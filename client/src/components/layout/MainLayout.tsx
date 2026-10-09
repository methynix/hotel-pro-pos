import { useState, FC } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout: FC = () => {
  // Start collapsed on phones so the sidebar doesn't cover the page on load.
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768);

  return (
    <div className="flex h-screen bg-background overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto print:overflow-visible">
          <div className="p-6 md:p-8 print:p-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
