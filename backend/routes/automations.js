const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { runDailyAutomation } = require('../services/automationService');
const { getSandboxLogs, clearSandboxLogs } = require('../services/notificationService');
const AuditLog = require('../models/AuditLog');

// @route   POST /api/automations/run
// @desc    Manually run background cron check rules (overdue bills, stale clients, missed follow-ups)
// @access  Private (Super Admin)
router.post('/run', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const logs = await runDailyAutomation(req.user);
    res.json({ data: { message: 'Daily automations triggered successfully', logs }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/automations/sandbox-logs
// @desc    Fetch custom email and WhatsApp simulation logs for local testing sandbox
// @access  Private (Super Admin, Finance, Sales Rep)
router.get('/sandbox-logs', protect, async (req, res) => {
  try {
    const logs = getSandboxLogs();
    res.json({ data: logs, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/automations/sandbox-logs
// @desc    Clear sandbox simulation logs
// @access  Private (Super Admin)
router.delete('/sandbox-logs', protect, authorize('Super Admin'), async (req, res) => {
  try {
    clearSandboxLogs();
    res.json({ data: { message: 'Simulation sandbox logs cleared' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/automations/audits
// @desc    Fetch audit log activity stream for corporate compliance
// @access  Private (Super Admin, HR Manager)
router.get('/audits', protect, authorize('Super Admin', 'HR Manager'), async (req, res) => {
  try {
    const audits = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(100);
    res.json({ data: audits, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
