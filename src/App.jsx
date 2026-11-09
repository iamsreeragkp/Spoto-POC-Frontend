import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { CalendarDays, ChevronDown, ChevronsLeft, CircleUserRound, Columns2, FileCheck2, Presentation, Settings, Shield, UserCog, UserRound, Users, Trophy } from 'lucide-react';
import logoUrl from './assets/sportojet-logo.svg';
import Reports from './pages/Reports.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import { ToastProvider } from './components/Toast.jsx';

function Logo() {
  return (
    <div className="logo">
      <img src={logoUrl} alt="Sportojet" width="200" />
    </div>
  );
}

const NAV = [
  { label: 'Published Reports', icon: FileCheck2, children: [{ label: 'Assessment Reports', to: '/reports' }, { label: 'Feedback Reports' }] },
  { label: 'Compare Players', icon: Columns2 },
  { label: 'Shadow Team', icon: Shield, children: [] },
  { label: 'Players & Teams', icon: Users, children: [] },
  { label: 'White Board', icon: Presentation, children: [] },
  { label: 'Calendar', icon: CalendarDays, children: [] },
  { label: 'Scout Stats', icon: Trophy, children: [] },
  { label: 'Administration', icon: UserCog, children: [] },
  { label: 'User Management', icon: UserRound, children: [] },
  { label: 'Settings', icon: Settings, children: [] },
];

export default function App() {
  const [open, setOpen] = useState({ 'Published Reports': true });
  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <Logo />
          {NAV.map(({ label, icon: Icon, children }) => (
            <div key={label}>
              <button
                className={`nav-group-btn ${open[label] ? 'open' : ''}`}
                onClick={() => setOpen((o) => ({ ...o, [label]: !o[label] }))}
              >
                <Icon size={18} />
                {label}
                {children && <ChevronDown className="caret-ic" size={15} />}
              </button>
              {open[label] && children?.length > 0 && (
                <nav className="nav-sub">
                  {children.map((c) => c.to
                    ? <NavLink key={c.label} to={c.to} className="navlink">{c.label}</NavLink>
                    : <span key={c.label} className="navlink">{c.label}</span>)}
                </nav>
              )}
            </div>
          ))}
        </aside>
        <div className="main">
          <header className="topbar">
            <ChevronsLeft size={20} />
            <div className="user">
              <span className="org">Satya FCA</span>
              <span>Satya FCA1</span>
              <span className="avatar-u"><CircleUserRound size={26} /></span>
              <ChevronDown size={15} />
            </div>
          </header>
          <main className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/reports" replace />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="*" element={<Navigate to="/reports" replace />} />
            </Routes>
          </main>
        </div>
        <ChatWidget />
      </div>
    </ToastProvider>
  );
}
