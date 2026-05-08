const express  = require('express');
const router   = express.Router();
const { protect, admin } = require('../middleware/auth');
const Receipt  = require('../models/receipt');
const Order    = require('../models/order');
const User     = require('../models/user');
const PDFDocument = require('pdfkit');
const nodemailer  = require('nodemailer');
const path     = require('path');
const fs       = require('fs');

// ─── Mailer setup ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Helper: Generate PDF ─────────────────────────────────────────────────────
const generateReceiptPDF = (receipt, user) => {
  return new Promise((resolve, reject) => {
    const dir = path.join(__dirname, '../../uploads/receipts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${receipt.receiptNumber}.pdf`);
    const doc      = new PDFDocument({ margin: 50 });
    const stream   = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(22).font('Helvetica-Bold').text('STUSSY STORE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('ใบเสร็จรับเงิน / Receipt', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11);
    doc.text(`เลขที่ใบเสร็จ: ${receipt.receiptNumber}`, 50);
    doc.text(`วันที่: ${new Date(receipt.paidAt || receipt.createdAt).toLocaleDateString('th-TH')}`);
    doc.text(`ชื่อลูกค้า: ${user.name}`);
    doc.text(`อีเมล: ${user.email}`);
    doc.text(`วิธีชำระเงิน: ${
      receipt.paymentMethod === 'promptpay'     ? 'PromptPay QR' :
      receipt.paymentMethod === 'bank_transfer' ? 'โอนธนาคาร' : 'เก็บเงินปลายทาง (COD)'
    }`);
    doc.moveDown();

    doc.font('Helvetica-Bold');
    doc.text('สินค้า',    50,  doc.y, { width: 220 });
    doc.text('จำนวน',   270,  doc.y - doc.currentLineHeight(), { width: 60,  align: 'center' });
    doc.text('ราคา/ชิ้น', 330, doc.y - doc.currentLineHeight(), { width: 80,  align: 'right'  });
    doc.text('รวม',      440,  doc.y - doc.currentLineHeight(), { width: 80,  align: 'right'  });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica');
    receipt.items.forEach(item => {
      const y = doc.y;
      doc.text(item.productName,                      50, y, { width: 220 });
      doc.text(String(item.quantity),                270, y, { width: 60,  align: 'center' });
      doc.text(`฿${item.price.toLocaleString()}`,    330, y, { width: 80,  align: 'right'  });
      doc.text(`฿${item.subtotal.toLocaleString()}`, 440, y, { width: 80,  align: 'right'  });
      doc.moveDown();
    });

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    const right = { width: 80, align: 'right' };
    doc.text('ยอดรวม:', 350, doc.y, { width: 120 });
    doc.text(`฿${receipt.subtotal.toLocaleString()}`, 470, doc.y - doc.currentLineHeight(), right);
    doc.moveDown(0.3);

    if (receipt.shippingFee > 0) {
      doc.text('ค่าจัดส่ง:', 350, doc.y, { width: 120 });
      doc.text(`฿${receipt.shippingFee.toLocaleString()}`, 470, doc.y - doc.currentLineHeight(), right);
      doc.moveDown(0.3);
    }
    if (receipt.discount > 0) {
      doc.text('ส่วนลด:', 350, doc.y, { width: 120 });
      doc.text(`-฿${receipt.discount.toLocaleString()}`, 470, doc.y - doc.currentLineHeight(), right);
      doc.moveDown(0.3);
    }

    doc.font('Helvetica-Bold');
    doc.text('ยอดรวมสุทธิ:', 350, doc.y, { width: 120 });
    doc.text(`฿${receipt.total.toLocaleString()}`, 470, doc.y - doc.currentLineHeight(), right);
    doc.moveDown(2);

    doc.font('Helvetica').fontSize(10)
       .text('ขอบคุณที่ใช้บริการ Stussy Store', { align: 'center' })
       .text('สอบถามเพิ่มเติม: support@stussystore.com', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error',  reject);
  });
};

// ─── Helper: Send Email ───────────────────────────────────────────────────────
const sendReceiptEmail = async (user, receipt, pdfPath) => {
  await transporter.sendMail({
    from   : `"Stussy Store" <${process.env.EMAIL_USER}>`,
    to     : user.email,
    subject: `ใบเสร็จรับเงิน #${receipt.receiptNumber}`,
    html   : `
      <h2>ขอบคุณที่สั่งซื้อสินค้า!</h2>
      <p>สวัสดีคุณ ${user.name},</p>
      <p>ใบเสร็จรับเงินเลขที่ <strong>${receipt.receiptNumber}</strong> แนบมาในอีเมลนี้</p>
      <p>ยอดชำระทั้งหมด: <strong>฿${receipt.total.toLocaleString()}</strong></p>
      <br/><p>ขอบคุณที่ใช้บริการ Stussy Store 🙏</p>
    `,
    attachments: [{ filename: `${receipt.receiptNumber}.pdf`, path: pdfPath }],
  });
};

// ─── POST /api/receipts/create ────────────────────────────────────────────────
router.post('/create', protect, async (req, res) => {
  try {
    const { orderId, paymentMethod, paymentProof } = req.body;

    const order = await Order.findById(orderId).populate('items.product');
    if (!order) return res.status(404).json({ message: 'ไม่พบ Order' });
    if (order.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });

    // ถ้ามีใบเสร็จอยู่แล้ว ส่งกลับเลย ไม่ต้องสร้างใหม่
    const existing = await Receipt.findOne({ order: orderId });
    if (existing) return res.status(200).json({ message: 'มีใบเสร็จแล้ว', receipt: existing });

    const user = await User.findById(req.user.id);

    // ✅ แก้: ใช้ i.qty แทน i.quantity ให้ตรงกับ Order model
    const items = order.items.map(i => ({
      productName: i.product?.name || i.name || 'สินค้า',
      quantity   : i.qty || 1,                                    // ✅ แก้จาก i.quantity → i.qty
      price      : i.product?.price || i.price || 0,
      subtotal   : (i.qty || 1) * (i.product?.price || i.price || 0), // ✅ แก้
    }));

    const subtotal    = items.reduce((s, i) => s + i.subtotal, 0);
    const shippingFee = order.shippingFee || 0;
    const discount    = order.discount    || 0;
    const total       = subtotal + shippingFee - discount;

    const receipt = new Receipt({
      order        : orderId,
      user         : req.user.id,
      paymentMethod,
      paymentProof : paymentProof || null,
      paymentStatus: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      paidAt       : paymentMethod === 'cod' ? new Date() : null,
      items, subtotal, shippingFee, discount, total,
    });

    await receipt.save();

    // ✅ แก้: เปลี่ยน awaiting_confirmation → awaiting_payment (ตรงกับ Order enum)
    order.status = paymentMethod === 'cod' ? 'confirmed' : 'awaiting_payment';
    await order.save();

    // COD → ออกใบเสร็จ + ส่ง Email ทันที
    if (paymentMethod === 'cod') {
      try {
        const pdfPath     = await generateReceiptPDF(receipt, user);
        receipt.pdfUrl    = `/uploads/receipts/${receipt.receiptNumber}.pdf`;
        receipt.emailSent = true;
        await receipt.save();
        await sendReceiptEmail(user, receipt, pdfPath);
      } catch (emailErr) {
        console.error('❌ Email/PDF error:', emailErr.message);
        // ไม่ throw เพราะใบเสร็จสร้างสำเร็จแล้ว
      }
    }

    res.status(201).json({ message: 'บันทึกการชำระเงินแล้ว', receipt });
  } catch (err) {
    console.error('❌ CREATE RECEIPT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── PATCH /api/receipts/:id/confirm  (Admin) ─────────────────────────────────
router.patch('/:id/confirm', protect, admin, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'ไม่พบใบเสร็จ' });

    receipt.paymentStatus = 'confirmed';
    receipt.paidAt        = new Date();
    await receipt.save();

    const user    = await User.findById(receipt.user);
    const pdfPath = await generateReceiptPDF(receipt, user);
    receipt.pdfUrl    = `/uploads/receipts/${receipt.receiptNumber}.pdf`;
    receipt.emailSent = true;
    await receipt.save();
    await sendReceiptEmail(user, receipt, pdfPath);
    await Order.findByIdAndUpdate(receipt.order, { status: 'confirmed' });

    res.json({ message: 'ยืนยันการชำระเงินสำเร็จ ส่ง Email แล้ว', receipt });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── PATCH /api/receipts/:id/reject  (Admin) ─────────────────────────────────
router.patch('/:id/reject', protect, admin, async (req, res) => {
  try {
    const receipt = await Receipt.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'rejected' },
      { new: true }
    );
    await Order.findByIdAndUpdate(receipt.order, { status: 'cancelled' }); // ✅ ใช้ status ที่มีใน enum
    res.json({ message: 'ปฏิเสธการชำระเงินแล้ว', receipt });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET /api/receipts/my ─────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const receipts = await Receipt.find({ user: req.user.id })
      .populate('order', 'status createdAt')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/receipts/admin/all  (Admin) — ต้องอยู่เหนือ /:id ───────────────
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const { status, method, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.paymentStatus = status;
    if (method) filter.paymentMethod = method;

    const receipts = await Receipt.find(filter)
      .populate('user',  'name email')
      .populate('order', 'status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Receipt.countDocuments(filter);
    res.json({ receipts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/receipts/:id — ต้องอยู่ล่างสุด ─────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id).populate('order');
    if (!receipt) return res.status(404).json({ message: 'ไม่พบใบเสร็จ' });

    if (receipt.user.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });

    res.json(receipt);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;