import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ClayCardProps {
  children: React.ReactNode;
  className?: string;
  color?: 'blue' | 'purple' | 'teal' | 'orange' | 'white';
}

const colorStyles = {
  blue: 'bg-blue-100 text-blue-900 shadow-[20px_20px_60px_#d9d9d9,-20px_-20px_60px_#ffffff]',
  purple: 'bg-purple-100 text-purple-900 shadow-[20px_20px_60px_#d9d9d9,-20px_-20px_60px_#ffffff]',
  teal: 'bg-teal-100 text-teal-900 shadow-[20px_20px_60px_#d9d9d9,-20px_-20px_60px_#ffffff]',
  orange: 'bg-orange-100 text-orange-900 shadow-[20px_20px_60px_#d9d9d9,-20px_-20px_60px_#ffffff]',
  white: 'bg-white text-gray-900 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]',
};

export const ClayCard: React.FC<ClayCardProps> = ({ children, className, color = 'white' }) => {
  return (
    <div
      className={cn(
        'rounded-[40px] p-6 transition-all duration-300 hover:scale-[1.02]',
        colorStyles[color],
        className
      )}
    >
      {children}
    </div>
  );
};
