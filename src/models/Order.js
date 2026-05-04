const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  price: Number,
  size: String,
  qty: { type: Number, default: 1 },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  shippingAddress: {
    name: String,
    street: String,
    province: String,
    postalCode: String,
    phone: String,
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'promptpay', 'cod', 'bank', 'bank_transfer'], // ✅ เพิ่ม bank และ bank_transfer
    required: true
  },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'awaiting_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'], // ✅ เพิ่ม awaiting_payment
    default: 'pending'
  },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentSlip: { type: String },
  transactionId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);