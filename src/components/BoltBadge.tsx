import React from 'react';

interface BoltBadgeProps {
  position?: 'bottom-left' | 'bottom-right' | 'top-right';
  className?: string;
}

export function BoltBadge({ position = 'bottom-left', className = '' }: BoltBadgeProps) {
  const positionClasses = {
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'top-right': 'fixed top-4 right-4',
  };

  return (
    <a
      href="https://bolt.new"
      target="_blank"
      rel="noopener noreferrer"
      className={`${positionClasses[position]} z-30 flex items-center justify-center hover:scale-105 transition-all duration-200 ${className}`}
    >
      <img 
        src="/black_circle_360x360.png" 
        alt="Bolt" 
        className="w-16 h-16 bg-transparent"
        style={{ backgroundColor: 'transparent' }}
      />
    </a>
  );
}