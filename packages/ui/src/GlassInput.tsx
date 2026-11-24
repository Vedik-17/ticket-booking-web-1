import React from 'react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#1A1A1A] tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-xl bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#8E8E93] border ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                : 'border-[#E5D7DA] focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/30'
            } outline-none transition-all duration-200 shadow-sm ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-white/40">{helperText}</p>}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

