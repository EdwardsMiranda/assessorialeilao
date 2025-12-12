import { supabase } from '../lib/supabase';
import type { Property, AnalysisStatus, AuctionModality, PropertyAnalysisData } from '../types';

export const propertyService = {
    /**
     * Get all properties
     */
    async getAll(): Promise<{ properties: Property[]; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select(`
          *,
          property_analysis (*)
        `)
                .order('added_at', { ascending: false });

            if (error) {
                return { properties: [], error: error.message };
            }

            // Map database properties to app Property type
            const properties: Property[] = data.map(p => ({
                id: p.id,
                url: p.url,
                modality: p.modality as AuctionModality,
                auctionDate: p.auction_date,
                status: p.status as AnalysisStatus,
                assignedTo: p.assigned_to,
                addedBy: p.added_by,
                addedAt: p.added_at,
                title: p.title || undefined,
                notes: p.notes || '',
                abortReason: p.abort_reason || undefined,
                aiAnalysis: p.ai_analysis || undefined,
                analysisData: p.property_analysis ? mapAnalysisData(p.property_analysis) : undefined,
                managerDispatch: p.manager_dispatch || undefined,
                lastEditedAt: p.last_edited_at || undefined,
                soldDate: p.sold_date || undefined,
                soldAmount: p.sold_amount || undefined,
                buyerName: p.buyer_name || undefined,
            }));

            return { properties, error: null };
        } catch (error) {
            console.error('Get properties error:', error);
            return { properties: [], error: 'Erro ao buscar propriedades' };
        }
    },

    /**
     * Find property by URL
     */
    async findByUrl(url: string): Promise<{ property: Property | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select(`
          *,
          property_analysis (*)
        `)
                .eq('url', url.trim())
                .single();

            if (error) {
                return { property: null, error: null }; // Not found is not an error
            }

            const property: Property = {
                id: data.id,
                url: data.url,
                modality: data.modality as AuctionModality,
                auctionDate: data.auction_date,
                status: data.status as AnalysisStatus,
                assignedTo: data.assigned_to,
                addedBy: data.added_by,
                addedAt: data.added_at,
                title: data.title || undefined,
                notes: data.notes || '',
                abortReason: data.abort_reason || undefined,
                aiAnalysis: data.ai_analysis || undefined,
                analysisData: data.property_analysis ? mapAnalysisData(data.property_analysis) : undefined,
                managerDispatch: data.manager_dispatch || undefined,
                lastEditedAt: data.last_edited_at || undefined,
                soldDate: data.sold_date || undefined,
                soldAmount: data.sold_amount || undefined,
                buyerName: data.buyer_name || undefined,
            };

            return { property, error: null };
        } catch (error) {
            console.error('Find property by URL error:', error);
            return { property: null, error: 'Erro ao buscar propriedade' };
        }
    },

    /**
     * Add new property
     */
    async add(
        url: string,
        modality: AuctionModality,
        auctionDate: string,
        title: string | undefined,
        addedBy: string,
        initialAnalysisData?: Partial<PropertyAnalysisData>
    ): Promise<{ success: boolean; propertyId: string | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('properties')
                .insert({
                    url: url.trim(),
                    modality,
                    auction_date: auctionDate,
                    title: title || 'Imóvel sem título',
                    status: 'Não Iniciado',
                    assigned_to: null,
                    added_by: addedBy,
                    notes: '',
                    added_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                return { success: false, propertyId: null, error: error.message };
            }

            // If we have initial analysis data (from AI), save it
            if (initialAnalysisData && data.id) {
                const { error: analysisError } = await supabase
                    .from('property_analysis')
                    .insert({
                        property_id: data.id,
                        ...mapAnalysisDataToDb({ ...initialAnalysisData } as PropertyAnalysisData)
                    });

                if (analysisError) {
                    console.error('Error saving initial analysis:', analysisError);
                    // We don't fail the whole operation, just log it
                }
            }

            return { success: true, propertyId: data.id, error: null };
        } catch (error) {
            console.error('Add property error:', error);
            return { success: false, propertyId: null, error: 'Erro ao adicionar propriedade' };
        }
    },

    /**
     * Add multiple properties
     */
    async addBulk(
        items: Array<{ url: string; modality: AuctionModality; auctionDate: string; title: string }>,
        addedBy: string
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            const properties = items.map(item => ({
                url: item.url.trim(),
                modality: item.modality,
                auction_date: item.auctionDate,
                title: item.title || 'Imóvel Importado',
                status: 'Não Iniciado' as const,
                assigned_to: null,
                added_by: addedBy,
                notes: '',
                added_at: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from('properties')
                .insert(properties);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Add bulk properties error:', error);
            return { success: false, error: 'Erro ao adicionar propriedades' };
        }
    },

    /**
     * Claim property
     */
    async claim(propertyId: string, userId: string): Promise<{ success: boolean; error: string | null }> {
        try {
            // Check if already assigned
            const { data: existing, error: fetchError } = await supabase
                .from('properties')
                .select('assigned_to')
                .eq('id', propertyId)
                .single();

            if (fetchError) {
                return { success: false, error: 'Propriedade não encontrada' };
            }

            if (existing.assigned_to && existing.assigned_to !== userId) {
                return { success: false, error: 'Propriedade já atribuída a outro usuário' };
            }

            // Claim it
            const { error } = await supabase
                .from('properties')
                .update({
                    assigned_to: userId,
                    status: 'Em Análise',
                })
                .eq('id', propertyId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Claim property error:', error);
            return { success: false, error: 'Erro ao reivindicar propriedade' };
        }
    },

    /**
     * Update property status
     */
    async updateStatus(
        propertyId: string,
        status: AnalysisStatus,
        notes?: string,
        abortReason?: string,
        aiAnalysis?: string,
        analysisData?: PropertyAnalysisData
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            // Update property
            const updateData: any = { status };
            if (notes !== undefined) updateData.notes = notes;
            if (abortReason !== undefined) updateData.abort_reason = abortReason;
            if (aiAnalysis !== undefined) updateData.ai_analysis = aiAnalysis;

            // Check if editing completed property
            const { data: existing } = await supabase
                .from('properties')
                .select('status')
                .eq('id', propertyId)
                .single();

            if (existing && (existing.status === 'Analisado' || existing.status === 'Abortado') && status !== 'Arrematado') {
                updateData.last_edited_at = new Date().toISOString();
            }

            const { error: propError } = await supabase
                .from('properties')
                .update(updateData)
                .eq('id', propertyId);

            if (propError) {
                return { success: false, error: propError.message };
            }

            // Save analysis data if provided
            if (analysisData) {
                // Check if analysis already exists
                const { data: existingAnalysis, error: fetchError } = await supabase
                    .from('property_analysis')
                    .select('id')
                    .eq('property_id', propertyId);

                if (fetchError) {
                    console.error('Error checking existing analysis:', fetchError);
                    return { success: false, error: fetchError.message };
                }

                if (existingAnalysis && existingAnalysis.length > 0) {
                    // Update ALL existing records to ensure consistency
                    const { error: analysisError } = await supabase
                        .from('property_analysis')
                        .update(mapAnalysisDataToDb(analysisData))
                        .eq('property_id', propertyId);

                    if (analysisError) {
                        return { success: false, error: analysisError.message };
                    }
                } else {
                    // Insert new
                    const { error: analysisError } = await supabase
                        .from('property_analysis')
                        .insert({
                            property_id: propertyId,
                            ...mapAnalysisDataToDb(analysisData),
                        });

                    if (analysisError) {
                        return { success: false, error: analysisError.message };
                    }
                }
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Update status error:', error);
            return { success: false, error: 'Erro ao atualizar status' };
        }
    },

    /**
     * Update manager dispatch
     */
    async updateManagerDispatch(
        propertyId: string,
        recipient: string,
        sent: boolean,
        clientId?: string
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            const { error } = await supabase
                .from('properties')
                .update({
                    manager_dispatch: { recipient, sent, clientId },
                })
                .eq('id', propertyId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Update manager dispatch error:', error);
            return { success: false, error: 'Erro ao atualizar envio' };
        }
    },

    /**
     * Mark property as sold
     */
    async markAsSold(
        propertyId: string,
        soldDate: string,
        soldAmount: number,
        buyerName: string
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            const { error } = await supabase
                .from('properties')
                .update({
                    status: 'Arrematado',
                    sold_date: soldDate,
                    sold_amount: soldAmount,
                    buyer_name: buyerName,
                })
                .eq('id', propertyId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Mark as sold error:', error);
            return { success: false, error: 'Erro ao marcar como arrematado' };
        }
    },
};

// Helper functions to map between DB and App types
function mapAnalysisData(dbData: any): PropertyAnalysisData {
    return {
        cityState: dbData.city_state || '',
        condoName: dbData.condo_name || '',
        address: dbData.address || '',
        paymentMethod: dbData.payment_method || '',
        modality: dbData.modality || '',
        eventDate: dbData.event_date || '',
        initialBid: dbData.initial_bid || 0,
        bankValuation: dbData.bank_valuation || 0,
        financing: dbData.financing || '',
        bankMirror: dbData.bank_mirror || '',
        paymentPrint: dbData.payment_print || '',
        privateArea: dbData.private_area || 0,
        condoDebtRule: dbData.condo_debt_rule || false,
        editalLink: dbData.edital_link || '',
        homologationDate: dbData.homologation_date || '',
        auctionLotLink: dbData.auction_lot_link || '',
        criticalImpediment: dbData.critical_impediment || '',
        bankConsolidation: dbData.bank_consolidation || '',
        cpfCriticalNature: dbData.cpf_critical_nature || '',
        cpfPropterRem: dbData.cpf_propter_rem || '',
        cpfSearchPrint: dbData.cpf_search_print || '',
        matriculaFile: dbData.matricula_file || '',
        waitingLawyer: dbData.waiting_lawyer || false,
        locAsphaltQuality: dbData.loc_asphalt_quality || '',
        locRural: dbData.loc_rural || '',
        locRemote: dbData.loc_remote || '',
        locFavela: dbData.loc_favela || '',
        locGoodAppearance: dbData.loc_good_appearance || '',
        locPublicTransport: dbData.loc_public_transport || '',
        locCommerce: dbData.loc_commerce || '',
        locHealthEducation: dbData.loc_health_education || '',
        locLeisure: dbData.loc_leisure || '',
        locDifferential: dbData.loc_differential || '',
        rentValue: dbData.rent_value || 0,
        rentPrint: dbData.rent_print || '',
        comparables: dbData.comparables || [],
        condoFee: dbData.condo_fee || 0,
        venalValue: dbData.venal_value || 0,
        itbiRate: dbData.itbi_rate || 0,
        registryValue: dbData.registry_value || 0,
        renovationValue: dbData.renovation_value || 0,
        condoDebt: dbData.condo_debt || 0,
        iptuDebt: dbData.iptu_debt || 0,
        iptuDebtPrint: dbData.iptu_debt_print || '',
        financingRate: dbData.financing_rate || 0,
        financingTerm: dbData.financing_term || 0,
        salesPeriod: dbData.sales_period || 0,
        maxBid: dbData.max_bid,
        lastOwnerRegistryDate: dbData.last_owner_registry_date || '',
        monthlyIptu: dbData.monthly_iptu || 0,
        finalRoi: dbData.final_roi,
        finalNetProfit: dbData.final_net_profit,
    };
}

function mapAnalysisDataToDb(data: PropertyAnalysisData): any {
    return {
        city_state: data.cityState,
        condo_name: data.condoName,
        address: data.address,
        payment_method: data.paymentMethod,
        modality: data.modality,
        event_date: data.eventDate,
        initial_bid: data.initialBid,
        bank_valuation: data.bankValuation,
        financing: data.financing,
        bank_mirror: data.bankMirror,
        payment_print: data.paymentPrint,
        private_area: data.privateArea,
        condo_debt_rule: data.condoDebtRule,
        edital_link: data.editalLink,
        homologation_date: data.homologationDate,
        auction_lot_link: data.auctionLotLink,
        critical_impediment: data.criticalImpediment,
        bank_consolidation: data.bankConsolidation,
        cpf_critical_nature: data.cpfCriticalNature,
        cpf_propter_rem: data.cpfPropterRem,
        cpf_search_print: data.cpfSearchPrint,
        matricula_file: data.matriculaFile,
        waiting_lawyer: data.waitingLawyer,
        loc_asphalt_quality: data.locAsphaltQuality,
        loc_rural: data.locRural,
        loc_remote: data.locRemote,
        loc_favela: data.locFavela,
        loc_good_appearance: data.locGoodAppearance,
        loc_public_transport: data.locPublicTransport,
        loc_commerce: data.locCommerce,
        loc_health_education: data.locHealthEducation,
        loc_leisure: data.locLeisure,
        loc_differential: data.locDifferential,
        rent_value: data.rentValue,
        rent_print: data.rentPrint,
        comparables: data.comparables,
        condo_fee: data.condoFee,
        venal_value: data.venalValue,
        itbi_rate: data.itbiRate,
        registry_value: data.registryValue,
        renovation_value: data.renovationValue,
        condo_debt: data.condoDebt,
        iptu_debt: data.iptuDebt,
        iptu_debt_print: data.iptuDebtPrint,
        financing_rate: data.financingRate,
        financing_term: data.financingTerm,
        sales_period: data.salesPeriod,
        max_bid: data.maxBid,
        last_owner_registry_date: data.lastOwnerRegistryDate,
        monthly_iptu: data.monthlyIptu,
        final_roi: data.finalRoi,
        final_net_profit: data.finalNetProfit,
    };
}
