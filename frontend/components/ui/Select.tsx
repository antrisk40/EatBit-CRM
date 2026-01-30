'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/helpers';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  disabled = false,
  error,
  label,
  required = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div ref={dropdownRef} className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200',
            'bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            isOpen && 'ring-2 ring-blue-500 border-transparent'
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption?.icon && (
              <span className="flex-shrink-0 text-gray-500">{selectedOption.icon}</span>
            )}
            <span className={cn(
              'truncate',
              selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'
            )}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0',
              isOpen && 'transform rotate-180'
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Input */}
            {options.length > 5 && (
              <div className="p-2 border-b border-gray-100">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        'hover:bg-blue-50 focus:bg-blue-50 focus:outline-none',
                        isSelected && 'bg-blue-50'
                      )}
                    >
                      {option.icon && (
                        <span className="flex-shrink-0 text-gray-500">{option.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        )}>
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {option.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  );
}
