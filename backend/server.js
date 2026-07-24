const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/db');
const { runDailyAutomation } = require('./services/automationService');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Database Connection
connectDB().then(async () => {
  try {
    const User = require('./models/User');
    const { seedData } = require('./scripts/seed');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty. Seeding initial data...');
      await seedData();
    }
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create required upload folders if they don't exist
const makeDirs = () => {
  const receiptsDir = path.join(__dirname, 'uploads/receipts');
  const documentsDir = path.join(__dirname, 'uploads/documents');
  
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }
};
makeDirs();

// Serve uploads static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes mapping
app.use('/api/auth', require('./routes/auth'));
app.use('/api/interns', require('./routes/interns'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/students', require('./routes/students'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/automations', require('./routes/automations'));
app.use('/api/search', require('./routes/search'));
app.use('/api/documents', require('./routes/documents'));

// Test Route
app.get('/', (req, res) => {
  res.send('TMT Operations API running successfully.');
});

// Basic global error handler
app.use((err, req, res, next) => {
  console.error('Server error stack:', err.stack);
  res.status(500).json({
    data: null,
    error: err.message || 'Server error occurred',
  });
});

// Setup 24-hour daily scheduler check (86400000 ms = 24 Hours)
setInterval(() => {
  runDailyAutomation().catch((err) => console.error('Scheduled automation run failed:', err.message));
}, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`📡 Server operating in env on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server process terminated.');
    process.exit(0);
  });
});
