const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  address: {
    name:       String,   // ชื่อผู้รับ
    street:     String,   // บ้านเลขที่ / ถนน
    tambon:     String,   // ตำบล
    amphoe:     String,   // อำเภอ
    province:   String,   // จังหวัด
    postalCode: String,   // รหัสไปรษณีย์
    phone:      String,   // เบอร์โทร
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);