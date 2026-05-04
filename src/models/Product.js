 
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['tee', 'hoodie', 'jacket', 'cap'], required: true },
  price: { type: Number, required: true },
  description: { type: String },
  imageUrl: { type: String, default: '' },
  sizes: [{ type: String, enum: ['XS','S','M','L','XL','XXL','ONE SIZE'] }],
  stock: { type: Map, of: Number, default: {} },
  badge: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);