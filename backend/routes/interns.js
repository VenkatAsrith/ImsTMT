const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Intern = require('../models/Intern');
const { protect, authorize } = require('../middleware/auth');
const { validateIntern } = require('../middleware/validation');
const { sendInAppNotification, sendEmail } = require('../services/notificationService');
const { logAudit } = require('../services/automationService');

// Multer Local Storage Setup for Mocking S3/Doc Uploads
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
    // Only accept PDFs, Images
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

// Helper for filtering & sorting query
const buildQuery = (req) => {
  const query = {};
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.department) {
    query.department = req.query.department;
  }
  if (req.query.status) {
    query.status = req.query.status;
  }
  return query;
};

// @route   GET /api/interns
// @desc    Get all interns (with sorting, filtering, pagination, search)
// @access  Private (HR and Super Admin)
router.get('/', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const query = buildQuery(req);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortField]: sortOrder };

    const total = await Intern.countDocuments(query);
    const interns = await Intern.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      data: {
        interns,
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

// @route   GET /api/interns/:id
// @desc    Get single intern detail
// @access  Private (HR and Super Admin)
router.get('/:id', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }
    res.json({ data: intern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/interns
// @desc    Create new intern (Triggers onboarding workflows)
// @access  Private (HR and Super Admin)
router.post('/', protect, authorize('HR Manager', 'Super Admin'), validateIntern, async (req, res) => {
  try {
    const internData = {
      ...req.body,
      status: 'Onboarding Pending', // Enforce onboarding state on create
    };

    const intern = await Intern.create(internData);

    // Automation: Schedule Onboarding tasks reminders
    await sendInAppNotification({
      recipientRole: 'HR Manager',
      title: 'New Intern Registered - Onboarding Active',
      message: `Intern "${intern.name}" is marked as "Onboarding Pending". Check document submissions.`,
      type: 'Info',
      link: `/org/interns/${intern._id}`,
    });

    // Email to student welcoming them
    await sendEmail({
      to: intern.email,
      subject: 'Welcome to TMT Operations - Techmecha Torque',
      html: `<h3>Welcome, ${intern.name}!</h3><p>We are excited to have you join our ${intern.department} department as a ${intern.role}. Please log in or reach out to HR to submit your training documents.</p>`,
    });

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Registered intern: ${intern.name} (Dept: ${intern.department})`,
    });

    res.status(201).json({ data: intern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/interns/:id
// @desc    Update intern info
// @access  Private (HR and Super Admin)
router.put('/:id', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    const oldValues = intern.toObject();
    
    // Perform update
    const updatedIntern = await Intern.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: updatedIntern._id.toString(),
      details: `Updated details for intern: ${updatedIntern.name}`,
      oldValues,
      newValues: updatedIntern.toObject(),
    });

    res.json({ data: updatedIntern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/interns/:id
// @desc    Delete an intern (requires confirmation from client UI)
// @access  Private (HR and Super Admin)
router.delete('/:id', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    await Intern.findByIdAndDelete(req.params.id);

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE',
      entity: 'Intern',
      entityId: req.params.id,
      details: `Deleted intern profile: ${intern.name}`,
      oldValues: intern.toObject(),
    });

    res.json({ data: { message: 'Intern removed successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/interns/:id/documents
// @desc    Upload documents to intern profile
// @access  Private (HR and Super Admin)
router.post('/:id/documents', protect, authorize('HR Manager', 'Super Admin'), upload.single('document'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    if (!req.file) {
      return res.status(400).json({ data: null, error: 'Please upload a file' });
    }

    // Upload to Supabase and delete local copy
    const { uploadFileToCloud } = require('../services/supabaseService');
    const cloudUrl = await uploadFileToCloud(
      req.file.path,
      'documents',
      req.file.filename,
      req.file.mimetype,
      true // delete local copy
    );

    const newDoc = {
      name: req.body.name || req.file.originalname,
      url: cloudUrl,
    };

    intern.documentUrls.push(newDoc);
    await intern.save();

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Uploaded document: "${newDoc.name}" for intern ${intern.name}`,
    });

    res.json({ data: intern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/interns/:id/performance
// @desc    Add monthly performance metrics
// @access  Private (HR and Super Admin)
router.post('/:id/performance', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const { month, rating, notes } = req.body;
    
    if (!month || !rating) {
      return res.status(400).json({ data: null, error: 'Month and Rating are required' });
    }

    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    intern.performanceMetrics.push({ month, rating, notes });
    await intern.save();

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Added monthly rating (${rating}/5) for ${intern.name} - Month: ${month}`,
    });

    res.json({ data: intern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/interns/:id/documents/:docId
// @desc    Delete document from intern profile
// @access  Private (HR and Super Admin)
router.delete('/:id/documents/:docId', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    const doc = intern.documentUrls.id(req.params.docId);
    if (!doc) {
      return res.status(404).json({ data: null, error: 'Document not found' });
    }

    const docName = doc.name;
    const docUrl = doc.url;

    // Pull document from subdocument array
    intern.documentUrls.pull({ _id: req.params.docId });
    await intern.save();

    // Clean up physical file if it exists locally
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

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Deleted document: "${docName}" for intern ${intern.name}`,
    });

    res.json({ data: intern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/interns/:id/performance/:perfId
// @desc    Delete monthly performance metric
// @access  Private (HR and Super Admin)
router.delete('/:id/performance/:perfId', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    const perf = intern.performanceMetrics.id(req.params.perfId);
    if (!perf) {
      return res.status(404).json({ data: null, error: 'Performance metric not found' });
    }

    const rating = perf.rating;
    const month = perf.month;

    // Pull performance metric from subdocument array
    intern.performanceMetrics.pull({ _id: req.params.perfId });
    await intern.save();

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Deleted monthly rating (${rating}/5) for ${intern.name} - Month: ${month}`,
    });

    res.json({ data: intern, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/interns/:id/email
// @desc    Log email correspondence sent to intern via UI
// @access  Private (HR and Super Admin)
router.post('/:id/email', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const { subject, body } = req.body;
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    // Trigger email send
    await sendEmail({
      to: intern.email,
      subject: subject,
      html: `<p>Dear ${intern.name},</p><br/><div>${body}</div>`,
    });

    // Save history audit trail
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Emailed intern: "${subject}"`,
    });

    res.json({ data: { message: 'Email dispatched and logged successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

const submissionUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|docx|doc|ppt|pptx|zip/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype.includes('zip') || file.mimetype.includes('octet-stream') || file.mimetype.includes('officedocument');

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, PPT, PPTX, ZIP and Images are supported!'));
    }
  },
});

const InternSubmission = require('../models/InternSubmission');

// @route   GET /api/interns/:id/submissions
// @desc    Get all submissions for an intern
// @access  Private (HR Manager, Super Admin)
router.get('/:id/submissions', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const submissions = await InternSubmission.find({ internId: req.params.id })
      .sort({ uploadedDate: -1 });
    res.json({ data: submissions, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/interns/:id/submissions
// @desc    Submit file for intern profile
// @access  Private (HR Manager, Super Admin)
router.post('/:id/submissions', protect, authorize('HR Manager', 'Super Admin'), submissionUpload.single('document'), async (req, res) => {
  try {
    const intern = await Intern.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ data: null, error: 'Intern not found' });
    }

    if (!req.file) {
      return res.status(400).json({ data: null, error: 'Please upload a file' });
    }

    // Upload to Supabase and delete local copy
    const { uploadFileToCloud } = require('../services/supabaseService');
    const cloudUrl = await uploadFileToCloud(
      req.file.path,
      'submissions',
      req.file.filename,
      req.file.mimetype,
      true // delete local copy
    );

    const submission = await InternSubmission.create({
      internId: intern._id,
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'Assignment',
      remarks: req.body.remarks || '',
      fileUrl: cloudUrl,
      status: 'Pending',
    });

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: intern._id.toString(),
      details: `Created submission: "${submission.title}" (Category: ${submission.category}) for intern ${intern.name}`,
    });

    res.status(201).json({ data: submission, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/interns/:id/submissions/:subId
// @desc    Approve/Reject submission
// @access  Private (HR Manager, Super Admin)
router.put('/:id/submissions/:subId', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  try {
    const { status, reviewerRemarks } = req.body;
    
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ data: null, error: 'Valid status (Approved or Rejected) is required' });
    }

    const submission = await InternSubmission.findById(req.params.subId);
    if (!submission) {
      return res.status(404).json({ data: null, error: 'Submission not found' });
    }

    submission.status = status;
    submission.reviewerRemarks = reviewerRemarks || '';
    await submission.save();

    const intern = await Intern.findById(req.params.id);

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Intern',
      entityId: req.params.id,
      details: `Reviewed submission "${submission.title}" for intern ${intern ? intern.name : req.params.id} -> Status: ${status}`,
    });

    res.json({ data: submission, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
