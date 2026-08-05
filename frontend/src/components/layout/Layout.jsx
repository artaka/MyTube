import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout({ children, onLogin }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Header onLogin={onLogin} onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-content">
        {children}
      </main>
    </>
  );
}
