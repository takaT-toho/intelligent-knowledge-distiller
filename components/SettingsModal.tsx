
import React from 'react';
import { LLMProvider } from '../types';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: LLMProvider;
    setProvider: (provider: LLMProvider) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, provider, setProvider }) => {
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
                        <p className="text-xs text-gray-500 mt-2">Currently, only the Gemini provider is implemented.</p>
                    </div>
                </div>
                 <div className="p-4 bg-gray-900/50 rounded-b-lg flex justify-end">
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
};
