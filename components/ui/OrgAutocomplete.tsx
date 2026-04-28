
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SATUN_HEALTH_ORGS } from '../../constants';
import { HealthOrg } from '../../types';

interface OrgAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const OrgAutocomplete: React.FC<OrgAutocompleteProps> = ({ value, onChange, placeholder, className, disabled }) => {
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

  const filteredOrgs = useMemo(() => {
    if (!query) return SATUN_HEALTH_ORGS.slice(0, 50); // Limit to 50 for performance
    const lowerQuery = query.toLowerCase();
    return SATUN_HEALTH_ORGS.filter(org => 
        org.name.toLowerCase().includes(lowerQuery) || 
        org.district.toLowerCase().includes(lowerQuery) ||
        org.subDistrict.toLowerCase().includes(lowerQuery) ||
        org.code.includes(lowerQuery)
    ).slice(0, 50); 
  }, [query]);

  const handleSelect = (org: HealthOrg) => {
    setQuery(org.name);
    onChange(org.name);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setShowDropdown(true);
  };

  // --- Helper: Color Coding for Org Types ---
  const getOrgTypeStyle = (type: string) => {
      switch (type) {
          case 'สสจ.': 
              return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700';
          case 'โรงพยาบาลทั่วไป': 
              return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700';
          case 'โรงพยาบาลชุมชน': 
              return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700';
          case 'สสอ.': 
              return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
          case 'รพ.สต.': 
              return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700';
          case 'สอน.': 
              return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700';
          case 'ศสม.': 
              return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700';
          default: 
              return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      }
  };

  return (
    // Added dynamic z-index: z-[100] when open to float above other form elements
    <div className={`relative w-full ${showDropdown ? 'z-[100]' : 'z-0'}`} ref={wrapperRef}>
      <input 
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
            if (!disabled) setShowDropdown(true);
        }}
        placeholder={placeholder || "พิมพ์ชื่อหน่วยงาน, อำเภอ หรือตำบล..."}
        className={className || "w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white transition"}
        autoComplete="off"
        disabled={disabled}
      />
      
      {showDropdown && filteredOrgs.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
          {filteredOrgs.map((org) => (
            <div 
              key={org.code}
              onClick={() => handleSelect(org)}
              className="px-4 py-3 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition group"
            >
              <div className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-sky-600 dark:group-hover:text-sky-400">
                {org.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getOrgTypeStyle(org.type)}`}>
                    {org.type}
                </span>
                <span className="opacity-80">
                    ต.{org.subDistrict} อ.{org.district}
                    {org.moo && org.moo !== "0" && ` หมู่ ${org.moo}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgAutocomplete;
