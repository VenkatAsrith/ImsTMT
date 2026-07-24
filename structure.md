# 📁 InternDashBoard Codebase Directory Structure & Architecture Mapping

This document provides a comprehensive structural guide to the **InternDashBoard** MERN-stack codebase. It outlines the directories, files, model schemas, API routes, frontend components, and pages, detailing how data flows from the database to the user interface.

---

## 🗺️ High-Level Project Layout
The repository is split into two primary folders: a backend server environment and a frontend single-page application.

```
InternDashBoard/
├── backend/                  # Express.js REST API & Mongoose schemas
├── frontend/                 # React.js SPA (Vite, CSS Modules, Recharts)
├── TMT-Letters/              # Document generator assets (assets, signatures)
└── structure.md              # Current architecture mapping reference
```

---

## 🖥️ Backend Directory Structure (`/backend`)
The backend is built with Node.js, Express, and MongoDB (via Mongoose), utilizing JSON Web Tokens (JWT) for secure authentication.

```
backend/
├── config/
│   └── db.js                 # MongoDB database connection configuration
├── middleware/
│   ├── auth.js               # Route protection & role-based validation middleware
│   └── validation.js         # Input sanitization and payload validators
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
│   └── User.js               # Access credentials & RBAC definitions (Admin, HR, etc.)
├── routes/                   # API Controller Endpoints
│   ├── auth.js               # Session logins (/api/auth/login)
│   ├── automations.js        # Background sweep manual triggers
│   ├── clients.js            # CRUD client list endpoints
│   ├── courses.js            # Syllabus catalog additions
│   ├── deals.js              # Deal pipeline cards
│   ├── interns.js            # Intern profile details & rating posts
│   ├── notifications.js      # Global announcement postings
│   ├── payments.js           # billing operations & invoice creation
│   ├── receipts.js           # PDF receipt downloads
│   ├── search.js             # Global Command Bar searches
│   └── students.js           # Student registrations, tasks and exams
├── scripts/
│   └── seed.js               # Database population script (dummy data setup)
├── services/
│   ├── automationService.js  # Runs background checks (3-day reminders, stale CRM accounts)
│   ├── notificationService.js# Twilio WhatsApp & simulated outbox sandboxes
│   └── pdfService.js         # HTML-to-PDF invoice compilation engine
├── uploads/                  # Temporary generated PDF receipts directory
├── .env                      # Environment configurations (Port, DB URI, JWT keys)
├── server.js                 # Entry file initializing middlewares, routes & database
└── package.json              # Backend dependencies configuration
```

---

## 🎨 Frontend Directory Structure (`/frontend`)
The user interface is built on Vite, React, standard CSS, Recharts for visual analytics, and Lucide React icons.

```
frontend/
├── public/                   # Static browser assets (logos, signatures)
├── src/
│   ├── assets/               # CSS fonts and styling themes
│   ├── components/           # Reusable Component Engine
│   │   ├── GlobalSearch.jsx  # Global command bar search (Ctrl + K)
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

## 🔀 Data Flow Mapping

### 1. Authentication Flow
```
[LoginPage.jsx]
     │ (Form submission: Email/Password)
     ▼
[AuthContext.jsx] (Calls login method)
     │
     ▼ (POST request to /api/auth/login)
[routes/auth.js] --> [models/User.js] (Validates password hash)
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
     ├── 3. Calls [services/pdfService.js] to compile receipt document
     └── 4. Writes new receipt record into [models/Receipt.js]
             │
             ▼
[Dashboard Sandbox Logs] (Displays mock WhatsApp notification with download link)
```

---

## 🔐 Key System Guards (App.jsx Protection)
Route protection utilizes the `ProtectedRoute` component to secure routes based on user roles:
*   **Org Space Protection**: Restricted to `['Super Admin', 'HR Manager', 'Viewer']`
*   **Marketing Space Protection**: Restricted to `['Super Admin', 'Sales Rep', 'Viewer']`
*   **Learning Space Protection**: Restricted to `['Super Admin', 'Teacher', 'Finance', 'Viewer']`
    *   *Finance Ledger/Receipts views*: Excludes `'Teacher'`.

---

## 📘 User Guide & Simple Explanations (No Tech Talk)

### 👶 Explaining the Portal to a 5th Grader
Imagine you are running a giant **school** that also has **secret agents (interns)** working on cool projects. 

Instead of writing everything down on messy paper notebooks that can get lost, this portal is like a **Super Digital Assistant** on a computer. 
* It helps the school **Principal (Super Admin)** watch over everything.
* It helps the **Money Keeper (Finance)** count coins and print out gold stars (payment receipts).
* It helps the **Teachers** track who is doing their homework.
* It helps the **Staff Recruiter (HR)** hire new agents, check their papers, and print out certificates!

Everyone has their own special key to log in, and they only see the rooms (tabs) they need to do their jobs.

---

### 🚪 The Feature Rooms & What Happens When You Fill Forms

#### 1. 🎒 Student Registry Room (Learning Space)
*   **The Admission Form (Adding a student)**:
    *   **What you type in**: Student's name, email, and phone number.
    *   **What happens when you click Submit**: The portal creates a digital folder for the student. It automatically sends them a welcoming email, sets their status to "Inquiry Received", and logs a note on their personal timeline: *"Admission Created by [User Name] at [Time]"*.
*   **The Course Enrollment Form**:
    *   **What you do**: Select a course from the dropdown and attach it to the student.
    *   **What happens when you click Submit**: The student is officially enrolled! Their status changes to "Enrolled" and they are added to the classroom list. A note is written in their timeline log.
*   **The Exam Score Form**:
    *   **What you type in**: The name of the test, type of test, and marks scored out of 100.
    *   **What happens when you click Submit**: The portal automatically decides if the student passed or failed. It saves their grade badge and shows their score trends.
*   **The Student Activity Timeline (Activity Log)**:
    *   This is like a diary of the student. Whenever they pay money, finish a course, or get a WhatsApp text, a line is written here (newest diary entry on top) so teachers can see their history at a glance.

#### 2. 💰 Money Room (Billing & Receipts)
*   **The Settle Payment Form**:
    *   **What you type in**: How much money they paid, how they paid (UPI, Cash, PayPal, Stripe), and a tracking reference number.
    *   **What happens when you click Submit**: The portal does math! It subtracts the payment from what the student owes. It marks the bill as "Paid". Then, it automatically builds a clean PDF Receipt and uploads it safely to the cloud so it won't get lost.
*   **The WhatsApp Pop-Up (Sending updates)**:
    *   **What you do**: Select a template (like "Payment Reminder" or "Receipt Confirmation"), type a custom message if you want, and click "Send".
    *   **What happens next**: 
        *   The portal takes the template and fills in the blanks (replaces `{{name}}` with the student's actual name, `{{amount}}` with their payment, and `{{receipt}}` with the link to their receipt PDF).
        *   If you click **Send via Twilio**, it dispatches it immediately.
        *   If you click **WhatsApp Web Link**, it opens a chat window on your browser/phone with the text already typed in, ready to send!
        *   No matter which button you click, a diary entry is written in the student's timeline so you know they were notified.

#### 3. 💼 Intern & Staff Room (HR Space)
*   **The Intern Onboarding Form**:
    *   **What you type in**: Name, department, join date, and their role title.
    *   **What happens when you click Submit**: Creates their profile, fires off an onboarding checklist, and welcomes them via email.
*   **The Work Submission Form (Intern Deliverables)**:
    *   **What you do**: Type a title, select a category (like "Assignment" or "Project Report"), write remarks, and upload a file (PDF, ZIP, Word document).
    *   **What happens when you click Submit**: The file is sent directly to secure cloud storage. A record is added to the intern's **Submissions Archive** with a yellow badge showing **"Pending"** (waiting for a teacher to look at it).
*   **The Review Panel**:
    *   **What you do**: HR Managers look at the submission, type their notes in the box, and click either **Approve** (green) or **Reject** (red).
    *   **What happens next**: The status badge on the deliverable changes immediately, and a record is logged in the timeline so everyone knows who graded the work.
*   **The HR Letters Builder**:
    *   **What you do**: Choose the document type (e.g. "Certificate" or "Offer Letter"), change pre-filled information like stipend rate or training dates, and click **Download PDF/PNG**.
    *   **What happens next**: The portal creates a high-quality certificate or letter. It downloads it to your computer, and at the same time, it sends a copy to the **Unified Document Repository** so the business has an permanent record of it.

#### 4. 🗃️ Unified Document Repository (Operations Space)
*   Think of this as a **Giant Digital Filing Cabinet** for the entire business.
*   It aggregates files from everywhere: payment receipts, profile forms, intern homework submissions, and generated certificates/letters.
*   **How you use it**: You type a name or title in the search box, click filters (type, category, date range), and the cabinet instantly shows you the matching files. Click **View File** to download or see them instantly.

---

### 📝 What is Updated & What is Deleted Behind the Scenes

When you perform actions in the portal, here is exactly what changes:

| Action | What gets Updated / Saved | What gets Deleted / Cleaned Up |
| :--- | :--- | :--- |
| **Uploading a Student/Intern document** | The file is uploaded to cloud storage. The link is saved in the student's file. An activity log entry is created. | The temporary file uploaded from your web browser is immediately wiped off the server's hard drive to keep it clean. |
| **Deleting a Document from a Profile** | The list of documents is updated to remove this file. A log is saved: *"Document [Name] deleted"*. | The document URL link is permanently deleted. |
| **Settle a Payment / Billing transaction** | The invoice status updates to "Paid". The student's outstanding balance goes down. A PDF receipt is generated and saved in the cloud. | Any temporary local PDF file is deleted from the server. |
| **Deleting a Payment invoice** | The student's outstanding balance is recalculated (increased back by the deleted amount). | The invoice record, payment log, and its associated PDF receipt link are completely deleted from the database. |
| **Reviewing an Intern Submission** | The submission's status updates to "Approved" or "Rejected". Reviewer remarks are appended. An audit event is recorded. | No files are deleted (the deliverable stays in the cloud for compliance tracking). |

