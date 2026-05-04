const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number, // ✅ เปลี่ยนจาก qty เป็น quantity
  }]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price imageUrl');
    res.json(cart || { items: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/sync', protect, async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, items: req.body.items },
      { upsert: true, new: true }
    ).populate('items.product', 'name price imageUrl'); // ✅ populate ตอน sync ด้วย
    res.json(cart);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/', protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ message: 'Cart cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;