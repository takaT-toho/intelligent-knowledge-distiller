
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
    return (
        <textarea
            className={`w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
            {...props}
        />
    );
};
