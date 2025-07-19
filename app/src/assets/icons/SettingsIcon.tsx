import React from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const SettingsIcon: React.FC<IconProps> = ({ 
  className = '', 
  width = 20, 
  height = 20 
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 6.5m-14 11L6.5 16M17.5 19.5L19 17.5M6.5 8L5 6.5" />
  </svg>
);