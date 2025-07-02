
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select: React.FC<SelectProps> = ({ className, children, ...props }) => {
    return (
        <select
            className={`w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
            {...props}
        >
            {children}
        </select>
    );
};
