import React from 'react';

interface GashtyarLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export function GashtyarLogo({
  className = '',
  size = 40,
  showText = true,
  subtitle = 'IT Management & Operations Portal',
}: GashtyarLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Gashtyar Brand Logo */}
      <div className="shrink-0 flex items-center justify-center">
        <img
          src="/images/gashtyar_logo.png"
          alt="Gashtyar Official Logo"
          className="object-contain transition-transform hover:scale-105"
          style={{ height: `${size}px`, width: 'auto', maxHeight: '52px' }}
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
            Gashtyar
          </span>
          {subtitle && (
            <span className="text-[11px] font-semibold text-slate-500 leading-none mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
