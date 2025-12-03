
import React, { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LinkOrUploadInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
  placeholder?: string;
  onAiAction?: () => void;
  aiActionLabel?: string;
  propertyId: string;
  docType: string;
}

export const LinkOrUploadInput: React.FC<LinkOrUploadInputProps> = ({
  label,
  value,
  onChange,
  disabled,
  placeholder = "https://...",
  onAiAction,
  aiActionLabel = "IA",
  propertyId,
  docType,
}) => {
  const { uploadDocument } = useApp();
  const [mode, setMode] = useState<'link' | 'upload'>(value.startsWith('[ARQUIVO]') ? 'upload' : 'link');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      try {
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
