
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { Marketplace } from './pages/Marketplace';
import { MyWork } from './pages/MyWork';
import { AdminOpportunities } from './pages/AdminOpportunities';
import { SoldProperties } from './pages/SoldProperties';
import { UserManagement } from './pages/UserManagement';
import { Login } from './pages/Login';
import { Clients } from './pages/Clients';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isAuthenticated) {
      return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'inbox':
        return <Inbox />;
      case 'marketplace':
        return <Marketplace />;
      case 'my-work':
        return <MyWork />;
      case 'admin-opportunities':
        return <AdminOpportunities />;
      case 'sold-properties':
        return <SoldProperties />;
      case 'user-management':
        return <UserManagement />;
      case 'clients':
        return <Clients />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activePage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
