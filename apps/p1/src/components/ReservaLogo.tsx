'use client';

import React from 'react';

interface ReservaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  inverted?: boolean;
  className?: string;
}

export const ReservaLogo: React.FC<ReservaLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  inverted = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const textColor = inverted ? 'text-white' : 'text-[#171D2B]';
  const subtitleColor = inverted ? 'text-white/70' : 'text-[#742F42]';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Editorial Stamp Ticket Icon */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl transition-transform -rotate-6`}
        style={{
          background: inverted
            ? 'rgba(255, 255, 255, 0.15)'
            : 'linear-gradient(135deg, #742F42 0%, #B64A38 100%)',
          boxShadow: inverted
            ? '0 3px 10px rgba(0,0,0,0.2)'
            : '0 3px 10px rgba(116, 47, 66, 0.25)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-1/2 h-1/2 text-white"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M12 9v6" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Brand Text with Serif Character */}
      <div className="flex flex-col leading-none">
        <span
          className={`font-serif font-black tracking-tight ${textSizes[size]} ${textColor}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Reserva
        </span>
        {showSubtitle && (
          <span className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${subtitleColor}`}>
            Events & Travel
          </span>
        )}
      </div>
    </div>
  );
};
