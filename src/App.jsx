import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import Reports from './pages/Reports.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import { ToastProvider } from './components/Toast.jsx';

export default function App() {
  return (
    <ToastProvider>
      <div className="shell">
        <header className="topbar">
          <NavLink to="/reports" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
                <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="M16 9l4 6-4 3-4-3z" fill="currentColor" />
              </svg>
            </span>
            <span>Sporto <em>Scouting</em></span>
          </NavLink>
          <nav>
            <NavLink to="/reports" className="navlink">
              <ClipboardList size={16} /> Reports
            </NavLink>
          </nav>
        </header>
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/reports" replace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="*" element={<Navigate to="/reports" replace />} />
          </Routes>
        </main>
        <ChatWidget />
      </div>
    </ToastProvider>
  );
}
