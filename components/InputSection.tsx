
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { Select } from './ui/Select';
import { ProcessingMode } from '../types';

interface InputSectionProps {
    rawData: string;
    setRawData: (value: string) => void;
    separator: string;
    setSeparator: (value: string) => void;
    domain: string;
    setDomain: (value: string) => void;
    processingMode: ProcessingMode;
    setProcessingMode: (value: ProcessingMode) => void;
    onProcess: () => void;
    isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
    rawData, setRawData, 
    separator, setSeparator, 
    domain, setDomain,
    processingMode, setProcessingMode,
    onProcess, isLoading 
}) => {
    const { t } = useTranslation();

    return (
        <Card>
            <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">{t('inputSection.title')}</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="domain" className="block text-sm font-medium text-gray-400 mb-1">
                            {t('inputSection.domainLabel')}
                        </label>
                        <Input
                            id="domain"
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder={t('inputSection.domainPlaceholder')}
                        />
                    </div>
                     <div>
                        <label htmlFor="processing-mode" className="block text-sm font-medium text-gray-400 mb-1">
                            {t('inputSection.processingModeLabel')}
                        </label>
                        <Select
                            id="processing-mode"
                            value={processingMode}
                            onChange={(e) => setProcessingMode(e.target.value as ProcessingMode)}
                        >
                            <option value={ProcessingMode.SIMPLE}>{t('inputSection.simpleMode')}</option>
                            <option value={ProcessingMode.DYNAMIC}>{t('inputSection.dynamicMode')}</option>
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="raw-data" className="block text-sm font-medium text-gray-400 mb-1">
                            {t('inputSection.pasteLabel')}
                        </label>
                        <Textarea
                            id="raw-data"
                            value={rawData}
                            onChange={(e) => setRawData(e.target.value)}
                            rows={10}
                            placeholder={t('inputSection.pastePlaceholder')}
                        />
                    </div>
                    <div>
                        <label htmlFor="separator" className="block text-sm font-medium text-gray-400 mb-1">
                            {t('inputSection.separatorLabel')}
                        </label>
                        <Input
                            id="separator"
                            type="text"
                            value={separator}
                            onChange={(e) => setSeparator(e.target.value)}
                        />
                    </div>
                    <div className="pt-2">
                        <Button onClick={onProcess} disabled={isLoading} className="w-full flex justify-center">
                            {isLoading ? <><Spinner className="mr-2" /> {t('inputSection.processingButton')}</> : t('inputSection.processButton')}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};
