const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Receipt = require('../models/Receipt');
const Course = require('../models/Course');
const FinancialAccount = require('../models/FinancialAccount');
const { protect, authorize } = require('../middleware/auth');
const { generateReceiptPDF } = require('../services/pdfService');
const { sendWhatsApp, sendEmail, sendInAppNotification } = require('../services/notificationService');
const { logAudit } = require('../services/automationService');

// Helper to generate and ensure an Invoice PDF is uploaded for an unpaid bill
const ensureInvoicePDF = async (payment, student, req) => {
  if (payment.invoicePdfUrl) return payment.invoicePdfUrl;
  
  try {
    const financialAccount = await FinancialAccount.findOne({ studentId: student._id }) || {
      agreedAmount: payment.amount,
      balanceAmount: payment.amount
    };
    
    const enrolledCourseIds = student.coursesTaken.map((c) => c.courseId);
    const courses = await Course.find({ _id: { $in: enrolledCourseIds } });
    
    const { generateInvoicePDF } = require('../services/pdfService');
    const { filePath, publicUrl } = await generateInvoicePDF(payment, student, financialAccount, courses);
    
    const { isCloudConfigured } = require('../services/supabaseService');
    if (isCloudConfigured() && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('⚠️ Failed to delete local temp invoice PDF:', unlinkErr.message);
      }
    }
    
    payment.invoicePdfUrl = publicUrl;
    await payment.save();
    return publicUrl;
  } catch (err) {
    console.error('❌ Failed to ensure invoice PDF:', err.message);
    return null;
  }
};

// Helper function to settle a payment transaction
const settlePaymentInDb = async ({ paymentId, method, referenceNumber, amount, performedBy, protocol, host }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.status === 'Paid') throw new Error('Payment is already marked as Paid');

  const student = await Student.findById(payment.studentId);
  if (!student) throw new Error('Associated student profile not found');

  let financialAccount = await FinancialAccount.findOne({ studentId: student._id });
  if (!financialAccount) {
    financialAccount = await FinancialAccount.create({
      studentId: student._id,
      courseFee: payment.amount,
      scholarshipAmount: 0,
      agreedAmount: payment.amount,
      totalPaid: 0,
      balanceAmount: payment.amount,
      paymentStatus: 'Fee Pending',
    });
    student.financialAccount = financialAccount._id;
    await student.save();
  }

  const payAmount = parseFloat(amount) || payment.amount;

  // Capture payment details
  payment.status = 'Paid';
  payment.paidDate = new Date();
  payment.method = method;
  payment.amount = payAmount;
  if (referenceNumber) {
    payment.referenceNumber = referenceNumber;
  }
  await payment.save();

  // Update Financial Account
  financialAccount.totalPaid += payAmount;
  await financialAccount.save();

  // Progress onboarding pipeline stage
  if (financialAccount.balanceAmount <= 0) {
    student.onboardingStage = 'Paid';
  } else {
    student.onboardingStage = 'Partially Paid';
  }
  
  if (!student.financialAccount) {
    student.financialAccount = financialAccount._id;
  }
  await student.save();

  // Fetch student's current enrolled course titles for PDF receipt
  const enrolledCourseIds = student.coursesTaken.map((c) => c.courseId);
  const courses = await Course.find({ _id: { $in: enrolledCourseIds } });

  // Generate daily sequence receipt number (IST: UTC+5:30)
  const localNow = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const localTime = new Date(localNow.getTime() + offset);
  
  const yearStr = String(localTime.getUTCFullYear()).slice(-2);
  const monthStr = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(localTime.getUTCDate()).padStart(2, '0');
  const datePrefix = `${yearStr}${monthStr}${dayStr}`;

  const startOfDayUTC = new Date(Date.UTC(
    localTime.getUTCFullYear(),
    localTime.getUTCMonth(),
    localTime.getUTCDate(),
    0, 0, 0, 0
  ));
  startOfDayUTC.setTime(startOfDayUTC.getTime() - offset);
  const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

  const todayReceiptsCount = await Receipt.countDocuments({
    createdAt: {
      $gte: startOfDayUTC,
      $lte: endOfDayUTC
    }
  });

  const seq = String(todayReceiptsCount + 1).padStart(2, '0');
  const receiptNumber = `${datePrefix}${seq}`;

  // Generate PDF receipt locally
  const { filePath, publicUrl } = await generateReceiptPDF(payment, student, financialAccount, receiptNumber, courses);

  // Save Receipt metadata in DB
  const receipt = await Receipt.create({
    paymentId: payment._id,
    receiptNumber,
    pdfUrl: publicUrl,
  });

  // Send WhatsApp (Simulate or dispatch Twilio Sandbox with PDF Link)
  const fullReceiptUrl = `${protocol}://${host}${publicUrl}`;

  const whatsappBody = `🧾 *TECHMECHA TORQUE PVT. LTD.*\n*TMT Payment Confirmation*\n\nDear ${student.name},\n\nThank you for your payment of *₹${payAmount.toLocaleString('en-IN')}* towards your learning program.\n\n📋 *Transaction Details:*\n• Reference: ${payment.referenceNumber}\n• Receipt No: ${receiptNumber}\n• Amount Paid: ₹${payAmount.toLocaleString('en-IN')}\n• Payment Method: ${payment.method}\n• Date: ${new Date().toLocaleDateString('en-IN')}\n• Outstanding Balance: ₹${(financialAccount.balanceAmount || 0).toLocaleString('en-IN')}\n\n📄 *Download Receipt:*\n${fullReceiptUrl}\n\nFor queries contact: team@techmechatorque.com\nPh: +91 7993442607\n\n— TMT Finance Team`;
  await sendWhatsApp({
    to: student.phone,
    body: whatsappBody,
    mediaUrl: fullReceiptUrl,
  });

  // Send Email notification copy with local PDF attachment
  const emailSubject = `Payment Receipt Confirmation - Techmecha Torque (Ref: ${receiptNumber})`;
  const emailHtml = `
    <h3>Dear ${student.name},</h3>
    <p>Thank you for your payment. We have successfully recorded your payment of <b>₹${payAmount.toLocaleString('en-IN')}</b>.</p>
    <p><b>Transaction Reference:</b> ${payment.referenceNumber}</p>
    <p>Your receipt (Number: <b>${receiptNumber}</b>) is attached to this email. You can also view it online: <a href="${fullReceiptUrl}" target="_blank">View Receipt</a>.</p>
    <br/>
    <p>Best regards,<br/>TMT Finance Team</p>
  `;

  await sendEmail({
    to: student.email,
    subject: emailSubject,
    html: emailHtml,
    attachments: [
      {
        filename: `Receipt_${receiptNumber}.pdf`,
        path: filePath,
      },
    ],
  });
  
  // Clean up local temp file after sending email
  const { isCloudConfigured } = require('../services/supabaseService');
  if (isCloudConfigured() && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted local temporary PDF at ${filePath}`);
    } catch (unlinkErr) {
      console.warn(`⚠️ Failed to clean up local receipt PDF:`, unlinkErr.message);
    }
  }

  // Track Student Audit Logs
  const { logStudentAudit } = require('../services/auditService');
  await logStudentAudit(
    student._id,
    'Payment Added',
    `Settled payment invoice ${payment.referenceNumber} (Captured ₹${payAmount.toLocaleString('en-IN')} via ${method})`,
    performedBy
  );
  await logStudentAudit(
    student._id,
    'Receipt Sent',
    `Generated receipt number: ${receiptNumber} and dispatched notifications.`,
    performedBy
  );

  // Log Audit
  await logAudit({
    userId: null,
    userName: performedBy,
    action: 'UPDATE',
    entity: 'Payment',
    entityId: payment._id.toString(),
    details: `Marked payment invoice ${payment.referenceNumber} as Paid. Generated Receipt: ${receiptNumber}`,
  });

  // Create in-app alert for payment capture success
  await sendInAppNotification({
    recipientRole: 'Finance',
    title: 'Payment Received',
    message: `Captured ₹${payAmount.toFixed(2)} from ${student.name}. Receipt ${receiptNumber} generated.`,
    type: 'Success',
    link: `/learning/payments`,
  });

  return { payment, receipt, financialAccount, receiptUrl: publicUrl };
};

// @route   GET /api/payments
// @desc    Get all payment bills (sorted by due date, filter by status)
// @access  Private (Finance, Super Admin)
router.get('/', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.studentId) {
      query.studentId = req.query.studentId;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'studentId',
        populate: { path: 'financialAccount' }
      })
      .sort({ dueDate: 1 });

    res.json({ data: payments, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/payments
// @desc    Create a payment invoice or capture a paid transaction for a student
// @access  Private (Finance, Super Admin)
router.post('/', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const { studentId, amount, dueDate, referenceNumber, method } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({ data: null, error: 'Student ID and amount are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    let financialAccount = await FinancialAccount.findOne({ studentId });
    if (!financialAccount) {
      // Auto-create default account if missing
      financialAccount = await FinancialAccount.create({
        studentId: student._id,
        courseFee: amount,
        scholarshipAmount: 0,
        agreedAmount: amount,
        totalPaid: 0,
        balanceAmount: amount,
        paymentStatus: 'Fee Pending',
      });
      student.financialAccount = financialAccount._id;
      await student.save();
    }

    const ref = referenceNumber || `TXN-${Date.now().toString().substring(5)}`;

    if (method && method !== 'None') {
      // Record direct payment transaction (Paid)
      const payment = await Payment.create({
        studentId,
        amount,
        dueDate: dueDate || new Date(),
        paidDate: new Date(),
        method,
        status: 'Paid',
        referenceNumber: ref,
      });

      // Update Financial Account
      financialAccount.totalPaid += amount;
      await financialAccount.save(); // pre-save will update balanceAmount & paymentStatus

      // Auto-transition onboardingStage based on balanceAmount
      if (financialAccount.balanceAmount <= 0) {
        student.onboardingStage = 'Paid';
      } else {
        student.onboardingStage = 'Partially Paid';
      }
      
      if (!student.financialAccount) {
        student.financialAccount = financialAccount._id;
      }
      await student.save();

      // Fetch student's current enrolled course titles for PDF receipt
      const enrolledCourseIds = student.coursesTaken.map((c) => c.courseId);
      const courses = await Course.find({ _id: { $in: enrolledCourseIds } });

      // Generate sequence receipt number (IST: UTC+5:30)
      const localNow = new Date();
      const offset = 5.5 * 60 * 60 * 1000;
      const localTime = new Date(localNow.getTime() + offset);
      
      const yearStr = String(localTime.getUTCFullYear()).slice(-2);
      const monthStr = String(localTime.getUTCMonth() + 1).padStart(2, '0');
      const dayStr = String(localTime.getUTCDate()).padStart(2, '0');
      const datePrefix = `${yearStr}${monthStr}${dayStr}`;

      const startOfDayUTC = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        localTime.getUTCDate(),
        0, 0, 0, 0
      ));
      startOfDayUTC.setTime(startOfDayUTC.getTime() - offset);
      const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

      const todayReceiptsCount = await Receipt.countDocuments({
        createdAt: {
          $gte: startOfDayUTC,
          $lte: endOfDayUTC
        }
      });

      const seq = String(todayReceiptsCount + 1).padStart(2, '0');
      const receiptNumber = `${datePrefix}${seq}`;

      // Generate PDF receipt locally
      const { filePath, publicUrl } = await generateReceiptPDF(payment, student, financialAccount, receiptNumber, courses);

      // Save Receipt metadata in DB
      const receipt = await Receipt.create({
        paymentId: payment._id,
        receiptNumber,
        pdfUrl: publicUrl,
      });

      // Send WhatsApp (Simulate or dispatch Twilio Sandbox with PDF Link)
      const host = req.get('host');
      const protocol = req.protocol;
      const fullReceiptUrl = `${protocol}://${host}${publicUrl}`;

      const whatsappBody = `🧾 *TECHMECHA TORQUE PVT. LTD.*\n*TMT Payment Confirmation*\n\nDear ${student.name},\n\nThank you for your payment of *₹${payment.amount.toLocaleString('en-IN')}* towards your learning program.\n\n📋 *Transaction Details:*\n• Reference: ${ref}\n• Receipt No: ${receiptNumber}\n• Amount Paid: ₹${payment.amount.toLocaleString('en-IN')}\n• Payment Method: ${payment.method}\n• Date: ${new Date().toLocaleDateString('en-IN')}\n• Outstanding Balance: ₹${(financialAccount.balanceAmount || 0).toLocaleString('en-IN')}\n\n📄 *Download Receipt:*\n${fullReceiptUrl}\n\nFor queries contact: team@techmechatorque.com\nPh: +91 7993442607\n\n— TMT Finance Team`;
      await sendWhatsApp({
        to: student.phone,
        body: whatsappBody,
        mediaUrl: fullReceiptUrl,
      });

      // Send Email notification copy with local PDF attachment
      const emailSubject = `Payment Receipt Confirmation - Techmecha Torque (Ref: ${receiptNumber})`;
      const emailHtml = `
        <h3>Dear ${student.name},</h3>
        <p>Thank you for your payment. We have successfully recorded your payment of <b>₹${payment.amount.toLocaleString('en-IN')}</b>.</p>
        <p><b>Transaction Reference:</b> ${ref}</p>
        <p>Your receipt (Number: <b>${receiptNumber}</b>) is attached to this email. You can also view it online: <a href="${fullReceiptUrl}" target="_blank">View Receipt</a>.</p>
        <br/>
        <p>Best regards,<br/>TMT Finance Team</p>
      `;

      await sendEmail({
        to: student.email,
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            filename: `Receipt_${receiptNumber}.pdf`,
            path: filePath,
          },
        ],
      });
      
      // Clean up local temp file after sending email
      const { isCloudConfigured } = require('../services/supabaseService');
      if (isCloudConfigured() && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted local temporary PDF at ${filePath}`);
        } catch (unlinkErr) {
          console.warn(`⚠️ Failed to clean up local receipt PDF:`, unlinkErr.message);
        }
      }

      
      // Track Student Audit Logs
      const { logStudentAudit } = require('../services/auditService');
      await logStudentAudit(
        student._id,
        'Payment Added',
        `Recorded tuition payment capture of ₹${payment.amount.toLocaleString('en-IN')} via ${payment.method} (Ref: ${ref})`,
        req.user.name
      );
      await logStudentAudit(
        student._id,
        'Receipt Sent',
        `Generated receipt number: ${receiptNumber} and dispatched notifications.`,
        req.user.name
      );

      // Log Audit
      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        action: 'UPDATE',
        entity: 'Payment',
        entityId: payment._id.toString(),
        details: `Recorded payment transaction of ₹${amount} for student ${student.name}. Receipt generated: ${receiptNumber}`,
      });

      // Create in-app alert
      await sendInAppNotification({
        recipientRole: 'Finance',
        title: 'Payment Received',
        message: `Captured ₹${amount.toFixed(2)} from ${student.name}. Receipt ${receiptNumber} generated.`,
        type: 'Success',
        link: `/learning/payments`,
      });

      res.status(201).json({
        data: {
          payment,
          receipt,
          financialAccount,
        },
        error: null,
      });
    } else {
      // Create invoice bill (Due)
      const payment = await Payment.create({
        studentId,
        amount,
        dueDate: dueDate || new Date(),
        status: 'Due',
        referenceNumber: ref,
      });

      // Update student stage to Registered if Inquiry
      if (student.onboardingStage === 'Inquiry Received') {
        student.onboardingStage = 'Registered';
        await student.save();
      }

      // Generate invoice PDF
      await ensureInvoicePDF(payment, student, req);

      // Track Student Audit Log
      const { logStudentAudit } = require('../services/auditService');
      await logStudentAudit(
        student._id,
        'Invoice Generated',
        `Invoice reference ${ref} generated for ₹${amount.toLocaleString('en-IN')} (Due: ${new Date(dueDate || new Date()).toLocaleDateString()})`,
        req.user.name
      );

      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment._id.toString(),
        details: `Generated payment invoice of ₹${amount} (Due: ${new Date(dueDate || new Date()).toLocaleDateString()}) for student ${student.name}`,
      });

      res.status(201).json({ data: payment, error: null });
    }
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   PUT /api/payments/:id/pay
// @desc    Record/Capture payment (marks Paid, generates PDF, dispatches WhatsApp/Email)
// @access  Private (Finance, Super Admin)
router.put('/:id/pay', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const { method, referenceNumber, amount } = req.body;
    
    if (!method) {
      return res.status(400).json({ data: null, error: 'Payment method is required' });
    }

    const result = await settlePaymentInDb({
      paymentId: req.params.id,
      method,
      referenceNumber,
      amount,
      performedBy: req.user.name,
      protocol: req.protocol,
      host: req.get('host')
    });

    res.json({
      data: {
        payment: result.payment,
        receipt: result.receipt,
        receiptUrl: result.receiptUrl,
      },
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/payments/whatsapp/send-mock
// @desc    Mock WhatsApp send trigger (logs in sandbox and calls Twilio simulation)
// @access  Private
router.post('/whatsapp/send-mock', protect, async (req, res) => {
  try {
    const { to, body, mediaUrl } = req.body;
    if (!to || !body) {
      return res.status(400).json({ data: null, error: 'Recipient phone and message body are required' });
    }

    await sendWhatsApp({
      to,
      body,
      mediaUrl: mediaUrl ? `${req.protocol}://${req.get('host')}${mediaUrl}` : undefined,
    });

    res.json({ data: { message: 'WhatsApp message sent successfully in simulation' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   DELETE /api/payments/:id
// @desc    Delete invoice payment transaction (cascades balance recalculation & receipt deletion)
// @access  Private (Finance, Super Admin)
router.delete('/:id', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ data: null, error: 'Payment not found' });
    }

    const studentId = payment.studentId;
    const paymentAmount = payment.amount;
    const isPaid = payment.status === 'Paid';

    // 1. If payment is paid, adjust Financial Account totalPaid
    let financialAccount = await FinancialAccount.findOne({ studentId });
    if (financialAccount && isPaid) {
      financialAccount.totalPaid = Math.max(0, financialAccount.totalPaid - paymentAmount);
      await financialAccount.save(); // pre-save will automatically update balanceAmount & paymentStatus
    }

    // 2. Adjust Student onboarding stage if financial account exists
    const student = await Student.findById(studentId);
    if (student && financialAccount) {
      if (financialAccount.balanceAmount <= 0) {
        student.onboardingStage = 'Paid';
      } else if (financialAccount.totalPaid > 0) {
        student.onboardingStage = 'Partially Paid';
      } else {
        student.onboardingStage = 'Fee Pending';
      }
      await student.save();
    }

    // 3. Find and delete associated Receipt document & physical PDF
    const receipt = await Receipt.findOne({ paymentId: req.params.id });
    if (receipt) {
      if (receipt.pdfUrl) {
        const filePath = path.join(__dirname, '..', receipt.pdfUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete receipt PDF at ${filePath}:`, err);
          }
        }
      }
      await Receipt.deleteOne({ _id: receipt._id });
    }

    // 4. Delete the actual payment document
    await Payment.findByIdAndDelete(req.params.id);

    // 5. Track Audit Log
    const studentName = student ? student.name : 'Unknown';
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE',
      entity: 'Payment',
      entityId: req.params.id,
      details: `Deleted payment invoice reference ${payment.referenceNumber} for student ${studentName} (Amount: ₹${paymentAmount})`,
    });

    res.json({ data: { message: 'Payment invoice removed successfully' }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/payments/:id/share
// @desc    Generate Razorpay link, QR code, and WhatsApp message for sharing
// @access  Private (Finance, Super Admin)
router.get('/:id/share', protect, authorize('Finance', 'Super Admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ data: null, error: 'Payment not found' });
    }

    const student = await Student.findById(payment.studentId);
    if (!student) {
      return res.status(404).json({ data: null, error: 'Student not found' });
    }

    if (payment.status === 'Paid') {
      return res.status(400).json({ data: null, error: 'Invoice has already been Paid and settled.' });
    }

    // Ensure Invoice PDF exists
    await ensureInvoicePDF(payment, student, req);

    // Ensure Razorpay/Mock Payment Link is generated
    if (!payment.razorpayPaymentLink) {
      const { createPaymentLink } = require('../services/razorpayService');
      const linkData = await createPaymentLink(payment, student, req);
      
      payment.razorpayPaymentLinkId = linkData.id;
      payment.razorpayPaymentLink = linkData.short_url;
      payment.razorpayPaymentLinkStatus = linkData.status;
      await payment.save();
    }

    // Generate base64 QR Code
    const QRCode = require('qrcode');
    const qrCodeDataUri = await QRCode.toDataURL(payment.razorpayPaymentLink);

    // Construct WhatsApp message template
    const invoicePdfUrl = payment.invoicePdfUrl ? (payment.invoicePdfUrl.startsWith('http') ? payment.invoicePdfUrl : `${req.protocol}://${req.get('host')}${payment.invoicePdfUrl}`) : '';
    const whatsappMessage = `🧾 *TECHMECHA TORQUE PVT. LTD.*\n*TMT Fee Invoice Issued*\n\nDear ${student.name},\n\nAn invoice has been generated for your learning program.\n\n📋 *Invoice Details:*\n• Reference: ${payment.referenceNumber}\n• Amount Due: ₹${payment.amount.toLocaleString('en-IN')}\n• Due Date: ${new Date(payment.dueDate).toLocaleDateString('en-IN')}\n\n📄 *Download Invoice PDF:*\n${invoicePdfUrl}\n\n🔗 *Secure Razorpay Link:*\n${payment.razorpayPaymentLink}\n\nScan the QR code or click the link above to complete your payment securely.\n\nFor queries contact: team@techmechatorque.com\nPh: +91 7993442607\n\n— TMT Finance Team`;

    res.json({
      data: {
        paymentLink: payment.razorpayPaymentLink,
        qrCode: qrCodeDataUri,
        whatsappMessage,
        invoicePdfUrl: payment.invoicePdfUrl,
        phone: student.phone,
        amount: payment.amount,
        studentName: student.name,
        referenceNumber: payment.referenceNumber,
        dueDate: new Date(payment.dueDate).toLocaleDateString('en-IN')
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/payments/razorpay-mock/pay/:id
// @desc    Simulated checkout page for local testing
// @access  Public
router.get('/razorpay-mock/pay/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).send('<h1>Invoice Not Found</h1>');
    }

    const student = await Student.findById(payment.studentId);
    if (!student) {
      return res.status(404).send('<h1>Student Profile Not Found</h1>');
    }

    if (payment.status === 'Paid') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Razorpay Payment Checkout</title>
          <style>
            body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; text-align: center; max-width: 480px; backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #10b981; margin-bottom: 12px; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
            .btn { background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 24px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.2s; }
            .btn:hover { background: #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Payment Already Settled</h2>
            <p>Invoice <strong>${payment.referenceNumber}</strong> has already been paid successfully. No further action is required.</p>
            <a href="#" onclick="window.close()" class="btn">Close Window</a>
          </div>
        </body>
        </html>
      `);
    }

    // Render Checkout
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Razorpay Secure checkout</title>
        <style>
          body {
            background: linear-gradient(135deg, #0b0f19 0%, #1e1b4b 100%);
            color: #f8fafc;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .card {
            background: rgba(17, 24, 39, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 32px;
            width: 100%;
            max-width: 440px;
            backdrop-filter: blur(16px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
          }
          .logo-text {
            color: #e11d48;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 1px;
            margin: 0;
          }
          .tagline {
            color: #94a3b8;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 4px 0 0 0;
          }
          .title {
            text-align: center;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 20px;
            color: #38bdf8;
          }
          .details-box {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 24px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .row:last-child {
            margin-bottom: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding-top: 12px;
          }
          .label {
            color: #94a3b8;
          }
          .value {
            font-weight: 600;
          }
          .amount-val {
            color: #10b981;
            font-size: 18px;
            font-weight: 700;
          }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .btn {
            padding: 14px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            transition: all 0.2s;
            border: none;
          }
          .btn-primary {
            background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
            color: #fff;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          }
          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
          }
          .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          .footer-note {
            text-align: center;
            font-size: 10px;
            color: #64748b;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="logo-text">TECHMECHA TORQUE</h1>
            <p class="tagline">Secure Payment Checkout</p>
          </div>
          
          <div class="title">Razorpay Sim Checkout</div>
          
          <div class="details-box">
            <div class="row">
              <span class="label">Student Name</span>
              <span class="value">${student.name}</span>
            </div>
            <div class="row">
              <span class="label">Reference Invoice</span>
              <span class="value">${payment.referenceNumber}</span>
            </div>
            <div class="row">
              <span class="label">Due Date</span>
              <span class="value">${new Date(payment.dueDate).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span class="label">Total Amount</span>
              <span class="amount-val">₹${payment.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div class="actions">
            <a href="/api/payments/razorpay-mock/callback/${payment._id}?status=success" class="btn btn-primary">Simulate Payment Success</a>
            <a href="/api/payments/razorpay-mock/callback/${payment._id}?status=failed" class="btn btn-secondary">Simulate Payment Failure</a>
          </div>
          
          <div class="footer-note">
            Powered by Razorpay sandbox simulation engine.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('<h1>Server Error</h1>');
  }
});

// @route   GET /api/payments/razorpay-mock/callback/:id
// @desc    Simulate successful/failed checkout callback
// @access  Public
router.get('/razorpay-mock/callback/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).send('<h1>Invoice Not Found</h1>');
    }

    const { status } = req.query;

    if (status === 'success') {
      const mockRef = `MOCK-PAY-${Date.now().toString().substring(5)}`;
      const result = await settlePaymentInDb({
        paymentId: req.params.id,
        method: 'UPI / Razorpay',
        referenceNumber: mockRef,
        amount: payment.amount,
        performedBy: 'Razorpay Online Portal',
        protocol: req.protocol,
        host: req.get('host')
      });

      // Get receipt path
      const receipt = await Receipt.findOne({ paymentId: payment._id });
      const receiptUrl = receipt ? receipt.pdfUrl : '';

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(17, 24, 39, 0.7); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; backdrop-filter: blur(16px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px auto; font-weight: bold; }
            h2 { color: #10b981; margin: 0 0 10px 0; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
            .details { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13.5px; }
            .details div { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .details div:last-child { margin-bottom: 0; }
            .label { color: #94a3b8; }
            .value { color: #f8fafc; font-weight: 600; }
            .actions { display: flex; gap: 12px; }
            .btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13.5px; text-decoration: none; cursor: pointer; text-align: center; border: none; }
            .btn-primary { background: #10b981; color: #fff; }
            .btn-primary:hover { background: #059669; }
            .btn-secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Thank you. Your tuition payment has been captured and settled in our billing system.</p>
            
            <div class="details">
              <div>
                <span class="label">Reference Invoice</span>
                <span class="value">${payment.referenceNumber}</span>
              </div>
              <div>
                <span class="label">Transaction Reference</span>
                <span class="value">${mockRef}</span>
              </div>
              <div>
                <span class="label">Amount Paid</span>
                <span class="value" style="color:#10b981">₹${payment.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div class="actions">
              ${receiptUrl ? `<a href="${receiptUrl}" target="_blank" class="btn btn-primary">Download Receipt</a>` : ''}
              <a href="#" onclick="window.close()" class="btn btn-secondary">Close Window</a>
            </div>
          </div>
        </body>
        </html>
      `);
    } else {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Failed</title>
          <style>
            body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(17, 24, 39, 0.7); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; backdrop-filter: blur(16px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px auto; font-weight: bold; }
            h2 { color: #ef4444; margin: 0 0 10px 0; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
            .actions { display: flex; gap: 12px; }
            .btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13.5px; text-decoration: none; cursor: pointer; text-align: center; border: none; }
            .btn-primary { background: #3b82f6; color: #fff; }
            .btn-secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✗</div>
            <h2>Payment Failed</h2>
            <p>Your payment attempt could not be processed. This is a simulated checkout failure. You can retry the transaction.</p>
            <div class="actions">
              <a href="/api/payments/razorpay-mock/pay/${payment._id}" class="btn btn-primary">Try Again</a>
              <a href="#" onclick="window.close()" class="btn btn-secondary">Close Window</a>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    res.status(500).send('<h1>Server Error</h1>');
  }
});

// @route   GET /api/payments/razorpay-callback
// @desc    Live Razorpay checkout callback redirection handler
// @access  Public
router.get('/razorpay-callback', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_status } = req.query;

    if (razorpay_payment_link_status === 'paid' && razorpay_payment_link_id) {
      // Find the corresponding payment record
      const payment = await Payment.findOne({ razorpayPaymentLinkId: razorpay_payment_link_id });
      if (!payment) {
        return res.status(404).send('<h1>Associated Payment Invoice Not Found</h1>');
      }

      if (payment.status !== 'Paid') {
        const result = await settlePaymentInDb({
          paymentId: payment._id,
          method: 'Razorpay Online Gateway',
          referenceNumber: razorpay_payment_id || `RZP-TXN-${Date.now().toString().substring(5)}`,
          amount: payment.amount,
          performedBy: 'Razorpay Online Portal',
          protocol: req.protocol,
          host: req.get('host')
        });

        // Get receipt path
        const receipt = await Receipt.findOne({ paymentId: payment._id });
        const receiptUrl = receipt ? receipt.pdfUrl : '';

        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Successful</title>
            <style>
              body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: rgba(17, 24, 39, 0.7); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; backdrop-filter: blur(16px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px auto; font-weight: bold; }
              h2 { color: #10b981; margin: 0 0 10px 0; }
              p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
              .details { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13.5px; }
              .details div { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .details div:last-child { margin-bottom: 0; }
              .label { color: #94a3b8; }
              .value { color: #f8fafc; font-weight: 600; }
              .actions { display: flex; gap: 12px; }
              .btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13.5px; text-decoration: none; cursor: pointer; text-align: center; border: none; }
              .btn-primary { background: #10b981; color: #fff; }
              .btn-primary:hover { background: #059669; }
              .btn-secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✓</div>
              <h2>Payment Successful!</h2>
              <p>Thank you. Your tuition payment has been captured and settled in our billing system.</p>
              
              <div class="details">
                <div>
                  <span class="label">Reference Invoice</span>
                  <span class="value">${payment.referenceNumber}</span>
                </div>
                <div>
                  <span class="label">Transaction Reference</span>
                  <span class="value">${razorpay_payment_id}</span>
                </div>
                <div>
                  <span class="label">Amount Paid</span>
                  <span class="value" style="color:#10b981">₹${payment.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div class="actions">
                ${receiptUrl ? `<a href="${receiptUrl}" target="_blank" class="btn btn-primary">Download Receipt</a>` : ''}
                <a href="#" onclick="window.close()" class="btn btn-secondary">Close Window</a>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    }

    // Default failure screen
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Callback Failed</title>
        <style>
          body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(17, 24, 39, 0.7); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; backdrop-filter: blur(16px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px auto; font-weight: bold; }
          h2 { color: #ef4444; margin: 0 0 10px 0; }
          p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
          .actions { display: flex; gap: 12px; }
          .btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13.5px; text-decoration: none; cursor: pointer; text-align: center; border: none; }
          .btn-secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✗</div>
          <h2>Payment Unsettled</h2>
          <p>The online checkout transaction status returned unsettled. If the funds have been deducted from your bank account, please contact team@techmechatorque.com with your transaction ID.</p>
          <div class="actions">
            <a href="#" onclick="window.close()" class="btn btn-secondary">Close Window</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('<h1>Server Error</h1>');
  }
});

module.exports = router;
