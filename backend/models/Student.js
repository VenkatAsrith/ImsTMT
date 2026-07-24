const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
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
  admissionDate: {
    type: Date,
    default: Date.now,
  },
  startDate: {
    type: Date,
  },
  assignedMentor: {
    type: String,
    trim: true,
    default: '',
  },
  coursesTaken: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
      },
      completionDate: {
        type: Date,
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  status: {
    type: String,
    enum: ['Registered', 'Enrolled', 'Alumni'],
    default: 'Registered',
  },
  onboardingStage: {
    type: String,
    enum: ['Inquiry Received', 'Registered', 'Fee Pending', 'Partially Paid', 'Paid', 'Enrolled', 'Completed'],
    default: 'Inquiry Received',
  },
  financialAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinancialAccount',
  },
  outstandingBalance: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['Settle', 'Due', 'Overpaid'],
    default: 'Due',
  },
  totalFee: {
    type: Number,
    default: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  feeRemarks: {
    type: String,
    default: '',
  },
  examAttended: {
    type: Boolean,
    default: false,
  },
  examScore: {
    type: Number,
    default: null,
  },
  exams: [
    {
      test: {
        type: String,
        required: [true, 'Test name is required'],
        trim: true,
      },
      typeOfTest: {
        type: String,
        default: 'Quiz',
      },
      result: {
        type: String,
        enum: ['Pass', 'Fail', 'Pending'],
        default: 'Pass',
      },
      marksSecured: {
        type: Number,
        required: [true, 'Marks secured is required'],
      },
      totalMarks: {
        type: Number,
        default: 100,
      },
      dateOfExamination: {
        type: Date,
        default: Date.now,
      },
      typeOfExam: {
        type: String,
        default: 'Online',
      },
      remarks: {
        type: String,
        default: '',
      },
    }
  ],
  workLog: [
    {
      title: {
        type: String,
        required: [true, 'Work log title is required'],
        trim: true,
      },
      description: {
        type: String,
        default: '',
      },
      status: {
        type: String,
        enum: ['To Do', 'In Progress', 'Done', 'Blocked'],
        default: 'To Do',
      },
      category: {
        type: String,
        enum: ['Assignment', 'Project', 'Exam Prep', 'Research', 'Other'],
        default: 'Other',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  documentUrls: [
    {
      name: {
        type: String,
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

module.exports = mongoose.model('Student', StudentSchema);
