const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discount: { type: Number, required: true }, // จำนวนส่วนลด
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' }, // % หรือ บาท
  minOrder: { type: Number, default: 0 }, // ยอดขั้นต่ำ
  maxUses: { type: Number, default: 100 }, // จำนวนครั้งที่ใช้ได้
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);