const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
  }]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

// GET /api/cart
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price imageUrl');
    res.json(cart || { items: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/cart/add  ✅ เพิ่มใหม่ — Flutter เรียกแค่ครั้งเดียว ไม่ค้างแล้ว
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (i) => i.product.toString() === productId
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    const populated = await cart.populate('items.product', 'name price imageUrl');
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/cart/sync
router.post('/sync', protect, async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, items: req.body.items },
      { upsert: true, new: true }
    ).populate('items.product', 'name price imageUrl');
    res.json(cart);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/cart
router.delete('/', protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ message: 'Cart cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;