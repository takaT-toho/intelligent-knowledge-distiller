
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GearIcon } from './icons/GearIcon';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <header className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                         <h1 className="text-xl sm:text-2xl font-bold text-white">{t('appTitle')}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div>
                            <select
                                onChange={(e) => changeLanguage(e.target.value)}
                                value={i18n.language}
                                className="bg-gray-800 text-white border border-gray-600 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                            >
                                <option value="en">English</option>
                                <option value="ja">日本語</option>
                            </select>
                        </div>
                       <button
                           onClick={onSettingsClick}
                           className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                           aria-label="Settings"
                       >
                           <GearIcon className="h-6 w-6" />
                       </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
