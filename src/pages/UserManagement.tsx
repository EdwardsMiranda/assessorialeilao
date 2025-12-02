
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Shield, ShieldOff, Search, UserPlus, Key } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { users, toggleUserBlock, updateUserRole, createUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // Create User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.ANALYST);
  const [creationMsg, setCreationMsg] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for(let i=0; i<6; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newName || !newEmail || !newPassword) return;

    const success = createUser(newName, newEmail, newPassword, newRole);
    if(success) {
        setCreationMsg('Usuário criado com sucesso!');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setTimeout(() => setCreationMsg(''), 3000);
    } else {
        alert('Erro: Email já cadastrado.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h2>
        <p className="text-gray-500">Crie acessos para sua equipe e gerencie permissões.</p>
      </div>

      {/* Create User Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Criar Novo Acesso
          </h3>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input 
                    type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                    placeholder="Nome do colaborador"
                />
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input 
                    type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                    placeholder="email@leilao.com"
                />
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cargo</label>
                <select
                    value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                >
                    <option value={UserRole.ANALYST}>Analista</option>
                    <option value={UserRole.ADMIN}>Gestor (Admin)</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Senha Inicial</label>
                <div className="relative">
                    <input 
                        type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm pr-8"
                        placeholder="Senha"
                    />
                    <button 
                        type="button" 
                        onClick={generatePassword}
                        className="absolute right-2 top-2 text-gray-400 hover:text-blue-600"
                        title="Gerar senha aleatória"
                    >
                        <Key className="w-4 h-4" />
                    </button>
                </div>
             </div>
             <div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-sm">
                    Criar Usuário
                </button>
             </div>
          </form>
          {creationMsg && <p className="text-green-600 text-sm mt-2">{creationMsg}</p>}
      </div>

      {/* User List Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-700">Usuários Cadastrados</h3>
                 <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
             </div>

             <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-white">
                         <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                             <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                         {filteredUsers.map(user => (
                             <tr key={user.id} className={user.blocked ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                     <div className="flex items-center">
                                         <img className="h-8 w-8 rounded-full" src={user.avatar} alt="" />
                                         <div className="ml-4">
                                             <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                             <div className="text-xs text-gray-500">Senha: {user.password}</div>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {user.email || 'N/A'}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                     <select
                                        value={user.role}
                                        onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                        className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-200 bg-white focus:ring-blue-500 focus:border-blue-500"
                                     >
                                         <option value={UserRole.ANALYST}>Analista</option>
                                         <option value={UserRole.ADMIN}>Gestor (Admin)</option>
                                     </select>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                                     {user.blocked ? (
                                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                             <ShieldOff className="w-3 h-3" /> Bloqueado
                                         </span>
                                     ) : (
                                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                             <Shield className="w-3 h-3" /> Ativo
                                         </span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                     <button
                                         onClick={() => toggleUserBlock(user.id)}
                                         className={`text-xs font-bold px-3 py-1 rounded border ${user.blocked ? 'bg-white text-green-600 border-green-600 hover:bg-green-50' : 'bg-white text-red-600 border-red-600 hover:bg-red-50'}`}
                                     >
                                         {user.blocked ? 'Desbloquear' : 'Bloquear'}
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
      </div>
    </div>
  );
};
