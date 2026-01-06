import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisStatus, Property } from '../types';
import { formatDate } from '../utils/formatters';
import { ExternalLink, Edit, CheckCircle2, XCircle, Search, Calendar, CheckSquare } from 'lucide-react';
import { AnalysisModal } from '../components/AnalysisModal';

export const MyWork: React.FC = () => {
  const [searchStr, setSearchStr] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'modality' | 'status'>('date');
  const [monthFilter, setMonthFilter] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { properties, currentUser, deletePropertiesBulk, isManager, users } = useApp();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // GESTOR vê todas as análises, ANALISTA vê apenas as suas
  const myProperties = currentUser
    ? isManager
      ? properties  // Gestor vê TODAS as propriedades
      : properties.filter((p: Property) => p.assignedTo === currentUser.id)  // Analista vê só as suas
    : [];

  // Helper para obter nome do analista
  const getAnalystName = (assignedTo: string | undefined) => {
    if (!assignedTo) return 'Não atribuído';
    const user = users.find(u => u.id === assignedTo);
    return user?.name || 'Desconhecido';
  };

  // Apply Filters and Sort
  const filteredAndSortedProperties = myProperties
    .filter((p: Property) => {
      const search = searchStr.toLowerCase();
      const matchesSearch =
        p.title?.toLowerCase().includes(search) ||
        p.displayId?.toLowerCase().includes(search) ||
        false;
      const matchesStatus = filterStatus === 'all' ? true : p.status === filterStatus;

      // Month Filter Logic (Auction Date) - skip empty dates
      const matchesMonth = monthFilter ? (p.auctionDate && p.auctionDate.startsWith(monthFilter)) : true;

      return matchesSearch && matchesStatus && matchesMonth;
    })
    .sort((a: Property, b: Property) => {
      switch (sortBy) {
        case 'date':
          // Handle empty dates - put them at the end
          if (!a.auctionDate && !b.auctionDate) return 0;
          if (!a.auctionDate) return 1;
          if (!b.auctionDate) return -1;
          return new Date(a.auctionDate).getTime() - new Date(b.auctionDate).getTime();
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'modality':
          return a.modality.localeCompare(b.modality);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const getStatusColor = (status: AnalysisStatus) => {
    switch (status) {
      case AnalysisStatus.EM_ANALISE: return 'bg-blue-100 text-blue-800';
      case AnalysisStatus.ANALISADO: return 'bg-green-100 text-green-800';
      case AnalysisStatus.ABORTADO: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedProperties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedProperties.map((p: Property) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} análises ? `)) {
      try {
        await deletePropertiesBulk(selectedIds);
        setSelectedIds([]);
      } catch (error) {
        console.error('Error deleting properties:', error);
        alert('Erro ao excluir propriedades.');
      }
    }
  };

  const getStatusIcon = (status: AnalysisStatus) => {
    switch (status) {
      case AnalysisStatus.ANALISADO: return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case AnalysisStatus.ABORTADO: return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{isManager ? 'Análises da Equipe' : 'Minhas Análises'}</h2>
          <p className="text-gray-500">{isManager ? 'Acompanhe todas as análises da equipe.' : 'Gerencie sua fila de trabalho.'}</p>
        </div>

        {/* Month Filter */}
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Mês do Leilão
          </label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthFilter(e.target.value)}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-300 focus:ring focus:ring-blue-200 sm:text-sm"
            placeholder="Buscar por nome do imóvel..."
            value={searchStr}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchStr(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900"
            >
              <option value="all">Status: Todos</option>
              <option value={AnalysisStatus.EM_ANALISE}>Em Análise</option>
              <option value={AnalysisStatus.ANALISADO}>Analisado</option>
              <option value={AnalysisStatus.ABORTADO}>Abortado</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900"
            >
              <option value="date">Ordenar: Data Leilão</option>
              <option value="title">Ordenar: Nome Imóvel</option>
              <option value="modality">Ordenar: Modalidade</option>
              <option value="status">Ordenar: Status</option>
            </select>
          </div>
        </div>

        {isManager && selectedIds.length > 0 && (
          <button
            onClick={handleDeleteBulk}
            className="w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Excluir Selecionados ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isManager && (
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredAndSortedProperties.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imóvel</th>
                {isManager && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analista</th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Leilão</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modalidade</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedProperties.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="px-6 py-10 text-center text-gray-500">
                    Nenhum imóvel encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProperties.map((prop: Property) => (
                  <tr key={prop.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(prop.id) ? 'bg-blue-50' : ''}`}>
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(prop.id)}
                          onChange={() => toggleSelectOne(prop.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                            {prop.displayId}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{prop.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={prop.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            Ver link <ExternalLink className="w-3 h-3" />
                          </a>
                          {prop.managerDispatch?.sent && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1 border border-green-200">
                              <CheckSquare className="w-3 h-3" /> Enviado ao Cliente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-medium">
                          {getAnalystName(prop.assignedTo || undefined)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {formatDate(prop.auctionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prop.modality}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${getStatusColor(prop.status)}`}>
                        {getStatusIcon(prop.status)}
                        {prop.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedProperty(prop)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 w-full"
                      >
                        {prop.status === AnalysisStatus.EM_ANALISE ? 'Continuar' : 'Revisar'}
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProperty && (
        <AnalysisModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
};
