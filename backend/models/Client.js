const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  phone: String,
});

const ClientSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Please add a company name'],
    unique: true,
    trim: true,
  },
  contacts: [ContactSchema],
  industry: {
    type: String,
    default: 'Technology',
  },
  tags: [String],
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 80,
  },
  source: {
    type: String,
    default: 'Direct Outreach',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Client', ClientSchema);
