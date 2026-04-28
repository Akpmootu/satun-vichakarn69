import React from 'react';

interface PasswordStrengthMeterProps {
  password?: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const getStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    
    if (pass.length > 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    // Cap at 4 levels: 0 (empty), 1 (weak), 2 (fair), 3 (good), 4 (strong)
    if (score > 4) score = 4;

    switch (score) {
      case 0: return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
      case 1:
      case 2: return { score, label: 'อ่อน', color: 'bg-rose-500' };
      case 3: return { score, label: 'ปานกลาง', color: 'bg-amber-400' };
      case 4: return { score, label: 'ปลอดภัยสูง', color: 'bg-emerald-500' };
      default: return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-700' };
    }
  };

  const strength = getStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1.5 w-full">
        <div className={`flex-1 rounded-full transition-colors ${password.length > 0 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
        <div className={`flex-1 rounded-full transition-colors ${strength.score > 2 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
        <div className={`flex-1 rounded-full transition-colors ${strength.score > 3 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`}></div>
      </div>
      {password.length > 0 && (
        <p className={`text-xs text-right mt-1 font-semibold
           ${strength.score <= 2 ? 'text-rose-500' : strength.score === 3 ? 'text-amber-500' : 'text-emerald-500'}
        `}>
          {strength.label}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
