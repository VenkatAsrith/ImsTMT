const mongoose = require('mongoose');

const GeneratedLetterSchema = new mongoose.Schema({
  internId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intern',
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  },
  title: {
    type: String,
    required: [true, 'Please add a title for the letter'],
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['Certificate', 'Offer Letter', 'Relieving Letter', 'Other'],
    default: 'Other',
  },
  url: {
    type: String,
    required: [true, 'Please provide a document URL'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('GeneratedLetter', GeneratedLetterSchema);
