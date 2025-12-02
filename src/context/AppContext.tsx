
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Property, User, UserRole, AnalysisStatus, AuctionModality, PropertyAnalysisData, Client } from '../types';

// Initial Mock Users for seeding (password: 123456)
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Carlos Gestor', email: 'admin@leilao.com', password: '123', role: UserRole.ADMIN, avatar: 'https://picsum.photos/seed/u1/40', blocked: false },
  { id: 'u2', name: 'Ana Analista', email: 'ana@leilao.com', password: '123', role: UserRole.ANALYST, avatar: 'https://picsum.photos/seed/u2/40', blocked: false },
];

interface AppContextType {
  currentUser: User | null;
  users: User[];
  properties: Property[];
  clients: Client[];
  isAuthenticated: boolean;
  login: (email: string, pass: string) => boolean;
  createUser: (name: string, email: string, pass: string, role?: UserRole) => boolean;
  logout: () => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  toggleUserBlock: (userId: string) => void;
  
  // CRM
  addClient: (client: Client) => void;
  removeClient: (clientId: string) => void;

  // Properties & Files
  findPropertyByUrl: (url: string) => Property | undefined;
  addProperty: (url: string, modality: AuctionModality, auctionDate: string, title?: string) => void;
  addProperties: (items: Array<{url: string, modality: AuctionModality, auctionDate: string, title: string}>) => void;
  claimProperty: (propertyId: string) => boolean; // Returns success/fail
  updateStatus: (
    propertyId: string, 
    status: AnalysisStatus, 
    notes?: string, 
    abortReason?: string, 
    aiAnalysis?: string, 
    analysisData?: PropertyAnalysisData
  ) => void;
  updateManagerDispatch: (propertyId: string, recipient: string, sent: boolean, clientId?: string) => void;
  markAsSold: (propertyId: string, soldDate: string, soldAmount: number, buyerName: string) => void;
  getStats: () => { total: number; pending: number; inProgress: number; completed: number; aborted: number; sold: number };

  // File Management
  uploadDocument: (propertyId: string, file: File, docType: string) => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Helper for Business Days
function addBusinessDays(dateStr: string, days: number): string {
  let date = new Date(dateStr);
  let count = 0;
  while (count < days) {
      date.setDate(date.getDate() + 1);
      // 0 = Sunday, 6 = Saturday
      if (date.getDay() !== 0 && date.getDay() !== 6) {
          count++;
      }
  }
  return date.toISOString().split('T')[0];
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- USERS & AUTH ---
  const [users, setUsers] = useState<User[]>(() => {
      const saved = localStorage.getItem('leilao_users_db');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const saved = localStorage.getItem('leilao_session');
      return saved ? JSON.parse(saved) : null;
  });

  const isAuthenticated = !!currentUser;

  // --- CLIENTS (CRM) ---
  const [clients, setClients] = useState<Client[]>(() => {
      const saved = localStorage.getItem('leilao_clients');
      return saved ? JSON.parse(saved) : [];
  });

  // --- PROPERTIES ---
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('leilao_properties');
    return saved ? JSON.parse(saved) : [];
  });

  // --- MOCK FILE STORAGE (In-Memory for Demo) ---
  // In a real app, this would be S3 or a backend storage
  const [fileStorage, setFileStorage] = useState<Record<string, string>>({});

  // Persistence Effects
  useEffect(() => { localStorage.setItem('leilao_properties', JSON.stringify(properties)); }, [properties]);
  useEffect(() => { localStorage.setItem('leilao_users_db', JSON.stringify(users)); }, [users]);
  useEffect(() => { 
      if (currentUser) localStorage.setItem('leilao_session', JSON.stringify(currentUser));
      else localStorage.removeItem('leilao_session');
  }, [currentUser]);
  useEffect(() => { localStorage.setItem('leilao_clients', JSON.stringify(clients)); }, [clients]);

  // --- AUTH ACTIONS ---
  const login = (email: string, pass: string) => {
      const user = users.find(u => u.email === email && u.password === pass);
      if (user) {
          if (user.blocked) {
              alert("Usuário bloqueado. Contate o administrador.");
              return false;
          }
          setCurrentUser(user);
          return true;
      }
      return false;
  };

  const createUser = (name: string, email: string, pass: string, role: UserRole = UserRole.ANALYST) => {
      if (users.find(u => u.email === email)) {
          return false; // Email already exists
      }
      const newUser: User = {
          id: `u${Date.now()}`,
          name,
          email,
          password: pass,
          role: role, 
          avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
          blocked: false
      };
      setUsers(prev => [...prev, newUser]);
      return true;
  };

  const logout = () => {
      setCurrentUser(null);
  };

  const updateUserRole = (userId: string, role: UserRole) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const toggleUserBlock = (userId: string) => {
      setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, blocked: !u.blocked } : u
      ));
  };

  // --- CRM ACTIONS ---
  const addClient = (client: Client) => {
      setClients(prev => [...prev, client]);
  };

  const removeClient = (clientId: string) => {
      setClients(prev => prev.filter(c => c.id !== clientId));
  };

  // --- PROPERTY ACTIONS ---
  const findPropertyByUrl = (url: string) => {
      return properties.find(p => p.url.trim() === url.trim());
  };

  const addProperty = (url: string, modality: AuctionModality, auctionDate: string, title?: string) => {
    if (!currentUser) return;
    const newProp: Property = {
      id: Date.now().toString(),
      url: url.trim(),
      modality,
      auctionDate,
      title: title || 'Imóvel sem título',
      status: AnalysisStatus.NAO_INICIADO,
      assignedTo: null,
      addedBy: currentUser.id,
      addedAt: new Date().toISOString(),
      notes: '',
    };
    setProperties(prev => [newProp, ...prev]);
  };

  const addProperties = (items: Array<{url: string, modality: AuctionModality, auctionDate: string, title: string}>) => {
    if (!currentUser) return;
    const newProps: Property[] = items.map((item, index) => ({
      id: (Date.now() + index).toString(),
      url: item.url.trim(),
      modality: item.modality,
      auctionDate: item.auctionDate,
      title: item.title || 'Imóvel Importado',
      status: AnalysisStatus.NAO_INICIADO,
      assignedTo: null,
      addedBy: currentUser.id,
      addedAt: new Date().toISOString(),
      notes: '',
    }));
    
    setProperties(prev => [...newProps, ...prev]);
  };

  const claimProperty = (propertyId: string) => {
    if (!currentUser) return false;
    
    let success = false;
    
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        // Critical Check: Is it already assigned?
        if (p.assignedTo && p.assignedTo !== currentUser.id) {
            return p; // Do not modify
        }
        // Claim it
        success = true;
        return { ...p, assignedTo: currentUser.id, status: AnalysisStatus.EM_ANALISE };
      }
      return p;
    }));

    return success;
  };

  const updateStatus = (
    propertyId: string, 
    status: AnalysisStatus, 
    notes?: string, 
    abortReason?: string, 
    aiAnalysis?: string,
    analysisData?: PropertyAnalysisData
  ) => {
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        const isEditingCompleted = (p.status === AnalysisStatus.ANALISADO || p.status === AnalysisStatus.ABORTADO) && status !== AnalysisStatus.ARREMATADO;
        
        return {
          ...p,
          status,
          ...(notes !== undefined && { notes }),
          ...(abortReason !== undefined && { abortReason }),
          ...(aiAnalysis !== undefined && { aiAnalysis }),
          ...(analysisData !== undefined && { analysisData }),
          ...(isEditingCompleted && { lastEditedAt: new Date().toISOString() })
        };
      }
      return p;
    }));
  };

  const updateManagerDispatch = (propertyId: string, recipient: string, sent: boolean, clientId?: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        return {
          ...p,
          managerDispatch: { recipient, sent, clientId }
        };
      }
      return p;
    }));
  };

  const markAsSold = (propertyId: string, soldDate: string, soldAmount: number, buyerName: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        
        // Auto-calculate Homologation Date logic
        let finalAnalysisData = p.analysisData;
        
        if (finalAnalysisData) {
            // If date is missing OR user logic dictates auto-calc (Venda Direta/Online rule)
            // Rule: 2 business days after sold date
            if (!finalAnalysisData.homologationDate) {
                const autoDate = addBusinessDays(soldDate, 2);
                finalAnalysisData = {
                    ...finalAnalysisData,
                    homologationDate: autoDate
                };
            }
        }

        return {
          ...p,
          status: AnalysisStatus.ARREMATADO,
          soldDate,
          soldAmount,
          buyerName,
          analysisData: finalAnalysisData
        };
      }
      return p;
    }));
  };

  // --- FILE MANAGEMENT ---
  const uploadDocument = async (propertyId: string, file: File, docType: string): Promise<string> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64Data = reader.result as string;
              
              // Standardized Naming Convention: PROP-{ID}_{DOCTYPE}_{TIMESTAMP}.{EXT}
              const extension = file.name.split('.').pop() || 'dat';
              const cleanDocType = docType.toUpperCase().replace(/[^A-Z0-9]/g, '_');
              const newFileName = `PROP-${propertyId}_${cleanDocType}_${Date.now()}.${extension}`;
              
              // Simulate "Uploading" by storing in memory/state
              // In a real app, this would POST to a server
              setFileStorage(prev => ({
                  ...prev,
                  [newFileName]: base64Data
              }));

              console.log(`[File System] Arquivo salvo: ${newFileName}`);
              resolve(newFileName);
          };
          reader.readAsDataURL(file);
      });
  };

  const getStats = () => {
    const total = properties.length;
    const pending = properties.filter(p => p.status === AnalysisStatus.NAO_INICIADO).length;
    const inProgress = properties.filter(p => p.status === AnalysisStatus.EM_ANALISE).length;
    const completed = properties.filter(p => p.status === AnalysisStatus.ANALISADO).length;
    const aborted = properties.filter(p => p.status === AnalysisStatus.ABORTADO).length;
    const sold = properties.filter(p => p.status === AnalysisStatus.ARREMATADO).length;
    return { total, pending, inProgress, completed, aborted, sold };
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, properties, clients, isAuthenticated,
      login, createUser, logout, updateUserRole, toggleUserBlock,
      addClient, removeClient,
      findPropertyByUrl, addProperty, addProperties, claimProperty, updateStatus, updateManagerDispatch, markAsSold, getStats,
      uploadDocument
    }}>
      {children}
    </AppContext.Provider>
  );
};
