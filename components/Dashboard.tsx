import React, { useMemo } from 'react';
import { Submission } from '../types';
import { BRANCHES, WORK_TYPES } from '../constants';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  hint?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, hint }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 flex items-start justify-between">
    <div>
      <div className="text-sm font-bold text-slate-600">{title}</div>
      <div className="text-3xl font-black text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
    <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
      <i className={`fa-solid ${icon}`} />
    </div>
  </div>
);

const Dashboard: React.FC<{ submissions: Submission[] }> = ({ submissions }) => {
  const stats = useMemo(() => {
    const total = submissions.length;
    const submitted = submissions.filter(s => s.status === 'submitted').length;
    const draft = submissions.filter(s => s.status === 'draft').length;

    const byType = WORK_TYPES.map(t => ({
      ...t,
      count: submissions.filter(s => s.workType === t.id).length
    }));

    const byBranch = BRANCHES.map(b => ({
      ...b,
      count: submissions.filter(s => s.branchId === b.id).length
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { total, submitted, draft, byType, byBranch };
  }, [submissions]);

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 fade-in">
       <div className="text-lg md:text-xl font-black text-slate-900 mb-1">ภาพรวมการส่งผลงาน</div>
       <div className="text-sm text-slate-500 mb-6">Executive Summary Analysis</div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="ทั้งหมด" value={stats.total} icon="fa-folder-open" />
          <StatCard title="ส่งแล้ว" value={stats.submitted} icon="fa-check-circle" hint="Ready for review" />
          <StatCard title="ฉบับร่าง" value={stats.draft} icon="fa-pencil" hint="In progress" />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-100 p-4">
             <h3 className="font-bold text-slate-800 mb-4">สัดส่วนตามประเภท</h3>
             <div className="space-y-4">
                {stats.byType.map(t => (
                  <div key={t.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{t.label}</span>
                      <span className="font-bold">{t.count}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-slate-800" style={{ width: `${stats.total ? (t.count / stats.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
             <h3 className="font-bold text-slate-800 mb-4">5 อันดับสาขายอดนิยม</h3>
             <div className="space-y-3">
                {stats.byBranch.map((b, idx) => (
                  <div key={b.id} className="flex items-center gap-3">
                     <div className="h-6 w-6 rounded bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-bold">
                       {idx + 1}
                     </div>
                     <div className="flex-1 text-sm text-slate-700 truncate">{b.label}</div>
                     <div className="font-bold text-sm">{b.count}</div>
                  </div>
                ))}
                {stats.byBranch.every(b => b.count === 0) && (
                    <div className="text-center text-sm text-slate-400 py-4">ยังไม่มีข้อมูล</div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default Dashboard;