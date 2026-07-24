const nodemailer = require('nodemailer');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');
const Notification = require('../models/Notification');

// Memory cache for simulation logs (accessed by frontend sandbox tab)
const sandboxLogs = {
  whatsapp: [],
  email: [],
};

const getSandboxLogs = () => sandboxLogs;

const clearSandboxLogs = () => {
  sandboxLogs.whatsapp = [];
  sandboxLogs.email = [];
};

// Send In-App Notification (database write)
const sendInAppNotification = async ({ userId, recipientRole, title, message, type = 'Info', link = '' }) => {
  try {
    const notification = await Notification.create({
      userId,
      recipientRole,
      title,
      message,
      type,
      link,
    });
    return notification;
  } catch (error) {
    console.error('Error creating in-app notification:', error.message);
  }
};

// Send WhatsApp via Twilio (with fallback logs)
const sendWhatsApp = async ({ to, body, mediaUrl }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'; // Twilio sandbox number

  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const formattedFrom = fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`;

  const timestamp = new Date();

  if (accountSid && authToken) {
    try {
      const client = twilio(accountSid, authToken);
      const messageParams = {
        from: formattedFrom,
        to: formattedTo,
        body: body,
      };

      if (mediaUrl) {
        // Twilio supports array of mediaUrls
        messageParams.mediaUrl = [mediaUrl];
      }

      const response = await client.messages.create(messageParams);
      console.log(`✅ WhatsApp sent via Twilio! SID: ${response.sid}`);
      
      sandboxLogs.whatsapp.push({
        timestamp,
        to,
        body,
        mediaUrl,
        status: 'Sent via Twilio API',
        sid: response.sid,
      });

      return response;
    } catch (error) {
      console.error(`❌ Twilio WhatsApp Error: ${error.message}`);
      sandboxLogs.whatsapp.push({
        timestamp,
        to,
        body,
        mediaUrl,
        status: `Error: ${error.message}`,
      });
    }
  } else {
    // Sandbox Simulation Mode
    console.log('\n--- 📱 WHATSAPP SIMULATION ---');
    console.log(`To: ${formattedTo}`);
    console.log(`From: ${formattedFrom}`);
    console.log(`Body: ${body}`);
    if (mediaUrl) console.log(`Attached PDF: ${mediaUrl}`);
    console.log('------------------------------\n');

    sandboxLogs.whatsapp.push({
      timestamp,
      to,
      body,
      mediaUrl,
      status: 'Simulated Sandbox Log',
    });
  }
};

// Send Email via Nodemailer (with fallback logs)
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const service = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const fromAddress = process.env.EMAIL_FROM || 'no-reply@techmechatorque.com';

  const timestamp = new Date();

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const mailOptions = {
        from: `"TMT Operations" <${fromAddress}>`,
        to,
        subject,
        html,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent via Nodemailer! MessageID: ${info.messageId}`);

      sandboxLogs.email.push({
        timestamp,
        to,
        subject,
        attachments: attachments.map(a => a.filename),
        status: 'Sent via Nodemailer SMTP',
        messageId: info.messageId,
      });

      return info;
    } catch (error) {
      console.error(`❌ Nodemailer Error: ${error.message}`);
      sandboxLogs.email.push({
        timestamp,
        to,
        subject,
        attachments: attachments.map(a => a.filename),
        status: `Error: ${error.message}`,
      });
    }
  } else {
    // Sandbox Simulation Mode
    console.log('\n--- ✉️ EMAIL SIMULATION ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML preview): ${html.substring(0, 150)}...`);
    if (attachments.length > 0) {
      console.log(`Attachments: ${attachments.map((a) => a.filename).join(', ')}`);
    }
    console.log('---------------------------\n');

    sandboxLogs.email.push({
      timestamp,
      to,
      subject,
      bodyPreview: html.substring(0, 250),
      attachments: attachments.map((a) => a.filename),
      status: 'Simulated Sandbox Log',
    });
  }
};

module.exports = {
  sendInAppNotification,
  sendWhatsApp,
  sendEmail,
  getSandboxLogs,
  clearSandboxLogs,
};
