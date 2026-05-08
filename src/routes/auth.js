const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({ name, email, password });

    try {
      await transporter.sendMail({
        from: `"Stussy Store" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 ยินดีต้อนรับสู่ Stussy Store!',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
            <h1 style="font-size:28px;letter-spacing:4px;text-align:center">STÜSSY</h1>
            <hr style="border:none;border-top:1px solid #eee">
            <h2 style="font-size:18px">สวัสดีคุณ ${name}! 👋</h2>
            <p style="color:#555">ขอบคุณที่สมัครสมาชิกกับ Stussy Store</p>
            <p style="color:#555">บัญชีของคุณพร้อมใช้งานแล้ว เริ่มช้อปปิ้งได้เลย!</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0">
              <p style="margin:0;color:#333"><strong>Email:</strong> ${email}</p>
            </div>
            <p style="color:#999;font-size:12px;text-align:center">© 2026 Stussy Store</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('❌ Email error:', emailErr.message);
    }

    res.status(201).json({
      token: signToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    res.json({
      token: signToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/auth/profile ─────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '')
      return res.status(400).json({ message: 'กรุณากรอกชื่อ' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/auth/change-password ────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch)
      return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/auth/address ─────────────────────────────────────────────────
router.put('/address', protect, async (req, res) => {
  try {
    const { name, street, tambon, amphoe, province, postalCode, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { address: { name, street, tambon, amphoe, province, postalCode, phone } },
      { new: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ ─── GET /api/auth/users (Admin — ดูสมาชิกทั้งหมด) ──────────────────────
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ ─── PUT /api/auth/users/:id/role (Admin — เปลี่ยน role) ────────────────
router.put('/users/:id/role', protect, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ ─── DELETE /api/auth/users/:id (Admin — ลบสมาชิก) ─────────────────────
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'ลบสมาชิกสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
