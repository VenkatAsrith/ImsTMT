const StudentAuditLog = require('../models/StudentAuditLog');

/**
 * Logs a student audit timeline event to the database.
 * 
 * @param {string} studentId Mongoose ObjectId of the student
 * @param {string} action Action type enum value
 * @param {string} details Description of what occurred
 * @param {string} performedBy Full name of the user triggering the action
 */
const logStudentAudit = async (studentId, action, details, performedBy) => {
  try {
    const log = await StudentAuditLog.create({
      studentId,
      action,
      details,
      performedBy: performedBy || 'System Scheduler',
    });
    console.log(`📝 [Student Audit] Logged "${action}" for student ${studentId}: ${details}`);
    return log;
  } catch (err) {
    console.error('❌ Failed to create student audit log:', err.message);
  }
};

module.exports = {
  logStudentAudit,
};
