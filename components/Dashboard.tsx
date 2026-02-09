import React, { useMemo } from 'react';
import { Submission } from '../types';
import { BRANCHES, WORK_TYPES } from '../constants';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  hint?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, hint, tone = 'blue' }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  };

  return (
    <div className={`rounded-2xl bg-white ring-1 shadow-sm p-4 flex items-start justify-between hover:shadow-md transition ${colors[tone].split(' ')[2]}`}>
      <div>
        <div className="text-sm font-bold text-slate-500">{title}</div>
        <div className="text-3xl font-black text-slate-900 mt-2">{value}</div>
        {hint && <div className="text-xs text-slate-400 mt-1 font-medium">{hint}</div>}
      </div>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${colors[tone].split(' ').slice(0, 2).join(' ')}`}>
        <i className={`fa-solid ${icon}`} />
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ submissions: Submission[] }> = ({ submissions }) => {
  const stats = useMemo(() => {
    const total = submissions.length;
    // Count anything NOT draft as submitted (including reviewed, accepted, rejected)
    const submitted = submissions.filter(s => s.status !== 'draft').length;
    const draft = submissions.filter(s => s.status === 'draft').length;
    
    // Calculate Success Rate
    const successRate = total > 0 ? (submitted / total) * 100 : 0;

    const byType = WORK_TYPES.map(t => {
      const count = submissions.filter(s => s.workType === t.id).length;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return { ...t, count, percent };
    });

    const byBranch = BRANCHES.map(b => ({
      ...b,
      count: submissions.filter(s => s.branchId === b.id).length
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { total, submitted, draft, successRate, byType, byBranch };
  }, [submissions]);

  return (
    <div className="space-y-6 fade-in pb-10">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">Dashboard ภาพรวม</div>
            <div className="text-sm text-slate-500">สรุปสถานการณ์การส่งผลงานวิชาการประจำปี {new Date().getFullYear() + 543}</div>
          </div>
          <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Updated</div>
              <div className="text-sm font-mono text-slate-600">{new Date().toLocaleString('th-TH')}</div>
          </div>
       </div>

       {/* Top Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="ทั้งหมด" 
            value={stats.total} 
            icon="fa-folder-open" 
            tone="blue"
            hint="รายการส่งผลงานรวม"
          />
          <StatCard 
            title="ส่งแล้ว" 
            value={stats.submitted} 
            icon="fa-circle-check" 
            tone="emerald"
            hint="รวมทุกสถานะ (ไม่รวมร่าง)" 
          />
          <StatCard 
            title="ฉบับร่าง" 
            value={stats.draft} 
            icon="fa-pen-ruler" 
            tone="amber"
            hint="กำลังดำเนินการ" 
          />
          <StatCard 
            title="อัตราความสำเร็จ" 
            value={`${stats.successRate.toFixed(1)}%`} 
            icon="fa-chart-pie" 
            tone="indigo"
            hint="Submitted vs Total" 
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Chart: Work Types */}
          <div className="lg:col-span-2 rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <i className="fa-solid fa-chart-bar text-sky-500"></i> สัดส่วนตามประเภทผลงาน
                </h3>
             </div>
             
             <div className="space-y-5">
                {stats.byType.map((t) => (
                  <div key={t.id} className="group relative">
                    <div className="flex justify-between text-sm mb-2 relative z-10">
                      <span className="font-bold text-slate-700 flex items-center gap-2">
                          <i className={`fa-solid ${t.icon} text-slate-400 w-5`}></i>
                          {t.label}
                      </span>
                      <span className="font-mono text-slate-500 group-hover:text-sky-600 transition font-bold">
                          {t.count} ({t.percent.toFixed(1)}%)
                      </span>
                    </div>
                    
                    {/* Interactive Bar */}
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner cursor-help">
                       <div 
                          className="h-full bg-slate-800 rounded-full transition-all duration-1000 ease-out group-hover:bg-sky-500 relative" 
                          style={{ width: `${t.percent}%` }}
                       >
                           {/* Shimmer Effect */}
                           <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                       </div>
                    </div>

                    {/* Enhanced Tooltip on Hover */}
                    <div className="absolute bottom-full right-0 mb-3 w-56 bg-slate-900 text-white text-xs p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-2xl pointer-events-none z-30 ring-1 ring-white/10">
                        <div className="font-bold text-sky-300 mb-3 border-b border-slate-700 pb-2 text-sm">{t.label}</div>
                        
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400">จำนวนผลงาน</span>
                            <div className="flex items-baseline gap-1">
                                <span className="font-mono font-bold text-xl text-white">{t.count}</span>
                                <span className="text-[10px] text-slate-500 uppercase">items</span>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center bg-slate-800/50 rounded-lg p-2">
                            <span className="text-slate-400">คิดเป็นร้อยละ</span>
                            <span className="font-mono font-bold text-emerald-400 text-lg">{t.percent.toFixed(1)}%</span>
                        </div>

                        {/* Triangle */}
                        <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-800/50"></div>
                    </div>
                  </div>
                ))}
                
                {stats.total === 0 && (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border-dashed border-2 border-slate-200">
                        <i className="fa-solid fa-chart-simple text-4xl mb-2 opacity-50"></i>
                        <p>ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
                    </div>
                )}
             </div>
          </div>

          {/* Top 5 Branches */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-6 flex flex-col">
             <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                <i className="fa-solid fa-trophy text-amber-500"></i> 5 อันดับสาขายอดนิยม
             </h3>
             <div className="space-y-4 flex-1">
                {stats.byBranch.map((b, idx) => (
                  <div key={b.id} className="flex items-center gap-4 group p-2 rounded-xl hover:bg-slate-50 transition">
                     <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-110
                        ${idx === 0 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 
                          idx === 1 ? 'bg-slate-200 text-slate-700 ring-1 ring-slate-300' : 
                          idx === 2 ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200' : 
                          'bg-slate-50 text-slate-500 ring-1 ring-slate-100'}
                     `}>
                       {idx + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-700 truncate group-hover:text-sky-700 transition">{b.label}</div>
                        <div className="text-xs text-slate-400">สาขาที่ {b.id}</div>
                     </div>
                     <div className="font-mono font-bold text-sm bg-slate-100 px-2 py-1 rounded-md text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700 transition">
                        {b.count}
                     </div>
                  </div>
                ))}
                
                {stats.byBranch.every(b => b.count === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 min-h-[150px]">
                         <i className="fa-regular fa-folder-open text-3xl"></i>
                        <span className="text-sm">ยังไม่มีข้อมูล</span>
                    </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default Dashboard;