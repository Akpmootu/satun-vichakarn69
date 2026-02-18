
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { THAI_UNIVERSITIES } from '../../constants';

interface UniversityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const UniversityAutocomplete: React.FC<UniversityAutocompleteProps> = ({ value, onChange, placeholder, className }) => {
  const [query, setQuery] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUnis = useMemo(() => {
    // Return ALL items if no query, or filter by query
    if (!query) return THAI_UNIVERSITIES; 
    const lowerQuery = query.toLowerCase();
    return THAI_UNIVERSITIES.filter(uni => 
        uni.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  const handleSelect = (uni: string) => {
    setQuery(uni);
    onChange(uni);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setShowDropdown(true);
  };

  return (
    // Added dynamic z-index: z-[100] when open
    <div className={`relative w-full ${showDropdown ? 'z-[100]' : 'z-0'}`} ref={wrapperRef}>
      <input 
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder || "พิมพ์ชื่อมหาวิทยาลัย/สถาบัน..."}
        className={className || "w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white transition"}
        autoComplete="off"
      />
      
      {showDropdown && filteredUnis.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
          {filteredUnis.map((uni, idx) => (
            <div 
              key={idx}
              onClick={() => handleSelect(uni)}
              className="px-4 py-3 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition"
            >
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                {uni}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UniversityAutocomplete;
