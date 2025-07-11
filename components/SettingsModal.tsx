
import React from 'react';
import { LLMProvider } from '../types';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: LLMProvider;
    setProvider: (provider: LLMProvider) => void;
    openaiBaseUrl: string;
    setOpenaiBaseUrl: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    provider, 
    setProvider, 
    openaiBaseUrl, 
    setOpenaiBaseUrl 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="llm-provider" className="block text-sm font-medium text-gray-300 mb-2">
                            AI Model Provider
                        </label>
                        <Select
                            id="llm-provider"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value as LLMProvider)}
                        >
                            {Object.values(LLMProvider).map(p => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </Select>
                        <p className="text-xs text-gray-500 mt-2">Select your preferred AI model provider.</p>
                    </div>
                    
                    {provider === LLMProvider.OPENAI && (
                        <div>
                            <label htmlFor="openai-base-url" className="block text-sm font-medium text-gray-300 mb-2">
                                OpenAI API Base URL (互換APIの場合)
                            </label>
                            <Input
                                id="openai-base-url"
                                value={openaiBaseUrl}
                                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                                placeholder="https://api.openai.com/v1"
                            />
                            <p className="text-xs text-gray-500 mt-2">OpenAI互換APIを使用する場合はベースURLを入力してください。</p>
                        </div>
                    )}
                </div>
                 <div className="p-4 bg-gray-900/50 rounded-b-lg flex justify-end">
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
};
