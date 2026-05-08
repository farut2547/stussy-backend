const express = require('express');
const router = express.Router();
const Coupon = require('../models/coupon');
const { protect, admin } = require('../middleware/auth');

// ใช้โค้ดส่วนลด (User)
router.post('/apply', protect, async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ message: 'ไม่พบโค้ดส่วนลดนี้' });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return res.status(400).json({ message: 'โค้ดหมดอายุแล้ว' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'โค้ดถูกใช้ครบแล้ว' });
    if (orderTotal < coupon.minOrder) return res.status(400).json({ message: `ยอดสั่งซื้อขั้นต่ำ ฿${coupon.minOrder.toLocaleString()}` });

    const discount = coupon.type === 'percent'
      ? Math.round(orderTotal * coupon.discount / 100)
      : coupon.discount;

    res.json({ message: 'ใช้โค้ดสำเร็จ', coupon: { code: coupon.code, type: coupon.type, discount: coupon.discount, discountAmount: discount } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin — ดูโค้ดทั้งหมด
router.get('/', protect, admin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin — สร้างโค้ดใหม่
router.post('/', protect, admin, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Admin — แก้ไขโค้ด
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(coupon);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Admin — ลบโค้ด
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบโค้ดสำเร็จ' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
