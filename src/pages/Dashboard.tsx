
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckCircle, Users, Trophy, AlertOctagon, TrendingDown, Calendar } from 'lucide-react';
import { AnalysisStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { users, properties } = useApp();
  
  // State for Month Filter (Defaults to current month YYYY-MM)
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  // 1. Filter properties based on Auction Date
  const filteredProperties = properties.filter(p => {
      if (!monthFilter) return true;
      return p.auctionDate.startsWith(monthFilter);
  });

  // 2. Calculate Stats locally based on filtered properties
  const stats = {
      completed: filteredProperties.filter(p => p.status === AnalysisStatus.ANALISADO).length,
      aborted: filteredProperties.filter(p => p.status === AnalysisStatus.ABORTADO).length,
      sold: filteredProperties.filter(p => p.status === AnalysisStatus.ARREMATADO).length,
  };

  // Metrics specifically requested: Analyzed (Completed), Sold (Arrematados), Aborted
  const processedTotal = stats.completed + stats.aborted + stats.sold;
  const abortRate = processedTotal > 0 ? ((stats.aborted / processedTotal) * 100).toFixed(1) : '0.0';

  // Chart data focusing on the result of processed items
  const data = [
    { name: 'Analisados (Aprovados)', value: stats.completed, color: '#22c55e' }, // Green
    { name: 'Arrematados', value: stats.sold, color: '#eab308' }, // Yellow/Gold
    { name: 'Abortados (Reprovados)', value: stats.aborted, color: '#ef4444' }, // Red
  ];

  // Calculate stats per analyst based on filtered properties
  const analystStats = users.map(user => {
      const userProps = filteredProperties.filter(p => p.assignedTo === user.id);
      
      const completed = userProps.filter(p => p.status === AnalysisStatus.ANALISADO).length;
      const aborted = userProps.filter(p => p.status === AnalysisStatus.ABORTADO).length;
      const sold = userProps.filter(p => p.status === AnalysisStatus.ARREMATADO).length;
      const totalProcessed = completed + aborted + sold;
      const userAbortRate = totalProcessed > 0 ? ((aborted / totalProcessed) * 100).toFixed(1) : '0.0';

      return {
          id: user.id,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          completed,
          aborted,
          sold,
          abortRate: userAbortRate,
          totalProcessed
      };
  }).sort((a, b) => b.completed - a.completed);

  const StatCard = ({ title, value, subtext, icon: Icon, color, textColor }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${textColor || 'text-gray-900'}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Visão Geral de Resultados</h2>
            <p className="text-gray-500">Foco em métricas de conclusão, qualidade e arrematação.</p>
        </div>
        
        {/* Month Filter */}
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Mês de Referência (Leilão)
            </label>
            <input 
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Imóveis Analisados" 
            value={stats.completed} 
            subtext="Oportunidades validadas"
            icon={CheckCircle} 
            color="bg-green-500" 
            textColor="text-green-600"
        />
        <StatCard 
            title="Imóveis Arrematados" 
            value={stats.sold} 
            subtext="Sucesso total"
            icon={Trophy} 
            color="bg-yellow-500" 
            textColor="text-yellow-600"
        />
        <StatCard 
            title="Total Abortados" 
            value={stats.aborted} 
            subtext="Descartados por risco"
            icon={AlertOctagon} 
            color="bg-red-500" 
            textColor="text-red-600"
        />
        <StatCard 
            title="Taxa de Aborto" 
            value={`${abortRate}%`} 
            subtext="Sobre imóveis processados"
            icon={TrendingDown} 
            color="bg-gray-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Distribuição de Resultados ({monthFilter || 'Geral'})</h3>
          <div className="h-64 w-full">
            {processedTotal > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                Sem dados para o período selecionado.
              </div>
            )}
          </div>
        </div>
        
        {/* Abort Rate Visual */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Indicador de Qualidade</h3>
          <div className="flex flex-col items-center justify-center h-56">
             <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={parseFloat(abortRate) > 50 ? "text-red-500" : "text-blue-500"}
                    strokeDasharray={`${abortRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className={`text-2xl font-bold ${parseFloat(abortRate) > 50 ? "text-red-600" : "text-blue-600"}`}>
                        {abortRate}%
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Taxa de Aborto</span>
                </div>
             </div>
             <p className="text-center text-xs text-gray-500 mt-4 px-4 leading-relaxed">
                 Um índice alto de aborto pode indicar problemas na origem da captação ou qualidade ruim da lista de imóveis.
             </p>
          </div>
        </div>
      </div>

      {/* Analyst Productivity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-bold text-gray-800">Produtividade e Qualidade por Analista</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analista</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider">Analisados</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-yellow-700 uppercase tracking-wider">Arrematados</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-red-700 uppercase tracking-wider">Abortados</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa de Aborto</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {analystStats.map(user => (
                          <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8">
                                          <img className="h-8 w-8 rounded-full" src={user.avatar} alt="" />
                                      </div>
                                      <div className="ml-4">
                                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                          <div className="text-xs text-gray-500">{user.role}</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 font-bold bg-green-50/50">
                                  {user.completed}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-600 font-bold bg-yellow-50/50">
                                  {user.sold}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600 font-bold bg-red-50/50">
                                  {user.aborted}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      parseFloat(user.abortRate) > 50 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                      {user.abortRate}%
                                  </span>
                              </td>
                          </tr>
                      ))}
                      {analystStats.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-6 py-4 text-center text-gray-500 text-sm">
                                  Nenhum analista com atividades registradas neste período.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
