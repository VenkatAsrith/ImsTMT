const mongoose = require('mongoose');

const InternSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
  },
  department: {
    type: String,
    required: [true, 'Please add a department'],
    enum: ['Org Space', 'Learning Space', 'Marketing Space'],
  },
  joinDate: {
    type: Date,
    required: [true, 'Please add a join date'],
  },
  role: {
    type: String,
    required: [true, 'Please add a role/title'],
  },
  status: {
    type: String,
    enum: ['Onboarding Pending', 'Active', 'Probation', 'Completed', 'Terminated'],
    default: 'Onboarding Pending',
  },
  photoUrl: {
    type: String,
    default: '',
  },
  performanceMetrics: [
    {
      month: {
        type: String, // e.g. "Jan 2026"
        required: true,
      },
      rating: {
        type: Number, // 1 to 5
        min: 1,
        max: 5,
        required: true,
      },
      notes: String,
    },
  ],
  documentUrls: [
    {
      name: {
        type: String, // e.g. "Offer Letter"
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Intern', InternSchema);
