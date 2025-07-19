import React from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const GorlamiLogoIcon: React.FC<IconProps> = ({ 
  className = '', 
  width = 32, 
  height = 32 
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
    <path d="M12 8v4l3 3" />
  </svg>
);