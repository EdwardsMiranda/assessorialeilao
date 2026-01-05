import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisStatus } from '../types';
import { Hand, ExternalLink, Calendar, AlertCircle, ArrowUpDown, LayoutGrid, List, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const Marketplace: React.FC = () => {
    const { properties, claimProperty, deleteProperty, deletePropertiesBulk, currentUser } = useApp();

    // Local State for Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Local State for Filters (Independent per user session)
    const [sortBy, setSortBy] = useState<'date' | 'modality' | 'created'>('date');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [monthFilter, setMonthFilter] = useState('');

    // Filter for properties that are STRICTLY not started. 
    // Once claimed, status changes to EM_ANALISE and it disappears from here immediately.
    const availableProperties = properties
        .filter(p => {
            const matchesStatus = p.status === AnalysisStatus.NAO_INICIADO;
            const matchesMonth = monthFilter ? (p.auctionDate && p.auctionDate.startsWith(monthFilter)) : true;
            return matchesStatus && matchesMonth;
        });

    // Sorting Logic
    const sortedProperties = [...availableProperties].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                // Closest date first
                // Handle empty dates - put them at the end
                if (!a.auctionDate && !b.auctionDate) return 0;
                if (!a.auctionDate) return 1;
                if (!b.auctionDate) return -1;
                return new Date(a.auctionDate).getTime() - new Date(b.auctionDate).getTime();
            case 'modality':
                return a.modality.localeCompare(b.modality);
            case 'created':
                // Newest added first
                return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
            default:
                return 0;
        }
    });

    const isUrgent = (dateString: string) => {
        const daysUntil = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 3;
    };

    const handleClaim = async (propertyId: string) => {
        const success = await claimProperty(propertyId);
        if (success) {
            // Success: Property status changes to EM_ANALISE in Context, 
            // triggering re-render and removing it from 'availableProperties' automatically.
        } else {
            // Fail: Likely race condition where someone else took it milliseconds ago
            alert("Atenção: Este imóvel acabou de ser selecionado por outro analista e não está mais disponível.");
        }
    };

    const handleDelete = async (propertyId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta oportunidade? Esta ação não pode ser desfeita.')) return;
        await deleteProperty(propertyId);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === sortedProperties.length && sortedProperties.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(sortedProperties.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} imóveis selecionados? Esta ação não pode ser desfeita.`)) return;

        await deletePropertiesBulk(selectedIds);
        setSelectedIds([]);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Mural de Oportunidades</h2>
                    <p className="text-gray-500">Imóveis aguardando um analista.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        {availableProperties.length} disponíveis
                    </span>

                    {/* Month Filter */}
                    <div className="w-full sm:w-40">
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                            title="Filtrar por Mês do Leilão"
                        />
                    </div>

                    {/* View Toggles - Local State */}
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Visualização em Lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sort - Local State */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500 text-sm"
                        >
                            <option value="date">Ordenar por: Data do Leilão</option>
                            <option value="modality">Ordenar por: Modalidade</option>
                            <option value="created">Ordenar por: Adição (Recentes)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <ArrowUpDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {currentUser?.role === 'Gestor' && sortedProperties.length > 0 && (
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === sortedProperties.length && sortedProperties.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Selecionar Todos</span>
                        </label>
                        {selectedIds.length > 0 && (
                            <span className="text-sm text-gray-500 font-medium">
                                {selectedIds.length} selecionado(s)
                            </span>
                        )}
                    </div>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-bold transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Selecionados
                        </button>
                    )}
                </div>
            )}

            {sortedProperties.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">Nenhum imóvel aguardando análise no momento.</p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedProperties.map(prop => {
                                const urgent = isUrgent(prop.auctionDate);
                                return (
                                    <div key={prop.id} className={`bg-white rounded-xl shadow-sm border ${urgent ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'} p-5 hover:shadow-md transition-shadow flex flex-col justify-between`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {prop.modality}
                                                </span>
                                                {urgent && (
                                                    <span className="flex items-center gap-1 text-xs text-red-600 font-bold">
                                                        <AlertCircle className="w-3 h-3" /> Urgente
                                                    </span>
                                                )}
                                            </div>

                                            {currentUser?.role === 'Gestor' && (
                                                <div className="absolute top-4 left-4 z-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(prop.id)}
                                                        onChange={() => handleToggleSelect(prop.id)}
                                                        className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer border-gray-300 bg-white"
                                                    />
                                                </div>
                                            )}

                                            {currentUser?.role === 'Gestor' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(prop.id);
                                                    }}
                                                    className="absolute top-4 right-4 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Excluir Oportunidade"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                                                    {prop.displayId}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2" title={prop.title}>
                                                {prop.title}
                                            </h3>

                                            <div className={`flex items-center gap-2 text-sm mb-3 ${urgent ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                                                <Calendar className="w-4 h-4" />
                                                <span>Leilão: {formatDate(prop.auctionDate)}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mb-3">
                                                Adicionado em: {formatDate(prop.addedAt)}
                                            </div>

                                            <a
                                                href={prop.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4 truncate"
                                            >
                                                <ExternalLink className="w-3 h-3" /> Link do Leilão
                                            </a>
                                        </div>

                                        <button
                                            onClick={() => handleClaim(prop.id)}
                                            className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${urgent ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                                        >
                                            <Hand className="w-4 h-4" />
                                            Pegar para Analisar
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {currentUser?.role === 'Gestor' && (
                                                <th className="px-6 py-3 text-left w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.length === sortedProperties.length && sortedProperties.length > 0}
                                                        onChange={handleSelectAll}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </th>
                                            )}
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cód</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modalidade</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imóvel / Link</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Leilão</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Adição</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedProperties.map(prop => {
                                            const urgent = isUrgent(prop.auctionDate);
                                            return (
                                                <tr key={prop.id} className={`hover:bg-gray-50 ${selectedIds.includes(prop.id) ? 'bg-blue-50' : ''}`}>
                                                    {currentUser?.role === 'Gestor' && (
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(prop.id)}
                                                                onChange={() => handleToggleSelect(prop.id)}
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                                                            {prop.displayId}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            {prop.modality}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-900 line-clamp-1" title={prop.title}>{prop.title}</span>
                                                            <a
                                                                href={prop.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                                                            >
                                                                {prop.url} <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className={`text-sm ${urgent ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                                                            {formatDate(prop.auctionDate)}
                                                            {urgent && <span className="ml-2 text-[10px] bg-red-100 px-1 rounded border border-red-200">URGENTE</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(prop.addedAt)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                                                        {currentUser?.role === 'Gestor' && (
                                                            <button
                                                                onClick={() => handleDelete(prop.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleClaim(prop.id)}
                                                            className={`px-3 py-1.5 border border-transparent rounded text-xs font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${urgent ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
                                                        >
                                                            Analisar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
