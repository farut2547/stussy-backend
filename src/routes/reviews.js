const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const { protect } = require('../middleware/auth');

// ดูรีวิวของสินค้า
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({ reviews, avgRating: parseFloat(avgRating), total: reviews.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// เพิ่มรีวิว
router.post('/:productId', protect, async (req, res) => {
  try {
    const existing = await Review.findOne({ product: req.params.productId, user: req.user._id });
    if (existing) return res.status(400).json({ message: 'คุณรีวิวสินค้านี้แล้ว' });

    const review = await Review.create({
      product: req.params.productId,
      user: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment,
    });

    const populated = await review.populate('user', 'name');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ลบรีวิวของตัวเอง
router.delete('/:reviewId', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'ไม่พบรีวิว' });
    if (review.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    await review.deleteOne();
    res.json({ message: 'ลบรีวิวแล้ว' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
