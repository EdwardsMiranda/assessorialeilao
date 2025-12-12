
import React, { useState, useRef } from 'react';
import { Property, AnalysisStatus, AuctionModality, PropertyAnalysisData, ComparableItem } from '../types';
import { useApp } from '../context/AppContext';
import { X, AlertTriangle, CheckCircle, BrainCircuit, ExternalLink, Calendar, FileText, Scale, MapPin, Search, Calculator, Plus, Trash2, DollarSign, CalendarDays, ChevronDown, ChevronUp, Eye, Percent, Gavel, Edit, Sparkles, ImagePlus, RefreshCw, Check, XCircle } from 'lucide-react';
import { analyzePropertyRisks, extractDataFromImage, extractEditalData, analyzeRegistryFile, getItbiRate, extractDataFromUrl } from '../services/geminiService';

interface AnalysisModalProps {
    property: Property;
    onClose: () => void;
}

// Helper component for "Link or Upload"
const LinkOrUploadInput = ({
    label,
    value,
    onChange,
    disabled,
    placeholder = "https://...",
    onAiAction,
    aiActionLabel = "IA",
    propertyId,
    docType,
}: {
    label?: string,
    value: string,
    onChange: (val: string) => void,
    disabled: boolean,
    placeholder?: string,
    onAiAction?: () => void,
    aiActionLabel?: string,
    propertyId: string,
    docType: string // Type of document for renaming (e.g., "MATRICULA", "EDITAL")
}) => {
    const { uploadDocument } = useApp();
    const [mode, setMode] = useState<'link' | 'upload'>(value.startsWith('[ARQUIVO]') ? 'upload' : 'link');
    const [isUploading, setIsUploading] = useState(false);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            const file = e.target.files[0];

            try {
                // Upload and Rename via Context
                const newFileName = await uploadDocument(propertyId, file, docType);
                onChange(`[ARQUIVO] ${newFileName}`);
            } catch (error) {
                alert("Erro ao salvar arquivo.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-1">
                {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}
                {onAiAction && (
                    <button
                        type="button"
                        onClick={onAiAction}
                        className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                        disabled={disabled}
                        title="Processar com IA"
                    >
                        <Sparkles className="w-3 h-3" /> {aiActionLabel}
                    </button>
                )}
            </div>
            <div className="flex gap-1 mb-1">
                <button
                    type="button"
                    onClick={() => setMode('link')}
                    className={`flex-1 py-0.5 text-[10px] rounded border ${mode === 'link' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                    Link
                </button>
                <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className={`flex-1 py-0.5 text-[10px] rounded border ${mode === 'upload' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                    Upload
                </button>
            </div>

            {mode === 'link' ? (
                <div className="relative">
                    <input
                        type="url"
                        value={value.startsWith('[ARQUIVO]') ? '' : value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="block w-full py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder={placeholder}
                    />
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        disabled={disabled || isUploading}
                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-white"
                    />
                    {isUploading && <span className="text-[10px] text-blue-600 animate-pulse">Enviando e renomeando...</span>}
                    {value.startsWith('[ARQUIVO]') && !isUploading && (
                        <p className="mt-1 text-[10px] text-green-600 flex items-center gap-1 truncate" title={value.replace('[ARQUIVO] ', '')}>
                            <FileText className="w-3 h-3" /> {value.replace('[ARQUIVO] ', '')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

interface FeedbackState {
    type: 'success' | 'error';
    message: string;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ property, onClose }) => {
    const { updateStatus, currentUser, uploadDocument } = useApp();
    const [description, setDescription] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState(property.aiAnalysis || '');
    const [abortReason, setAbortReason] = useState(property.abortReason || '');
    const [showAbortInput, setShowAbortInput] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isVisionThinking, setIsVisionThinking] = useState(false);
    const [isEditalThinking, setIsEditalThinking] = useState(false);
    const [isRegistryThinking, setIsRegistryThinking] = useState(false);
    const [isItbiThinking, setIsItbiThinking] = useState(false);
    const [showCalcDetails, setShowCalcDetails] = useState(false);
    const [showMaxBidSim, setShowMaxBidSim] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [isAutoFillThinking, setIsAutoFillThinking] = useState(false);

    // AI Feedback States
    const [visionFeedback, setVisionFeedback] = useState<FeedbackState | null>(null);
    const [registryFeedback, setRegistryFeedback] = useState<FeedbackState | null>(null);

    // Refs for Auto-Fill
    const imageInputRef = useRef<HTMLInputElement>(null);
    const editalInputRef = useRef<HTMLInputElement>(null);
    const registryInputRef = useRef<HTMLInputElement>(null);

    // Form Data State
    const [formData, setFormData] = useState<PropertyAnalysisData>(property.analysisData || {
        cityState: '',
        condoName: '',
        address: '',
        paymentMethod: 'À vista sem FGTS',
        modality: property.modality,
        eventDate: property.auctionDate,
        initialBid: 0,
        bankValuation: 0,
        financing: 'Não',
        bankMirror: '',
        paymentPrint: '',
        privateArea: 0,
        condoDebtRule: false,
        editalLink: '',
        homologationDate: '',
        auctionLotLink: property.url,
        // Matrícula
        criticalImpediment: 'Nada Consta',
        bankConsolidation: 'Sim',
        cpfCriticalNature: 'Nada Consta',
        cpfPropterRem: 'Nada Consta',
        cpfSearchPrint: '',
        matriculaFile: '',
        waitingLawyer: false,
        // Localidade
        locAsphaltQuality: 'Asfalto de boa qualidade',
        locRural: 'Não',
        locRemote: 'Não',
        locFavela: 'Não',
        locGoodAppearance: 'Sim',
        locPublicTransport: 'Sim',
        locCommerce: 'Sim',
        locHealthEducation: 'Sim',
        locLeisure: 'Sim',
        locDifferential: '',
        // Calculadora Mercado
        rentValue: 0,
        rentPrint: '',
        comparables: [],
        condoFee: 0,
        // Calculadora Financeira
        venalValue: 0,
        itbiRate: 2.5,
        registryValue: 0,
        renovationValue: 0,
        condoDebt: 0,
        iptuDebt: 0,
        iptuDebtPrint: '',
        financingRate: 11.75, // Default SELIC placeholder
        financingTerm: 360,
        salesPeriod: 12, // Default 12 months
        maxBid: 0,
        // Estimativa IPTU
        lastOwnerRegistryDate: '',
        monthlyIptu: 0
    });

    const isAssignedToMe = currentUser ? property.assignedTo === currentUser.id : false;
    const isFinalized = (property.status === AnalysisStatus.ANALISADO || property.status === AnalysisStatus.ABORTADO || property.status === AnalysisStatus.ARREMATADO);

    // Logic: Read Only if NOT assigned to me (unless new), OR finalized AND not editing.
    const isReadOnly = (property.status !== AnalysisStatus.NAO_INICIADO && !isAssignedToMe) || (isFinalized && !isEditingMode);

    const updateField = (field: keyof PropertyAnalysisData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Auto-fetch ITBI when City changes (Optional, but user requested "already fills")
    const handleFetchItbi = async () => {
        if (!formData.cityState) return alert("Preencha a Cidade/UF primeiro.");
        setIsItbiThinking(true);
        const rate = await getItbiRate(formData.cityState);
        if (rate !== null) {
            updateField('itbiRate', rate);
        } else {
            alert("Não foi possível encontrar a alíquota automaticamente. Preencha manualmente.");
        }
        setIsItbiThinking(false);
    };

    const handleAIAnalysis = async () => {
        if (!description) return;
        setIsThinking(true);
        const result = await analyzePropertyRisks(description, property.modality);
        setAiAnalysis(result);
        updateStatus(property.id, property.status, undefined, abortReason, result, formData);
        setIsThinking(false);
    };

    // Auto-fill on Open
    React.useEffect(() => {
        const attemptAutoFill = async () => {
            // Only run if:
            // 1. Not finalized (or is editing)
            // 2. property.url exists
            // 3. We haven't filled main fields yet (avoid overwriting user work)
            const isFreshAnalysis = !formData.cityState && !formData.privateArea && !formData.initialBid;

            console.log('[AUTO-FILL] Checking conditions:', {
                hasUrl: !!property.url,
                isFreshAnalysis,
                isFinalized,
                isReadOnly,
                isAutoFillThinking,
                formData: { cityState: formData.cityState, privateArea: formData.privateArea, initialBid: formData.initialBid }
            });

            if (property.url && isFreshAnalysis && !isFinalized && !isReadOnly && !isAutoFillThinking) {
                console.log("[AUTO-FILL] Iniciando auto-preenchimento via URL:", property.url);
                setIsAutoFillThinking(true);
                try {
                    const data = await extractDataFromUrl(property.url);
                    console.log('[AUTO-FILL] Dados extraídos:', data);
                    if (data) {
                        setFormData(prev => ({
                            ...prev,
                            cityState: data.cityState || prev.cityState,
                            condoName: data.condoName || prev.condoName,
                            privateArea: data.privateArea || prev.privateArea,
                            initialBid: data.initialBid || prev.initialBid,
                            bankValuation: data.bankValuation || prev.bankValuation
                        }));
                        console.log('[AUTO-FILL] Dados aplicados ao formulário');

                        // If city found, trigger ITBI
                        if (data.cityState) {
                            getItbiRate(data.cityState).then(rate => {
                                if (rate) setFormData(prev => ({ ...prev, itbiRate: rate }));
                            });
                        }
                    } else {
                        console.warn('[AUTO-FILL] Nenhum dado foi extraído da URL');
                    }
                } catch (err) {
                    console.error("[AUTO-FILL] Erro no auto-preenchimento:", err);
                } finally {
                    setIsAutoFillThinking(false);
                }
            } else {
                console.log('[AUTO-FILL] Condições não atendidas, pulando auto-fill');
            }
        };

        attemptAutoFill();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run ONCE on mount

    const handleCloseAndSave = async () => {
        console.log('[SAVE] handleCloseAndSave iniciado');
        const finalMetrics = calculateMetrics(formData.initialBid || 0);

        // Sanitize date fields
        const sanitizedFormData = { ...formData };
        if (sanitizedFormData.homologationDate === '') {
            // @ts-ignore
            sanitizedFormData.homologationDate = null;
        }
        if (sanitizedFormData.lastOwnerRegistryDate === '') {
            // @ts-ignore
            sanitizedFormData.lastOwnerRegistryDate = null;
        }

        const dataToSave = {
            ...sanitizedFormData,
            finalRoi: finalMetrics.roi,
            finalNetProfit: finalMetrics.netProfit
        };

        console.log('[SAVE] Dados a serem salvos:', dataToSave);
        setIsThinking(true);
        await updateStatus(property.id, property.status, undefined, abortReason, aiAnalysis, dataToSave);
        console.log('[SAVE] updateStatus concluído');
        setIsThinking(false);
        onClose();
    };

    // AI Auto Fill Handlers - Now also Saving the File
    const handleVisionAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setVisionFeedback(null);
        if (e.target.files && e.target.files[0]) {
            setIsVisionThinking(true);
            const file = e.target.files[0];

            // Save file
            const savedName = await uploadDocument(property.id, file, 'ESPELHO_IMOVEL');

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const result = await extractDataFromImage(base64String);

                if (result) {
                    setFormData(prev => ({
                        ...prev,
                        cityState: result.cityState || prev.cityState,
                        condoName: result.condoName || prev.condoName,
                        address: result.address || prev.address,
                        privateArea: result.privateArea || prev.privateArea,
                        initialBid: result.initialBid || prev.initialBid,
                        bankValuation: result.bankValuation || prev.bankValuation
                        // We don't have a field for "Mirror Image" here, but we could add if needed
                    }));

                    setVisionFeedback({ type: 'success', message: `Dados lidos e arquivo salvo: ${savedName}` });

                    // Trigger ITBI fetch automatically if city found
                    if (result.cityState) {
                        getItbiRate(result.cityState).then(rate => {
                            if (rate) setFormData(prev => ({ ...prev, itbiRate: rate }));
                        });
                    }

                } else {
                    setVisionFeedback({ type: 'error', message: 'Falha ao ler o documento. Tente uma imagem mais nítida.' });
                }
                setIsVisionThinking(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleEditalAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsEditalThinking(true);
            const file = e.target.files[0];

            // Save file
            const savedName = await uploadDocument(property.id, file, 'EDITAL');
            updateField('editalLink', `[ARQUIVO] ${savedName}`);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const result = await extractEditalData(base64String);

                if (result && result.homologationDate) {
                    setFormData(prev => ({
                        ...prev,
                        homologationDate: result.homologationDate
                    }));
                    alert("Data de Homologação encontrada e preenchida!");
                } else {
                    alert("Não encontramos uma data explícita. O sistema usará a regra de 2 dias úteis após arremate.");
                }
                setIsEditalThinking(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleRegistryAutoFill = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegistryFeedback(null);
        if (e.target.files && e.target.files[0]) {
            setIsRegistryThinking(true);
            const file = e.target.files[0];

            // Save File
            const savedName = await uploadDocument(property.id, file, 'MATRICULA');
            updateField('matriculaFile', `[ARQUIVO] ${savedName}`);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const mimeType = file.type || 'application/pdf';
                const result = await analyzeRegistryFile(base64String, mimeType);

                if (result) {
                    setFormData(prev => ({
                        ...prev,
                        criticalImpediment: result.criticalImpediment || prev.criticalImpediment,
                        bankConsolidation: result.bankConsolidation || prev.bankConsolidation,
                        cpfPropterRem: result.propterRem || prev.cpfPropterRem,
                    }));

                    // Logic for Green/Red Message
                    const isClean =
                        (result.criticalImpediment === 'Nada Consta') &&
                        (result.bankConsolidation === 'Não') &&
                        (result.propterRem === 'Nada Consta');

                    if (isClean) {
                        setRegistryFeedback({ type: 'success', message: 'Lido e nenhuma pendência encontrada.' });
                    } else {
                        setRegistryFeedback({ type: 'error', message: 'Atenção: Pendências ou riscos identificados.' });
                    }

                } else {
                    setRegistryFeedback({ type: 'error', message: 'Não foi possível ler o documento ou falha na análise.' });
                }
                setIsRegistryThinking(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (status: AnalysisStatus) => {
        console.log('[SAVE] handleSave iniciado com status:', status);
        const finalMetrics = calculateMetrics(formData.initialBid || 0);

        // Sanitize date fields to avoid "invalid input syntax for type date: ''"
        const sanitizedFormData = { ...formData };
        if (sanitizedFormData.homologationDate === '') {
            // @ts-ignore
            sanitizedFormData.homologationDate = null;
        }
        if (sanitizedFormData.lastOwnerRegistryDate === '') {
            // @ts-ignore
            sanitizedFormData.lastOwnerRegistryDate = null;
        }

        const dataToSave = {
            ...sanitizedFormData,
            finalRoi: finalMetrics.roi,
            finalNetProfit: finalMetrics.netProfit
        };

        console.log('[SAVE] Dados a serem salvos:', dataToSave);

        // If explicitly completing analysis, we might want to check required fields?
        // But preventing data loss is key.

        await updateStatus(property.id, status, undefined, abortReason, aiAnalysis, dataToSave);
        console.log('[SAVE] updateStatus concluído');
        setIsThinking(false);
        if (isEditingMode) setIsEditingMode(false);
        onClose();
    };

    const handlePaymentMethodChange = (value: string) => {
        let newFinancing = formData.financing;

        const isFinanced = value.includes('Financiado');
        const isCash = value.includes('À vista');

        if (isFinanced) {
            newFinancing = 'Caixa (95%)';
        } else if (isCash && !isFinanced) {
            newFinancing = 'Não';
        }

        setFormData(prev => ({
            ...prev,
            paymentMethod: value,
            financing: newFinancing
        }));
    };

    // Comparables Logic
    const addComparable = () => {
        const newComp: ComparableItem = { link: '', value: 0, area: 0 };
        setFormData(prev => ({ ...prev, comparables: [...(prev.comparables || []), newComp] }));
    };

    const removeComparable = (index: number) => {
        setFormData(prev => ({
            ...prev,
            comparables: prev.comparables.filter((_, i) => i !== index)
        }));
    };

    const updateComparable = (index: number, field: keyof ComparableItem, value: any) => {
        const newComps = [...(formData.comparables || [])];
        newComps[index] = { ...newComps[index], [field]: value };
        setFormData(prev => ({ ...prev, comparables: newComps }));
    };

    // --- CALCULATIONS ENGINE ---
    const calculateMetrics = (currentBid: number) => {
        // 1. Market Value
        let marketVal = 0;
        if (formData.comparables && formData.comparables.length > 0) {
            let totalSqm = 0;
            let count = 0;
            formData.comparables.forEach(c => {
                if (c.value > 0 && c.area > 0) {
                    totalSqm += (c.value / c.area);
                    count++;
                }
            });
            if (count > 0) marketVal = (totalSqm / count) * (formData.privateArea || 0);
        }

        // 2. Costs
        const itbi = currentBid * (formData.itbiRate / 100);
        const broker = marketVal * 0.06;
        const isDirect = formData.modality === AuctionModality.VENDA_DIRETA || formData.modality === AuctionModality.VENDA_ONLINE;
        const auctioneer = isDirect ? 0 : (currentBid * 0.05);

        let effectiveCondoDebt = formData.condoDebt || 0;
        if (formData.condoDebtRule && formData.bankValuation > 0) {
            const limit = formData.bankValuation * 0.10;
            if (effectiveCondoDebt > limit) effectiveCondoDebt = limit;
        }

        const salesPeriod = formData.salesPeriod || 12;
        const holdingCost = ((formData.condoFee || 0) + (formData.monthlyIptu || 0)) * salesPeriod;

        const totalExpenses =
            itbi + broker + auctioneer +
            (formData.registryValue || 0) +
            (formData.renovationValue || 0) +
            effectiveCondoDebt +
            (formData.iptuDebt || 0) +
            holdingCost;

        // 3. Financing
        let financed = 0;
        let isFin = false;
        if (formData.financing && formData.financing.includes('95%')) {
            financed = currentBid * 0.95;
            isFin = true;
        } else if (formData.financing && formData.financing.includes('80%')) {
            financed = currentBid * 0.80;
            isFin = true;
        }

        let monthlyPMT = 0;
        let totalPMTCost = 0;
        if (isFin && financed > 0) {
            const annualRate = formData.financingRate || 11.75;
            const months = formData.financingTerm || 360;
            const monthlyRate = (annualRate / 100) / 12;

            if (monthlyRate > 0) {
                monthlyPMT = financed * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
            } else {
                monthlyPMT = financed / months;
            }
            totalPMTCost = monthlyPMT * salesPeriod;
        }

        // 4. Profit & ROI
        const costBasis = currentBid + totalExpenses;
        const grossProfit = marketVal - costBasis;
        const ir = grossProfit > 0 ? grossProfit * 0.15 : 0;
        const netProfit = grossProfit - ir;

        const entry = currentBid - financed;
        const cashRequired = entry + totalExpenses + (isFin ? totalPMTCost : 0);
        const roi = cashRequired > 0 ? (netProfit / cashRequired) * 100 : 0;

        return {
            marketVal,
            itbi,
            broker,
            auctioneer,
            effectiveCondoDebt,
            totalExpenses,
            financed,
            monthlyPMT,
            totalPMTCost,
            grossProfit,
            ir,
            netProfit,
            cashRequired,
            roi,
            entry
        };
    };

    const calculateBidForTargetROI = (targetRoi: number) => {
        let low = 1;
        let high = mainMetrics.marketVal;
        let iterations = 0;
        let optimalBid = 0;

        while (high - low > 10 && iterations < 50) {
            const mid = (low + high) / 2;
            const result = calculateMetrics(mid);

            if (result.roi > targetRoi) {
                optimalBid = mid;
                low = mid;
            } else {
                high = mid;
            }
            iterations++;
        }
        return optimalBid;
    };

    const handleAutoMaxBid = () => {
        const optimal = calculateBidForTargetROI(20);
        updateField('maxBid', Math.floor(optimal));
    };

    const mainMetrics = calculateMetrics(formData.initialBid || 0);
    const maxBidMetrics = calculateMetrics(formData.maxBid || formData.initialBid || 0);

    const calculateIptuEstimate = () => {
        if (!formData.lastOwnerRegistryDate || !formData.monthlyIptu) return 0;
        const lastRegistry = new Date(formData.lastOwnerRegistryDate);
        const now = new Date();
        let months = (now.getFullYear() - lastRegistry.getFullYear()) * 12;
        months -= lastRegistry.getMonth();
        months += now.getMonth();
        return months > 0 ? months * formData.monthlyIptu : 0;
    };
    const estimatedHiddenIptu = calculateIptuEstimate();

    const paymentMethods = [
        'À vista sem FGTS',
        'À vista com FGTS',
        'Financiado',
        'À vista com FGTS ou Financiado',
        'À vista sem FGTS ou Financiado'
    ];

    const modalities = Object.values(AuctionModality);

    const getMapsUrl = () => {
        const fullAddress = `${formData.address}, ${formData.cityState}`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    };

    const getSearchUrl = () => {
        const fullAddress = `${formData.address}, ${formData.cityState}`;
        return `https://www.google.com/search?q=${encodeURIComponent(fullAddress)}`;
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col my-auto relative">

                {/* Hidden Inputs for AI Actions */}
                <input
                    type="file"
                    ref={imageInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleVisionAutoFill}
                />
                <input
                    type="file"
                    ref={editalInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleEditalAutoFill}
                />
                <input
                    type="file"
                    ref={registryInputRef}
                    className="hidden"
                    accept="application/pdf,image/*"
                    onChange={handleRegistryAutoFill}
                />

                {/* Warning Banner if Finalized & Waiting Lawyer */}
                {isFinalized && formData.waitingLawyer && (
                    <div className="bg-yellow-100 text-yellow-800 px-6 py-2 text-sm font-bold flex items-center gap-2 justify-center border-b border-yellow-200">
                        <AlertTriangle className="w-5 h-5" />
                        ATENÇÃO: Esta análise foi finalizada mas está aguardando parecer jurídico/advogado.
                    </div>
                )}

                {/* Warning Banner if Edited */}
                {property.lastEditedAt && (
                    <div className="bg-blue-50 text-blue-800 px-6 py-2 text-xs font-medium flex items-center gap-2 justify-center border-b border-blue-200">
                        <Edit className="w-3 h-3" />
                        Análise alterada em: {new Date(property.lastEditedAt).toLocaleString('pt-BR')}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{property.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Leilão Original: {new Date(property.auctionDate).toLocaleDateString('pt-BR')}
                            </span>
                            {isFinalized && !isEditingMode && (
                                <span className="text-gray-400 text-xs">Modo Leitura</span>
                            )}
                            {isEditingMode && (
                                <span className="text-blue-600 font-bold text-xs animate-pulse">MODO DE EDIÇÃO ATIVO</span>
                            )}
                        </div>
                    </div>
                    <button onClick={handleCloseAndSave} className="p-2 rounded-full hover:bg-gray-200 text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Left Column: AI Assistant (3 cols) */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 sticky top-0">
                                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm">
                                    <BrainCircuit className="w-4 h-4" />
                                    Assistente de IA
                                </h4>
                                <textarea
                                    className="w-full h-32 p-2 text-xs border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 bg-white"
                                    placeholder="Cole o texto do edital aqui..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isFinalized && !isEditingMode}
                                />
                                <button
                                    onClick={handleAIAnalysis}
                                    disabled={!description || isThinking || (isFinalized && !isEditingMode)}
                                    className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isThinking ? 'Analisando...' : 'Gerar Análise'}
                                </button>

                                {aiAnalysis && (
                                    <div className="mt-4 bg-white p-3 rounded border border-blue-100 max-h-60 overflow-y-auto">
                                        <div
                                            className="prose prose-xs max-w-none text-gray-600"
                                            dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle/Right Column: The Big Form (9 cols) */}
                        <div className="lg:col-span-9">
                            <form className="space-y-6">

                                {/* Section 1: Basic Identification */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative">
                                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                            Identificação do Imóvel
                                            {isAutoFillThinking && <span className="text-[10px] text-blue-600 animate-pulse font-normal flex items-center gap-1"><Sparkles className="w-3 h-3" /> IA lendo link...</span>}
                                        </h4>
                                        {!isReadOnly && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => imageInputRef.current?.click()}
                                                    disabled={isVisionThinking}
                                                    className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-200 font-bold disabled:opacity-50 transition-colors"
                                                >
                                                    {isVisionThinking ? (
                                                        <>
                                                            <Sparkles className="w-3 h-3 animate-spin" /> Processando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ImagePlus className="w-3 h-3" /> Preencher com IA (Upload Print)
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Feedback for Identification */}
                                    {visionFeedback && (
                                        <div className={`mb-4 px-3 py-2 rounded flex items-center gap-2 text-xs font-bold border ${visionFeedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                                            {visionFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {visionFeedback.message}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">1) Cidade/UF</label>
                                            <input
                                                type="text"
                                                value={formData.cityState}
                                                onChange={e => updateField('cityState', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                placeholder="Ex: São Paulo-SP"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">2) Condomínio</label>
                                            <input
                                                type="text"
                                                value={formData.condoName}
                                                onChange={e => updateField('condoName', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">3) Endereço (sem apto/cep/bloco)</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => updateField('address', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                placeholder="Rua Exemplo, 123"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">12) Área Privativa (m²)</label>
                                            <input
                                                type="number"
                                                value={formData.privateArea}
                                                onChange={e => updateField('privateArea', parseFloat(e.target.value))}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Auction Details */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">Detalhes do Leilão</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">5) Modalidade</label>
                                            <select
                                                value={formData.modality}
                                                onChange={e => updateField('modality', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                {modalities.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">6) Data do Evento</label>
                                            <input
                                                type="date"
                                                value={formData.eventDate}
                                                onChange={e => updateField('eventDate', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>

                                        <div className="lg:col-span-2">
                                            <LinkOrUploadInput
                                                label="14) Link do Edital (PDF)"
                                                value={formData.editalLink}
                                                onChange={(val) => updateField('editalLink', val)}
                                                disabled={isReadOnly}
                                                onAiAction={!isReadOnly ? () => editalInputRef.current?.click() : undefined}
                                                propertyId={property.id}
                                                docType="EDITAL"
                                            />
                                            {isEditalThinking && (
                                                <p className="text-[10px] text-indigo-600 mt-1 animate-pulse">
                                                    Processando imagem do edital para encontrar datas...
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">15) Data Homologação</label>
                                            <input
                                                type="date"
                                                value={formData.homologationDate}
                                                onChange={e => updateField('homologationDate', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">17) Link para Arrematar</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                    <ExternalLink className="h-3 w-3 text-gray-400" />
                                                </div>
                                                <input
                                                    type="url"
                                                    value={formData.auctionLotLink}
                                                    onChange={(e) => updateField('auctionLotLink', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="block w-full pl-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Section 3: Financials */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">Financeiro</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">7) Lance Inicial (R$)</label>
                                            <input
                                                type="number"
                                                value={formData.initialBid}
                                                onChange={e => updateField('initialBid', parseFloat(e.target.value))}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">8) Avaliação Banco (R$)</label>
                                            <input
                                                type="number"
                                                value={formData.bankValuation}
                                                onChange={e => updateField('bankValuation', parseFloat(e.target.value))}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">4) Forma de Pagamento</label>
                                            <select
                                                value={formData.paymentMethod}
                                                onChange={e => handlePaymentMethodChange(e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">9) Financiamento</label>
                                            <select
                                                value={formData.financing}
                                                onChange={e => updateField('financing', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="Não">Não</option>
                                                <option value="Caixa (95%)">Caixa (95%)</option>
                                                <option value="Demais Bancos (80%)">Demais Bancos (80%)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center pt-5">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="condoRule"
                                                    type="checkbox"
                                                    checked={formData.condoDebtRule}
                                                    onChange={(e) => updateField('condoDebtRule', e.target.checked)}
                                                    disabled={isReadOnly}
                                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="condoRule" className="font-medium text-gray-700">13) Regra dos 10% (Excedente)</label>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-1">
                                            <LinkOrUploadInput
                                                label="10) Link Espelho do Banco"
                                                value={formData.bankMirror}
                                                onChange={(val) => updateField('bankMirror', val)}
                                                disabled={isReadOnly}
                                                propertyId={property.id}
                                                docType="ESPELHO_BANCO"
                                            />
                                        </div>

                                        <div className="lg:col-span-1">
                                            <LinkOrUploadInput
                                                label="11) Print Formas Pagamento"
                                                value={formData.paymentPrint}
                                                onChange={(val) => updateField('paymentPrint', val)}
                                                disabled={isReadOnly}
                                                propertyId={property.id}
                                                docType="PRINT_PAGAMENTO"
                                            />
                                        </div>

                                    </div>
                                </div>

                                {/* Section 4: Análise de Matrícula */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2 flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-purple-600" />
                                        <span className="text-purple-700">Análise de Matrícula</span>
                                    </h4>

                                    {/* AI Feedback for Registry */}
                                    {registryFeedback && (
                                        <div className={`mb-4 px-3 py-2 rounded flex items-center gap-2 text-xs font-bold border ${registryFeedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                                            {registryFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {registryFeedback.message}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        <div className="col-span-1 md:col-span-2">
                                            <LinkOrUploadInput
                                                label="6) Matrícula Salva (Drive/PDF)"
                                                value={formData.matriculaFile}
                                                onChange={(val) => updateField('matriculaFile', val)}
                                                disabled={isReadOnly}
                                                onAiAction={!isReadOnly ? () => registryInputRef.current?.click() : undefined}
                                                aiActionLabel="Analisar Documento"
                                                propertyId={property.id}
                                                docType="MATRICULA"
                                            />
                                            {isRegistryThinking && (
                                                <p className="text-xs text-purple-600 mt-1 animate-pulse font-medium">
                                                    A IA está lendo a matrícula para identificar penhoras e dívidas...
                                                </p>
                                            )}
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">1) Impeditivo Crítico</label>
                                            <select
                                                value={formData.criticalImpediment}
                                                onChange={e => updateField('criticalImpediment', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="Nada Consta">Nada Consta</option>
                                                <option value="Penhora">Penhora</option>
                                                <option value="Arresto">Arresto</option>
                                                <option value="Indisponibilidade">Indisponibilidade</option>
                                            </select>
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">2) Consolidação Propriedade Banco</label>
                                            <select
                                                value={formData.bankConsolidation}
                                                onChange={e => updateField('bankConsolidation', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="Sim">Sim</option>
                                                <option value="Não">Não</option>
                                            </select>
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">3) CPF - Natureza Crítica</label>
                                            <select
                                                value={formData.cpfCriticalNature}
                                                onChange={e => updateField('cpfCriticalNature', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="Nada Consta">Nada Consta</option>
                                                <option value="Processo criminal de alta periculosidade">Processo criminal de alta periculosidade</option>
                                                <option value="Segredo de justiça">Segredo de justiça</option>
                                            </select>
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">4) CPF - Propter Rem</label>
                                            <select
                                                value={formData.cpfPropterRem}
                                                onChange={e => updateField('cpfPropterRem', e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="Nada Consta">Nada Consta</option>
                                                <option value="Processo de condomínio">Processo de condomínio</option>
                                                <option value="IPTU">IPTU</option>
                                            </select>
                                        </div>

                                        <div className="col-span-1 md:col-span-2">
                                            <LinkOrUploadInput
                                                label="5) Print Pesquisa CPF"
                                                value={formData.cpfSearchPrint}
                                                onChange={(val) => updateField('cpfSearchPrint', val)}
                                                disabled={isReadOnly}
                                                propertyId={property.id}
                                                docType="PRINT_CPF"
                                            />
                                        </div>

                                        {/* WAITING LAWYER CHECKBOX */}
                                        <div className="col-span-1 md:col-span-2 mt-2 bg-yellow-50 p-3 rounded border border-yellow-200 flex items-center gap-3">
                                            <input
                                                id="waitingLawyer"
                                                type="checkbox"
                                                checked={formData.waitingLawyer}
                                                onChange={(e) => updateField('waitingLawyer', e.target.checked)}
                                                disabled={isReadOnly}
                                                className="focus:ring-yellow-500 h-5 w-5 text-yellow-600 border-gray-300 rounded"
                                            />
                                            <div>
                                                <label htmlFor="waitingLawyer" className="font-bold text-sm text-yellow-800 flex items-center gap-1">
                                                    <Gavel className="w-4 h-4" /> Aguardando Advogado
                                                </label>
                                                <p className="text-xs text-yellow-700">Marque se a análise jurídica requer um parecer externo ou mais detalhado.</p>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Section 5: Análise de Localidade */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2 border-b pb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-orange-600" />
                                        <span className="text-orange-700">Análise de Localidade</span>
                                    </h4>

                                    <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded mb-4 flex items-start gap-2 border border-yellow-200">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <p>
                                            Este imóvel é classe C - É importante o local não ser favela, área rural ou muito afastado / desconectado da cidade,
                                            ser bem asfaltado, ter uma boa aparência geral e ter algum ponto de transporte e comércio essencial próximo!
                                            <br />
                                            <strong>Se houver 1 resultado vermelho crítico abaixo, aborte a análise e sinalize!</strong>
                                        </p>
                                    </div>

                                    <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200 flex flex-col md:flex-row gap-3 items-center justify-between">
                                        <div className="text-sm text-gray-700 truncate w-full md:w-auto">
                                            <span className="font-bold">Endereço Base:</span> {formData.address}, {formData.cityState}
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <a
                                                href={getMapsUrl()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                                            >
                                                <MapPin className="w-3 h-3" /> Ver no Maps
                                            </a>
                                            <a
                                                href={getSearchUrl()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded hover:bg-gray-700"
                                            >
                                                <Search className="w-3 h-3" /> Pesquisar Google
                                            </a>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Coluna 1: Streetview */}
                                        <div className="space-y-3">
                                            <h5 className="font-bold text-xs text-gray-600 uppercase border-b pb-1">1) Análise Streetview</h5>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Qualidade do asfalto?</label>
                                                <select
                                                    value={formData.locAsphaltQuality}
                                                    onChange={e => updateField('locAsphaltQuality', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Asfalto de boa qualidade">Asfalto de boa qualidade</option>
                                                    <option value="Não há asfalto">Não há asfalto / Terra</option>
                                                    <option value="Buracos / Precário">Buracos / Precário</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">É área rural?</label>
                                                <select
                                                    value={formData.locRural}
                                                    onChange={e => updateField('locRural', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Não">Não</option>
                                                    <option value="Sim">Sim</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">É um local afastado?</label>
                                                <select
                                                    value={formData.locRemote}
                                                    onChange={e => updateField('locRemote', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Não">Não</option>
                                                    <option value="Sim">Sim</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">É favela?</label>
                                                <select
                                                    value={formData.locFavela}
                                                    onChange={e => updateField('locFavela', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Não">Não</option>
                                                    <option value="Sim">Sim</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Boa aparência geral?</label>
                                                <select
                                                    value={formData.locGoodAppearance}
                                                    onChange={e => updateField('locGoodAppearance', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Sim">Sim</option>
                                                    <option value="Não">Não</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Coluna 2: Mapa Normal */}
                                        <div className="space-y-3">
                                            <h5 className="font-bold text-xs text-gray-600 uppercase border-b pb-1">2) Análise Mapa Normal</h5>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Ponto de ônibus, trem, metrô?</label>
                                                <select
                                                    value={formData.locPublicTransport}
                                                    onChange={e => updateField('locPublicTransport', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Sim">Sim</option>
                                                    <option value="Não">Não</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Mercado, padaria ou farmácia?</label>
                                                <select
                                                    value={formData.locCommerce}
                                                    onChange={e => updateField('locCommerce', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Sim">Sim</option>
                                                    <option value="Não">Não</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Hospital ou escola?</label>
                                                <select
                                                    value={formData.locHealthEducation}
                                                    onChange={e => updateField('locHealthEducation', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Sim">Sim</option>
                                                    <option value="Não">Não</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Igreja ou lazer (parque, shopping)?</label>
                                                <select
                                                    value={formData.locLeisure}
                                                    onChange={e => updateField('locLeisure', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                >
                                                    <option value="Sim">Sim</option>
                                                    <option value="Não">Não</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Diferencial que valorize o imóvel?</label>
                                                <textarea
                                                    value={formData.locDifferential}
                                                    onChange={(e) => updateField('locDifferential', e.target.value)}
                                                    disabled={isReadOnly}
                                                    placeholder="Escreva aqui..."
                                                    rows={2}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Section 6: Calculadora de Valor de Mercado */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-blue-600">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2 flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-blue-600" />
                                        <span className="text-blue-700">Calculadora de Valor de Mercado</span>
                                    </h4>

                                    <div className="space-y-6">
                                        {/* 1) Aluguel */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">1) Aluguel (R$)</label>
                                                <input
                                                    type="number"
                                                    value={formData.rentValue}
                                                    onChange={e => updateField('rentValue', parseFloat(e.target.value))}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <LinkOrUploadInput
                                                    label="Print/Link Aluguel"
                                                    value={formData.rentPrint}
                                                    onChange={(val) => updateField('rentPrint', val)}
                                                    disabled={isReadOnly}
                                                    propertyId={property.id}
                                                    docType="PRINT_ALUGUEL"
                                                />
                                            </div>
                                        </div>

                                        {/* 2) Comparativos de Mercado */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-medium text-gray-700">2) Comparativos (Marketplace / Venda)</label>
                                                <button
                                                    type="button"
                                                    onClick={addComparable}
                                                    disabled={isReadOnly}
                                                    className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:text-blue-800 disabled:opacity-50"
                                                >
                                                    <Plus className="w-3 h-3" /> Adicionar Linha
                                                </button>
                                            </div>

                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Link / Print</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-32">Valor (R$)</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-24">Área (m²)</th>
                                                            <th className="px-3 py-2 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {(formData.comparables || []).map((comp, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-3 py-2">
                                                                    <LinkOrUploadInput
                                                                        value={comp.link}
                                                                        onChange={(val) => updateComparable(idx, 'link', val)}
                                                                        disabled={isReadOnly}
                                                                        placeholder="Link do anúncio..."
                                                                        propertyId={property.id}
                                                                        docType={`COMPARATIVO_${idx + 1}`}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="number"
                                                                        value={comp.value}
                                                                        onChange={(e) => updateComparable(idx, 'value', parseFloat(e.target.value))}
                                                                        disabled={isReadOnly}
                                                                        className="w-full p-1 text-sm border border-gray-300 rounded bg-white"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="number"
                                                                        value={comp.area}
                                                                        onChange={(e) => updateComparable(idx, 'area', parseFloat(e.target.value))}
                                                                        disabled={isReadOnly}
                                                                        className="w-full p-1 text-sm border border-gray-300 rounded bg-white"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeComparable(idx)}
                                                                        disabled={isReadOnly}
                                                                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(!formData.comparables || formData.comparables.length === 0) && (
                                                            <tr>
                                                                <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-400 italic">
                                                                    Nenhum comparativo adicionado.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* 3) Condomínio e Resultado */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">3) Condomínio Mensal Referencial (R$)</label>
                                                <input
                                                    type="number"
                                                    value={formData.condoFee}
                                                    onChange={e => updateField('condoFee', parseFloat(e.target.value))}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                />
                                            </div>

                                            <div className="bg-blue-50 p-3 rounded border border-blue-200 flex flex-col items-center justify-center">
                                                <span className="text-xs font-bold text-blue-800 uppercase">Valor Aproximado de Mercado</span>
                                                <span className="text-xl font-extrabold text-blue-900">
                                                    {mainMetrics.marketVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                                <span className="text-[10px] text-blue-600">
                                                    Baseado na média do m² dos comparativos x {formData.privateArea}m²
                                                </span>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Section 7 & 8 Container */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* Section 7: Calculadora Financeira (Lucro, ROI e Despesas) */}
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-green-600">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            <span className="text-green-700">Calculadora Financeira</span>
                                        </h4>

                                        <div className="space-y-4">
                                            {/* Read-Only References */}
                                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Lance Inicial</label>
                                                    <span className="text-sm font-medium">{formatCurrency(mainMetrics.entry + mainMetrics.financed)}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Financiamento</label>
                                                    <span className="text-sm font-medium">{formData.financing}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Avaliação Banco</label>
                                                    <span className="text-sm font-medium">{formatCurrency(formData.bankValuation)}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Valor Financiado</label>
                                                    <span className="text-sm font-medium">{formatCurrency(mainMetrics.financed)}</span>
                                                </div>
                                            </div>

                                            {/* Inputs */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">1) Valor Venal (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.venalValue}
                                                        onChange={e => updateField('venalValue', parseFloat(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-xs font-medium text-gray-700">2) Alíquota ITBI (%)</label>
                                                        <button
                                                            type="button"
                                                            onClick={handleFetchItbi}
                                                            disabled={isReadOnly || isItbiThinking}
                                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
                                                            title="Buscar alíquota na internet"
                                                        >
                                                            {isItbiThinking ? <Sparkles className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={formData.itbiRate}
                                                        onChange={e => updateField('itbiRate', parseFloat(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">3) Valor Registro (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.registryValue}
                                                        onChange={e => updateField('registryValue', parseFloat(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">!) Reforma (R$ - Não Mexer se ok)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.renovationValue}
                                                        onChange={e => updateField('renovationValue', parseFloat(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">4) Dívida Condomínio Levantada (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.condoDebt}
                                                        onChange={e => updateField('condoDebt', parseFloat(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    />
                                                    {formData.condoDebtRule && formData.condoDebt > (formData.bankValuation * 0.10) && (
                                                        <p className="text-[10px] text-green-600 mt-1">
                                                            * Regra dos 10% ativa. Valor considerado no cálculo: {formatCurrency(mainMetrics.effectiveCondoDebt)}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">5) Dívida IPTU (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.iptuDebt}
                                                        onChange={e => updateField('iptuDebt', parseFloat(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    />
                                                </div>

                                                <div>
                                                    <LinkOrUploadInput
                                                        label="6) Print Dívida IPTU"
                                                        value={formData.iptuDebtPrint}
                                                        onChange={(val) => updateField('iptuDebtPrint', val)}
                                                        disabled={isReadOnly}
                                                        propertyId={property.id}
                                                        docType="PRINT_DIVIDA_IPTU"
                                                    />
                                                </div>
                                            </div>

                                            {/* Financing Parameters - Only show if financed */}
                                            {mainMetrics.financed > 0 && (
                                                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                                                    <h5 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                                        <Percent className="w-3 h-3" /> Parâmetros de Financiamento
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-medium text-gray-700 mb-1">Taxa de Juros Anual (CET %)</label>
                                                            <input
                                                                type="number"
                                                                value={formData.financingRate}
                                                                onChange={e => updateField('financingRate', parseFloat(e.target.value))}
                                                                disabled={isReadOnly}
                                                                className="w-full p-1 text-sm border border-gray-300 rounded bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-medium text-gray-700 mb-1">Prazo Financiamento (Meses)</label>
                                                            <input
                                                                type="number"
                                                                value={formData.financingTerm}
                                                                onChange={e => updateField('financingTerm', parseFloat(e.target.value))}
                                                                disabled={isReadOnly}
                                                                className="w-full p-1 text-sm border border-gray-300 rounded bg-white"
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-[10px] font-medium text-gray-700 mb-1">Tempo Estimado de Venda (Meses)</label>
                                                            <input
                                                                type="number"
                                                                value={formData.salesPeriod}
                                                                onChange={e => updateField('salesPeriod', parseFloat(e.target.value))}
                                                                disabled={isReadOnly}
                                                                className="w-full p-1 text-sm border border-gray-300 rounded bg-white"
                                                            />
                                                        </div>
                                                        {mainMetrics.monthlyPMT > 0 && (
                                                            <div className="col-span-2 pt-1 border-t border-blue-200">
                                                                <p className="text-[10px] text-blue-800">
                                                                    Parcela Mensal Estimada: <strong>{formatCurrency(mainMetrics.monthlyPMT)}</strong>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Results */}
                                            <div className="mt-4 space-y-2 border-t pt-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600">Lucro Líquido Estimado:</span>
                                                    <span className={`font-bold ${mainMetrics.netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(mainMetrics.netProfit)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600">ROI:</span>
                                                    <span className={`font-bold ${mainMetrics.roi > 20 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {mainMetrics.roi.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded">
                                                    <span className="text-blue-800 font-bold">Valor Necessário para Operação:</span>
                                                    <span className="font-bold text-blue-900">
                                                        {formatCurrency(mainMetrics.cashRequired)}
                                                    </span>
                                                </div>

                                                {/* Calculation Breakdown Toggle */}
                                                <div className="pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCalcDetails(!showCalcDetails)}
                                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 w-full justify-center py-1"
                                                    >
                                                        {showCalcDetails ? (
                                                            <>
                                                                <ChevronUp className="w-3 h-3" /> Ocultar Memória de Cálculo
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-3 h-3" /> Ver Memória de Cálculo
                                                            </>
                                                        )}
                                                    </button>

                                                    {showCalcDetails && (
                                                        <div className="mt-2 bg-gray-50 rounded p-3 text-[10px] space-y-1 border border-gray-200 text-gray-700">
                                                            {/* Lucro Part */}
                                                            <div className="font-bold text-gray-500 border-b border-gray-200 mb-1">Cálculo de Lucro (DRE)</div>
                                                            <div className="flex justify-between font-bold">
                                                                <span>(+) Valor de Mercado</span>
                                                                <span>{formatCurrency(mainMetrics.marketVal)}</span>
                                                            </div>

                                                            <div className="flex justify-between text-red-600">
                                                                <span>(-) Lance (Aquisição)</span>
                                                                <span>{formatCurrency(mainMetrics.entry + mainMetrics.financed)}</span>
                                                            </div>

                                                            <div className="flex justify-between text-red-600">
                                                                <span>(-) Total Despesas e Custos</span>
                                                                <span>{formatCurrency(mainMetrics.totalExpenses)}</span>
                                                            </div>

                                                            <div className="pl-3 space-y-1 text-gray-500 border-l-2 border-gray-200 ml-1">
                                                                <div className="flex justify-between">
                                                                    <span>ITBI ({formData.itbiRate}%)</span>
                                                                    <span>{formatCurrency(mainMetrics.itbi)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Corretagem (6%)</span>
                                                                    <span>{formatCurrency(mainMetrics.broker)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Leiloeiro</span>
                                                                    <span>{formatCurrency(mainMetrics.auctioneer)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Registro</span>
                                                                    <span>{formatCurrency(formData.registryValue)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Reforma</span>
                                                                    <span>{formatCurrency(formData.renovationValue)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Dívida Condomínio</span>
                                                                    <span>{formatCurrency(mainMetrics.effectiveCondoDebt)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Dívida IPTU</span>
                                                                    <span>{formatCurrency(formData.iptuDebt)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                                                                <span>(=) Lucro Bruto</span>
                                                                <span>{formatCurrency(mainMetrics.grossProfit)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-red-600">
                                                                <span>(-) IR (15% s/ Lucro)</span>
                                                                <span>{formatCurrency(mainMetrics.ir)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-extrabold text-green-700 border-t border-gray-300 pt-1 mt-1">
                                                                <span>(=) Lucro Líquido</span>
                                                                <span>{formatCurrency(mainMetrics.netProfit)}</span>
                                                            </div>

                                                            {/* Caixa Necessário Part */}
                                                            <div className="font-bold text-gray-500 border-b border-gray-200 mb-1 mt-3">Composição do Caixa Necessário</div>

                                                            {mainMetrics.financed > 0 ? (
                                                                <div className="flex justify-between text-blue-700 font-medium">
                                                                    <span>(+) Entrada (Down Payment)</span>
                                                                    <span>{formatCurrency(mainMetrics.entry)}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-between text-blue-700 font-medium">
                                                                    <span>(+) Lance Total</span>
                                                                    <span>{formatCurrency(mainMetrics.entry)}</span>
                                                                </div>
                                                            )}

                                                            <div className="flex justify-between text-blue-700 font-medium">
                                                                <span>(+) Total Despesas e Custos</span>
                                                                <span>{formatCurrency(mainMetrics.totalExpenses)}</span>
                                                            </div>

                                                            {mainMetrics.financed > 0 && (
                                                                <div className="flex justify-between text-blue-700 font-medium">
                                                                    <span>(+) Parcelas (Carregamento Financeiro)</span>
                                                                    <span>{formatCurrency(mainMetrics.totalPMTCost)}</span>
                                                                </div>
                                                            )}

                                                            <div className="flex justify-between font-bold bg-blue-50 p-1 rounded mt-1">
                                                                <span>(=) Valor Necessário</span>
                                                                <span>{formatCurrency(mainMetrics.cashRequired)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Max Bid Simulation Tab */}
                                            <div className="mt-6 border-t pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!showMaxBidSim) {
                                                            updateField('maxBid', formData.initialBid);
                                                        }
                                                        setShowMaxBidSim(!showMaxBidSim);
                                                    }}
                                                    className="w-full flex items-center justify-between p-2 bg-gray-100 rounded text-sm font-bold text-gray-700 hover:bg-gray-200"
                                                >
                                                    <span>Simulação de Lance Máximo</span>
                                                    {showMaxBidSim ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>

                                                {showMaxBidSim && (
                                                    <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-200 animate-in slide-in-from-top-2">
                                                        <div className="mb-3">
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Qual seria o Lance Máximo? (R$)</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={formData.maxBid}
                                                                    onChange={e => updateField('maxBid', parseFloat(e.target.value))}
                                                                    disabled={isReadOnly}
                                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white font-bold"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAutoMaxBid}
                                                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1"
                                                                    title="Calcular lance para ROI 20%"
                                                                >
                                                                    <RefreshCw className="w-3 h-3" /> ROI 20%
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="p-2 bg-white rounded border border-gray-200">
                                                                <span className="block text-gray-500">Novo ROI</span>
                                                                <span className={`font-bold text-sm ${maxBidMetrics.roi > 15 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                                    {maxBidMetrics.roi.toFixed(2)}%
                                                                </span>
                                                            </div>
                                                            <div className="p-2 bg-white rounded border border-gray-200">
                                                                <span className="block text-gray-500">Novo Lucro Líq.</span>
                                                                <span className="font-bold text-sm text-gray-800">
                                                                    {formatCurrency(maxBidMetrics.netProfit)}
                                                                </span>
                                                            </div>
                                                            <div className="p-2 bg-white rounded border border-gray-200 col-span-2">
                                                                <span className="block text-gray-500">Novo Caixa Necessário</span>
                                                                <span className="font-bold text-sm text-blue-700">
                                                                    {formatCurrency(maxBidMetrics.cashRequired)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>

                                    {/* Section 8: Calculadora Estimativa IPTU */}
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-indigo-500 h-fit">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2 flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-indigo-600" />
                                            <span className="text-indigo-700">Estimativa de IPTU Oculto</span>
                                        </h4>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Data registro último proprietário</label>
                                                <input
                                                    type="date"
                                                    value={formData.lastOwnerRegistryDate}
                                                    onChange={e => updateField('lastOwnerRegistryDate', e.target.value)}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">IPTU Mensal (Imóvel Similar)</label>
                                                <input
                                                    type="number"
                                                    value={formData.monthlyIptu}
                                                    onChange={e => updateField('monthlyIptu', parseFloat(e.target.value))}
                                                    disabled={isReadOnly}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                />
                                            </div>

                                            <div className="bg-indigo-50 p-3 rounded border border-indigo-200 flex flex-col items-center justify-center mt-4">
                                                <span className="text-xs font-bold text-indigo-800 uppercase">Dívida Oculta Estimada</span>
                                                <span className="text-xl font-extrabold text-indigo-900">
                                                    {formatCurrency(estimatedHiddenIptu)}
                                                </span>
                                                <span className="text-[10px] text-indigo-600 text-center">
                                                    Calculado baseando-se no tempo desde o último registro até hoje.
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                            </form>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                    {!isReadOnly ? (
                        <div className="flex justify-end gap-3">
                            {!showAbortInput ? (
                                <>
                                    <button
                                        onClick={() => handleSave(AnalysisStatus.EM_ANALISE)}
                                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Salvar Rascunho
                                    </button>
                                    <button
                                        onClick={() => setShowAbortInput(true)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium flex items-center gap-2 border border-red-200"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        Abortar
                                    </button>
                                    <button
                                        onClick={() => handleSave(AnalysisStatus.ANALISADO)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {isFinalized ? 'Salvar Edição' : 'Concluir Análise'}
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-between bg-red-50 p-2 rounded-lg border border-red-200">
                                    <input
                                        className="flex-1 p-2 text-sm border border-red-300 rounded mr-2 bg-white"
                                        placeholder="Motivo do aborto..."
                                        value={abortReason}
                                        onChange={(e) => setAbortReason(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAbortInput(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!abortReason) return alert('Motivo obrigatório');
                                                handleSave(AnalysisStatus.ABORTADO);
                                            }}
                                            className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center w-full">
                            <div className="flex flex-col">
                                <p className={`font-bold text-sm ${property.status === AnalysisStatus.ANALISADO ? 'text-green-700' : 'text-red-700'}`}>
                                    Análise Finalizada: {property.status}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                {isFinalized && (
                                    <button
                                        onClick={() => setIsEditingMode(true)}
                                        className="px-4 py-2 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-200 flex items-center gap-2 text-sm font-medium"
                                    >
                                        <Edit className="w-4 h-4" /> Habilitar Edição
                                    </button>
                                )}
                                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
