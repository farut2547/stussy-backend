const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:      { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:      { type: String, enum: ['percent', 'fixed'], default: 'fixed' },
  discount:  { type: Number, required: true },
  minOrder:  { type: Number, default: 0 },
  maxUses:   { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);