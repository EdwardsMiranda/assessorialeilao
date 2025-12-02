
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisStatus } from '../types';
import { Trophy, Calendar, DollarSign, User, TrendingUp, MapPin, Briefcase, Search, ArrowUpDown, CalendarCheck, AlertOctagon } from 'lucide-react';

export const SoldProperties: React.FC = () => {
  const { properties, users } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'auctionDate' | 'homologationDate' | 'buyer' | 'analyst'>('auctionDate');
  const [monthFilter, setMonthFilter] = useState('');

  const soldProperties = properties.filter(p => p.status === AnalysisStatus.ARREMATADO);

  const getAnalystName = (userId: string | null) => {
    if (!userId) return 'Desconhecido';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Desconhecido';
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Filter and Sort Logic
  const filteredAndSortedProperties = soldProperties
    .filter(p => {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = p.title?.toLowerCase().includes(searchLower) || false;
        const buyerMatch = p.buyerName?.toLowerCase().includes(searchLower) || false;
        const analystMatch = getAnalystName(p.assignedTo).toLowerCase().includes(searchLower);
        
        // Month Filter Logic (Sold Date - When the deal happened)
        // Fallback to auctionDate if soldDate is missing (though markAsSold requires it)
        const dateToCheck = p.soldDate || p.auctionDate;
        const matchesMonth = monthFilter ? dateToCheck.startsWith(monthFilter) : true;
        
        return (titleMatch || buyerMatch || analystMatch) && matchesMonth;
    })
    .sort((a, b) => {
        switch (sortBy) {
            case 'auctionDate':
                return new Date(b.auctionDate).getTime() - new Date(a.auctionDate).getTime(); // Recentes primeiro
            case 'homologationDate':
                const dateA = a.analysisData?.homologationDate ? new Date(a.analysisData.homologationDate).getTime() : 0;
                const dateB = b.analysisData?.homologationDate ? new Date(b.analysisData.homologationDate).getTime() : 0;
                return dateB - dateA;
            case 'buyer':
                return (a.buyerName || '').localeCompare(b.buyerName || '');
            case 'analyst':
                return getAnalystName(a.assignedTo).localeCompare(getAnalystName(b.assignedTo));
            default:
                return 0;
        }
    });

  // Calculations for Summary based on FILTERED results to reflect month selection
  const totalProfit = filteredAndSortedProperties.reduce((acc, p) => acc + (p.analysisData?.finalNetProfit || 0), 0);
  const totalInvested = filteredAndSortedProperties.reduce((acc, p) => acc + (p.soldAmount || p.analysisData?.initialBid || 0), 0);
  const totalCount = filteredAndSortedProperties.length;

  // Function to check if we should alert (Today >= Homologation)
  const shouldAlertPayment = (homologationDate?: string) => {
      if (!homologationDate) return false;
      const hDate = new Date(homologationDate);
      const today = new Date();
      // Remove time for comparison
      hDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return today >= hDate;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Imóveis Arrematados
          </h2>
          <p className="text-gray-500">Histórico de sucessos e lucros consolidados.</p>
        </div>

        {/* Month Filter */}
        <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Mês de Referência (Arremate)
            </label>
            <input 
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
                  <Trophy className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Imóveis Arrematados</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full">
                  <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Lucro Líquido Projetado</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
              </div>
          </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                  <DollarSign className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-gray-500 font-medium">Volume Total Arrematado</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvested)}</p>
              </div>
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
                placeholder="Buscar por Comprador, Analista ou Imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="relative w-full md:w-auto">
            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white text-gray-900"
            >
                <option value="auctionDate">Ordenar: Data Leilão</option>
                <option value="homologationDate">Ordenar: Data Homologação</option>
                <option value="buyer">Ordenar: Comprador</option>
                <option value="analyst">Ordenar: Analista</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ArrowUpDown className="w-4 h-4" />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          {filteredAndSortedProperties.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">Nenhum imóvel encontrado com os filtros atuais.</p>
              </div>
          ) : (
              filteredAndSortedProperties.map(prop => {
                  const alertPayment = shouldAlertPayment(prop.analysisData?.homologationDate);

                  return (
                    <div key={prop.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all ${alertPayment ? 'border-red-300 ring-2 ring-red-100' : 'border-yellow-200'}`}>
                        {/* Ribbon */}
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                            ARREMATADO EM {prop.soldDate ? new Date(prop.soldDate).toLocaleDateString('pt-BR') : 'Data N/D'}
                        </div>

                        {/* Payment Alert Badge */}
                        {alertPayment && (
                            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg shadow-sm flex items-center gap-1 animate-pulse">
                                <AlertOctagon className="w-3 h-3" /> COBRAR CLIENTE
                            </div>
                        )}

                        <div className="flex-1 space-y-3 mt-4 md:mt-0">
                            <h3 className="text-xl font-bold text-gray-900 pr-32">{prop.title}</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {prop.analysisData?.cityState}</span>
                                <span className="flex items-center gap-1" title="Data do Leilão"><Calendar className="w-4 h-4" /> Leilão: {new Date(prop.auctionDate).toLocaleDateString('pt-BR')}</span>
                                {prop.analysisData?.homologationDate && (
                                    <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded border ${alertPayment ? 'text-red-700 bg-red-50 border-red-100' : 'text-purple-700 bg-purple-50 border-purple-100'}`} title="Data de Homologação">
                                        <CalendarCheck className="w-4 h-4" /> Homologação: {new Date(prop.analysisData.homologationDate).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                    <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                                        <p className="text-xs text-yellow-700 font-semibold">Valor Arrematado</p>
                                        <p className="font-bold text-gray-900 text-lg">{formatCurrency(prop.soldAmount || prop.analysisData?.initialBid || 0)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Comprador</p>
                                        <p className="font-bold text-gray-900 truncate" title={prop.buyerName}>{prop.buyerName || 'Não Informado'}</p>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <p className="text-xs text-green-700">Lucro Líquido Proj.</p>
                                        <p className="font-bold text-green-700">{formatCurrency(prop.analysisData?.finalNetProfit || 0)}</p>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <p className="text-xs text-green-700">ROI Projetado</p>
                                        <p className="font-bold text-green-700">{(prop.analysisData?.finalRoi || 0).toFixed(2)}%</p>
                                    </div>
                            </div>
                        </div>

                        <div className="md:w-64 border-l pl-6 border-gray-100 flex flex-col justify-center">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Analista Responsável</p>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{getAnalystName(prop.assignedTo)}</p>
                                    <p className="text-xs text-gray-500">Analista</p>
                                </div>
                            </div>
                        </div>
                    </div>
                  );
              })
          )}
      </div>
    </div>
  );
};
