
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  Briefcase,
  CheckSquare,
  Menu,
  Award,
  Trophy,
  Users,
  LogOut,
  Contact,
  Settings
} from 'lucide-react';
import { UserRole } from '../types';
import { UserProfileModal } from './UserProfileModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;

  // Define nav items
  const commonNavItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: Home },
    { id: 'inbox', path: '/inbox', label: 'Novos Imóveis', icon: PlusCircle },
    { id: 'marketplace', path: '/marketplace', label: 'Mural de Oportunidades', icon: Briefcase },
    { id: 'my-work', path: '/my-work', label: 'Minhas Análises', icon: CheckSquare },
  ];

  const adminNavItems = [
    { id: 'admin-opportunities', path: '/admin-opportunities', label: 'Oportunidades Validadas', icon: Award },
    { id: 'sold-properties', path: '/sold-properties', label: 'Imóveis Arrematados', icon: Trophy },
    { id: 'clients', path: '/clients', label: 'Investidores', icon: Contact },
    { id: 'user-management', path: '/user-management', label: 'Gestão de Usuários', icon: Users },
  ];

  const navItems = currentUser.role === UserRole.ADMIN
    ? [...commonNavItems, ...adminNavItems]
    : commonNavItems;

  const activeItem = navItems.find(item => location.pathname.startsWith(item.path));
  const activeId = activeItem ? activeItem.id : '';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-blue-600">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="bg-white text-blue-600 rounded p-1 text-sm font-extrabold">LI</span>
            LeilãoInvest
          </h1>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeId === item.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeId === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold relative">
              <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
              {currentUser.blocked && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="text-gray-400 hover:text-blue-600 p-1"
                title="Configurações de Perfil"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <button
            className="p-1 mr-4 lg:hidden rounded-md hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6 text-gray-500" />
          </button>

          <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">
            {activeItem?.label || 'Dashboard'}
          </h2>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">v1.0.3</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
