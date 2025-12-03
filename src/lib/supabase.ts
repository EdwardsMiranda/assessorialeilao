import { createClient } from '@supabase/supabase-js';

// Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on our schema
export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    name: string;
                    email: string;
                    password_hash: string;
                    role: 'Gestor' | 'Analista';
                    avatar: string | null;
                    blocked: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['users']['Insert']>;
            };
            clients: {
                Row: {
                    id: string;
                    name: string;
                    phone: string;
                    email: string | null;
                    investment_thesis: {
                        cities: string[];
                        maxBidValue: number;
                        propertyTypes?: string[];
                        notes?: string;
                    };
                    added_at: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['clients']['Insert']>;
            };
            properties: {
                Row: {
                    id: string;
                    url: string;
                    modality: string;
                    auction_date: string;
                    status: 'Não Iniciado' | 'Em Análise' | 'Analisado' | 'Abortado' | 'Arrematado';
                    assigned_to: string | null;
                    added_by: string;
                    title: string | null;
                    notes: string | null;
                    abort_reason: string | null;
                    ai_analysis: string | null;
                    manager_dispatch: {
                        recipient: string;
                        clientId?: string;
                        sent: boolean;
                    } | null;
                    last_edited_at: string | null;
                    sold_date: string | null;
                    sold_amount: number | null;
                    buyer_name: string | null;
                    added_at: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['properties']['Insert']>;
            };
            property_analysis: {
                Row: {
                    id: string;
                    property_id: string;
                    city_state: string | null;
                    condo_name: string | null;
                    address: string | null;
                    payment_method: string | null;
                    modality: string | null;
                    event_date: string | null;
                    initial_bid: number | null;
                    bank_valuation: number | null;
                    financing: string | null;
                    bank_mirror: string | null;
                    payment_print: string | null;
                    private_area: number | null;
                    condo_debt_rule: boolean | null;
                    edital_link: string | null;
                    homologation_date: string | null;
                    auction_lot_link: string | null;
                    critical_impediment: string | null;
                    bank_consolidation: string | null;
                    cpf_critical_nature: string | null;
                    cpf_propter_rem: string | null;
                    cpf_search_print: string | null;
                    matricula_file: string | null;
                    waiting_lawyer: boolean;
                    loc_asphalt_quality: string | null;
                    loc_rural: string | null;
                    loc_remote: string | null;
                    loc_favela: string | null;
                    loc_good_appearance: string | null;
                    loc_public_transport: string | null;
                    loc_commerce: string | null;
                    loc_health_education: string | null;
                    loc_leisure: string | null;
                    loc_differential: string | null;
                    rent_value: number | null;
                    rent_print: string | null;
                    comparables: Array<{
                        link: string;
                        value: number;
                        area: number;
                    }> | null;
                    condo_fee: number | null;
                    venal_value: number | null;
                    itbi_rate: number | null;
                    registry_value: number | null;
                    renovation_value: number | null;
                    condo_debt: number | null;
                    iptu_debt: number | null;
                    iptu_debt_print: string | null;
                    financing_rate: number | null;
                    financing_term: number | null;
                    sales_period: number | null;
                    max_bid: number | null;
                    last_owner_registry_date: string | null;
                    monthly_iptu: number | null;
                    final_roi: number | null;
                    final_net_profit: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['property_analysis']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['property_analysis']['Insert']>;
            };
        };
    };
};
