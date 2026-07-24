const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/notifications/broadcast
// @desc    Broadcast an announcement notice (HR or Super Admin)
// @access  Private (HR Manager, Super Admin)
router.post('/broadcast', protect, authorize('HR Manager', 'Super Admin'), async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ data: null, error: 'Title and message are required' });
  }

  try {
    const announcement = await Notification.create({
      title,
      message,
      type: type || 'Info',
      recipientRole: 'All',
    });

    res.status(201).json({ data: announcement, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/notifications
// @desc    Get in-app notifications for active session (user matching + role matching)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get notifications for this specific user or general roles matching their role
    const notifications = await Notification.find({
      $or: [
        { userId: req.user._id },
        { recipientRole: req.user.role },
        { recipientRole: 'All' },
      ],
    }).sort({ createdAt: -1 });

    res.json({ data: notifications, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/notifications/mark-read
// @desc    Mark all unread notifications as read
// @access  Private
router.post('/mark-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { userId: req.user._id },
          { recipientRole: req.user.role },
          { recipientRole: 'All' },
        ],
        isRead: false,
      },
      { isRead: true }
    );

    res.json({ data: { message: 'All notifications marked as read' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
