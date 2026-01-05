import { supabase } from '../lib/supabase';

export const storageService = {
    /**
     * Upload a file to Supabase Storage
     */
    async uploadFile(
        propertyId: string,
        file: File,
        folder: string = 'documents'
    ): Promise<{ url: string | null; error: string | null }> {
        try {
            const extension = file.name.split('.').pop() || 'dat';
            const cleanFileName = `${folder}/${propertyId}_${Date.now()}.${extension}`;
            const bucketName = 'property-documents';

            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(cleanFileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Core Storage Upload Error:', error);
                return { url: null, error: error.message };
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(cleanFileName);

            return { url: publicUrl, error: null };
        } catch (error) {
            console.error('Upload catch error:', error);
            return { url: null, error: 'Erro inesperado no upload' };
        }
    }
};
