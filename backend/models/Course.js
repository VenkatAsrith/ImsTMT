const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a course title'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a course description'],
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Development', 'Design', 'Marketing', 'Business', 'Operations'],
  },
  prerequisites: [String],
  sections: {
    type: [String],
    default: [],
  },
  stack: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Course', CourseSchema);
