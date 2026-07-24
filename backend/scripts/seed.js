const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Intern = require('../models/Intern');
const Client = require('../models/Client');
const Deal = require('../models/Deal');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const FinancialAccount = require('../models/FinancialAccount');
const { connectDB, disconnectDB } = require('../config/db');
const { generateReceiptPDF } = require('../services/pdfService');

const seedData = async () => {
  try {
    // 1. Clear Database
    console.log('🧹 Clearing existing database models...');
    await User.deleteMany({});
    await Intern.deleteMany({});
    await Client.deleteMany({});
    await Deal.deleteMany({});
    await Student.deleteMany({});
    await Course.deleteMany({});
    await Payment.deleteMany({});
    await Receipt.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await FinancialAccount.deleteMany({});

    console.log('🌱 Database cleared. Starting seed process...');

    // 2. Create Single User: Jaychandra (Super Admin with full access)
    console.log('👤 Seeding accounts...');
    const users = await User.create([
      { name: 'Jaychandra', email: 'jaychandra@techmechatorque.com', password: '2288', role: 'Super Admin' },
    ]);
    const admin = users[0];

    // 3. Create Courses
    console.log('📚 Seeding course catalog...');
    const courses = await Course.create([
      { 
        title: 'JavaScript', 
        description: 'Learn the language of the web. Build interactive and dynamic web applications.', 
        category: 'Development', 
        prerequisites: ['HTML', 'CSS'],
        sections: ['JavaScript Basics', 'DOM Manipulation', 'Asynchronous JS', 'APIs & Web Apps'],
        stack: ['JavaScript', 'HTML5', 'CSS3']
      },
      { 
        title: 'C / C++', 
        description: 'Build strong programming fundamentals. Learn problem-solving and efficient coding.', 
        category: 'Development', 
        prerequisites: [],
        sections: ['Variables & Operators', 'Control Flow', 'Functions & Pointers', 'OOP in C++'],
        stack: ['C', 'C++', 'Data Structures']
      },
      { 
        title: 'Python', 
        description: 'Versatile and beginner-friendly. Ideal for web, automation, AI/ML and data science.', 
        category: 'Development', 
        prerequisites: [],
        sections: ['Python Syntax', 'Data Structures', 'Scripting & Automation', 'Intro to NumPy/Pandas'],
        stack: ['Python', 'Automation', 'Data Science']
      },
      { 
        title: 'Java', 
        description: 'Object-oriented programming for robust applications across industries.', 
        category: 'Development', 
        prerequisites: [],
        sections: ['Java Syntax', 'OOP Concepts', 'Exception Handling', 'Multithreading & Collections'],
        stack: ['Java', 'OOP']
      },
      { 
        title: 'DSA', 
        description: 'Master Data Structures and Algorithms to build strong problem-solving skills and crack coding interviews.', 
        category: 'Development', 
        prerequisites: ['C / C++', 'Java', 'Python'],
        sections: ['Time/Space Complexity', 'Arrays & Linked Lists', 'Stacks & Queues', 'Trees & Graphs', 'Recursion & Dynamic Programming'],
        stack: ['DSA', 'Algorithms', 'Problem Solving']
      },
      { 
        title: 'Web Development (MERN Stack)', 
        description: 'Build modern, responsive web applications using MongoDB, Express.js, React.js and Node.js.', 
        category: 'Development', 
        prerequisites: ['JavaScript'],
        sections: ['MongoDB Database', 'Express.js Framework', 'React.js Component Engine', 'Node.js Backend'],
        stack: ['MongoDB', 'Express.js', 'React.js', 'Node.js', 'Fullstack']
      },
      { 
        title: 'Java Web Dev using Spring Boot', 
        description: 'Build enterprise-grade web applications and RESTful APIs using Java, Spring, Spring Boot and Hibernate.', 
        category: 'Development', 
        prerequisites: ['Java'],
        sections: ['Spring MVC Framework', 'RESTful API Services', 'Spring Data JPA & Hibernate', 'Security & Authentication'],
        stack: ['Java', 'Spring Boot', 'REST APIs', 'Hibernate']
      },
      { 
        title: 'AI and ML', 
        description: 'Learn AI and machine learning fundamentals, data-driven models, and practical applications for real-world problem solving.', 
        category: 'Development', 
        prerequisites: ['Python'],
        sections: ['Supervised Learning', 'Unsupervised Clustering', 'Neural Networks Basics', 'Computer Vision & NLP Intro'],
        stack: ['AI', 'ML', 'Python', 'TensorFlow']
      }
    ]);

    // 4. Create Interns (using TMT department categories)
    console.log('💼 Seeding interns...');
    const interns = await Intern.create([
      {
        name: 'Ravi Kumar',
        email: 'ravi@techmechatorque.com',
        phone: '9848088022',
        department: 'Org Space',
        joinDate: new Date('2026-01-15'),
        role: 'Junior Web Intern',
        status: 'Active',
        performanceMetrics: [
          { month: 'Jan 2026', rating: 4, notes: 'Quick learner, completed initial codebase review.' },
          { month: 'Feb 2026', rating: 5, notes: 'Implemented multiple UI components independently.' },
        ],
      },
      {
        name: 'Priya Sharma',
        email: 'priya@techmechatorque.com',
        phone: '9848088022',
        department: 'Learning Space',
        joinDate: new Date('2026-03-01'),
        role: 'UI/UX Design Intern',
        status: 'Probation',
        performanceMetrics: [
          { month: 'Mar 2026', rating: 5, notes: 'Outstanding design proposals for platform layout.' },
        ],
      },
      {
        name: 'Arun Reddy',
        email: 'arun@techmechatorque.com',
        phone: '9848088022',
        department: 'Marketing Space',
        joinDate: new Date('2026-05-10'),
        role: 'Growth Marketing Intern',
        status: 'Onboarding Pending',
        performanceMetrics: [],
      },
    ]);

    // 5. Create Clients
    console.log('🏢 Seeding B2B clients...');
    const clients = await Client.create([
      {
        companyName: 'Sunrise Tech Solutions',
        contacts: [{ name: 'Vikram Patel', email: 'vikram@sunrisetech.com', phone: '9848088022' }],
        industry: 'Technology',
        tags: ['Key Account', 'Enterprise'],
        healthScore: 95,
        source: 'Referral',
        rating: 5,
        priority: 'High',
      },
      {
        companyName: 'BlueWave Industries',
        contacts: [
          { name: 'Suresh Rao', email: 'suresh@bluewave.com', phone: '9848088022' },
        ],
        industry: 'Operations',
        tags: ['Consulting'],
        healthScore: 60,
        source: 'Direct Outreach',
        rating: 3,
        priority: 'Medium',
      },
    ]);

    // 6. Create Deals
    console.log('💰 Seeding sales pipeline deals...');
    const deals = await Deal.create([
      {
        clientId: clients[0]._id,
        dealName: 'Sunrise Tech Operations Platform',
        amount: 85000,
        currency: 'INR',
        stage: 'Negotiation',
        probability: 75,
        assignedTo: admin._id,
        nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        tags: ['Enterprise', 'Core integration'],
        stageHistory: [{ stage: 'New' }, { stage: 'Contacted' }, { stage: 'Proposal Sent' }, { stage: 'Negotiation' }],
      },
      {
        clientId: clients[1]._id,
        dealName: 'BlueWave Consulting Package',
        amount: 25000,
        currency: 'INR',
        stage: 'Proposal Sent',
        probability: 50,
        assignedTo: admin._id,
        nextFollowUp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        tags: ['Consulting'],
        stageHistory: [{ stage: 'New' }, { stage: 'Proposal Sent' }],
      },
    ]);

    // 7. Create Students
    console.log('🎓 Seeding students...');
    const students = await Student.create([
      {
        name: 'Sai Kiran',
        email: 'saikiran@student.com',
        phone: '9848088022',
        admissionDate: new Date('2026-02-10'),
        startDate: new Date('2026-02-15'),
        assignedMentor: 'Jaychandra',
        coursesTaken: [
          { courseId: courses[0]._id, enrolledAt: new Date('2026-02-10') },
          { courseId: courses[1]._id, enrolledAt: new Date('2026-02-15') },
        ],
        status: 'Enrolled',
        onboardingStage: 'Enrolled',
        outstandingBalance: 12000,
        paymentStatus: 'Due',
        examAttended: true,
        examScore: 82,
        exams: [
          {
            test: 'JavaScript Basics Quiz',
            typeOfTest: 'Quiz',
            result: 'Pass',
            marksSecured: 78,
            totalMarks: 100,
            dateOfExamination: new Date('2026-02-25'),
            typeOfExam: 'Online',
            remarks: 'Strong foundation, minor syntax errors.'
          },
          {
            test: 'C/C++ Pointers Midterm',
            typeOfTest: 'Midterm',
            result: 'Pass',
            marksSecured: 86,
            totalMarks: 100,
            dateOfExamination: new Date('2026-03-20'),
            typeOfExam: 'Written',
            remarks: 'Excellent pointer arithmetic knowledge.'
          }
        ]
      },
      {
        name: 'Meghana Reddy',
        email: 'meghana@student.com',
        phone: '9848088022',
        admissionDate: new Date('2026-04-01'),
        startDate: new Date('2026-04-05'),
        assignedMentor: 'Jaychandra',
        coursesTaken: [{ courseId: courses[5]._id, enrolledAt: new Date('2026-04-01'), completionDate: new Date('2026-05-30') }],
        status: 'Alumni',
        onboardingStage: 'Completed',
        outstandingBalance: 0,
        paymentStatus: 'Settle',
        examAttended: true,
        examScore: 91,
        exams: [
          {
            test: 'MongoDB Aggregations Test',
            typeOfTest: 'Quiz',
            result: 'Pass',
            marksSecured: 94,
            totalMarks: 100,
            dateOfExamination: new Date('2026-04-18'),
            typeOfExam: 'Online',
            remarks: 'Outstanding query design.'
          },
          {
            test: 'Express Routing Practical',
            typeOfTest: 'Quiz',
            result: 'Pass',
            marksSecured: 88,
            totalMarks: 100,
            dateOfExamination: new Date('2026-05-05'),
            typeOfExam: 'Practical',
            remarks: 'Route middleware well implemented.'
          },
          {
            test: 'MERN Stack Final Evaluation',
            typeOfTest: 'Final',
            result: 'Pass',
            marksSecured: 92,
            totalMarks: 100,
            dateOfExamination: new Date('2026-05-28'),
            typeOfExam: 'Practical',
            remarks: 'Completed the full-stack application with clean responsiveness.'
          }
        ]
      },
      {
        name: 'Harsha Vardhan',
        email: 'harsha@student.com',
        phone: '9848088022',
        admissionDate: new Date('2026-06-01'),
        startDate: new Date('2026-06-05'),
        assignedMentor: 'Jaychandra',
        coursesTaken: [{ courseId: courses[2]._id, enrolledAt: new Date('2026-06-01') }],
        status: 'Registered',
        onboardingStage: 'Inquiry Received',
        outstandingBalance: 15000,
        paymentStatus: 'Due',
        examAttended: false,
        examScore: null,
      },
    ]);

    // 7.5 Create corresponding FinancialAccounts
    console.log('CNY: Seeding student financial accounts...');
    const saiKiranAccount = await FinancialAccount.create({
      studentId: students[0]._id,
      courseFee: 22000,
      scholarshipAmount: 0,
      agreedAmount: 22000,
      totalPaid: 10000,
      balanceAmount: 12000,
      paymentStatus: 'Partially Paid',
      remarks: 'Initial partially paid setup',
    });
    students[0].financialAccount = saiKiranAccount._id;
    await students[0].save();

    const meghanaAccount = await FinancialAccount.create({
      studentId: students[1]._id,
      courseFee: 15000,
      scholarshipAmount: 0,
      agreedAmount: 15000,
      totalPaid: 15000,
      balanceAmount: 0,
      paymentStatus: 'Paid',
      remarks: 'Paid full agreed fee',
    });
    students[1].financialAccount = meghanaAccount._id;
    await students[1].save();

    const harshaAccount = await FinancialAccount.create({
      studentId: students[2]._id,
      courseFee: 15000,
      scholarshipAmount: 0,
      agreedAmount: 15000,
      totalPaid: 0,
      balanceAmount: 15000,
      paymentStatus: 'Fee Pending',
      remarks: 'Pending tuition fee',
    });
    students[2].financialAccount = harshaAccount._id;
    await students[2].save();

    // 8. Create Bills & Payments
    console.log('💸 Seeding student billing and receipts...');
    
    // A. Paid Payment & Receipt for Sai Kiran
    const clarkPaymentPaid = await Payment.create({
      studentId: students[0]._id,
      amount: 10000,
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paidDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      method: 'UPI',
      status: 'Paid',
      referenceNumber: `TMT-INV-${Date.now()}-1`,
    });

    const receiptNumber = `TMT-REC-${Date.now()}-1`;
    const { publicUrl } = await generateReceiptPDF(clarkPaymentPaid, students[0], saiKiranAccount, receiptNumber, [courses[0]]);
    await Receipt.create({
      paymentId: clarkPaymentPaid._id,
      receiptNumber,
      pdfUrl: publicUrl,
    });

    // B. Due Payment for Sai Kiran (upcoming)
    await Payment.create({
      studentId: students[0]._id,
      amount: 12000,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'Due',
      referenceNumber: `TMT-INV-${Date.now()}-2`,
    });

    // C. Overdue Payment for Harsha Vardhan
    await Payment.create({
      studentId: students[2]._id,
      amount: 15000,
      dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      status: 'Overdue',
      referenceNumber: `TMT-INV-${Date.now()}-3`,
    });

    // 9. In-App Notifications
    console.log('🔔 Seeding general notifications...');
    await Notification.create([
      {
        recipientRole: 'Super Admin',
        title: 'Documents Pending Submission',
        message: 'Intern Ravi Kumar needs to submit the signed contract and NDA sheet.',
        type: 'Warning',
        link: '/org/interns',
      },
      {
        recipientRole: 'Super Admin',
        title: 'Student Bill Overdue Alert',
        message: 'Billing for student Harsha Vardhan (₹15000) has expired. Escalation pending.',
        type: 'Warning',
        link: '/learning/payments',
      },
    ]);

    // 10. Log Seeding Success
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error during data seeding:', error.message);
  }
};

// Execute if run from command line directly
if (require.main === module) {
  (async () => {
    await connectDB();
    await seedData();
    await disconnectDB();
  })();
}

module.exports = { seedData };
