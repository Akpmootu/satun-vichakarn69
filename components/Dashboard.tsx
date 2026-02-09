import React, { useMemo } from 'react';
import { Submission } from '../types';
import { BRANCHES, WORK_TYPES } from '../constants';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  hint?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, hint, tone = 'blue' }) => {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-blue-100 dark:ring-blue-900/50",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-100 dark:ring-emerald-900/50",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 ring-amber-100 dark:ring-amber-900/50",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 ring-indigo-100 dark:ring-indigo-900/50",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 ring-rose-100 dark:ring-rose-900/50",
  };

  const getIconBg = (t: string) => {
      // Split logic to handle dark mode classes embedded in string
      return t.split(' ').slice(0, 2).join(' ');
  }

  const getContainerClass = (t: string) => {
      // Get the ring class
      return t.split(' ').slice(2).join(' ');
  }

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 ring-1 shadow-sm p-4 flex items-start justify-between hover:shadow-md transition ${getContainerClass(colors[tone])}`}>
      <div>
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</div>
        <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{value}</div>
        {hint && <div className="text-xs text-slate-400 mt-1 font-medium">{hint}</div>}
      </div>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${getIconBg(colors[tone])}`}>
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
    
    // Status Breakdowns
    const accepted = submissions.filter(s => s.status === 'accepted').length;
    const pending = submissions.filter(s => ['submitted', 'reviewed'].includes(s.status)).length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;

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

    return { total, submitted, draft, successRate, byType, byBranch, accepted, pending, rejected };
  }, [submissions]);

  return (
    <div className="space-y-6 fade-in pb-10">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Dashboard ภาพรวม</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">สรุปสถานการณ์การส่งผลงานวิชาการประจำปี {new Date().getFullYear() + 543}</div>
          </div>
          <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Updated</div>
              <div className="text-sm font-mono text-slate-600 dark:text-slate-400">{new Date().toLocaleString('th-TH')}</div>
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
            icon="fa-paper-plane" 
            tone="emerald"
            hint="เข้าสู่กระบวนการแล้ว" 
          />
          <StatCard 
            title="ฉบับร่าง" 
            value={stats.draft} 
            icon="fa-pen-ruler" 
            tone="amber"
            hint="กำลังดำเนินการ" 
          />
          <StatCard 
            title="ผ่านการคัดเลือก" 
            value={stats.accepted} 
            icon="fa-trophy" 
            tone="indigo"
            hint="ผลงานที่ได้รับรางวัล" 
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Breakdown (New Card) */}
          <div className="rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-6 flex flex-col">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-6 flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-rose-500"></i> สรุปสถานะผลงาน
             </h3>
             <div className="flex-1 flex flex-col justify-center items-center relative min-h-[200px]">
                {/* Donut Chart Simulation with Conic Gradient */}
                {stats.total > 0 ? (
                    <div className="relative h-48 w-48 rounded-full" 
                        style={{ 
                            background: `conic-gradient(
                                #f59e0b 0% ${(stats.draft / stats.total) * 100}%, 
                                #3b82f6 ${(stats.draft / stats.total) * 100}% ${((stats.draft + stats.pending) / stats.total) * 100}%,
                                #10b981 ${((stats.draft + stats.pending) / stats.total) * 100}% ${((stats.draft + stats.pending + stats.accepted) / stats.total) * 100}%,
                                #f43f5e ${((stats.draft + stats.pending + stats.accepted) / stats.total) * 100}% 100%
                            )`
                        }}
                    >
                        <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</span>
                            <span className="text-xs text-slate-400 uppercase font-bold">Total Items</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-48 w-48 rounded-full border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600">
                        No Data
                    </div>
                )}
             </div>
             
             {/* Legend */}
             <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">ฉบับร่าง ({stats.draft})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">รอพิจารณา ({stats.pending})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">ผ่าน ({stats.accepted})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">ไม่ผ่าน ({stats.rejected})</span>
                </div>
             </div>
          </div>

          {/* Interactive Chart: Work Types */}
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <i className="fa-solid fa-chart-bar text-sky-500"></i> สัดส่วนตามประเภทผลงาน
                </h3>
             </div>
             
             <div className="space-y-5">
                {stats.byType.map((t) => (
                  <div key={t.id} className="group relative">
                    <div className="flex justify-between text-sm mb-2 relative z-10">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <i className={`fa-solid ${t.icon} text-slate-400 w-5`}></i>
                          {t.label}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition font-bold">
                          {t.count} ({t.percent.toFixed(1)}%)
                      </span>
                    </div>
                    
                    {/* Interactive Bar */}
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner cursor-help">
                       <div 
                          className="h-full bg-slate-800 dark:bg-sky-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-sky-500 dark:group-hover:bg-sky-400 relative" 
                          style={{ width: `${t.percent}%` }}
                       >
                           {/* Shimmer Effect */}
                           <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                       </div>
                    </div>
                  </div>
                ))}
                
                {stats.total === 0 && (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-dashed border-2 border-slate-200 dark:border-slate-700">
                        <i className="fa-solid fa-chart-simple text-4xl mb-2 opacity-50"></i>
                        <p>ยังไม่มีข้อมูลสำหรับการวิเคราะห์</p>
                    </div>
                )}
             </div>
          </div>

          {/* Top 5 Branches (Moved to full width below or keep in grid if prefer 3 cols layout) */}
          <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-6">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-6 flex items-center gap-2">
                <i className="fa-solid fa-trophy text-amber-500"></i> 5 อันดับสาขายอดนิยม
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.byBranch.map((b, idx) => (
                  <div key={b.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition group text-center items-center">
                     <div className={`
                        h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm mb-3 transition-transform group-hover:scale-110
                        ${idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-900/50' : 
                          idx === 1 ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-500' : 
                          idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-900/50' : 
                          'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600'}
                     `}>
                       {idx + 1}
                     </div>
                     <div className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2 min-h-[2.5em] group-hover:text-sky-700 dark:group-hover:text-sky-400 transition">{b.label}</div>
                     <div className="mt-2 font-mono font-bold text-2xl text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400">
                        {b.count}
                     </div>
                     <div className="text-[10px] text-slate-400">ผลงาน</div>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default Dashboard;