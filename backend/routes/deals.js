const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Client = require('../models/Client');
const { protect, authorize } = require('../middleware/auth');
const { sendInAppNotification } = require('../services/notificationService');
const { logAudit } = require('../services/automationService');

// Map default probability based on stage
const getDefaultProbability = (stage) => {
  switch (stage) {
    case 'New': return 10;
    case 'Contacted': return 25;
    case 'Proposal Sent': return 50;
    case 'Negotiation': return 75;
    case 'Closed Won': return 100;
    case 'Closed Lost': return 0;
    default: return 10;
  }
};

// @route   GET /api/deals
// @desc    Get deals list (supports pipeline filtering)
// @access  Private (Sales Rep, Super Admin)
router.get('/', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'Sales Rep') {
      filter.assignedTo = req.user._id;
    }
    if (req.query.stage) {
      filter.stage = req.query.stage;
    }

    const deals = await Deal.find(filter)
      .populate('clientId', 'companyName industry healthScore rating')
      .populate('assignedTo', 'name email role')
      .sort({ updatedAt: -1 });

    res.json({ data: deals, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/deals
// @desc    Create new sales deal
// @access  Private (Sales Rep, Super Admin)
router.post('/', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    const { clientId, dealName, amount, assignedTo, stage, tags } = req.body;

    if (!clientId || !dealName || !amount) {
      return res.status(400).json({ data: null, error: 'Client, deal name, and amount are required' });
    }

    const currentStage = stage || 'New';
    const probability = getDefaultProbability(currentStage);

    const deal = await Deal.create({
      clientId,
      dealName,
      amount,
      assignedTo: assignedTo || req.user._id,
      stage: currentStage,
      probability,
      tags: tags || [],
      stageHistory: [{ stage: currentStage }],
    });

    // CRM health update
    const client = await Client.findById(clientId);
    if (client) {
      client.healthScore = Math.min(100, client.healthScore + 5);
      await client.save();
    }

    // Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE',
      entity: 'Deal',
      entityId: deal._id.toString(),
      details: `Created deal "${dealName}" ($${amount}) for client: ${client ? client.companyName : clientId}`,
    });

    res.status(201).json({ data: deal, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/deals/:id
// @desc    Update deal or change pipeline stage
// @access  Private (Sales Rep, Super Admin)
router.put('/:id', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ data: null, error: 'Deal not found' });
    }

    // Access check for Sales Rep
    if (req.user.role === 'Sales Rep' && deal.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ data: null, error: 'Not authorized to edit this deal' });
    }

    const oldValues = deal.toObject();
    const { stage, reason, nextFollowUp } = req.body;

    // Check if stage is changing
    if (stage && stage !== deal.stage) {
      deal.stage = stage;
      deal.probability = getDefaultProbability(stage);
      
      // Log stage history
      deal.stageHistory.push({
        stage,
        reason: reason || '',
      });

      // Automation side effects
      if (stage === 'Proposal Sent') {
        // Schedule follow-up alert in 3 days
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 3);
        deal.nextFollowUp = reminderDate;

        await sendInAppNotification({
          userId: deal.assignedTo,
          title: 'Proposal Follow-up Scheduled',
          message: `Deal "${deal.dealName}" has been moved to "Proposal Sent". A follow-up task is scheduled for ${reminderDate.toLocaleDateString()}.`,
          type: 'Info',
          link: `/marketing/pipeline`,
        });
      }

      if (stage === 'Closed Won') {
        const client = await Client.findById(deal.clientId);
        if (client) {
          client.healthScore = 100; // Client is extremely happy / active
          if (!client.tags.includes('Customer')) client.tags.push('Customer');
          await client.save();
        }

        await sendInAppNotification({
          recipientRole: 'Super Admin',
          title: 'Deal WON! 🎉',
          message: `Sales Rep ${req.user.name} won deal "${deal.dealName}" worth $${deal.amount.toFixed(2)}!`,
          type: 'Success',
          link: `/marketing/pipeline`,
        });
      }

      if (stage === 'Closed Lost') {
        const client = await Client.findById(deal.clientId);
        if (client) {
          client.healthScore = Math.max(20, client.healthScore - 20); // health score drop
          await client.save();
        }
      }
    }

    // Apply other updates
    const allowedFields = ['dealName', 'amount', 'currency', 'assignedTo', 'tags', 'nextFollowUp', 'probability'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        deal[field] = req.body[field];
      }
    });

    await deal.save();
    const updatedDeal = await Deal.findById(deal._id)
      .populate('clientId', 'companyName')
      .populate('assignedTo', 'name');

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Deal',
      entityId: deal._id.toString(),
      details: `Updated deal "${deal.dealName}". Stage is now "${deal.stage}".`,
      oldValues,
      newValues: deal.toObject(),
    });

    res.json({ data: updatedDeal, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/deals/:id
// @desc    Delete deal
// @access  Private (Super Admin)
router.delete('/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ data: null, error: 'Deal not found' });
    }

    await Deal.findByIdAndDelete(req.params.id);

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE',
      entity: 'Deal',
      entityId: req.params.id,
      details: `Deleted deal "${deal.dealName}"`,
      oldValues: deal.toObject(),
    });

    res.json({ data: { message: 'Deal deleted successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
