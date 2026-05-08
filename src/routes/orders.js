const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');

// 1. สร้าง Order ใหม่
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, totalPrice, totalAmount, status } = req.body;
    const finalTotal = totalPrice || totalAmount;
    if (!items || items.length === 0) return res.status(400).json({ message: 'กรุณาระบุรายการสินค้า' });
    if (!finalTotal) return res.status(400).json({ message: 'กรุณาระบุยอดรวม' });
    if (!paymentMethod) return res.status(400).json({ message: 'กรุณาระบุวิธีชำระเงิน' });
    const formattedItems = items.map(item => ({
      product: item.product || item._id || item.productId,
      name: item.name,
      price: item.price,
      size: item.size || '',
      qty: item.qty || item.quantity || 1,
    }));
    const order = await Order.create({
      user: req.user._id,
      items: formattedItems,
      shippingAddress: shippingAddress || {},
      paymentMethod,
      totalPrice: finalTotal,
      status: status || 'pending',
    });
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ CREATE ORDER ERROR:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// 2. อัปเดตเมื่อจ่ายเงินสำเร็จ
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.status = 'confirmed';
      order.transactionId = req.body.transactionId;
      order.paymentSlip = req.body.paymentSlip;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    console.error('❌ PAY ORDER ERROR:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// 3. ดึงประวัติ Order ของตัวเอง
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('❌ GET MY ORDERS ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// 4. ดึงข้อมูล Order รายชิ้น
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(order);
  } catch (err) {
    console.error('❌ GET ORDER ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// 5. Admin — ดู Order ทั้งหมด
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Admin — อัปเดตสถานะ Order
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
