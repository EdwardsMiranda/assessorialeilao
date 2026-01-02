
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePropertyRisks = async (propertyDescription: string, modality: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Erro: Chave de API não configurada. Não é possível realizar a análise automática.";

  const prompt = `
    Atue como um especialista sênior em investimentos imobiliários e leilões no Brasil.
    
    Analise o seguinte texto descritivo de um imóvel em leilão na modalidade: ${modality}.
    
    Texto do imóvel:
    "${propertyDescription}"

    Gere um relatório conciso em formato HTML (apenas as tags internas como <ul>, <li>, <strong>, <p>) com:
    1. Pontos de Atenção Críticos (ex: ocupação, dívidas mencionadas).
    2. Documentação Necessária sugerida para esta modalidade.
    3. Potencial de Risco (Baixo, Médio, Alto) com breve justificativa.
    
    Seja direto e objetivo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar uma análise.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro ao tentar analisar os dados com a IA.";
  }
};

export const extractDataFromImage = async (base64Image: string): Promise<{
  cityState: string,
  condoName: string,
  address: string,
  privateArea: number,
  initialBid: number,
  bankValuation: number
} | null> => {
  const ai = getClient();
  if (!ai) return null;

  // Remove header data:image/png;base64, if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `
    Analise esta imagem de um anúncio de leilão de imóvel (espelho do leilão).
    Extraia as seguintes informações e retorne APENAS um JSON válido.
    
    Para valores numéricos, converta para float (ex: "R$ 150.000,00" vira 150000.00).

    1. "cityState": Cidade e UF no formato "Cidade-UF".
    2. "condoName": Nome do condomínio/edifício. Se não encontrar, string vazia.
    3. "address": O endereço contendo Rua e Número. REGRA: NÃO inclua complemento, NÃO inclua apto, NÃO inclua CEP.
    4. "privateArea": Área privativa em m² (number).
    5. "initialBid": Lance Inicial ou Valor Mínimo de Venda (number).
    6. "bankValuation": Valor de Avaliação do Banco ou Avaliação Total (number).

    Retorne apenas o JSON, sem markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: prompt }
        ]
      }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return null;
  }
};

export const extractEditalData = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<{ homologationDate: string } | null> => {
  const ai = getClient();
  if (!ai) return null;

  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `
    Analise esta imagem ou documento (PDF) de um Edital de Leilão ou Regras de Venda.
    Tente encontrar a "Data de Homologação", "Data do Resultado", ou "Data de Divulgação do Vencedor".
    
    Se encontrar uma data específica, retorne no formato YYYY-MM-DD.
    Se não encontrar uma data explícita, mas encontrar texto como "2 dias úteis após...", retorne null (deixe o sistema calcular).
    
    Retorne APENAS um JSON válido:
    {
      "homologationDate": "YYYY-MM-DD" || null
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Edital Error:", error);
    return null;
  }
};

export const analyzeRegistryFile = async (base64File: string, mimeType: string = 'application/pdf'): Promise<any | null> => {
  const ai = getClient();
  if (!ai) return null;

  const base64Data = base64File.split(',')[1] || base64File;

  const prompt = `
    Analise este documento de Matrícula de Imóvel (Registro de Imóveis).
    Busque por averbações ou registros de risco jurídico.
    
    Retorne APENAS um JSON com os seguintes campos baseados na análise:
    
    1. "criticalImpediment":
       - Se encontrar "Penhora", retorne "Penhora".
       - Se encontrar "Arresto", retorne "Arresto".
       - Se encontrar "Indisponibilidade", retorne "Indisponibilidade".
       - Se não encontrar nenhum desses, retorne "Nada Consta".
    
    2. "bankConsolidation":
       - Se houver averbação de "Consolidação da Propriedade" em nome de banco/fiduciário, retorne "Sim".
       - Caso contrário, retorne "Não".

    3. "propterRem":
       - Se encontrar menção a "Ação de Cobrança de Condomínio" ou dívida condominial, retorne "Processo de condomínio".
       - Se encontrar menção a "Execução Fiscal" ou dívida de IPTU/Prefeitura, retorne "IPTU".
       - Caso contrário, retorne "Nada Consta".
    
    Retorne apenas o JSON limpo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Registry Error:", error);
    return null;
  }
};

export const getItbiRate = async (cityState: string): Promise<number | null> => {
  const ai = getClient();
  if (!ai) return null;

  const prompt = `
    Qual é a alíquota padrão de ITBI (Imposto sobre Transmissão de Bens Imóveis) para a cidade de "${cityState}" no Brasil?
    Retorne APENAS o número da porcentagem (exemplo: se for 3%, retorne 3.0). Se for uma faixa, retorne a maior comum (ex: 3.0).
    Não coloque texto, apenas o número.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || "0";
    const rate = parseFloat(text.replace('%', '').replace(',', '.'));
    return isNaN(rate) ? null : rate;
  } catch (error) {
    console.error("Gemini ITBI Error:", error);
    return null;
  }
};

export const extractDataFromUrl = async (url: string): Promise<{
  cityState: string,
  condoName: string,
  address: string,
  privateArea: number,
  initialBid: number,
  bankValuation: number,
  condoDebtRule: boolean,
  paymentTerms: string[]
} | null> => {
  console.log('[extractDataFromUrl] Iniciando extração para:', url);
  const ai = getClient();
  if (!ai) {
    console.error('[extractDataFromUrl] Cliente Gemini não disponível');
    return null;
  }

  try {
    // 1. Fetch HTML content via CORS Proxy
    console.log('[extractDataFromUrl] Buscando conteúdo via proxy...');
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const fetchResponse = await fetch(proxyUrl);

    if (!fetchResponse.ok) {
      console.error("[extractDataFromUrl] Falha ao buscar URL via proxy. Status:", fetchResponse.status);
      return null;
    }

    const htmlText = await fetchResponse.text();
    console.log('[extractDataFromUrl] HTML obtido, tamanho:', htmlText.length, 'caracteres');

    // Limit HTML size to avoid token limits (approx 20k chars should be enough for main content)
    // We try to grab the body content
    const bodyContent = htmlText.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || htmlText.substring(0, 30000);
    const cleanedContent = bodyContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 20000);

    console.log('[extractDataFromUrl] Conteúdo limpo, tamanho:', cleanedContent.length, 'caracteres');

    // 2. Ask Gemini to extract data
    const prompt = `
      Analise o texto abaixo extraído de uma página de leilão de imóveis.
      Extraia as seguintes informações e retorne APENAS um JSON válido.
      
      Para valores numéricos, converta para float (ex: "R$ 150.000,00" vira 150000.00).
      
      1. "cityState": Cidade e UF no formato "Cidade-UF".
      2. "condoName": Nome do condomínio/edifício. Se não encontrar, string vazia.
      3. "address": O endereço completo (Logradouro, Número, Bairro). REGRA: NÃO inclua complemento, NÃO inclua apto, NÃO inclua CEP.
      4. "privateArea": Área privativa em m² (number).
      5. "initialBid": Lance Inicial ou Valor Mínimo de Venda (number).
      6. "bankValuation": Valor de Avaliação do Banco ou Avaliação Total (number).
      6. "bankValuation": Valor de Avaliação do Banco ou Avaliação Total (number).
      7. "condoDebtRule": (boolean) Retorne true SOMENTE se encontrar texto dizendo que "A CAIXA realizará o pagamento apenas do valor que exceder o limite de 10% do valor de avaliação" ou "Condomínio: Sob responsabilidade do comprador, até o limite de 10%". Caso contrário, false.
      8. "paymentTerms": Lista de strings com as formas de pagamento aceitas. Procure por termos como: "À vista", "Financiamento", "Parcelamento", "FGTS". Exemplo: ["À vista", "Financiamento", "FGTS"]. Se não encontrar, retorne lista vazia.

      Texto da página:
      "${cleanedContent}"

      Retorne apenas o JSON, sem markdown.
    `;

    console.log('[extractDataFromUrl] Enviando para Gemini...');
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = aiResponse.text || "{}";
    console.log('[extractDataFromUrl] Resposta do Gemini:', text);

    const jsonStr = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(jsonStr);
    console.log('[extractDataFromUrl] ✅ Dados extraídos com sucesso:', result);
    return result;
  } catch (error) {
    console.error("[extractDataFromUrl] ❌ Erro ao extrair dados da URL:", error);
    return null;
  }
};

export const expandInvestmentThesis = async (text: string): Promise<string[]> => {
  const ai = getClient();
  if (!ai) return [];

  const prompt = `
    Analise o seguinte texto de uma tese de investimento imobiliário: "${text}".
    
    Se houver menção a regiões (ex: "Grande SP", "Litoral Norte", "Região dos Lagos"), retorne uma lista com os principais nomes de cidades que compõem essa região.
    Se houver nomes de cidades explícitos, inclua-os.
    Se houver estados (ex: "SP", "Rio de Janeiro"), retorne as principais cidades desse estado (limitado a 10 principais).

    Retorne APENAS um JSON array de strings, sem markdown ou explicações. 
    Exemplo: ["Santos", "Guarujá", "Praia Grande"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }]
    });

    const resultText = response.text || "[]";
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erro ao expandir tese:", error);
    return [];
  }
};

/**
 * Checks if a property matches any client's investment thesis
 */
export const checkPropertyFit = async (propertyData: any, clients: any[]): Promise<{ matched: boolean; clientIds: string[]; reason: string }> => {
  const ai = getClient();
  if (!ai) return { matched: false, clientIds: [], reason: 'Erro configuração IA' };

  try {
    if (clients.length === 0) return { matched: false, clientIds: [], reason: 'Sem clientes cadastrados' };

    const clientsList = clients.map(c =>
      `- ID: ${c.id}\n  Nome: ${c.name}\n  Tese/Interesses: ${c.investmentThesis || 'Não informado'}\n  Pagamento: ${c.paymentMethods?.join(', ') || 'Todos'}`
    ).join('\n\n');

    const prompt = `
      Você é um consultor de investimentos imobiliários.
      Analise se o imóvel abaixo se encaixa na tese de investimento de algum dos clientes listados.

      DADOS DO IMÓVEL:
      - Título: ${propertyData.title}
      - Cidade/UF: ${propertyData.cityState}
      - Bairro: ${propertyData.neighborhood || 'Não informado'}
      - Valor Lance: R$ ${propertyData.initialBid}
      - Valor Avaliação: R$ ${propertyData.bankValuation}
      - Tipo: ${propertyData.propertyType || 'Indefinido'}
      - Condomínio: ${propertyData.condoName || 'Não informado'}

      CLIENTES E TESES:
      ${clientsList}

      REGRAS DE MATCH:
      1. Região/Cidade deve ser compatível.
      2. Valor deve estar dentro do poder de compra (se mencionado na tese).
      3. Tipo de imóvel deve ser compatível (comercial, residencial, terreno, etc).

      SAÍDA ESPERADA (JSON):
      {
        "matched": boolean,
        "clientIds": ["id1", "id2"],
        "reason": "Explicação breve de porque deu match ou porque não deu"
      }
      
      Responda APENAS o JSON.
      `;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    const text = result.text || "{}";

    // Clean up code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return {
      matched: parsed.matched || false,
      clientIds: parsed.clientIds || [],
      reason: parsed.reason || ''
    };
  } catch (error) {
    console.error('Gemini Match error:', error);
    return { matched: false, clientIds: [], reason: 'Erro na análise de IA' };
  }
};


