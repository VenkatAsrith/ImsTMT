const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');
const GeneratedLetter = require('../models/GeneratedLetter');
const Receipt = require('../models/Receipt');
const Student = require('../models/Student');
const Intern = require('../models/Intern');
const InternSubmission = require('../models/InternSubmission');
const { uploadFileToCloud } = require('../services/supabaseService');

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// @route   POST /api/documents/upload-letter
// @desc    Upload generated certificate or HR letters
// @access  Private (HR Manager, Super Admin)
router.post('/upload-letter', protect, authorize('HR Manager', 'Super Admin'), upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ data: null, error: 'Please upload a file' });
    }

    const { title, type, internId, studentId } = req.body;
    if (!title || !type) {
      return res.status(400).json({ data: null, error: 'Title and document type are required' });
    }

    // Upload to Supabase and delete local copy
    const cloudUrl = await uploadFileToCloud(
      req.file.path,
      'letters',
      req.file.filename,
      req.file.mimetype,
      true // delete local copy
    );

    const letter = await GeneratedLetter.create({
      internId: internId || undefined,
      studentId: studentId || undefined,
      title,
      type,
      url: cloudUrl,
    });

    res.status(201).json({ data: letter, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/documents
// @desc    Get all files normalized in unified repository
// @access  Private (HR Manager, Finance, Super Admin)
router.get('/', protect, authorize('HR Manager', 'Finance', 'Super Admin'), async (req, res) => {
  try {
    const [receipts, students, interns, submissions, letters] = await Promise.all([
      Receipt.find().populate({
        path: 'paymentId',
        populate: { path: 'studentId', select: 'name' }
      }),
      Student.find({ 'documentUrls.0': { $exists: true } }),
      Intern.find({ 'documentUrls.0': { $exists: true } }),
      InternSubmission.find().populate('internId', 'name'),
      GeneratedLetter.find().populate('internId', 'name').populate('studentId', 'name'),
    ]);

    const normalized = [];

    // 1. Receipts
    receipts.forEach(r => {
      normalized.push({
        id: r._id,
        title: `Receipt #${r.receiptNumber}`,
        type: 'Receipt',
        personName: r.paymentId?.studentId?.name || 'Unknown Student',
        url: r.pdfUrl,
        date: r.issueDate,
        category: 'Tuition Payment',
      });
    });

    // 2. Student Documents
    students.forEach(s => {
      s.documentUrls.forEach(d => {
        normalized.push({
          id: d._id,
          title: d.name,
          type: 'Student Document',
          personName: s.name,
          url: d.url,
          date: d.uploadedAt,
          category: 'Student Profile Doc',
        });
      });
    });

    // 3. Intern Documents
    interns.forEach(i => {
      i.documentUrls.forEach(d => {
        normalized.push({
          id: d._id,
          title: d.name,
          type: 'Intern Document',
          personName: i.name,
          url: d.url,
          date: d.uploadedAt,
          category: 'Intern Profile Doc',
        });
      });
    });

    // 4. Submissions
    submissions.forEach(s => {
      normalized.push({
        id: s._id,
        title: s.title,
        type: 'Intern Submission',
        personName: s.internId?.name || 'Unknown Intern',
        url: s.fileUrl,
        date: s.uploadedDate,
        category: s.category,
      });
    });

    // 5. Generated Letters
    letters.forEach(l => {
      normalized.push({
        id: l._id,
        title: l.title,
        type: 'Generated Letter',
        personName: l.internId?.name || l.studentId?.name || 'System Generated',
        url: l.url,
        date: l.createdAt,
        category: l.type,
      });
    });

    // Sort by date descending
    normalized.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ data: normalized, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
