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
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const primaryColor = inverted ? '#FFFFFF' : '#6B1736';
  const textColor = inverted ? 'text-white' : 'text-[#6B1736]';
  const subtitleColor = inverted ? 'text-white/70' : 'text-[#6B1736]/70';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Reserva Ticket Icon */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl transition-transform`}
        style={{
          background: inverted
            ? 'rgba(255, 255, 255, 0.15)'
            : 'linear-gradient(135deg, #6B1736 0%, #4E0F26 100%)',
          boxShadow: inverted
            ? '0 4px 14px rgba(0,0,0,0.2)'
            : '0 4px 14px rgba(107, 23, 54, 0.25)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-1/2 h-1/2 text-white"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Ticket Body with Notches */}
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M12 9v6" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col leading-none">
        <span
          className={`font-black tracking-tight ${textSizes[size]} ${textColor} font-serif`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Reserva
        </span>
        {showSubtitle && (
          <span className={`text-[9px] font-semibold tracking-wider uppercase mt-0.5 ${subtitleColor}`}>
            Event Ticketing & Management
          </span>
        )}
      </div>
    </div>
  );
};
