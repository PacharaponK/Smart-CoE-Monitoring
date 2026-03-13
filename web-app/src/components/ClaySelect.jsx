'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function ClaySelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  label = '',
  icon: Icon = null,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full clay-card-inset !p-2.5 flex items-center justify-between gap-2 group transition-all duration-300 hover:shadow-md active:scale-[0.98]"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && (
            <div className="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
              <Icon size={14} className="text-blue-500" />
            </div>
          )}
          <span className={`text-sm font-bold truncate ${selectedOption ? 'text-gray-700' : 'text-gray-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-3 clay-card !p-2 animate-slide-up shadow-2xl origin-top">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 mb-1 last:mb-0
                  ${value === option.value 
                    ? 'bg-blue-50 text-blue-600 font-bold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check size={14} className="flex-shrink-0" />}
              </button>
            ))}
            {options.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 font-medium italic">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
