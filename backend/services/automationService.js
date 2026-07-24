const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Deal = require('../models/Deal');
const Client = require('../models/Client');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendInAppNotification, sendEmail } = require('./notificationService');

// Helper to record audit logs
const logAudit = async ({ userId, userName, action, entity, entityId, details, oldValues, newValues }) => {
  try {
    await AuditLog.create({
      userId,
      userName,
      action,
      entity,
      entityId,
      details,
      oldValues,
      newValues,
    });
  } catch (error) {
    console.error('Error logging audit activity:', error.message);
  }
};

// Main daily automation runner
const runDailyAutomation = async (triggeringUser = { _id: '000000000000000000000000', name: 'System Scheduler' }) => {
  console.log('🤖 Running Daily Automations...');
  const logs = [];

  try {
    const today = new Date();
    
    // 1. Payment Reminders (due in 3 days) and Overdue status sweeps
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    const startOfThreeDays = new Date(threeDaysFromNow.setHours(0, 0, 0, 0));
    const endOfThreeDays = new Date(threeDaysFromNow.setHours(23, 59, 59, 999));

    // A. Pending Payments due in 3 days
    const upcomingPayments = await Payment.find({
      status: 'Due',
      dueDate: { $gte: startOfThreeDays, $lte: endOfThreeDays },
    }).populate('studentId');

    for (const payment of upcomingPayments) {
      if (payment.studentId) {
        const message = `Hello ${payment.studentId.name}, a payment of Rs. ${payment.amount.toLocaleString()} is due in 3 days (Reference: ${payment.referenceNumber}).`;
        
        // Notification to student
        await sendEmail({
          to: payment.studentId.email,
          subject: 'Payment Reminder - Techmecha Torque',
          html: `<p>${message}</p><p>Please settle the dues by ${new Date(payment.dueDate).toLocaleDateString()}.</p>`,
        });

        // In-app alert to staff
        await sendInAppNotification({
          recipientRole: 'Finance',
          title: 'Upcoming Student Payment Due',
          message: `Payment of Rs. ${payment.amount.toLocaleString()} for ${payment.studentId.name} is due in 3 days.`,
          type: 'Info',
          link: `/learning/payments`,
        });

        logs.push(`Sent 3-day payment warning for student: ${payment.studentId.name}`);
      }
    }

    // B. Mark overdue payments
    const overduePayments = await Payment.find({
      status: 'Due',
      dueDate: { $lt: today },
    }).populate('studentId');

    for (const payment of overduePayments) {
      payment.status = 'Overdue';
      await payment.save();

      if (payment.studentId) {
        // Red flag student onboarding card / alert staff
        payment.studentId.outstandingBalance += payment.amount;
        await payment.studentId.save();

        const message = `URGENT: Payment of Rs. ${payment.amount.toLocaleString()} for ${payment.studentId.name} is now OVERDUE.`;

        await sendInAppNotification({
          recipientRole: 'Finance',
          title: 'Payment OVERDUE Alert',
          message,
          type: 'Warning',
          link: `/learning/payments`,
        });

        await sendEmail({
          to: payment.studentId.email,
          subject: 'URGENT: Payment Overdue - Techmecha Torque',
          html: `<p>Dear ${payment.studentId.name}, your payment of Rs. ${payment.amount.toLocaleString()} was due on ${new Date(payment.dueDate).toLocaleDateString()}. Please complete the payment immediately to avoid suspension of services.</p>`,
        });

        logs.push(`Flagged payment ${payment.referenceNumber} as OVERDUE`);
      }
    }

    // C. Escalate overdue payments (>1 day overdue)
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const longOverduePayments = await Payment.find({
      status: 'Overdue',
      dueDate: { $lt: yesterday },
    }).populate('studentId');

    for (const payment of longOverduePayments) {
      if (payment.studentId) {
        await sendInAppNotification({
          recipientRole: 'Super Admin',
          title: 'CRITICAL: Unpaid Fee Escalation',
          message: `Payment of Rs. ${payment.amount.toLocaleString()} for ${payment.studentId.name} is more than 1 day overdue. Direct intervention recommended.`,
          type: 'Alert',
          link: `/learning/payments`,
        });

        logs.push(`Escalated unpaid fee for ${payment.studentId.name} to Admin`);
      }
    }

    // 2. Client follow-up alerts (missed/passed follow-up dates)
    const missedDeals = await Deal.find({
      stage: { $nin: ['Closed Won', 'Closed Lost'] },
      nextFollowUp: { $lt: today },
    }).populate('assignedTo clientId');

    for (const deal of missedDeals) {
      if (deal.assignedTo) {
        await sendInAppNotification({
          userId: deal.assignedTo._id,
          title: 'Missed Follow-up Task',
          message: `The follow-up date for deal "${deal.dealName}" has passed. Please contact "${deal.clientId ? deal.clientId.companyName : 'Client'}" immediately.`,
          type: 'Warning',
          link: `/marketing/pipeline`,
        });

        logs.push(`Notified salesperson ${deal.assignedTo.name} of missed follow-up on deal: ${deal.dealName}`);
      }
    }

    // 3. Stale lead check: Clients idle for > 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Find active deals updated recently
    const activeDeals = await Deal.find({ updatedAt: { $gte: thirtyDaysAgo } });
    const activeClientIds = activeDeals.map(d => d.clientId.toString());

    // Find clients created/modified more than 30 days ago and have no active deal activities
    const staleClients = await Client.find({
      createdAt: { $lt: thirtyDaysAgo },
      _id: { $nin: activeClientIds },
      tags: { $ne: 'Stale' },
    });

    if (staleClients.length > 0) {
      // Find a manager or admin to assign to
      const manager = await User.findOne({ role: 'Super Admin' });

      for (const client of staleClients) {
        client.tags.push('Stale');
        client.healthScore = Math.max(10, client.healthScore - 30); // Reduce CRM health score
        await client.save();

        if (manager) {
          await sendInAppNotification({
            userId: manager._id,
            title: 'Stale Account Re-assignment',
            message: `Account "${client.companyName}" has been idle for > 30 days. Auto-assigned to manager for review.`,
            type: 'Info',
            link: `/marketing/clients/${client._id}`,
          });

          await logAudit({
            userId: triggeringUser._id,
            userName: triggeringUser.name,
            action: 'UPDATE',
            entity: 'Client',
            entityId: client._id.toString(),
            details: `Marked client ${client.companyName} as Stale due to inactivity.`,
          });
        }
        logs.push(`Flagged client ${client.companyName} as Stale and reduced health score`);
      }
    }

    console.log('✅ Daily automation routine completed successfully');
  } catch (error) {
    console.error('❌ Daily automation routine error:', error.message);
    logs.push(`Automation error: ${error.message}`);
  }

  return logs;
};

module.exports = {
  logAudit,
  runDailyAutomation,
};
