import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({ className = '', ...props }) => {
  const baseClasses = 'w-full px-4 py-2.5 rounded-lg bg-slate-900 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors';
  
  return (
    <textarea
      className={`${baseClasses} ${className}`}
      {...props}
    />
  );
};