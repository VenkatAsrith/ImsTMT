const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');
const FinancialAccount = require('../models/FinancialAccount');
const Payment = require('../models/Payment');
const { protect, authorize } = require('../middleware/auth');
const { validateStudent } = require('../middleware/validation');
const { logAudit } = require('../services/automationService');

// @route   GET /api/students
// @desc    Get all students (paginated, sorted, filtered, searched)
// @access  Private (Teacher, Finance, Super Admin)
router.get('/', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const query = {};
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.onboardingStage) {
      query.onboardingStage = req.query.onboardingStage;
    }
    if (req.query.category) {
      const courses = await Course.find({ category: req.query.category }).select('_id');
      const courseIds = courses.map(c => c._id);
      query['coursesTaken.courseId'] = { $in: courseIds };
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: {
        students,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/students/:id
// @desc    Get student detail
// @access  Private (Teacher, Finance, Super Admin)
router.get('/:id', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('coursesTaken.courseId', 'title category description')
      .populate('financialAccount');
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }
    res.json({ data: student, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/students
// @desc    Admit/Register new student (Starts Kanban onboarding process)
// @access  Private (Teacher, Finance, Super Admin)
router.post('/', protect, authorize('Teacher', 'Finance', 'Super Admin'), validateStudent, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      onboardingStage, 
      status, 
      startDate, 
      assignedMentor, 
      examAttended, 
      examScore,
      courseFee,
      scholarshipAmount,
      financialRemarks,
      nextDueDate
    } = req.body;

    // 1. Create Student
    const student = await Student.create({
      name,
      email,
      phone,
      onboardingStage: onboardingStage || 'Inquiry Received',
      status: status || 'Registered',
      startDate: startDate || undefined,
      assignedMentor: assignedMentor || '',
      examAttended: examAttended || false,
      examScore: examScore !== undefined ? examScore : null,
    });

    // 2. Create Financial Account
    const fee = parseFloat(courseFee) || 0;
    const scholarship = 0;
    const agreed = fee;
    const balance = agreed; // totalPaid is 0 initially
    
    let initialPaymentStatus = 'Unpaid';
    if (agreed > 0) {
      initialPaymentStatus = 'Fee Pending';
    } else {
      initialPaymentStatus = 'Paid';
    }

    const financialAccount = await FinancialAccount.create({
      studentId: student._id,
      courseFee: fee,
      scholarshipAmount: scholarship,
      agreedAmount: agreed,
      totalPaid: 0,
      balanceAmount: balance,
      paymentStatus: initialPaymentStatus,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
      remarks: financialRemarks || '',
    });

    // Link Financial Account back to Student
    student.financialAccount = financialAccount._id;
    
    // Auto-transition onboardingStage based on balanceAmount
    if (balance <= 0) {
      student.onboardingStage = 'Paid';
    } else {
      student.onboardingStage = 'Fee Pending';
    }
    await student.save();

    // 3. Generate Initial Invoice
    const invoiceReference = `INV-${Date.now()}`;
    const initialInvoice = await Payment.create({
      studentId: student._id,
      amount: agreed,
      dueDate: nextDueDate ? new Date(nextDueDate) : new Date(),
      status: agreed > 0 ? 'Due' : 'Paid',
      referenceNumber: invoiceReference,
      method: agreed > 0 ? 'None' : 'Cash',
      paidDate: agreed > 0 ? undefined : new Date(),
    });

    if (agreed > 0) {
      try {
        const { generateInvoicePDF } = require('../services/pdfService');
        const fs = require('fs');
        const { filePath, publicUrl } = await generateInvoicePDF(initialInvoice, student, financialAccount, []);
        
        const { isCloudConfigured } = require('../services/supabaseService');
        if (isCloudConfigured() && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn('Failed to delete temp initial invoice PDF:', e.message);
          }
        }
        
        initialInvoice.invoicePdfUrl = publicUrl;
        await initialInvoice.save();
      } catch (err) {
        console.error('Failed to generate initial student invoice PDF:', err.message);
      }
    }

    // 4. Create Activity Log / Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Registered new student: ${student.name}. Created Financial Account & Initial Invoice reference: ${invoiceReference}`,
    });

    const { logStudentAudit } = require('../services/auditService');
    await logStudentAudit(
      student._id,
      'Admission Created',
      `Student admitted and onboarding timeline initialized.`,
      req.user.name
    );

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    res.status(201).json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student details
// @access  Private (Teacher, Finance, Super Admin)
router.put('/:id', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    // Update associated FinancialAccount if financial details are provided
    let financialAccount = await FinancialAccount.findOne({ studentId: req.params.id });
    if (financialAccount) {
      if (req.body.courseFee !== undefined) financialAccount.courseFee = parseFloat(req.body.courseFee) || 0;
      if (req.body.scholarshipAmount !== undefined) financialAccount.scholarshipAmount = parseFloat(req.body.scholarshipAmount) || 0;
      if (req.body.financialRemarks !== undefined) financialAccount.remarks = req.body.financialRemarks;
      if (req.body.nextDueDate !== undefined) financialAccount.nextDueDate = req.body.nextDueDate ? new Date(req.body.nextDueDate) : undefined;
      
      // Legacy updates support
      if (req.body.totalFee !== undefined) financialAccount.courseFee = parseFloat(req.body.totalFee) || 0;
      if (req.body.paidAmount !== undefined) financialAccount.scholarshipAmount = parseFloat(req.body.paidAmount) || 0;
      if (req.body.feeRemarks !== undefined) financialAccount.remarks = req.body.feeRemarks;

      await financialAccount.save();

      // Sync student onboardingStage based on updated balanceAmount
      if (financialAccount.balanceAmount <= 0) {
        student.onboardingStage = 'Paid';
      } else if (financialAccount.totalPaid > 0) {
        student.onboardingStage = 'Partially Paid';
      } else {
        student.onboardingStage = 'Fee Pending';
      }
      await student.save();
    }

    const oldValues = student.toObject();

    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    // Track Global Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: updatedStudent._id.toString(),
      details: `Updated details for student: ${updatedStudent.name}`,
      oldValues,
      newValues: updatedStudent.toObject(),
    });

    const { logStudentAudit } = require('../services/auditService');
    const wasFeeUpdated = req.body.courseFee !== undefined || req.body.totalFee !== undefined;
    if (wasFeeUpdated) {
      await logStudentAudit(
        updatedStudent._id,
        'Fee Updated',
        `Course fee updated to ₹${(updatedStudent.financialAccount?.courseFee || 0).toLocaleString('en-IN')}`,
        req.user.name
      );
    } else {
      await logStudentAudit(
        updatedStudent._id,
        'Fee Updated',
        `Profile details updated.`,
        req.user.name
      );
    }

    res.json({ data: updatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student profile (Cascades to payments & receipts)
// @access  Private (Teacher, Finance, Super Admin)
router.delete('/:id', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    // Import models for cascade delete
    const Payment = require('../models/Payment');
    const Receipt = require('../models/Receipt');

    // Find payments associated with this student
    const studentPayments = await Payment.find({ studentId: req.params.id });
    const paymentIds = studentPayments.map(p => p._id);

    // Delete receipts linked to those payments
    await Receipt.deleteMany({ paymentId: { $in: paymentIds } });

    // Delete student payments
    await Payment.deleteMany({ studentId: req.params.id });

    // Delete financial account
    await FinancialAccount.deleteOne({ studentId: req.params.id });

    // Delete student record
    await Student.findByIdAndDelete(req.params.id);

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE',
      entity: 'Student',
      entityId: req.params.id,
      details: `Deleted student profile: ${student.name} (cascaded payments & receipts deleted)`,
      oldValues: student.toObject(),
    });

    res.json({ data: { message: 'Student removed successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/students/:id/enroll
// @desc    Enroll student in a course
// @access  Private (Teacher, Super Admin)
router.post('/:id/enroll', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ data: null, error: 'Course ID is required' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ data: null, error: 'Course not found' });
    }

    // Check if already enrolled
    const isEnrolled = student.coursesTaken.some((c) => c.courseId.toString() === courseId.toString());
    if (isEnrolled) {
      return res.status(400).json({ data: null, error: 'Student already enrolled in this course' });
    }

    student.coursesTaken.push({ courseId });
    student.status = 'Enrolled';
    // If onboardingStage is Inquiry or Registered, change it to Enrolled
    if (student.onboardingStage === 'Inquiry Received' || student.onboardingStage === 'Registered (Pending Payment)') {
      student.onboardingStage = 'Enrolled';
    }
    
    await student.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Enrolled student ${student.name} in course: ${course.title}`,
    });

    const { logStudentAudit } = require('../services/auditService');
    await logStudentAudit(
      student._id,
      'Course Enrolled',
      `Enrolled in course: "${course.title}"`,
      req.user.name
    );

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/students/:id/complete-course
// @desc    Mark a course as completed in history
// @access  Private (Teacher, Super Admin)
router.post('/:id/complete-course', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ data: null, error: 'Course ID is required' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    // Find enrollment
    const courseIndex = student.coursesTaken.findIndex((c) => c.courseId.toString() === courseId.toString());
    if (courseIndex === -1) {
      return res.status(400).json({ data: null, error: 'Student is not enrolled in this course' });
    }

    student.coursesTaken[courseIndex].completionDate = new Date();
    
    // If all courses completed, mark onboarding stage completed
    const allCompleted = student.coursesTaken.every((c) => c.completionDate);
    if (allCompleted) {
      student.status = 'Alumni';
      student.onboardingStage = 'Completed';
    }

    await student.save();

    const course = await Course.findById(courseId);

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Marked course completion for ${student.name}: ${course ? course.title : courseId}`,
    });

    const { logStudentAudit } = require('../services/auditService');
    await logStudentAudit(
      student._id,
      'Course Completed',
      `Completed course: "${course ? course.title : courseId}"`,
      req.user.name
    );

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/students/:id/worklog
// @desc    Add a work log entry to a student (daily standup item)
// @access  Private (Teacher, Finance, Super Admin)
router.post('/:id/worklog', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const { title, description, status, category } = req.body;
    if (!title) {
      return res.status(400).json({ data: null, error: 'Work log title is required' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    student.workLog.push({
      title,
      description: description || '',
      status: status || 'To Do',
      category: category || 'Other',
    });

    await student.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Added work log item "${title}" for student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category');

    res.status(201).json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/students/:id/worklog/:logId
// @desc    Update a work log entry (change status, edit text)
// @access  Private (Teacher, Finance, Super Admin)
router.put('/:id/worklog/:logId', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    const logEntry = student.workLog.id(req.params.logId);
    if (!logEntry) {
      return res.status(404).json({ data: null, error: 'Work log entry not found' });
    }

    const { title, description, status, category } = req.body;
    if (title !== undefined) logEntry.title = title;
    if (description !== undefined) logEntry.description = description;
    if (status !== undefined) logEntry.status = status;
    if (category !== undefined) logEntry.category = category;
    logEntry.updatedAt = new Date();

    await student.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Updated work log item "${logEntry.title}" (status: ${logEntry.status}) for student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/students/:id/worklog/:logId
// @desc    Remove a work log entry
// @access  Private (Teacher, Finance, Super Admin)
router.delete('/:id/worklog/:logId', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    const logEntry = student.workLog.id(req.params.logId);
    if (!logEntry) {
      return res.status(404).json({ data: null, error: 'Work log entry not found' });
    }

    const logTitle = logEntry.title;
    student.workLog.pull({ _id: req.params.logId });
    await student.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Removed work log item "${logTitle}" from student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/students/:id/exams
// @desc    Add an exam record
// @access  Private (Teacher, Super Admin)
router.post('/:id/exams', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const { test, typeOfTest, result, marksSecured, totalMarks, dateOfExamination, typeOfExam, remarks } = req.body;
    if (!test || marksSecured === undefined) {
      return res.status(400).json({ data: null, error: 'Test name and marks secured are required' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    student.exams.push({
      test,
      typeOfTest: typeOfTest || 'Quiz',
      result: result || 'Pass',
      marksSecured: parseFloat(marksSecured),
      totalMarks: totalMarks ? parseFloat(totalMarks) : 100,
      dateOfExamination: dateOfExamination || new Date(),
      typeOfExam: typeOfExam || 'Online',
      remarks: remarks || '',
    });

    await student.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Added exam record "${test}" (Marks: ${marksSecured}/${totalMarks || 100}) for student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    res.status(201).json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/students/:id/exams/:examId
// @desc    Remove an exam record
// @access  Private (Teacher, Super Admin)
router.delete('/:id/exams/:examId', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    const exam = student.exams.id(req.params.examId);
    if (!exam) {
      return res.status(404).json({ data: null, error: 'Exam record not found' });
    }

    const examTitle = exam.test;
    student.exams.pull({ _id: req.params.examId });
    await student.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Removed exam record "${examTitle}" from student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/students/:id/courses/:courseId
// @desc    Unenroll student from a course
// @access  Private (Teacher, Super Admin)
router.delete('/:id/courses/:courseId', protect, authorize('Teacher', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    // Check if enrolled
    const isEnrolled = student.coursesTaken.some((c) => c.courseId.toString() === req.params.courseId.toString());
    if (!isEnrolled) {
      return res.status(400).json({ data: null, error: 'Student is not enrolled in this course' });
    }

    // Pull the course
    student.coursesTaken = student.coursesTaken.filter((c) => c.courseId.toString() !== req.params.courseId.toString());

    // If no more courses enrolled, update student's status back to Registered
    if (student.coursesTaken.length === 0) {
      student.status = 'Registered';
    }

    await student.save();

    // Get course title for audit logging
    const course = await Course.findById(req.params.courseId);
    const courseTitle = course ? course.title : req.params.courseId;

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Unenrolled student ${student.name} from course: ${courseTitle}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are supported!'));
    }
  },
});

// @route   POST /api/students/:id/documents
// @desc    Upload documents to student profile
// @access  Private (Teacher, Finance, Super Admin)
router.post('/:id/documents', protect, authorize('Teacher', 'Finance', 'Super Admin'), upload.single('document'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    if (!req.file) {
      return res.status(400).json({ data: null, error: 'Please upload a file' });
    }

    const { uploadFileToCloud } = require('../services/supabaseService');
    const cloudUrl = await uploadFileToCloud(
      req.file.path,
      'documents',
      req.file.filename,
      req.file.mimetype,
      true
    );

    const newDoc = {
      name: req.body.name || req.file.originalname,
      url: cloudUrl,
    };

    student.documentUrls.push(newDoc);
    await student.save();

    // Track Student Audit Log
    const { logStudentAudit } = require('../services/auditService');
    await logStudentAudit(
      student._id,
      'Student Document Uploaded',
      `Uploaded document: "${newDoc.name}"`,
      req.user.name
    );

    // Track Global Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Uploaded document: "${newDoc.name}" for student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/students/:id/documents/:docId
// @desc    Delete document from student profile
// @access  Private (Teacher, Finance, Super Admin)
router.delete('/:id/documents/:docId', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    const doc = student.documentUrls.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ data: null, error: 'Document not found' });
    }

    const docName = doc.name;
    const docUrl = doc.url;

    student.documentUrls.pull({ _id: req.params.docId });
    await student.save();

    if (docUrl) {
      const filePath = path.join(__dirname, '..', docUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Failed to delete file at ${filePath}:`, err);
        }
      }
    }

    // Track Student Audit Log
    const { logStudentAudit } = require('../services/auditService');
    await logStudentAudit(
      student._id,
      'Student Document Deleted',
      `Deleted document: "${docName}"`,
      req.user.name
    );

    // Track Global Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: student._id.toString(),
      details: `Deleted document: "${docName}" for student ${student.name}`,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('coursesTaken.courseId', 'title category')
      .populate('financialAccount');

    res.json({ data: populatedStudent, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/students/:id/audit-logs
// @desc    Get student audit timeline logs
// @access  Private (Teacher, Finance, Super Admin)
router.get('/:id/audit-logs', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const StudentAuditLog = require('../models/StudentAuditLog');
    const logs = await StudentAuditLog.find({ studentId: req.params.id })
      .sort({ timestamp: -1 });
    res.json({ data: logs, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/students/:id/audit-whatsapp
// @desc    Create manual audit entry for WhatsApp deep link redirection
// @access  Private (Teacher, Finance, Super Admin)
router.post('/:id/audit-whatsapp', protect, authorize('Teacher', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const { logStudentAudit } = require('../services/auditService');
    await logStudentAudit(
      req.params.id,
      'WhatsApp Sent',
      req.body.details || 'Dispatched via deep link redirection',
      req.user.name
    );
    res.json({ data: { message: 'WhatsApp redirect logged' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
