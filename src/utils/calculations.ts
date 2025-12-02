
import { PropertyAnalysisData, AuctionModality } from '../types';

export const calculateMetrics = (formData: PropertyAnalysisData, currentBid: number) => {
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

export const calculateIptuEstimate = (lastRegistryDate: string, monthlyIptu: number) => {
    if (!lastRegistryDate || !monthlyIptu) return 0;
    const lastRegistry = new Date(lastRegistryDate);
    const now = new Date();
    let months = (now.getFullYear() - lastRegistry.getFullYear()) * 12;
    months -= lastRegistry.getMonth();
    months += now.getMonth();
    return months > 0 ? months * monthlyIptu : 0;
};
