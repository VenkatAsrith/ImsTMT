# 💻 InternDashBoard — Operations & Learning Management System

> **⚠️ EDUCATIONAL PURPOSES ONLY**
> This repository is a learning and prototyping sandbox. It is configured with development conveniences (such as database fallback and developer authentication bypass) and must **not** be deployed to production environments without securing access layers and removing debugging fallbacks.

InternDashBoard is a comprehensive, production-inspired operations hub built on the **MERN (MongoDB, Express, React, Node.js) stack**. It is designed to model business operations across three primary scopes: **Org Space** (intern performance tracking), **Marketing Space** (B2B clients & CRM deals pipeline), and **Learning Space** (students registration, courses, payments, and PDF receipt compilation).

---

## ⭐️ Educational Disclaimer & Local Run Features

This project was built to illustrate real-world architecture while remaining incredibly simple to clone and run locally. It features:

1. **Zero-Configuration In-Memory Database Fallback**: 
   If no `MONGODB_URI` environment variable is specified (or connection to MongoDB Atlas fails), the backend automatically initializes an in-memory database using `mongodb-memory-server`. It seeds dummy records on startup so you can interact with the app immediately.
2. **Built-in Authentication Bypass (Dev Mode)**:
   The routing protection middleware (`backend/middleware/auth.js`) automatically falls back to a default `Super Admin` session (`Jaychandra`) if a valid JSON Web Token (JWT) is missing or expired. This allows you to explore API endpoints directly via tools like Postman or browser fetches without complex login cycles.
3. **Simulated Services**:
   Third-party integrations (Twilio WhatsApp, Razorpay payment processing, and nodemailer email alerts) fall back to safe simulation modes that log output directly to the server terminal and dashboard logs rather than calling live, paid APIs.

---

## 🗺️ Codebase Directory Structure

The repository is organized as a monorepo split into an Express server and a React single-page application built on Vite:

```
InternDashBoard/
├── backend/                  # Express.js REST API & Mongoose schemas
├── frontend/                 # React.js SPA (Vite, CSS Modules, Recharts)
├── TMT-Letters/              # Document generator assets (assets, signatures)
└── README.md                 # Project guide & reference manual (This File)
```

### 🖥️ Backend Subsystem (`/backend`)
The server controls database connections, handles PDF compiling, sends notification logs, and exposes API controllers.

```
backend/
├── config/
│   └── db.js                 # Database connector (with MongoMemoryServer fallback)
├── middleware/
│   ├── auth.js               # Route protection & role-based validation (JWT verify)
│   └── validation.js         # Input sanitization and payload validation
├── models/                   # Mongoose Database Schemas
│   ├── AuditLog.js           # Keeps track of compliance audit logs
│   ├── Client.js             # B2B client company data records
│   ├── Course.js             # Syllabus catalog lists
│   ├── Deal.js               # Sales pipeline B2B deal values
│   ├── FinancialAccount.js   # Student balance records & payment status
│   ├── Intern.js             # Intern profile details & performance reviews
│   ├── Notification.js       # In-app notification cards
│   ├── Payment.js            # Tuition invoices and billing ledgers
│   ├── Receipt.js            # PDF receipt URLs linked to payments
│   ├── Student.js            # Student registry details
│   └── User.js               # Access credentials & RBAC definitions (Super Admin, HR, etc.)
├── routes/                   # REST Controller Endpoints
│   ├── auth.js               # Session logins (/api/auth/login)
│   ├── automations.js        # Background sweep manual triggers
│   ├── clients.js            # CRUD client list endpoints
│   ├── courses.js            # Syllabus catalog additions
│   ├── deals.js              # Deal pipeline cards
│   ├── interns.js            # Intern profile details & rating posts
│   ├── notifications.js      # Global announcement postings
│   ├── payments.js           # Billing operations & invoice creation
│   ├── receipts.js           # PDF receipt downloads
│   ├── search.js             # Global Command Bar searches
│   └── students.js           # Student registrations, tasks, and exams
├── scripts/
│   └── seed.js               # Database population script (Populates mock data)
├── services/
│   ├── automationService.js  # Runs background checks (3-day reminders, stale CRM accounts)
│   ├── notificationService.js# Twilio WhatsApp & simulated outbox sandboxes
│   └── pdfService.js         # HTML-to-PDF invoice compilation engine using pdfkit
├── uploads/                  # Local directory hosting generated PDF receipts/documents
├── .env                      # Environment configurations (Port, DB URI, JWT keys)
├── server.js                 # Entry file initializing middlewares, routes & database
└── package.json              # Backend dependencies configuration
```

### 🎨 Frontend Subsystem (`/frontend`)
A modern, responsive user interface utilizing Glassmorphic principles, standard CSS variables, and clean components.

```
frontend/
├── public/                   # Static browser assets (logos, signatures)
├── src/
│   ├── assets/               # CSS fonts and styling themes
│   ├── components/           # Reusable Component Engine
│   │   ├── GlobalSearch.jsx  # Global command bar search (Ctrl + K search panel)
│   │   ├── KanbanBoard.jsx   # Drag-and-drop workflow visualizer
│   │   ├── Modal.jsx         # Accessible overlay dialogue box
│   │   ├── Navbar.jsx        # Top dashboard header bar & notifications panel
│   │   ├── Sidebar.jsx       # Left navigation links filtered by Role
│   │   ├── Table.jsx         # Interactive sorting, searching, & filtering tables
│   │   └── WhatsAppModal.jsx # WhatsApp dispatching (Twilio or wa.me)
│   ├── context/              # React Context Providers (State management)
│   │   ├── AuthContext.jsx   # Managed logins, sessions, and HTTP header JWT injection
│   │   └── NotificationContext.jsx # In-app notification alerts
│   ├── pages/                # Application Views & Pages
│   │   ├── Announcements/
│   │   │   └── Announcements.jsx # Global Notice Board postings
│   │   ├── Clients/
│   │   │   ├── ClientDetail.jsx   # Client account files, health score, and notes
│   │   │   ├── ClientList.jsx     # CRM Company Accounts table registry
│   │   │   ├── DealPipeline.jsx   # Kanban deal board (WIP limits, closure modals)
│   │   │   ├── FollowUpCalendar.jsx # Calendar scheduling outbox reminders
│   │   │   └── SalesAnalytics.jsx # Revenue forecasting charts & rep win rates
│   │   ├── Interns/
│   │   │   ├── DocumentGenerator.jsx # Dynamically compiles PDF certificates & offers
│   │   │   ├── InternDetail.jsx   # Monthly rating graphs, files, and templates
│   │   │   └── InternList.jsx     # Intern catalog list
│   │   ├── Students/
│   │   │   ├── CourseCatalog.jsx  # Syllabus catalogs & chapter lists
│   │   │   ├── PaymentList.jsx    # Settle tuition invoices
│   │   │   ├── ReceiptCenter.jsx  # Receipt registry & WhatsApp triggers
│   │   │   ├── StudentDetail.jsx  # Multi-tab panel (Ledger, Kanban tasks, Exams)
│   │   │   ├── StudentList.jsx    # Table of registered student profiles
│   │   │   └── StudentPipeline.jsx# Admissions Kanban pipeline stage trackers
│   │   ├── Dashboard.jsx     # Operations hub (daily sweeps trigger & dev sandbox logs)
│   │   └── LoginPage.jsx     # Credential authentication splash page
│   ├── App.css               # Core style variables
│   ├── App.jsx               # Navigation route controllers and route auth-guards
│   ├── index.css             # Main styling themes & glassmorphic layouts
│   └── main.jsx              # React DOM initialization anchor
├── index.html                # Entry HTML skeleton
├── vite.config.js            # Bundler server configurations (includes proxy settings)
└── package.json              # Frontend package dependencies configuration
```

---

## 🔀 Core Architecture & Data Flows

### 1. Authentication Flow
```
[LoginPage.jsx]
     │ (Form submission: Email/Password)
     ▼
[AuthContext.jsx] (Calls login method)
     │
     ▼ (POST request to /api/auth/login)
[routes/auth.js] ──> [models/User.js] (Validates password hash)
     │
     ▼ (Successful auth: Generates JWT token)
[AuthContext.jsx] (Saves token to LocalStorage; sets user status context)
     │
     ▼ (Navigates to /dashboard; passes JWT header in subsequent apiFetch requests)
[AppLayout (App.jsx)]
```

### 2. CRM Deal Stage Update Flow
```
[DealPipeline.jsx] (Moves Kanban card)
     │
     ▼ (Triggers drop handler: Check stage name)
   - If next stage === 'Closed Won' or 'Closed Lost':
     [Modal.jsx] prompts for closure explanation notes.
     │
     ▼ (Calls PUT /api/deals/:id)
[routes/deals.js]
     │
     ▼ (Saves new stage & updates stage history)
[models/Deal.js]
     │
     ▼ (Triggers compliance logging)
[AuditLog.js] (Writes modifications to DB -> Updates Dashboard Audit Feed)
```

### 3. Payment Settle Flow
```
[PaymentList.jsx] (Clicks "Settle Payment" -> opens modal)
     │
     ▼ (Form inputs: Amount, UPI/Cash, reference number)
[PaymentList.jsx] (Calls PUT /api/payments/:id/pay)
     │
     ▼
[routes/payments.js]
     ├── 1. Updates [models/Payment.js] status: 'Paid'
     ├── 2. Subtracts amount from [models/FinancialAccount.js] balance
     ├── 3. Calls [services/pdfService.js] to compile receipt document using pdfkit
     └── 4. Writes new receipt record into [models/Receipt.js]
             │
             ▼
[Dashboard Sandbox Logs] (Displays mock WhatsApp notification with download link)
```

---

## 🛠️ Installation & Setup Guide

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Configure the Backend Environment
1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory or copy the existing template.
   ```ini
   PORT=5000
   MONGODB_URI=your_mongodb_connection_uri_here   # Leave blank to use In-Memory Database!
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   ```

### 2. Run the Seed Script (Optional)
To populate data explicitly (though it seeds automatically if the DB is empty on server startup):
```bash
npm run seed
```

### 3. Start the Backend Server
You can run the server in development mode (which restarts on file changes using `nodemon`):
```bash
npm run dev
```
The console will log either `✅ MongoDB Connected` or `🚀 In-Memory MongoDB Server started`.

---

### 4. Setup the Frontend
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Click the link printed in your terminal (typically `http://localhost:5173`) to view the application in your browser.

---

## 🔑 Seeding / Login Credentials

The automatic database seeder initializes the system with a default Administrator user. Use these credentials to log in:

*   **Email**: `jaychandra@techmechatorque.com`
*   **Password**: `2288`
*   **Default Role**: `Super Admin`

Once logged in, you can access the dashboard and use the **Unified Document Repository**, perform manual sweeps, verify student records, or test Kanban cards.
