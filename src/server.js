const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ แก้ mongoose.connect เพิ่ม tlsAllowInvalidCertificates
mongoose.connect(process.env.MONGODB_URI, {
  tlsAllowInvalidCertificates: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Static files ต้องอยู่ก่อน routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/receipts', require('./routes/receipts'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));