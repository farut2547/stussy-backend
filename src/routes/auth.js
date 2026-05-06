const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email, password });

    // ส่ง Email ยืนยัน
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

    res.status(201).json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});