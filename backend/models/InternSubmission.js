const mongoose = require('mongoose');

const InternSubmissionSchema = new mongoose.Schema({
  internId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intern',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please add a submission title'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Please select a submission category'],
    enum: ['Assignment', 'Project Report', 'NDA Signed', 'Contract', 'ID Proof', 'Other'],
    default: 'Assignment',
  },
  remarks: {
    type: String,
    default: '',
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide a file URL'],
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  reviewerRemarks: {
    type: String,
    default: '',
  },
  uploadedDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('InternSubmission', InternSubmissionSchema);
