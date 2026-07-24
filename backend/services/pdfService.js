const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateReceiptPDF = (payment, student, financialAccount, receiptNumber, courses) => {
  return new Promise((resolve, reject) => {
    try {
      // Create A4 PDF doc
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const dirPath = path.join(__dirname, '../uploads/receipts');

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `receipt_${receiptNumber}.pdf`;
      const filePath = path.join(dirPath, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- TMT Corporate Letterhead Header ---

      // Top Red accent bar
      doc.rect(0, 0, 595.28, 15).fill('#e11d48');

      // --- TMT Corporate Letterhead Header ---

      // Top Red accent bar
      doc.rect(0, 0, 595.28, 15).fill('#e11d48');

      // TMT Logo Image or fallback text
      const logoPath = path.join(__dirname, '../uploads/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 22, { height: 80 });
      } else {
        doc
          .fillColor('#e11d48')
          .fontSize(36)
          .font('Helvetica-Bold')
          .text('TMT', 40, 22);
      }

      // Techmecha Torque Private Limited text
      doc
        .fillColor('#0f172a')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TECHMECHA TORQUE PRIVATE LIMITED', 40, 72);

      doc
        .fillColor('#475569')
        .fontSize(8)
        .font('Helvetica')
        .text('CIN: U62099TS2025PTC203529', 40, 85)
        .text('PAN: AAMCT2547A | TAN: HYDT16774C', 40, 97)
        .text('Address: CGR Manjeera Hotel, Plot 6&32 Pothireddypally, Sangareddy, Medak- 502001, Telangana.', 40, 109, { width: 320 });

      // Contact details top right
      doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica')
        .text('Ph No: +91 7993442607', 400, 35, { align: 'right' })
        .text('email: team@techmechatorque.com', 400, 49, { align: 'right' })
        .text('web: www.techmechatorque.com', 400, 63, { align: 'right' });

      // Title header line separator
      doc
        .moveTo(40, 135)
        .lineTo(555, 135)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      // Receipt Type Header
      doc
        .fillColor('#0f172a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('OFFICIAL PAYMENT RECEIPT', 40, 150)
        .fontSize(10)
        .font('Helvetica')
        .text(`Receipt Number: ${receiptNumber}`, 40, 170)
        .text(`Date of Issue: ${new Date().toLocaleDateString()}`, 40, 185)
        .text(`Payment Reference: ${payment.referenceNumber}`, 40, 200);

      // Student info block (Billed To)
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Billed To Student:', 40, 230)
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${student.name}`, 40, 248)
        .text(`Email: ${student.email}`, 40, 263)
        .text(`Phone: ${student.phone}`, 40, 278);

      // Payment Details Table Header
      let y = 310;
      doc
        .rect(40, y, 515, 20)
        .fill('#f1f5f9');

      doc
        .fillColor('#334155')
        .font('Helvetica-Bold')
        .text('Program Course Title', 50, y + 5)
        .text('Domain Space', 290, y + 5)
        .text('Price Fee (INR)', 450, y + 5, { align: 'right' });

      // Populate courses in row (displaying base fee per row, i.e., total amount divided by number of courses, then divided by 1.18 for GST exclusion)
      const numCourses = courses && courses.length > 0 ? courses.length : 1;
      const basePricePerRow = (payment.amount / 1.18) / numCourses;
      y += 20;
      doc.font('Helvetica').fillColor('#0f172a');

      if (courses && courses.length > 0) {
        courses.forEach((c) => {
          y += 10;
          doc
            .text(c.title, 50, y)
            .text(c.category, 290, y)
            .text(`Rs. ${basePricePerRow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });
          y += 15;
          doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
        });
      } else {
        y += 10;
        doc
          .text('General Learning & Training Program', 50, y)
          .text('Education', 290, y)
          .text(`Rs. ${basePricePerRow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });
        y += 15;
        doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
      }

      // GST Calculations (from inclusive amount)
      const subtotal = payment.amount / 1.18;
      const cgst = subtotal * 0.09;
      const sgst = subtotal * 0.09;
      const totalPaid = payment.amount;

      // Summary details blocks
      y += 25;
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text('Subtotal (Base Price):', 330, y)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 18;
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text('CGST (9%):', 330, y)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Rs. ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 18;
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text('SGST (9%):', 330, y)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Rs. ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 20;
      doc
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Payment Method:', 40, y)
        .font('Helvetica')
        .text(payment.method, 160, y)
        .font('Helvetica-Bold')
        .text('Total Paid (incl. GST):', 330, y)
        .text(`Rs. ${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 20;
      doc
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Agreed Tuition Fee:', 330, y)
        .text(`Rs. ${(financialAccount ? financialAccount.agreedAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 20;
      doc
        .font('Helvetica-Bold')
        .text('Remaining Balance:', 330, y)
        .fillColor('#dc2626')
        .text(`Rs. ${(financialAccount ? financialAccount.balanceAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      // Corporate Footer terms
      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text('This is a computer-generated billing receipt issued by Techmecha Torque Private Limited.', 40, 710, { align: 'center' })
        .text('For queries regarding program schedules or payments, contact careers@techmechatorque.com', 40, 722, { align: 'center' });

      doc.end();

      writeStream.on('finish', async () => {
        try {
          const { uploadFileToCloud } = require('./supabaseService');
          const publicUrl = await uploadFileToCloud(filePath, 'receipts', fileName, 'application/pdf', false);
          resolve({ filePath, publicUrl });
        } catch (uploadErr) {
          reject(uploadErr);
        }
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const generateInvoicePDF = (payment, student, financialAccount, courses) => {
  return new Promise((resolve, reject) => {
    try {
      // Create A4 PDF doc
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const dirPath = path.join(__dirname, '../uploads/receipts');

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `invoice_${payment.referenceNumber}.pdf`;
      const filePath = path.join(dirPath, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Top Red accent bar
      doc.rect(0, 0, 595.28, 15).fill('#e11d48');

      // TMT Logo Image or fallback text
      const logoPath = path.join(__dirname, '../uploads/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 22, { height: 80 });
      } else {
        doc
          .fillColor('#e11d48')
          .fontSize(36)
          .font('Helvetica-Bold')
          .text('TMT', 40, 22);
      }

      // Techmecha Torque Private Limited text
      doc
        .fillColor('#0f172a')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TECHMECHA TORQUE PRIVATE LIMITED', 40, 72);

      doc
        .fillColor('#475569')
        .fontSize(8)
        .font('Helvetica')
        .text('CIN: U62099TS2025PTC203529', 40, 85)
        .text('PAN: AAMCT2547A | TAN: HYDT16774C', 40, 97)
        .text('Address: CGR Manjeera Hotel, Plot 6&32 Pothireddypally, Sangareddy, Medak- 502001, Telangana.', 40, 109, { width: 320 });

      // Contact details top right
      doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica')
        .text('Ph No: +91 7993442607', 400, 35, { align: 'right' })
        .text('email: team@techmechatorque.com', 400, 49, { align: 'right' })
        .text('web: www.techmechatorque.com', 400, 63, { align: 'right' });

      // Title header line separator
      doc
        .moveTo(40, 135)
        .lineTo(555, 135)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      // Invoice Type Header
      doc
        .fillColor('#0f172a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('OFFICIAL FEE INVOICE', 40, 150)
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice Number: ${payment.referenceNumber}`, 40, 170)
        .text(`Date of Issue: ${new Date(payment.createdAt || Date.now()).toLocaleDateString()}`, 40, 185)
        .text(`Due Date: ${new Date(payment.dueDate).toLocaleDateString()}`, 40, 200);

      // Student info block (Billed To)
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Billed To Student:', 40, 230)
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${student.name}`, 40, 248)
        .text(`Email: ${student.email}`, 40, 263)
        .text(`Phone: ${student.phone}`, 40, 278);

      // Payment Details Table Header
      let y = 310;
      doc
        .rect(40, y, 515, 20)
        .fill('#f1f5f9');

      doc
        .fillColor('#334155')
        .font('Helvetica-Bold')
        .text('Program Course Title', 50, y + 5)
        .text('Domain Space', 290, y + 5)
        .text('Price Fee (INR)', 450, y + 5, { align: 'right' });

      // Populate courses in row
      const numCourses = courses && courses.length > 0 ? courses.length : 1;
      const basePricePerRow = (payment.amount / 1.18) / numCourses;
      y += 20;
      doc.font('Helvetica').fillColor('#0f172a');

      if (courses && courses.length > 0) {
        courses.forEach((c) => {
          y += 10;
          doc
            .text(c.title, 50, y)
            .text(c.category, 290, y)
            .text(`Rs. ${basePricePerRow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });
          y += 15;
          doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
        });
      } else {
        y += 10;
        doc
          .text('General Learning & Training Program', 50, y)
          .text('Education', 290, y)
          .text(`Rs. ${basePricePerRow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });
        y += 15;
        doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e8f0').stroke();
      }

      // GST Calculations (from inclusive amount)
      const subtotal = payment.amount / 1.18;
      const cgst = subtotal * 0.09;
      const sgst = subtotal * 0.09;
      const totalDue = payment.amount;

      // Summary details blocks
      y += 25;
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text('Subtotal (Base Price):', 330, y)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 18;
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text('CGST (9%):', 330, y)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Rs. ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 18;
      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text('SGST (9%):', 330, y)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Rs. ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 20;
      doc
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Payment Gateway:', 40, y)
        .font('Helvetica')
        .text('Razorpay / Online UPI', 160, y)
        .font('Helvetica-Bold')
        .text('Total Due (incl. GST):', 330, y)
        .text(`Rs. ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 20;
      doc
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Agreed Tuition Fee:', 330, y)
        .text(`Rs. ${(financialAccount ? financialAccount.agreedAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      y += 20;
      doc
        .font('Helvetica-Bold')
        .text('Remaining Balance:', 330, y)
        .fillColor('#dc2626')
        .text(`Rs. ${(financialAccount ? financialAccount.balanceAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { align: 'right' });

      // Corporate Footer terms
      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text('This is a computer-generated tuition fee invoice issued by Techmecha Torque Private Limited.', 40, 710, { align: 'center' })
        .text('To pay online, please click the secure link or scan the QR code provided in your invoice message.', 40, 722, { align: 'center' });

      doc.end();

      writeStream.on('finish', async () => {
        try {
          const { uploadFileToCloud } = require('./supabaseService');
          const publicUrl = await uploadFileToCloud(filePath, 'invoices', fileName, 'application/pdf', false);
          resolve({ filePath, publicUrl });
        } catch (uploadErr) {
          reject(uploadErr);
        }
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateReceiptPDF, generateInvoicePDF };
