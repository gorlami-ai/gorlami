import React from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const HomeIcon: React.FC<IconProps> = ({ 
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
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);