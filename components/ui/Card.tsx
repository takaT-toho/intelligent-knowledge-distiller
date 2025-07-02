
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={`bg-gray-800 rounded-lg shadow-lg border border-gray-700 ${className}`}>
            {children}
        </div>
    );
};
