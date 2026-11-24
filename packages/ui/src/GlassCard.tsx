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
      'bg-white border-[#F0E6E8] text-[#1A1A1A] shadow-[0_4px_20px_0_rgba(107,23,54,0.05)]',
    elevated:
      'bg-white border-[#E5D7DA] text-[#1A1A1A] shadow-[0_8px_30px_0_rgba(107,23,54,0.08)]',
    interactive:
      'bg-white hover:bg-[#FFFDFE] border-[#F0E6E8] hover:border-[#6B1736]/30 text-[#1A1A1A] shadow-[0_4px_20px_0_rgba(107,23,54,0.05)] hover:shadow-[0_8px_30px_0_rgba(107,23,54,0.10)] cursor-pointer active:scale-[0.99]',
    accent:
      'bg-[#FFF5F7] border-[#FCE7EC] text-[#1A1A1A] shadow-[0_4px_20px_0_rgba(107,23,54,0.06)]',
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

