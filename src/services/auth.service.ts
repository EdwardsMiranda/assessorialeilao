import { supabase } from '../lib/supabase';
import type { User } from '../types';

export const authService = {
    /**
     * Login user with email and password
     */
    async login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
        try {
            // 1. Authenticate with Supabase Auth FIRST
            // This ensures we have a valid session before trying to query the 'users' table,
            // avoiding Row Level Security (RLS) issues that might block unauthenticated reads.
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError || !authData.user) {
                console.error("Auth Error:", authError?.message);
                return { user: null, error: 'Email ou senha inválidos.' };
            }

            // 2. Get detailed user profile from database
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id) // Query by ID, which is safer and guarantees uniqueness
                .single();

            if (userError || !userData) {
                // If user exists in Auth but not in public.users, something is wrong with the sync
                // however, we should sign them out to prevent a "ghost" session
                await supabase.auth.signOut();
                console.error("User Profile Error:", userError?.message);
                return { user: null, error: 'Perfil de usuário não encontrado.' };
            }

            if (userData.blocked) {
                await supabase.auth.signOut();
                return { user: null, error: 'Usuário bloqueado. Contate o administrador.' };
            }

            // Map database user to app User type
            const user: User = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                avatar: userData.avatar || '',
                blocked: userData.blocked,
            };

            return { user, error: null };
        } catch (error) {
            console.error('Login error:', error);
            // Ensure we don't leave a half-logged-in state if something unexpected breaks
            await supabase.auth.signOut();
            return { user: null, error: 'Erro ao fazer login' };
        }
    },

    /**
     * Logout current user
     */
    async logout(): Promise<{ error: string | null }> {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                return { error: error.message };
            }
            return { error: null };
        } catch (error) {
            console.error('Logout error:', error);
            return { error: 'Erro ao fazer logout' };
        }
    },

    /**
     * Get current session
     */
    async getSession(): Promise<{ user: User | null; error: string | null }> {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                return { user: null, error: null };
            }

            // Get full user data from database
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (userError || !userData) {
                return { user: null, error: 'Usuário não encontrado' };
            }

            const user: User = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                avatar: userData.avatar || '',
                blocked: userData.blocked,
            };

            return { user, error: null };
        } catch (error) {
            console.error('Get session error:', error);
            return { user: null, error: 'Erro ao recuperar sessão' };
        }
    },

    /**
     * Create new user (admin only)
     */
    async createUser(
        name: string,
        email: string,
        password: string,
        role: 'Gestor' | 'Analista' = 'Analista'
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            // Check if email already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                return { success: false, error: 'Email já cadastrado' };
            }

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError || !authData.user) {
                return { success: false, error: authError?.message || 'Erro ao criar usuário' };
            }

            // Create user in database
            const { error: dbError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    name,
                    email,
                    password_hash: '', // Will be handled by Supabase Auth
                    role,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                    blocked: false,
                });

            if (dbError) {
                return { success: false, error: 'Erro ao salvar usuário no banco' };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: 'Erro ao criar usuário' };
        }
    },

    /**
     * Get all users (admin only)
     */
    async getAllUsers(): Promise<{ users: User[]; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                return { users: [], error: error.message };
            }

            const users: User[] = data.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar || '',
                blocked: u.blocked,
            }));

            return { users, error: null };
        } catch (error) {
            console.error('Get all users error:', error);
            return { users: [], error: 'Erro ao buscar usuários' };
        }
    },

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId: string, role: 'Gestor' | 'Analista'): Promise<{ success: boolean; error: string | null }> {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role })
                .eq('id', userId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Update user role error:', error);
            return { success: false, error: 'Erro ao atualizar função do usuário' };
        }
    },

    /**
     * Toggle user block status (admin only)
     */
    async toggleUserBlock(userId: string): Promise<{ success: boolean; error: string | null }> {
        try {
            // Get current blocked status
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('blocked')
                .eq('id', userId)
                .single();

            if (fetchError || !userData) {
                return { success: false, error: 'Usuário não encontrado' };
            }

            // Toggle blocked status
            const { error: updateError } = await supabase
                .from('users')
                .update({ blocked: !userData.blocked })
                .eq('id', userId);

            if (updateError) {
                return { success: false, error: updateError.message };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('Toggle user block error:', error);
            return { success: false, error: 'Erro ao bloquear/desbloquear usuário' };
        }
    },
};
