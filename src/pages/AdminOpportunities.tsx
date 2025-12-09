
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisStatus, Property } from '../types';
import { Eye, DollarSign, AlertTriangle, Send, CheckSquare, MapPin, CreditCard, Gavel, Search, ArrowUpDown, Trophy, X, Calendar } from 'lucide-react';
import { AnalysisModal } from '../components/AnalysisModal';

export const AdminOpportunities: React.FC = () => {
    const { properties, clients, updateManagerDispatch, markAsSold } = useApp();
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

    // Filter: Status ANALISADO and ROI > 20%
    const validatedProperties = properties.filter(p => {
        return p.status === AnalysisStatus.ANALISADO &&
            (p.analysisData?.finalRoi || 0) > 20;
    });

    // Apply Search, Sort, and Month Filter
    const processedProperties = validatedProperties
        .filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const titleMatch = p.title?.toLowerCase().includes(searchLower) || false;
            const cityMatch = p.analysisData?.cityState?.toLowerCase().includes(searchLower) || false;

            // Month Filter Logic (Auction Date)
            const matchesMonth = monthFilter ? p.auctionDate.startsWith(monthFilter) : true;

            return (titleMatch || cityMatch) && matchesMonth;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'roi':
                    // Higher ROI first
                    return (b.analysisData?.finalRoi || 0) - (a.analysisData?.finalRoi || 0);
                case 'date':
                    // Closest date first
                    return new Date(a.auctionDate).getTime() - new Date(b.auctionDate).getTime();
                case 'city':
                    return (a.analysisData?.cityState || '').localeCompare(b.analysisData?.cityState || '');
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                default:
                    return 0;
            }
        });

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const openArrematarModal = (prop: Property) => {
        setArrematarPropId(prop.id);
        setSoldAmount(prop.analysisData?.initialBid || 0);
        setBuyerName(prop.managerDispatch?.recipient || ''); // Suggest the CRM recipient
        setSoldDate(new Date().toISOString().split('T')[0]);
        setIsArrematarModalOpen(true);
    };

    const confirmArremate = () => {
        if (arrematarPropId && soldAmount > 0 && buyerName) {
            markAsSold(arrematarPropId, soldDate, soldAmount, buyerName);
            setIsArrematarModalOpen(false);
            setArrematarPropId(null);
        } else {
            alert("Por favor, preencha o valor e o nome do comprador.");
        }
    };

    // Helper to check thesis match
    const checkClientMatch = (client: any, prop: Property) => {
        if (!prop.analysisData) return false;
        const cityMatch = client.investmentThesis.cities.some((c: string) =>
            prop.analysisData?.cityState.toLowerCase().includes(c.toLowerCase())
        );
        const valueMatch = client.investmentThesis.maxBidValue >= prop.analysisData.initialBid;
        return cityMatch && valueMatch;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Oportunidades Validadas</h2>
                    <p className="text-gray-500">Imóveis analisados com ROI superior a 20%.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Month Filter */}
                    <div className="w-full md:w-48">
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

                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit">
                        {processedProperties.length} encontradas
                    </span>
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
                        placeholder="Buscar por Nome ou Cidade..."
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
                        <option value="roi">Ordenar: Maior ROI</option>
                        <option value="date">Ordenar: Data Leilão</option>
                        <option value="city">Ordenar: Cidade/UF</option>
                        <option value="title">Ordenar: Nome Imóvel</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <ArrowUpDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {processedProperties.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Nenhuma oportunidade validada encontrada com os filtros atuais.</p>
                    </div>
                ) : (
                    processedProperties.map(prop => {
                        const data = prop.analysisData!;
                        const roi = data.finalRoi || 0;
                        const profit = data.finalNetProfit || 0;
                        const waitingLawyer = data.waitingLawyer;
                        const recipient = prop.managerDispatch?.recipient || '';
                        const clientId = prop.managerDispatch?.clientId || '';
                        const isSent = prop.managerDispatch?.sent || false;

                        // CRM Matches
                        const matchedClients = clients.filter(c => checkClientMatch(c, prop));

                        return (
                            <div key={prop.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${isSent ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                                <div className="flex flex-col gap-4">

                                    {/* Top Row: Badges */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                ROI: {roi.toFixed(2)}%
                                            </span>
                                            {waitingLawyer && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                    <AlertTriangle className="w-3 h-3" /> Pendência Jurídica
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isSent && (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                    <CheckSquare className="w-3 h-3" /> Enviado
                                                </span>
                                            )}
                                            <button
                                                onClick={() => openArrematarModal(prop)}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded hover:bg-yellow-500 shadow-sm"
                                                title="Marcar como Arrematado"
                                            >
                                                <Trophy className="w-3 h-3" /> ARREMATADO
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:flex-row justify-between gap-6">
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
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                <label className="block text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                                    <Send className="w-3 h-3" /> Destino (CRM)
                                                </label>

                                                {/* Client Selector */}
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

                                                {/* Match Badge */}
                                                {matchedClients.length > 0 && !clientId && (
                                                    <div className="text-[10px] text-blue-600 bg-blue-100 px-2 py-1 rounded mb-2">
                                                        {matchedClients.length} investidor(es) com tese compatível.
                                                    </div>
                                                )}

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

                                                {/* Link Original */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <a
                                                        href={prop.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full text-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 py-1.5 rounded"
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

            {/* Modal de Arrematação */}
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
