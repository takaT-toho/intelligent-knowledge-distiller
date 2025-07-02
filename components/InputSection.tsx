
import React from 'react';
import { Card } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

interface InputSectionProps {
    rawData: string;
    setRawData: (value: string) => void;
    separator: string;
    setSeparator: (value: string) => void;
    onProcess: () => void;
    isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ rawData, setRawData, separator, setSeparator, onProcess, isLoading }) => {
    return (
        <Card>
            <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">1. Input Data</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="raw-data" className="block text-sm font-medium text-gray-400 mb-1">
                            Paste your unstructured data (e.g., tickets, emails)
                        </label>
                        <Textarea
                            id="raw-data"
                            value={rawData}
                            onChange={(e) => setRawData(e.target.value)}
                            rows={12}
                            placeholder="Paste your data here..."
                        />
                    </div>
                    <div>
                        <label htmlFor="separator" className="block text-sm font-medium text-gray-400 mb-1">
                            Data record separator
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
                            {isLoading ? <><Spinner className="mr-2" /> Processing...</> : 'Distill Knowledge'}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};
