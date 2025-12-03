import { supabase } from '../lib/supabase';
import type { Client } from '../types';

export const clientService = {
    /**
     * Get all clients
     */
    async getAll(): Promise<{ clients: Client[]; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('added_at', { ascending: false });

            if (error) {
                return { clients: [], error: error.message };
            }

            const clients: Client[] = data.map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email || undefined,
                investmentThesis: c.investment_thesis,
                addedAt: c.added_at,
            }));

            return { clients, error: null };
        } catch (error) {
            console.error('Get clients error:', error);
            return { clients: [], error: 'Erro ao buscar clientes' };
        }
    },

    /**
     * Add new client
     */
    async add(client: Omit<Client, 'id' | 'addedAt'>): Promise<{ success: boolean; clientId: string | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('clients')
                .insert({
                    name: client.name,
                    phone: client.phone,
                    email: client.email || null,
                    investment_thesis: client.investmentThesis,
                    added_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                return { success: false, clientId: null, error: error.message };
            }

            return { success: true, clientId: data.id, error: null };
        } catch (error) {
            console.error('Add client error:', error);
            return { success: false, clientId: null, error: 'Erro ao adicionar cliente' };
        }
    },

    /**
     * Remove client
     */
    async remove(clientId: string): Promise<{ success: boolean; error: string | null }> {
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Remove client error:', error);
            return { success: false, error: 'Erro ao remover cliente' };
        }
    },

    /**
     * Update client
     */
    async update(clientId: string, updates: Partial<Omit<Client, 'id' | 'addedAt'>>): Promise<{ success: boolean; error: string | null }> {
        try {
            const updateData: any = {};
            if (updates.name) updateData.name = updates.name;
            if (updates.phone) updateData.phone = updates.phone;
            if (updates.email !== undefined) updateData.email = updates.email || null;
            if (updates.investmentThesis) updateData.investment_thesis = updates.investmentThesis;

            const { error } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', clientId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Update client error:', error);
            return { success: false, error: 'Erro ao atualizar cliente' };
        }
    },
};
