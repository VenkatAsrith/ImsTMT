// React import not needed (JSX transform handles it)
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Building2, 
  KanbanSquare, 
  BarChart3, 
  Calendar, 
  GraduationCap, 
  CreditCard, 
  Receipt,
  LogOut,
  Sparkles,
  FileText
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  const navSections = [
    {
      title: 'Org (HR)',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Intern Directory', path: '/org/interns', icon: Users },
        { name: 'Announcements', path: '/org/announcements', icon: Megaphone },
      ]
    },
    {
      title: 'Marketing (CRM)',
      items: [
        { name: 'Client Directory', path: '/marketing/clients', icon: Building2 },
        { name: 'Deal Pipeline', path: '/marketing/pipeline', icon: KanbanSquare },
        { name: 'Sales Analytics', path: '/marketing/reports', icon: BarChart3 },
        { name: 'Follow-up Calendar', path: '/marketing/calendars', icon: Calendar },
      ]
    },
    {
      title: 'Learning (LMS)',
      items: [
        { name: 'Student Directory', path: '/learning/students', icon: GraduationCap },
        { name: 'Admissions Pipeline', path: '/learning/pipeline', icon: KanbanSquare },
        { name: 'Course Catalog', path: '/learning/courses', icon: Sparkles },
        { name: 'Billing & Payments', path: '/learning/payments', icon: CreditCard },
        { name: 'Receipt Center', path: '/learning/receipts', icon: Receipt },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Document Repository', path: '/documents', icon: FileText },
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand" style={brandStyles}>
        <img src="/logo.png" style={{ height: '32px', width: 'auto', borderRadius: '4px' }} alt="TMT Logo" />
        <div className="brand-name" style={nameStyles}>
          <span>TMT Operations</span>
          <span style={roleBadgeStyles}>{user.role}</span>
        </div>
      </div>

      <nav className="sidebar-nav" style={navStyles}>
        {navSections.map((section, idx) => {
          return (
            <div key={idx} className="nav-section" style={sectionStyles}>
              <h4 style={sectionHeaderStyles}>{section.title}</h4>
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth <= 991) toggleSidebar();
                    }}
                    style={({ isActive }) => ({
                      ...navLinkStyles,
                      ...(isActive ? navLinkActiveStyles : {})
                    })}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={footerStyles}>
        <div className="user-info" style={userInfoStyles}>
          <div className="user-avatar" style={avatarStyles}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-details" style={userDetailsStyles}>
            <span className="user-name" style={userNameStyles}>{user.name}</span>
            <span className="user-email" style={userEmailStyles}>{user.email}</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={logout} style={logoutBtnStyles}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

// --- Styles object ---

const brandStyles = {
  height: 'var(--header-height)',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderBottom: '1px solid var(--glass-border)',
};


const nameStyles = {
  display: 'flex',
  flexDirection: 'column',
  fontWeight: '600',
  fontSize: '15px',
};

const roleBadgeStyles = {
  fontSize: '10px',
  color: 'var(--primary)',
  fontWeight: 'normal',
  marginTop: '-2px',
};

const navStyles = {
  flexGrow: 1,
  padding: '24px 16px',
  overflowY: 'auto',
};

const sectionStyles = {
  marginBottom: '20px',
};

const sectionHeaderStyles = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  marginBottom: '10px',
  paddingLeft: '8px',
};

const navLinkStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  paddingTop: '10px',
  paddingRight: '12px',
  paddingBottom: '10px',
  paddingLeft: '12px',
  borderRadius: '8px',
  color: 'var(--text-secondary)',
  marginBottom: '4px',
  transition: 'all var(--transition-speed)',
};

const navLinkActiveStyles = {
  backgroundColor: 'rgba(99, 102, 241, 0.1)',
  color: 'var(--text-primary)',
  fontWeight: '500',
  borderLeft: '3px solid var(--primary)',
  borderRadius: '0 8px 8px 0',
  paddingLeft: '9px',
};

const footerStyles = {
  padding: '20px 16px',
  borderTop: '1px solid var(--glass-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const userInfoStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const avatarStyles = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)',
  color: 'white',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const userDetailsStyles = {
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const userNameStyles = {
  fontSize: '13px',
  fontWeight: '500',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const userEmailStyles = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const logoutBtnStyles = {
  width: '100%',
};

export default Sidebar;
