import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Property, User, UserRole, AnalysisStatus, AuctionModality, PropertyAnalysisData, Client } from '../types';
import { authService } from '../services/auth.service';
import { propertyService } from '../services/property.service';
import { clientService } from '../services/client.service';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  properties: Property[];
  clients: Client[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  createUser: (name: string, email: string, pass: string, role?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  toggleUserBlock: (userId: string) => Promise<void>;

  // CRM
  addClient: (client: Client) => Promise<void>;
  removeClient: (clientId: string) => Promise<void>;

  // Properties & Files
  findPropertyByUrl: (url: string) => Property | undefined;
  addProperty: (url: string, modality: AuctionModality, auctionDate: string, title?: string) => Promise<void>;
  addProperties: (items: Array<{ url: string, modality: AuctionModality, auctionDate: string, title: string }>) => Promise<void>;
  claimProperty: (propertyId: string) => Promise<boolean>;
  updateStatus: (
    propertyId: string,
    status: AnalysisStatus,
    notes?: string,
    abortReason?: string,
    aiAnalysis?: string,
    analysisData?: PropertyAnalysisData
  ) => Promise<void>;
  updateManagerDispatch: (propertyId: string, recipient: string, sent: boolean, clientId?: string) => Promise<void>;
  markAsSold: (propertyId: string, soldDate: string, soldAmount: number, buyerName: string) => Promise<void>;
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!currentUser;

  // Initialize: Check session and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user is already logged in
        const { user } = await authService.getSession();
        if (user) {
          setCurrentUser(user);
          await loadAllData();
        }
      } catch (error) {
        console.error('Initialize error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load all data from database
  const loadAllData = async () => {
    try {
      const [usersResult, propertiesResult, clientsResult] = await Promise.all([
        authService.getAllUsers(),
        propertyService.getAll(),
        clientService.getAll(),
      ]);

      if (!usersResult.error) setUsers(usersResult.users);
      if (!propertiesResult.error) setProperties(propertiesResult.properties);
      if (!clientsResult.error) setClients(clientsResult.clients);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  // Refresh properties from database
  const refreshProperties = async () => {
    const { properties: newProperties, error } = await propertyService.getAll();
    if (!error) {
      setProperties(newProperties);
    }
  };

  // Refresh clients from database
  const refreshClients = async () => {
    const { clients: newClients, error } = await clientService.getAll();
    if (!error) {
      setClients(newClients);
    }
  };

  // Refresh users from database
  const refreshUsers = async () => {
    const { users: newUsers, error } = await authService.getAllUsers();
    if (!error) {
      setUsers(newUsers);
    }
  };

  // --- AUTH ACTIONS ---
  const login = async (email: string, pass: string): Promise<boolean> => {
    const { user, error } = await authService.login(email, pass);
    if (error) {
      alert(error);
      return false;
    }
    if (user) {
      setCurrentUser(user);
      await loadAllData();
      return true;
    }
    return false;
  };

  const createUser = async (name: string, email: string, pass: string, role: UserRole = UserRole.ANALYST): Promise<boolean> => {
    const { success, error } = await authService.createUser(name, email, pass, role);
    if (error) {
      alert(error);
      return false;
    }
    if (success) {
      await refreshUsers();
      return true;
    }
    return false;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setCurrentUser(null);
    setUsers([]);
    setProperties([]);
    setClients([]);
  };

  const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
    const { success, error } = await authService.updateUserRole(userId, role);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshUsers();
    }
  };

  const toggleUserBlock = async (userId: string): Promise<void> => {
    const { success, error } = await authService.toggleUserBlock(userId);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshUsers();
    }
  };

  // --- CRM ACTIONS ---
  const addClient = async (client: Client): Promise<void> => {
    const { success, error } = await clientService.add(client);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshClients();
    }
  };

  const removeClient = async (clientId: string): Promise<void> => {
    const { success, error } = await clientService.remove(clientId);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshClients();
    }
  };

  // --- PROPERTY ACTIONS ---
  const findPropertyByUrl = (url: string): Property | undefined => {
    return properties.find(p => p.url.trim() === url.trim());
  };

  const addProperty = async (
    url: string,
    modality: AuctionModality,
    auctionDate: string,
    title?: string,
    initialAnalysisData?: Partial<PropertyAnalysisData>
  ): Promise<void> => {
    if (!currentUser) return;

    const { success, error } = await propertyService.add(url, modality, auctionDate, title, currentUser.id, initialAnalysisData);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshProperties();
    }
  };

  const addProperties = async (items: Array<{ url: string, modality: AuctionModality, auctionDate: string, title: string }>): Promise<void> => {
    if (!currentUser) return;

    const { success, error } = await propertyService.addBulk(items, currentUser.id);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshProperties();
    }
  };

  const claimProperty = async (propertyId: string): Promise<boolean> => {
    if (!currentUser) return false;

    const { success, error } = await propertyService.claim(propertyId, currentUser.id);
    if (error) {
      alert(error);
      return false;
    }
    if (success) {
      await refreshProperties();
      return true;
    }
    return false;
  };

  const updateStatus = async (
    propertyId: string,
    status: AnalysisStatus,
    notes?: string,
    abortReason?: string,
    aiAnalysis?: string,
    analysisData?: PropertyAnalysisData
  ): Promise<void> => {
    const { success, error } = await propertyService.updateStatus(
      propertyId,
      status,
      notes,
      abortReason,
      aiAnalysis,
      analysisData
    );
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshProperties();
    }
  };

  const updateManagerDispatch = async (propertyId: string, recipient: string, sent: boolean, clientId?: string): Promise<void> => {
    const { success, error } = await propertyService.updateManagerDispatch(propertyId, recipient, sent, clientId);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshProperties();
    }
  };

  const markAsSold = async (propertyId: string, soldDate: string, soldAmount: number, buyerName: string): Promise<void> => {
    const { success, error } = await propertyService.markAsSold(propertyId, soldDate, soldAmount, buyerName);
    if (error) {
      alert(error);
      return;
    }
    if (success) {
      await refreshProperties();
    }
  };

  // --- FILE MANAGEMENT ---
  const uploadDocument = async (propertyId: string, file: File, docType: string): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const extension = file.name.split('.').pop() || 'dat';
        const cleanDocType = docType.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const newFileName = `PROP-${propertyId}_${cleanDocType}_${Date.now()}.${extension}`;

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
      currentUser, users, properties, clients, isAuthenticated, isLoading,
      login, createUser, logout, updateUserRole, toggleUserBlock,
      addClient, removeClient,
      findPropertyByUrl, addProperty, addProperties, claimProperty, updateStatus, updateManagerDispatch, markAsSold, getStats,
      uploadDocument
    }}>
      {children}
    </AppContext.Provider>
  );
};
