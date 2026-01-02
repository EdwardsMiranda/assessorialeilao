
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AuctionModality } from '../types';
import { Plus, Link as LinkIcon, Building, Calendar, FileSpreadsheet, Upload, Download, AlertTriangle, CheckCircle, Copy, Brain, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { extractDataFromUrl, checkPropertyFit } from '../services/geminiService';


export const Inbox: React.FC = () => {
    const { addProperty, addProperties, findPropertyByUrl, clients } = useApp();
    const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'smart'>('manual');

    // Manual Form State
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [modality, setModality] = useState<AuctionModality>(AuctionModality.LEILAO_JUDICIAL);
    const [auctionDate, setAuctionDate] = useState('');
    const [successMsg, setSuccessMsg] = useState('');


    const [cityState, setCityState] = useState('');
    const [condoName, setCondoName] = useState('');
    const [privateArea, setPrivateArea] = useState<number | ''>('');
    const [initialBid, setInitialBid] = useState<number | ''>('');
    const [bankValuation, setBankValuation] = useState<number | ''>('');

    // Duplication Modal State
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [existingProp, setExistingProp] = useState<any>(null);

    // Import State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importStats, setImportStats] = useState<{ total: number, errors: number, duplicates: number } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Smart Import State
    const [smartUrls, setSmartUrls] = useState('');
    const [isProcessingSmart, setIsProcessingSmart] = useState(false);
    const [smartLogs, setSmartLogs] = useState<string[]>([]);
    const [smartProgress, setSmartProgress] = useState(0);

    const checkManualDuplication = () => {
        const existing = findPropertyByUrl(url);
        if (existing) {
            setExistingProp(existing);
            setDuplicateModalOpen(true);
            return true;
        }
        return false;
    };

    const confirmManualAdd = () => {
        addProperty(url, modality, auctionDate, title, {
            cityState,
            condoName,
            privateArea: Number(privateArea) || 0,
            initialBid: Number(initialBid) || 0,
            bankValuation: Number(bankValuation) || 0
        });
        resetManualForm();
    };

    const resetManualForm = () => {
        setUrl('');
        setTitle('');
        setAuctionDate('');
        setCityState('');
        setCondoName('');
        setPrivateArea('');
        setInitialBid('');
        setBankValuation('');
        setDuplicateModalOpen(false);
        setExistingProp(null);
        setSuccessMsg('Imóvel cadastrado com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Auction date is optional for Venda Direta
        const isVendaDireta = modality === AuctionModality.VENDA_DIRETA;
        if (!url || !title || (!isVendaDireta && !auctionDate)) return;

        if (checkManualDuplication()) {
            return; // Modal opens
        }

        confirmManualAdd();
    };



    // --- CSV / XLSX Logic ---

    const downloadTemplate = () => {
        // Ordem atualizada: Link, Modalidade, Data
        const headers = ["Link do Imóvel", "Modalidade", "Data do Leilão (AAAA-MM-DD)"];
        const example = ["https://leilao.com/lote/123", "Leilão Judicial", "2025-10-25"];

        // Criar workbook e worksheet
        const wb = XLSX.utils.book_new();
        const wsData = [headers, example];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        // Baixar arquivo xlsx
        XLSX.writeFile(wb, "modelo_importacao_leilao.xlsx");
    };

    const parseModality = (text: string): AuctionModality => {
        if (!text) return AuctionModality.LEILAO_JUDICIAL;
        const normalized = text.toLowerCase().trim();
        if (normalized.includes('judicial')) return AuctionModality.LEILAO_JUDICIAL;
        if (normalized.includes('sfi') || normalized.includes('fiduciária') || normalized.includes('caixa')) return AuctionModality.LEILAO_SFI_CAIXA;
        if (normalized.includes('aberta') || normalized.includes('licitacao')) return AuctionModality.LICITACAO_ABERTA;
        if (normalized.includes('online')) return AuctionModality.VENDA_ONLINE;
        if (normalized.includes('direta')) return AuctionModality.VENDA_DIRETA;
        return AuctionModality.LEILAO_JUDICIAL; // Default fallback
    };

    const processFile = async (file: File) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        let rows: any[][] = [];

        try {
            if (isExcel) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            } else {
                const text = await file.text();
                rows = text.split('\n').map(r => r.split(','));
            }
        } catch (err) {
            alert("Erro ao ler arquivo. Verifique se o formato está correto.");
            return;
        }

        const newItems: Array<{ url: string, modality: AuctionModality, auctionDate: string, title: string }> = [];
        let errors = 0;
        let duplicates = 0;

        // Skip header (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // Expectativa: [0] Link, [1] Modalidade, [2] Data
            const cUrl = row[0]?.toString().trim();
            const cModality = row[1]?.toString().trim();
            const cDate = row[2]?.toString().trim();

            if (!cUrl) {
                // Linha vazia ou inválida
                continue;
            }

            // 1. Check Duplicates
            if (findPropertyByUrl(cUrl)) {
                duplicates++;
                continue; // Pular duplicados na importação em massa para manter limpo
            }

            // 2. Validate Date (optional for Venda Direta)
            const modalityEnum = parseModality(cModality);
            let finalDate = cDate;
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

            // For Venda Direta, empty date is allowed
            if (modalityEnum === AuctionModality.VENDA_DIRETA && !cDate) {
                finalDate = ''; // Allow empty date for Venda Direta
            } else {
                // Attempt to fix Excel date serial number or DD/MM/YYYY
                if (!isNaN(Number(cDate)) && Number(cDate) > 40000) {
                    // Excel serial date
                    const dateObj = new Date(Math.round((Number(cDate) - 25569) * 86400 * 1000));
                    finalDate = dateObj.toISOString().split('T')[0];
                } else if (cDate && cDate.includes('/')) {
                    const parts = cDate.split('/');
                    if (parts.length === 3) {
                        // Assume DD/MM/YYYY -> YYYY-MM-DD
                        finalDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }

                if (!finalDate || (finalDate.length !== 10 && !dateRegex.test(finalDate))) {
                    // Data inválida
                    errors++;
                    continue;
                }
            }

            // Gerar Título Automático já que foi removido da planilha
            const generatedTitle = `Oportunidade ${modalityEnum} - ${finalDate || 'Sem Data'}`;

            newItems.push({
                title: generatedTitle,
                url: cUrl,
                modality: modalityEnum,
                auctionDate: finalDate
            });
        }

        if (newItems.length > 0) {
            addProperties(newItems);
            setSuccessMsg(`${newItems.length} imóveis importados com sucesso!`);
            setTimeout(() => setSuccessMsg(''), 5000);
        }

        setImportStats({ total: newItems.length, errors, duplicates });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    // --- Smart Import Logic ---
    const handleSmartImport = async () => {
        const urls = smartUrls.split('\n').filter(u => u.trim() !== '');
        if (urls.length === 0) return;

        setIsProcessingSmart(true);
        setSmartLogs(['Iniciando análise inteligente...']);
        setSmartProgress(0);

        let addedCount = 0;

        for (let i = 0; i < urls.length; i++) {
            const currentUrl = urls[i].trim();
            setSmartProgress(((i + 1) / urls.length) * 100);

            try {
                // 1. Check duplicate
                if (findPropertyByUrl(currentUrl)) {
                    setSmartLogs(prev => [`⚠️ [Duplicado] ${currentUrl}`, ...prev]);
                    continue;
                }

                setSmartLogs(prev => [`🔍 Analisando: ${currentUrl}...`, ...prev]);

                // 2. Extract Data via AI
                const extractedData = await extractDataFromUrl(currentUrl);

                // 3. Check Fit with Clients
                const { matched, clientIds, reason } = await checkPropertyFit(extractedData, clients);

                if (matched) {
                    // 4. Add Property
                    // Defaulting to Leilão Judicial if not specified, parsing date if valid
                    await addProperty(
                        currentUrl,
                        AuctionModality.LEILAO_JUDICIAL,
                        extractedData.dates?.[0] || new Date().toISOString().split('T')[0], // Fallback date
                        extractedData.title || 'Oportunidade Smart IA',
                        {
                            cityState: extractedData.city || '',
                            initialBid: extractedData.secondAuctionValue || extractedData.assessmentValue || 0,
                            bankValuation: extractedData.assessmentValue || 0,
                            paymentMethod: extractedData.paymentTerms
                        }
                    );

                    // Note: Ideally we would tag the property with interested clients here.
                    // For now, we put it in the analysis notes or similar? 
                    // The 'addProperty' simple signature doesn't support generic metadata update easily 
                    // without a secondary call, but let's keep it simple for now.

                    setSmartLogs(prev => [`✅ [MATCH] Importado! (${reason})`, ...prev]);
                    addedCount++;
                } else {
                    setSmartLogs(prev => [`❌ [Sem Match] Descartado. (${reason})`, ...prev]);
                }

            } catch (err) {
                console.error(err);
                setSmartLogs(prev => [`❌ [Erro] Falha ao processar ${currentUrl}`, ...prev]);
            }
        }

        setSmartLogs(prev => [`🏁 Concluído! ${addedCount} imóveis importados de ${urls.length} analisados.`, ...prev]);
        setIsProcessingSmart(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Duplication Warning Modal */}
            {duplicateModalOpen && existingProp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in zoom-in duration-200">
                        <div className="flex items-center gap-2 text-yellow-600 mb-4">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Imóvel Já Cadastrado</h3>
                        </div>

                        <p className="text-gray-600 mb-4 text-sm">
                            O link deste imóvel já consta em nossa base de dados.
                        </p>

                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm space-y-2 mb-6">
                            <p><strong>Status:</strong> {existingProp.status}</p>
                            <p><strong>Data Leilão:</strong> {formatDate(existingProp.auctionDate)}</p>
                            {existingProp.assignedTo && (
                                <p><strong>Analista:</strong> {existingProp.assignedTo}</p>
                            )}
                            <a href={existingProp.url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate block">
                                {existingProp.url}
                            </a>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDuplicateModalOpen(false)}
                                className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmManualAdd}
                                className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center justify-center gap-2"
                            >
                                <Copy className="w-4 h-4" /> Duplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Cadastro Manual
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'import' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Importação em Massa (XLSX/CSV)
                    </button>
                    <button
                        onClick={() => setActiveTab('smart')}
                        className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'smart' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Brain className="w-4 h-4" /> Importação Inteligente (IA)
                        </span>
                    </button>
                </div>

                <div className="p-8">
                    {activeTab === 'manual' ? (
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Novo Imóvel</h2>
                                <p className="text-gray-500 mt-2">Adicione um leilão individualmente.</p>
                            </div>

                            <form onSubmit={handleManualSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Título / Identificação</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            placeholder="Ex: Apartamento 3 Quartos - Jardins/SP"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Modalidade</label>
                                        <select
                                            value={modality}
                                            onChange={(e) => setModality(e.target.value as AuctionModality)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        >
                                            {Object.values(AuctionModality).map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Data do Leilão {modality === AuctionModality.VENDA_DIRETA && <span className="text-gray-500 text-xs">(Opcional)</span>}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Calendar className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="date"
                                                required={modality !== AuctionModality.VENDA_DIRETA}
                                                value={auctionDate}
                                                onChange={(e) => setAuctionDate(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link do Imóvel</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <LinkIcon className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="url"
                                                required
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                placeholder="https://site-do-leiloeiro.com.br/lote/..."
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Cole o link do imóvel para referência.
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Building className="w-4 h-4 text-gray-500" />
                                        Dados do Imóvel (Opcional)
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Cidade / UF</label>
                                            <input
                                                type="text"
                                                value={cityState}
                                                onChange={(e) => setCityState(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="Ex: São Paulo-SP"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Condomínio</label>
                                            <input
                                                type="text"
                                                value={condoName}
                                                onChange={(e) => setCondoName(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="Nome do Edifício"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Área Privativa (m²)</label>
                                            <input
                                                type="number"
                                                value={privateArea}
                                                onChange={(e) => setPrivateArea(e.target.value ? Number(e.target.value) : '')}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Lance Inicial (R$)</label>
                                            <input
                                                type="number"
                                                value={initialBid}
                                                onChange={(e) => setInitialBid(e.target.value ? Number(e.target.value) : '')}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Avaliação Banco (R$)</label>
                                            <input
                                                type="number"
                                                value={bankValuation}
                                                onChange={(e) => setBankValuation(e.target.value ? Number(e.target.value) : '')}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Adicionar Imóvel
                                </button>
                            </form>
                        </>
                    ) : activeTab === 'import' ? (
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Importar Planilha</h2>
                                <p className="text-gray-500 mt-2">Carregue vários imóveis de uma vez via Excel (.xlsx) ou CSV.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                    <div className="p-2 bg-white rounded-full text-blue-500 shadow-sm">
                                        <Download className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-900">Passo 1: Baixe o modelo</h4>
                                        <p className="text-xs text-blue-700 mb-2">A ordem das colunas deve ser: <strong>1) Link, 2) Modalidade, 3) Data</strong>.</p>
                                        <button
                                            onClick={downloadTemplate}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Download Template.xlsx
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className={`w-10 h-10 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <p className="text-sm font-medium text-gray-700 text-center">
                                        Arraste seu arquivo Excel/CSV aqui ou <span className="text-blue-600">clique para selecionar</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">Suporta .xlsx e .csv</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".csv, .xlsx, .xls"
                                        className="hidden"
                                    />
                                </div>

                                {importStats && (
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-900 mb-2">Resumo da Importação</h4>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center gap-2 text-sm text-green-700">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>{importStats.total} novos importados</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-yellow-700">
                                                <Copy className="w-4 h-4" />
                                                <span>{importStats.duplicates} duplicados (ignorados)</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-red-700">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>{importStats.errors} erros/inválidos</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-4">
                                    <Brain className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Importação Inteligente com IA</h2>
                                <p className="text-gray-500 mt-2">Cole links e a IA filtrará apenas o que atende seus clientes.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm text-purple-900">
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><Brain className="w-4 h-4" /> Como funciona?</h4>
                                    <ul className="list-disc list-inside space-y-1 text-purple-800">
                                        <li>Cole uma lista de links de leilões (um por linha).</li>
                                        <li>A IA vai ler cada página e extrair os dados.</li>
                                        <li>Em seguida, cruzará com a tese de todos os seus investidores.</li>
                                        <li><strong>Apenas imóveis com "Match" serão importados.</strong></li>
                                    </ul>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Links dos Imóveis (Um por linha)</label>
                                    <textarea
                                        value={smartUrls}
                                        onChange={e => setSmartUrls(e.target.value)}
                                        rows={8}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                                        placeholder={`https://leilao.com/lote/1\nhttps://leilao.com/lote/2\n...`}
                                        disabled={isProcessingSmart}
                                    />
                                </div>

                                <button
                                    onClick={handleSmartImport}
                                    disabled={isProcessingSmart || !smartUrls.trim()}
                                    className="w-full py-3 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isProcessingSmart ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" /> Processando... {Math.round(smartProgress)}%
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-5 h-5" /> Iniciar Análise e Importação
                                        </>
                                    )}
                                </button>

                                {/* Logs Area */}
                                {smartLogs.length > 0 && (
                                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs max-h-60 overflow-y-auto">
                                        {smartLogs.map((log, i) => (
                                            <div key={i} className={`mb-1 ${log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : log.includes('⚠️') ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {successMsg && (
                        <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            {successMsg}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
