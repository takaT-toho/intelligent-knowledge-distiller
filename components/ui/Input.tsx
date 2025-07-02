
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
    return (
        <input
            className={`w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
            {...props}
        />
    );
};
