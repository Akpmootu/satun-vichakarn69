import React from 'react';

type Tone = 'slate' | 'navy' | 'green' | 'amber' | 'red';

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, tone = 'slate', className = '' }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    navy: "bg-sky-50 text-sky-700 ring-sky-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;