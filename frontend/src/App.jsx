import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import GlobalSearch from './components/GlobalSearch';

// Import Pages
import Dashboard from './pages/Dashboard';
import InternList from './pages/Interns/InternList';
import InternDetail from './pages/Interns/InternDetail';
import Announcements from './pages/Announcements/Announcements';
import ClientList from './pages/Clients/ClientList';
import ClientDetail from './pages/Clients/ClientDetail';
import DealPipeline from './pages/Clients/DealPipeline';
import SalesAnalytics from './pages/Clients/SalesAnalytics';
import FollowUpCalendar from './pages/Clients/FollowUpCalendar';
import StudentList from './pages/Students/StudentList';
import StudentDetail from './pages/Students/StudentDetail';
import StudentPipeline from './pages/Students/StudentPipeline';
import CourseCatalog from './pages/Students/CourseCatalog';
import PaymentList from './pages/Students/PaymentList';
import ReceiptCenter from './pages/Students/ReceiptCenter';
import DocumentRepository from './pages/Documents/DocumentRepository';

// Main App Layout — no auth guards, all routes open
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Collapse sidebar on tablet/mobile automatically
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 991);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ctrl+K keybind for Global Search palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background Dim Overlay on Mobile when Sidebar is toggled active */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="main-layout-wrapper" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          openSearch={() => setSearchOpen(true)}
        />

        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Org space */}
            <Route path="/org/interns" element={<InternList />} />
            <Route path="/org/interns/:id" element={<InternDetail />} />
            <Route path="/org/announcements" element={<Announcements />} />

            {/* Marketing space */}
            <Route path="/marketing/clients" element={<ClientList />} />
            <Route path="/marketing/clients/:id" element={<ClientDetail />} />
            <Route path="/marketing/pipeline" element={<DealPipeline />} />
            <Route path="/marketing/reports" element={<SalesAnalytics />} />
            <Route path="/marketing/calendars" element={<FollowUpCalendar />} />

            {/* Learning space */}
            <Route path="/learning/students" element={<StudentList />} />
            <Route path="/learning/students/:id" element={<StudentDetail />} />
            <Route path="/learning/pipeline" element={<StudentPipeline />} />
            <Route path="/learning/courses" element={<CourseCatalog />} />
            <Route path="/learning/payments" element={<PaymentList />} />
            <Route path="/learning/receipts" element={<ReceiptCenter />} />

            {/* Operations */}
            <Route path="/documents" element={<DocumentRepository />} />

            {/* Catch-all → Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Command Search Overlay */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

const App = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationProvider>
          <AppLayout />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
