
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisStatus, Property } from '../types';
import { formatDate } from '../utils/formatters';
import { ExternalLink, Edit, CheckCircle2, XCircle, Search, Calendar, CheckSquare } from 'lucide-react';
import { AnalysisModal } from '../components/AnalysisModal';

export const MyWork: React.FC = () => {
  const { properties, currentUser } = useApp();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'modality' | 'status'>('date');
  const [monthFilter, setMonthFilter] = useState('');

  // Filter for properties assigned to current user OR properties that are already completed (history)
  const myProperties = currentUser ? properties.filter(p => p.assignedTo === currentUser.id) : [];

  // Apply Filters and Sort
  const filteredAndSortedProperties = myProperties
    .filter(p => {
      const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

      // Month Filter Logic (Auction Date)
      const matchesMonth = monthFilter ? p.auctionDate.startsWith(monthFilter) : true;

      return matchesSearch && matchesStatus && matchesMonth;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
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
          <h2 className="text-2xl font-bold text-gray-800">Minhas Análises</h2>
          <p className="text-gray-500">Gerencie sua fila de trabalho.</p>
        </div>

        {/* Month Filter */}
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Mês do Leilão
          </label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              onChange={(e) => setSortBy(e.target.value as any)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900"
            >
              <option value="date">Ordenar: Data Leilão</option>
              <option value="title">Ordenar: Nome Imóvel</option>
              <option value="modality">Ordenar: Modalidade</option>
              <option value="status">Ordenar: Status</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imóvel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Leilão</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modalidade</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedProperties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Nenhum imóvel encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{prop.title}</span>
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
