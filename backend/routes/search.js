const express = require('express');
const router = express.Router();
const Intern = require('../models/Intern');
const Client = require('../models/Client');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Receipt = require('../models/Receipt');
const { protect } = require('../middleware/auth');

// @route   GET /api/search
// @desc    Global search across interns, clients, and courses (Ctrl+K)
// @access  Private
router.get('/', protect, async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim() === '') {
    return res.json({
      data: { interns: [], clients: [], courses: [], students: [], receipts: [] },
      error: null,
    });
  }

  try {
    const regex = new RegExp(query, 'i');

    // Perform queries concurrently
    const [interns, clients, courses, students, receipts] = await Promise.all([
      // Intern search (HR only - we can restrict internally if role allows, or show results based on user role)
      ['Super Admin', 'HR Manager'].includes(req.user.role)
        ? Intern.find({ $or: [{ name: regex }, { email: regex }, { department: regex }] }).limit(5).select('name email department')
        : Promise.resolve([]),

      // Client search (Sales and Admin)
      ['Super Admin', 'Sales Rep'].includes(req.user.role)
        ? Client.find({ $or: [{ companyName: regex }, { industry: regex }] }).limit(5).select('companyName industry')
        : Promise.resolve([]),

      // Course search (All staff)
      Course.find({ $or: [{ title: regex }, { category: regex }] }).limit(5).select('title category'),

      // Student search (Super Admin, Teacher, Finance)
      ['Super Admin', 'Teacher', 'Finance'].includes(req.user.role)
        ? Student.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }] }).limit(5).select('name email phone')
        : Promise.resolve([]),

      // Receipt search (Super Admin, Finance)
      ['Super Admin', 'Finance'].includes(req.user.role)
        ? Receipt.find({ receiptNumber: regex }).limit(5).populate({
            path: 'paymentId',
            populate: {
              path: 'studentId',
              select: 'name'
            }
          })
        : Promise.resolve([]),
    ]);

    res.json({
      data: {
        interns,
        clients,
        courses,
        students,
        receipts,
      },
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
