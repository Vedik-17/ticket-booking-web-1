import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseClasses =
    'relative rounded-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden';

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantClasses = {
    default:
      'bg-[#121212]/80 border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]',
    elevated:
      'bg-[#181818]/90 border-white/[0.12] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]',
    interactive:
      'bg-[#121212]/70 hover:bg-[#181818]/90 border-white/[0.08] hover:border-white/[0.18] hover:shadow-[0_12px_40px_0_rgba(255,106,26,0.12)] cursor-pointer active:scale-[0.99]',
    accent:
      'bg-[#181818]/90 border-[#FF6A1A]/30 shadow-[0_8px_32px_0_rgba(255,106,26,0.15)]',
  };

  return (
    <div
      className={`${baseClasses} ${paddingClasses[padding]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {/* Top subtle liquid glass highlight edge */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
      {children}
    </div>
  );
};
