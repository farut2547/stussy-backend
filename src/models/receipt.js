const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    unique: true,
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['promptpay', 'bank_transfer', 'cod'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending',
  },
  paymentProof: {
    type: String, // URL รูปสลิป
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  items: [
    {
      productName: String,
      quantity: Number,
      price: Number,
      subtotal: Number,
    },
  ],
  subtotal:   { type: Number, required: true },
  shippingFee:{ type: Number, default: 0 },
  discount:   { type: Number, default: 0 },
  total:      { type: Number, required: true },
  pdfUrl:     { type: String, default: null },
  emailSent:  { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate receipt number  ก่อน save
receiptSchema.pre('save', async function (next) {
  if (!this.receiptNumber) {
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const count = await mongoose.model('Receipt').countDocuments();
    this.receiptNumber = `RCP-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Receipt', receiptSchema);