
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisStatus, Property, Client } from '../types';
import { Eye, DollarSign, Send, MapPin, CreditCard, Gavel, Search, ArrowUpDown, Trophy, X, Calendar } from 'lucide-react';
import { AnalysisModal } from '../components/AnalysisModal';
import { formatCurrency } from '../utils/formatters';

export const AdminOpportunities: React.FC = () => {
    const { properties, clients, updateManagerDispatch, markAsSold, updateStatus } = useApp();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    // Arrematação Modal State
    const [isArrematarModalOpen, setIsArrematarModalOpen] = useState(false);
    const [arrematarPropId, setArrematarPropId] = useState<string | null>(null);
    const [soldDate, setSoldDate] = useState(new Date().toISOString().split('T')[0]);
    const [soldAmount, setSoldAmount] = useState<number>(0);
    const [buyerName, setBuyerName] = useState('');

    // States for Filtering and Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'roi' | 'date' | 'city' | 'title'>('roi');
    const [monthFilter, setMonthFilter] = useState('');

    const openArrematarModal = (prop: Property) => {
        setArrematarPropId(prop.id);
        setSoldAmount(prop.analysisData?.initialBid || 0);
        setIsArrematarModalOpen(true);
    };

    const confirmArremate = () => {
        if (arrematarPropId) {
            markAsSold(arrematarPropId, soldDate, soldAmount, buyerName);
            setIsArrematarModalOpen(false);
            setArrematarPropId(null);
            setBuyerName('');
        }
    };

    const checkClientMatch = (client: Client, prop: Property) => {
        const data = prop.analysisData;
        if (!data) return false;

        const cityMatch = client.investmentThesis.cities.some((c: string) =>
            data.cityState.toLowerCase().includes(c.toLowerCase())
        );
        const valueMatch = client.investmentThesis.maxBidValue >= data.initialBid;
        // Payment match is loose for now
        return cityMatch && valueMatch;
    };

    // Calculate Total Cost Helper if needed (or use finalNetProfit)
    const calculateTotalCost = (data: any) => {
        return (data.initialBid || 0) +
            (data.itbiRate ? (data.venalValue * data.itbiRate / 100) : 0) +
            (data.registryValue || 0) +
            (data.renovationValue || 0) +
            (data.condoDebt || 0) +
            (data.iptuDebt || 0);
    };

    // Filter properties: ANALISADO and ROI > 20
    const processedProperties = properties
        .filter(p => p.status === AnalysisStatus.ANALISADO && (p.analysisData?.finalRoi || 0) > 20)
        .filter(p => {
            if (!monthFilter) return true;
            return p.auctionDate?.startsWith(monthFilter);
        })
        .filter(p => {
            if (!searchTerm) return true;
            return (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.analysisData?.cityState.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        })
        .sort((a, b) => {
            if (sortBy === 'roi') {
                return (b.analysisData?.finalRoi || 0) - (a.analysisData?.finalRoi || 0);
            }
            if (sortBy === 'date') {
                return (a.auctionDate || '').localeCompare(b.auctionDate || '');
            }
            if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '');
            }
            if (sortBy === 'city') {
                return (a.analysisData?.cityState || '').localeCompare(b.analysisData?.cityState || '');
            }
            return 0;
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    Oportunidades Validadas
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {processedProperties.length}
                    </span>
                </h1>

                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar imóvel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none w-64"
                        />
                    </div>

                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                        />
                    </div>

                    <div className="relative">
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none appearance-none bg-white cursor-pointer"
                        >
                            <option value="roi">Maior ROI</option>
                            <option value="date">Próximos Leilões</option>
                            <option value="city">Cidade</option>
                            <option value="title">Título</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {processedProperties.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhuma oportunidade encontrada</h3>
                        <p className="text-gray-500">Tente ajustar seus filtros de busca</p>
                    </div>
                ) : (
                    processedProperties.map(prop => {
                        const data = prop.analysisData!;
                        // Calculate profit dynamically if needed
                        const profit = data.finalNetProfit ?? (data.bankValuation - calculateTotalCost(data));

                        // Find matched clients
                        const matchedClients = clients.filter(client => {
                            const cityMatch = client.investmentThesis.cities.some((c: string) =>
                                data.cityState.toLowerCase().includes(c.toLowerCase())
                            );
                            const valueMatch = client.investmentThesis.maxBidValue >= data.initialBid;
                            const paymentMatch = !client.investmentThesis.paymentMethods || client.investmentThesis.paymentMethods.length === 0 ||
                                client.investmentThesis.paymentMethods.some((pm: string) =>
                                    data.paymentMethod.toLowerCase().includes(pm.toLowerCase())
                                );
                            return cityMatch && valueMatch && paymentMatch;
                        });

                        // Manager Logic Variables
                        const recipient = prop.managerDispatch?.recipient || '';
                        const isSent = prop.managerDispatch?.sent || false;
                        const clientId = prop.managerDispatch?.clientId || '';

                        return (
                            <div key={prop.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Leilão</span>
                                            <span className="font-bold text-gray-900 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                {new Date(prop.auctionDate!).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                        <div className="h-8 w-px bg-gray-300 mx-2"></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ROI</span>
                                            <span className="font-bold text-green-600 text-lg">
                                                {data.finalRoi}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Lost Opportunity Button */}
                                        {prop.auctionDate && prop.auctionDate < new Date().toISOString().split('T')[0] && (
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm("Marcar como Oportunidade Perdida? O leilão já passou.")) {
                                                        await updateStatus(prop.id, AnalysisStatus.PERDIDA);
                                                    }
                                                }}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs font-bold rounded hover:bg-gray-700 shadow-sm transition-colors"
                                                title="Leilão já ocorreu"
                                            >
                                                <X className="w-3 h-3" /> PERDIDA
                                            </button>
                                        )}

                                        <button
                                            onClick={() => openArrematarModal(prop)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded hover:bg-yellow-500 shadow-sm transition-colors"
                                            title="Marcar como Arrematado"
                                        >
                                            <Trophy className="w-3 h-3" /> ARREMATADO
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 flex flex-col lg:flex-row justify-between gap-6">
                                    {/* Left: Main Property Info */}
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{prop.title}</h3>
                                            <div className="flex items-center gap-2 text-gray-600 text-sm mt-1 font-medium">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                {data.cityState} • {data.condoName}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                            <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                    <Gavel className="w-3 h-3" /> Lance Inicial
                                                </p>
                                                <p className="font-bold text-gray-900">{formatCurrency(data.initialBid)}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                                    <CreditCard className="w-3 h-3" /> Pagamento
                                                </p>
                                                <p className="font-bold text-gray-900 truncate" title={data.paymentMethod}>
                                                    {data.paymentMethod}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 p-2 rounded border border-green-100 col-span-2">
                                                <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" /> Lucro Líquido Estimado
                                                </p>
                                                <p className="font-bold text-green-800 text-base">{formatCurrency(profit)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Management Actions */}
                                    <div className="lg:w-80 flex flex-col gap-3 border-l pl-0 lg:pl-6 border-gray-100">
                                        {/* Client Suggestions */}
                                        {matchedClients.length > 0 && (
                                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-200">
                                                <label className="block text-xs font-bold text-purple-900 mb-2 flex items-center gap-1">
                                                    <Trophy className="w-3 h-3" /> Clientes Sugeridos ({matchedClients.length})
                                                </label>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {matchedClients.map(client => (
                                                        <div key={client.id} className="bg-white p-2 rounded border border-purple-200 text-xs shadow-sm">
                                                            <p className="font-bold text-purple-900">{client.name}</p>
                                                            <div className="mt-1 space-y-0.5 text-[10px] text-gray-600">
                                                                <p>★ Match de Tese</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <label className="block text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                                <Send className="w-3 h-3" /> Destino (CRM)
                                            </label>

                                            <select
                                                value={clientId}
                                                onChange={(e) => {
                                                    const selectedClient = clients.find(c => c.id === e.target.value);
                                                    updateManagerDispatch(prop.id, selectedClient ? selectedClient.name : '', isSent, e.target.value);
                                                }}
                                                className="w-full text-sm p-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white text-gray-900 mb-2"
                                            >
                                                <option value="">Selecione um cliente...</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} {checkClientMatch(c, prop) ? '★' : ''}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`sent-${prop.id}`}
                                                    checked={isSent}
                                                    onChange={(e) => updateManagerDispatch(prop.id, recipient, e.target.checked, clientId)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                />
                                                <label htmlFor={`sent-${prop.id}`} className="text-sm text-blue-900 font-medium cursor-pointer select-none">
                                                    Marcar como Enviado
                                                </label>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-2 space-y-2">
                                            <button
                                                onClick={() => setSelectedProperty(prop)}
                                                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Revisar Análise
                                            </button>

                                            <div className="grid grid-cols-2 gap-2">
                                                <a
                                                    href={prop.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-full text-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 py-1.5 rounded flex items-center justify-center"
                                                >
                                                    Link Original
                                                </a>
                                                {data.auctionLotLink && (
                                                    <a
                                                        href={data.auctionLotLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full text-center text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 py-1.5 rounded font-bold flex items-center justify-center gap-1"
                                                    >
                                                        <Gavel className="w-3 h-3" /> Arrematar
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedProperty && (
                <AnalysisModal
                    property={selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                />
            )}

            {isArrematarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-yellow-400 p-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                                <Trophy className="w-5 h-5" /> Confirmar Arrematação
                            </h3>
                            <button onClick={() => setIsArrematarModalOpen(false)} className="text-yellow-900 hover:bg-yellow-500 rounded p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                Parabéns! Preencha os dados finais da arrematação para mover este imóvel para o histórico de sucessos.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Arrematação</label>
                                <input
                                    type="date"
                                    value={soldDate}
                                    onChange={(e) => setSoldDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Arrematado (R$)</label>
                                <input
                                    type="number"
                                    value={soldAmount}
                                    onChange={(e) => setSoldAmount(parseFloat(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500 font-bold bg-white text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente / Comprador</label>
                                <input
                                    type="text"
                                    value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                    placeholder="Nome completo..."
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setIsArrematarModalOpen(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmArremate}
                                    className="flex-1 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-bold shadow-sm"
                                >
                                    Confirmar Sucesso
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
