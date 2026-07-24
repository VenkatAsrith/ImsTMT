const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Deal = require('../models/Deal');
const { protect, authorize } = require('../middleware/auth');
const { validateClient } = require('../middleware/validation');
const { logAudit } = require('../services/automationService');

// Helper to filter clients for Sales Reps if they only own specific deals
const filterForRole = async (req, queryObj) => {
  if (req.user.role === 'Sales Rep') {
    // Find all clients where this sales rep has deals
    const deals = await Deal.find({ assignedTo: req.user._id });
    const clientIds = deals.map((d) => d.clientId.toString());
    queryObj._id = { $in: clientIds };
  }
  return queryObj;
};

// @route   GET /api/clients
// @desc    Get all clients (paginated, sorted, searchable)
// @access  Private (Sales Rep, Super Admin)
router.get('/', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    let query = {};
    if (req.query.search) {
      query.$or = [
        { companyName: { $regex: req.query.search, $options: 'i' } },
        { industry: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // Filter by ownership for Sales Reps
    query = await filterForRole(req, query);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: {
        clients,
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

// @route   GET /api/clients/:id
// @desc    Get client by ID
// @access  Private (Sales Rep, Super Admin)
router.get('/:id', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ data: null, error: 'Client not found' });
    }

    // Role-based access validation
    if (req.user.role === 'Sales Rep') {
      const associatedDealsCount = await Deal.countDocuments({
        clientId: client._id,
        assignedTo: req.user._id,
      });
      // If client exists but no active deals assigned to this rep, deny unless the rep created the client
      if (associatedDealsCount === 0) {
        return res.status(403).json({
          data: null,
          error: 'Access denied: You do not have active deals for this client.',
        });
      }
    }

    res.json({ data: client, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/clients
// @desc    Create client profile
// @access  Private (Sales Rep, Super Admin)
router.post('/', protect, authorize('Sales Rep', 'Super Admin'), validateClient, async (req, res) => {
  try {
    const client = await Client.create(req.body);

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE',
      entity: 'Client',
      entityId: client._id.toString(),
      details: `Created B2B client: ${client.companyName}`,
    });

    res.status(201).json({ data: client, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client profile
// @access  Private (Sales Rep, Super Admin)
router.put('/:id', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ data: null, error: 'Client not found' });
    }

    const oldValues = client.toObject();

    const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Client',
      entityId: updatedClient._id.toString(),
      details: `Updated client profile for: ${updatedClient.companyName}`,
      oldValues,
      newValues: updatedClient.toObject(),
    });

    res.json({ data: updatedClient, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Remove client profile
// @access  Private (Super Admin)
router.delete('/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ data: null, error: 'Client not found' });
    }

    await Client.findByIdAndDelete(req.params.id);

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE',
      entity: 'Client',
      entityId: req.params.id,
      details: `Deleted client company: ${client.companyName}`,
      oldValues: client.toObject(),
    });

    res.json({ data: { message: 'Client deleted successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/clients/:id/contacts
// @desc    Add contact to client company
// @access  Private (Sales Rep, Super Admin)
router.post('/:id/contacts', protect, authorize('Sales Rep', 'Super Admin'), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) {
      return res.status(400).json({ data: null, error: 'Contact name is required' });
    }

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ data: null, error: 'Client not found' });
    }

    client.contacts.push({ name, email, phone });
    await client.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE',
      entity: 'Client',
      entityId: client._id.toString(),
      details: `Added new contact "${name}" to client ${client.companyName}`,
    });

    res.json({ data: client, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
