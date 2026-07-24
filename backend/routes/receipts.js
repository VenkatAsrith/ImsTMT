const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/receipts
// @desc    Get all receipts list
// @access  Private (Finance, Super Admin)
router.get('/', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const query = {};
    if (req.query.studentId) {
      const Payment = require('../models/Payment');
      const payments = await Payment.find({ studentId: req.query.studentId });
      const paymentIds = payments.map(p => p._id);
      query.paymentId = { $in: paymentIds };
    }

    const receipts = await Receipt.find(query)
      .populate({
        path: 'paymentId',
        populate: {
          path: 'studentId',
          select: 'name email phone outstandingBalance assignedMentor coursesTaken',
          populate: {
            path: 'coursesTaken.courseId',
            select: 'title',
          }
        },
      })
      .sort({ issueDate: -1 });

    res.json({ data: receipts, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/receipts/:id
// @desc    Get receipt details by ID
// @access  Private (Finance, Super Admin)
// @route   GET /api/receipts/:id
router.get('/:id', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate({
        path: 'paymentId',
        populate: {
          path: 'studentId',
          select: 'name email phone outstandingBalance assignedMentor coursesTaken',
          populate: {
            path: 'coursesTaken.courseId',
            select: 'title',
          }
        },
      });

    if (!receipt) {
      return res.status(404).json({ data: null, error: 'Receipt not found' });
    }

    res.json({ data: receipt, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
