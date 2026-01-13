
export enum AuctionModality {
  VENDA_DIRETA = 'Venda Direta',
  VENDA_ONLINE = 'Venda Online',
  LICITACAO_ABERTA = 'Licitação Aberta',
  LEILAO_SFI_CAIXA = 'Leilão SFI (Caixa)',
  LEILAO_SFI_OUTRO = 'Leilão SFI (Outro Banco)',
  LEILAO_JUDICIAL = 'Leilão Judicial',
}

export enum AnalysisStatus {
  NAO_INICIADO = 'Não Iniciado',
  EM_ANALISE = 'Em Análise',
  ANALISADO = 'Analisado',
  ABORTADO = 'Abortado',
  ARREMATADO = 'Arrematado',
  PERDIDA = 'Perdida',
}

export enum UserRole {
  ADMIN = 'Gestor',
  ANALYST = 'Analista',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for security in frontend, strictly for mock auth
  role: UserRole;
  avatar: string;
  blocked?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  investmentThesis: {
    cities: string[];
    maxBidValue: number;
    propertyTypes?: string[];
    paymentMethods?: string[];
    notes?: string;
  };
  addedAt: string;
}

export interface ComparableItem {
  link: string;
  value: number;
  area: number;
}

export interface PropertyAnalysisData {
  cityState: string;        // 1. Cidade/UF
  condoName: string;        // 2. Nome do condomínio
  address: string;          // 3. Endereço completo
  paymentMethod: string;    // 4. Forma de pagamento
  modality: string;         // 5. Modalidade (confirmar/alterar)
  eventDate: string;        // 6. Data do evento
  initialBid: number;       // 7. Lance inicial
  bankValuation: number;    // 8. Valor de avaliação
  financing: string;        // 9. Financiamento
  bankMirror: string;       // 10. Link/Arquivo espelho
  paymentPrint: string;     // 11. Link/Arquivo print pagamento
  privateArea: number;      // 12. Metragem área privativa
  condoDebtRule: boolean;   // 13. Regra dos 10% condomínio
  editalLink: string;       // 14. Link/Arquivo Edital
  homologationDate: string; // 15. Data de homologação
  auctionLotLink: string;   // 17. Link da página do lote

  // Seção Análise de Matrícula
  criticalImpediment: string; // 1) Impeditivo crítico na matrícula
  bankConsolidation: string;  // 2) Consolidação de propriedade do banco
  cpfCriticalNature: string;  // 3) CPF - Natureza crítica
  cpfPropterRem: string;      // 4) CPF - Propter Rem
  cpfSearchPrint: string;     // 5) Prints da pesquisa de CPF
  matriculaFile: string;      // 6) Salve a matrícula no drive
  waitingLawyer?: boolean;    // Aguardando Advogado

  // Seção Análise de Localidade
  locAsphaltQuality: string;  // Qualidade do asfalto
  locRural: string;           // É área rural?
  locRemote: string;          // É local afastado?
  locFavela: string;          // É favela?
  locGoodAppearance: string;  // Boa aparência geral?
  locPublicTransport: string; // Ponto de ônibus/trem/metrô
  locCommerce: string;        // Mercado/Padaria/Farmácia
  locHealthEducation: string; // Hospital/Escola
  locLeisure: string;         // Igreja/Lazer
  locDifferential: string;    // Diferencial

  // Seção Calculadora de Mercado
  rentValue: number;
  rentPrint: string;
  comparables: ComparableItem[];
  condoFee: number; // Condomínio mensal referencial

  // Seção Calculadora Financeira (ROI e Despesas)
  venalValue: number;        // 1) Valor Venal
  itbiRate: number;          // 2) Alíquota ITBI (%)
  registryValue: number;     // 3) Valor de registro
  renovationValue: number;   // !) Reforma
  condoDebt: number;         // 4) Dívida condomínio levantada
  iptuDebt: number;          // 5) Dívida IPTU levantada
  iptuDebtPrint: string;     // 6) Print dívida IPTU

  // Financiamento Avançado
  financingRate: number;     // Taxa de juros anual (CET)
  financingTerm: number;     // Prazo em meses
  salesPeriod: number;       // Tempo estimado de venda (meses)

  // Simulação Lance Máximo
  maxBid?: number;           // Lance máximo para simulação

  // Seção Estimativa IPTU
  lastOwnerRegistryDate: string; // Data registro último proprietário
  monthlyIptu: number;           // IPTU mensal

  // Métricas Finais Salvas
  finalRoi?: number;
  finalNetProfit?: number;
}

export interface ManagerDispatch {
  recipient: string; // Nome do cliente/lead
  clientId?: string; // ID do cliente cadastrado
  sent: boolean;     // Se já foi enviado
}

export interface Property {
  id: string;
  displayId?: string;
  url: string;
  modality: AuctionModality;
  auctionDate: string; // ISO Date string (YYYY-MM-DD), can be empty for Venda Direta
  status: AnalysisStatus;
  assignedTo: string | null; // User ID
  addedBy: string; // User ID
  addedAt: string;
  notes: string; // Mantido para observações gerais além do formulário
  abortReason?: string;
  aiAnalysis?: string;
  title?: string;

  // Dados do formulário de análise
  analysisData?: PropertyAnalysisData;

  // Dados de gestão (Envio)
  managerDispatch?: ManagerDispatch;

  // Controle de Edição e Venda
  lastEditedAt?: string;
  soldDate?: string;
  soldAmount?: number;
  buyerName?: string;
}

export interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  aborted: number;
  sold: number;
}
