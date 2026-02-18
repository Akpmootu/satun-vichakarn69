
import React, { useMemo, useState } from 'react';
import { Submission, SubmissionStatus } from '../types';
import { BRANCHES, WORK_TYPES, BUDGET_YEAR } from '../constants';
import Badge from './ui/Badge';

// --- UI Components ---

interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: string;
  trend?: number; 
  trendLabel?: string; 
  tone?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
}

const StatCard: React.FC<StatCardProps> = ({ title, subtitle, value, icon, trend, trendLabel = "เทียบกับเดือนก่อน", tone = 'blue' }) => {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
    slate: "text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400",
  };

  const c = colors[tone];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-full hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none ${c.replace('text-', 'bg-')}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl ${c}`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
        {trend !== undefined && (
             <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'}`}>
                 <i className={`fa-solid ${trend >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                 <span>{Math.abs(trend)}%</span>
             </div>
         )}
      </div>

      <div className="relative z-10">
          <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
              {value}
          </div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 dark:text-slate-500 font-medium mt-0.5">{subtitle}</div>}
          
          {trend !== undefined && (
              <div className="mt-3 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span className={trend >= 0 ? "text-emerald-500" : "text-rose-500"}>
                      {trend > 0 ? '+' : ''}{trend}%
                  </span> 
                  {trendLabel}
              </div>
          )}
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; subtitle?: string; icon?: string }> = ({ title, subtitle, icon }) => (
    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
        {icon && (
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm shadow-sm">
                <i className={`fa-solid ${icon}`}></i>
            </div>
        )}
        <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-none">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
    </div>
);

// --- Main Dashboard Component ---

interface DashboardProps {
    submissions: Submission[];
    onViewAll?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ submissions, onViewAll }) => {
  const [filterYear, setFilterYear] = useState<string>(String(BUDGET_YEAR));
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('all');

  const { stats, orgOptions, monthlyData, tableData, userCounts, donutGradient } = useMemo(() => {
    // 0. Pre-process
    const orgs = Array.from(new Set(submissions.map(s => s.organization?.trim()).filter(Boolean))).sort();

    // 1. Filter Data
    const filtered = submissions.filter(s => {
        const d = new Date(s.createdAt);
        const matchYear = String(s.budgetYear) === filterYear;
        const matchMonth = filterMonth === 'all' || String(d.getMonth() + 1) === filterMonth;
        const matchOrg = filterOrg === 'all' || s.organization === filterOrg;
        return matchYear && matchMonth && matchOrg;
    });

    const total = filtered.length;
    
    // 2. KPIs
    const uniqueOrgs = new Set(filtered.map(s => s.organization?.trim())).size;
    const uniqueAuthors = new Set(filtered.map(s => `${s.firstName.trim()} ${s.lastName.trim()}`)).size;
    const submittedCount = filtered.filter(s => s.status !== 'draft').length;
    const completionRate = total > 0 ? (submittedCount / total) * 100 : 0;

    // 3. Volume: Monthly Trend
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const mData = months.map((m, i) => {
        const count = filtered.filter(s => new Date(s.createdAt).getMonth() === i).length;
        return { label: m, count };
    });
    const maxMonthly = Math.max(...mData.map(d => d.count), 1); 

    // 4. Distribution: Org
    const orgCounts = orgs.map(org => ({
        name: org,
        count: filtered.filter(s => s.organization === org).length
    })).filter(o => o.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);

    // 5. Distribution: Branch
    const branchCounts = BRANCHES.map(b => ({
        ...b,
        count: filtered.filter(s => s.branchId === b.id).length
    })).filter(b => b.count > 0).sort((a, b) => b.count - a.count);

    // 6. Distribution: Work Type (Prepare for Donut)
    const typeCounts = WORK_TYPES.map(t => {
        const count = filtered.filter(s => s.workType === t.id).length;
        const percent = total > 0 ? (count / total) * 100 : 0;
        let color = '#94a3b8'; // default slate
        if (t.id === 'oral') color = '#0ea5e9'; // Sky-500
        if (t.id === 'eposter') color = '#6366f1'; // Indigo-500
        if (t.id === 'innovation') color = '#f59e0b'; // Amber-500
        return { ...t, count, percent, color };
    });

    // Build Conic Gradient String
    let currentDeg = 0;
    const gradientParts = typeCounts.map(t => {
        const deg = (t.percent / 100) * 360;
        const part = `${t.color} ${currentDeg}deg ${currentDeg + deg}deg`;
        currentDeg += deg;
        return part;
    });
    // Fallback if no data
    const donutGradient = total > 0 
        ? `conic-gradient(${gradientParts.join(', ')})`
        : `conic-gradient(#f1f5f9 0deg 360deg)`; // slate-100

    // 7. Top Submitters
    const userCounts = Object.values(
      filtered.reduce((acc, s) => {
        const key = `${s.firstName.trim()} ${s.lastName.trim()}`;
        if (!acc[key]) {
          acc[key] = { 
              name: key, 
              org: s.organization || '-', 
              count: 0,
              initial: s.firstName.charAt(0) 
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, { name: string; org: string; count: number; initial: string }>)
    ).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

    // 8. Status Pipeline Data
    const statusCounts = {
        draft: filtered.filter(s => s.status === 'draft').length,
        submitted: filtered.filter(s => s.status === 'submitted').length,
        reviewed: filtered.filter(s => s.status === 'reviewed').length,
        accepted: filtered.filter(s => s.status === 'accepted').length,
        rejected: filtered.filter(s => s.status === 'rejected').length,
    };

    // 9. Table Data
    const tData = filtered.filter(s => {
        const matchSearch = tableSearch === '' || 
            (s.fileName || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
            (s.firstName || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
            (s.organization || '').toLowerCase().includes(tableSearch.toLowerCase());
        const matchStatus = tableFilterStatus === 'all' || s.status === tableFilterStatus;
        return matchSearch && matchStatus;
    }).slice(0, 10);

    return { 
        stats: { total, uniqueOrgs, uniqueAuthors, completionRate, statusCounts, typeCounts, orgCounts, branchCounts },
        orgOptions: orgs, // Fixed: Explicitly map local 'orgs' to 'orgOptions' property
        monthlyData: { data: mData, max: maxMonthly },
        tableData: tData,
        userCounts,
        donutGradient
    };
  }, [submissions, filterYear, filterMonth, filterOrg, tableSearch, tableFilterStatus]);

  // --- Helpers for Status Display ---
  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'draft': return 'ฉบับร่าง (Draft)';
          case 'submitted': return 'ส่งแล้ว (Submitted)';
          case 'reviewed': return 'กำลังพิจารณา (Reviewing)';
          case 'accepted': return 'ผ่านการคัดเลือก (Accepted)';
          case 'rejected': return 'ไม่ผ่าน (Rejected)';
          default: return status;
      }
  };

  const getStatusBadgeTone = (status: string) => {
      switch (status) {
          case 'accepted': return 'green';
          case 'rejected': return 'red';
          case 'reviewed': return 'indigo';
          case 'submitted': return 'navy';
          default: return 'slate';
      }
  };

  return (
    <div className="pb-12 relative font-sans fade-in">
       
       {/* Sticky Filter Bar */}
       <div className="sticky top-20 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 py-3 mb-8 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-chart-pie text-sky-500"></i>
                    Executive Dashboard
                </h1>
              </div>
              
              <div className="flex flex-wrap gap-2">
                  <select 
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                  >
                      <option value={String(BUDGET_YEAR)}>📅 ปีงบ {BUDGET_YEAR}</option>
                      <option value={String(BUDGET_YEAR - 1)}>📅 ปีงบ {BUDGET_YEAR - 1}</option>
                  </select>

                  <select 
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                  >
                      <option value="all">🗓️ ทุกเดือน</option>
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                          <option key={i} value={String(i + 1)}>{m}</option>
                      ))}
                  </select>

                  <select 
                    value={filterOrg}
                    onChange={e => setFilterOrg(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition max-w-[200px]"
                  >
                      <option value="all">🏢 ทุกหน่วยงาน</option>
                      {orgOptions.map((org, i) => (
                          <option key={i} value={org}>{org}</option>
                      ))}
                  </select>
              </div>
          </div>
       </div>

       <div className="space-y-10">
           
           {/* SECTION 1: EXECUTIVE SUMMARY (KPIs) */}
           <section>
               <SectionHeader title="สรุปผลการดำเนินงาน" subtitle="Key Performance Indicators (KPIs)" icon="fa-gauge-high" />
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="ผลงานทั้งหมด" 
                    subtitle="Total Submissions"
                    value={stats.total.toLocaleString()} 
                    icon="fa-folder-open" 
                    tone="blue"
                    trend={12} 
                    trendLabel="จากปีก่อน"
                  />
                  {/* Participation Rate (Mock Data Calculation) */}
                  <StatCard 
                    title="การมีส่วนร่วม (Participation)" 
                    subtitle={`จาก ${orgOptions.length} หน่วยงาน`}
                    value={`${((stats.uniqueOrgs / Math.max(orgOptions.length, 1)) * 100).toFixed(0)}%`} 
                    icon="fa-hand-holding-heart" 
                    tone="indigo"
                    trend={5}
                    trendLabel="หน่วยงานใหม่"
                  />
                  
                  {/* Incomplete Drafts */}
                  <StatCard 
                    title="งานที่รอส่ง (Drafts)" 
                    subtitle="Incomplete Submissions"
                    value={stats.statusCounts.draft.toLocaleString()} 
                    icon="fa-file-circle-exclamation" 
                    tone="amber"
                    trend={-2}
                    trendLabel="ลดลงจากเดือนก่อน"
                  />

                  <StatCard 
                    title="อัตราความสำเร็จ" 
                    subtitle="Success Rate"
                    value={`${stats.completionRate.toFixed(1)}%`} 
                    icon="fa-clipboard-check" 
                    tone="emerald"
                    trend={stats.completionRate > 80 ? 2 : -1}
                    trendLabel="เทียบเป้าหมาย"
                  />
               </div>
           </section>

           {/* SECTION 2: PROCESS PIPELINE (New: Stacked Bar) */}
           <section>
               <SectionHeader title="สถานะการดำเนินงาน" subtitle="Project Pipeline Progress" icon="fa-bars-progress" />
               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                   <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                       <i className="fa-solid fa-layer-group text-sky-500"></i> ภาพรวมสถานะงาน (Project Flow)
                   </h3>

                   {/* Stacked Bar */}
                   <div className="relative h-12 w-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex shadow-inner mb-6">
                       {[
                           { id: 'draft', count: stats.statusCounts.draft, color: 'bg-slate-300 dark:bg-slate-600', label: 'Draft' },
                           { id: 'submitted', count: stats.statusCounts.submitted, color: 'bg-sky-500', label: 'Submitted' },
                           { id: 'reviewed', count: stats.statusCounts.reviewed, color: 'bg-indigo-500', label: 'Reviewing' },
                           { id: 'accepted', count: stats.statusCounts.accepted, color: 'bg-emerald-500', label: 'Accepted' },
                           { id: 'rejected', count: stats.statusCounts.rejected, color: 'bg-rose-500', label: 'Rejected' },
                       ].map(s => {
                           const percent = stats.total > 0 ? (s.count / stats.total) * 100 : 0;
                           if (percent === 0) return null;
                           return (
                               <div 
                                   key={s.id}
                                   className={`${s.color} h-full flex items-center justify-center text-[10px] font-bold text-white transition-all hover:brightness-110 cursor-pointer relative group`}
                                   style={{ width: `${percent}%` }}
                                   onClick={() => setTableFilterStatus(s.id)}
                                   title={`${s.label}: ${s.count} (${percent.toFixed(1)}%)`}
                               >
                                   <span className="hidden sm:inline drop-shadow-md">{percent.toFixed(0)}%</span>
                               </div>
                           );
                       })}
                       {stats.total === 0 && (
                           <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">ไม่มีข้อมูล</div>
                       )}
                   </div>

                   {/* Interactive Legend (Click to Filter) */}
                   <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                       {[
                           { id: 'draft', label: 'ฉบับร่าง (Draft)', count: stats.statusCounts.draft, color: 'bg-slate-300', text: 'text-slate-600' },
                           { id: 'submitted', label: 'ส่งแล้ว (Submitted)', count: stats.statusCounts.submitted, color: 'bg-sky-500', text: 'text-sky-600' },
                           { id: 'reviewed', label: 'กำลังตรวจ (Reviewing)', count: stats.statusCounts.reviewed, color: 'bg-indigo-500', text: 'text-indigo-600' },
                           { id: 'accepted', label: 'ผ่าน/รางวัล (Accepted)', count: stats.statusCounts.accepted, color: 'bg-emerald-500', text: 'text-emerald-600' },
                           { id: 'rejected', label: 'ไม่ผ่าน (Rejected)', count: stats.statusCounts.rejected, color: 'bg-rose-500', text: 'text-rose-600' },
                       ].map(item => (
                           <button 
                               key={item.id}
                               onClick={() => setTableFilterStatus(item.id)}
                               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${tableFilterStatus === item.id ? 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-500 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                           >
                               <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                               <span className={`text-xs font-bold ${tableFilterStatus === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                   {item.label}
                                </span>
                               <span className={`text-xs font-mono font-bold ml-1 ${item.text} opacity-80`}>
                                   {item.count}
                               </span>
                           </button>
                       ))}
                       {tableFilterStatus !== 'all' && (
                           <button onClick={() => setTableFilterStatus('all')} className="text-xs text-slate-400 underline hover:text-slate-600">
                               ล้างตัวกรอง
                           </button>
                       )}
                   </div>
               </div>
           </section>

           {/* SECTION 3: VISUAL CHARTS */}
           <section>
               <SectionHeader title="แนวโน้มและสัดส่วน" subtitle="Volume & Distribution Analysis" icon="fa-chart-pie" />
               <div className="grid grid-cols-12 gap-6">
                  
                  {/* Left: Monthly Trend (Vertical Bar Chart) */}
                  <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fa-solid fa-chart-column text-sky-500"></i> ปริมาณการส่งรายเดือน
                         </h3>
                         <div className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">Unit: เรื่อง</div>
                     </div>
                     
                     <div className="flex-1 flex items-end gap-3 md:gap-4 relative pt-6 border-b border-slate-200 dark:border-slate-700 pb-2 min-h-[250px]">
                         {/* Grid Lines */}
                         <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                             {[...Array(5)].map((_, i) => <div key={i} className="border-t border-slate-400 w-full h-0"></div>)}
                         </div>

                         {monthlyData.data.map((d, idx) => {
                             const heightPercent = (d.count / monthlyData.max) * 100;
                             return (
                                 <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full z-10">
                                     <div className="absolute -top-8 font-bold text-slate-700 dark:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded shadow-sm transform -translate-y-2 group-hover:translate-y-0 duration-200">
                                         {d.count}
                                     </div>
                                     <div 
                                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 ease-out hover:brightness-110 relative overflow-hidden ${heightPercent > 0 ? 'bg-sky-500 dark:bg-sky-600' : 'bg-slate-100 dark:bg-slate-700'}`}
                                        style={{ height: `${heightPercent > 2 ? heightPercent : 2}%` }}
                                     >
                                         <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                                     </div>
                                     <div className="text-[10px] text-slate-400 mt-3 font-bold">{d.label}</div>
                                 </div>
                             );
                         })}
                     </div>
                  </div>

                  {/* Right: Work Type (Donut Chart) */}
                  <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                     <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-shapes text-indigo-500"></i> สัดส่วนประเภทผลงาน
                     </h3>
                     
                     <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
                         {/* Donut Chart CSS */}
                         <div 
                            className="relative w-48 h-48 rounded-full shadow-inner ring-8 ring-slate-50 dark:ring-slate-800 transition-all duration-1000"
                            style={{ background: donutGradient }}
                         >
                             {/* Inner Circle for Donut Effect */}
                             <div className="absolute inset-0 m-8 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-sm">
                                 <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</span>
                                 <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total</span>
                             </div>
                         </div>

                         {/* Legend */}
                         <div className="mt-8 w-full space-y-3">
                             {stats.typeCounts.map(t => (
                                 <div key={t.id} className="flex items-center justify-between text-xs group cursor-default">
                                     <div className="flex items-center gap-2">
                                         <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: t.color }}></div>
                                         <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">{t.label}</span>
                                     </div>
                                     <div className="font-mono font-bold text-slate-500 dark:text-slate-400">
                                         {t.count} ({t.percent.toFixed(0)}%)
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                  </div>
               </div>
           </section>

           {/* SECTION 4: TOP LISTS (SCALABLE TABLES) */}
           <section>
               <SectionHeader title="อันดับสูงสุด" subtitle="Top Rankings" icon="fa-trophy" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* Col 1: Top Organizations (Horizontal Bars) */}
                   <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                       <h3 className="font-bold text-slate-800 dark:text-white flex items-center justify-between mb-6">
                           <span className="flex items-center gap-2"><i className="fa-solid fa-building text-amber-500"></i> Top 10 หน่วยงาน</span>
                       </h3>
                       
                       <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                       <th className="pb-2 pl-2 font-bold w-12">#Rank</th>
                                       <th className="pb-2 font-bold">หน่วยงาน</th>
                                       <th className="pb-2 pr-2 font-bold text-right">จำนวน</th>
                                   </tr>
                               </thead>
                               <tbody className="text-xs">
                                   {stats.orgCounts.map((org, idx) => (
                                       <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition border-b border-slate-50 dark:border-slate-800 last:border-0">
                                           <td className="py-3 pl-2 font-bold text-slate-500 group-hover:text-amber-500 transition">{idx + 1}</td>
                                           <td className="py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={org.name}>
                                               {org.name}
                                           </td>
                                           <td className="py-3 pr-2 text-right">
                                               <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold shadow-sm">
                                                   {org.count}
                                               </span>
                                           </td>
                                       </tr>
                                   ))}
                                   {stats.orgCounts.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-400">ไม่มีข้อมูล</td></tr>}
                               </tbody>
                           </table>
                       </div>
                   </div>

                   {/* Col 2: Top Contributors (Mini Table) */}
                   <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                       <h3 className="font-bold text-slate-800 dark:text-white flex items-center justify-between mb-6">
                           <span className="flex items-center gap-2"><i className="fa-solid fa-user-astronaut text-emerald-500"></i> Top 5 ผู้ส่งผลงาน</span>
                       </h3>
                       
                       <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                       <th className="pb-2 pl-2 font-bold w-12">#Rank</th>
                                       <th className="pb-2 font-bold">ชื่อ-สกุล</th>
                                       <th className="pb-2 pr-2 font-bold text-right">ผลงาน</th>
                                   </tr>
                               </thead>
                               <tbody className="text-xs">
                                   {userCounts.map((user, idx) => (
                                       <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition border-b border-slate-50 dark:border-slate-800 last:border-0">
                                           <td className="py-3 pl-2">
                                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                                   {idx + 1}
                                               </div>
                                           </td>
                                           <td className="py-3">
                                               <div className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 transition">{user.name}</div>
                                               <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{user.org}</div>
                                           </td>
                                           <td className="py-3 pr-2 text-right">
                                               <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold shadow-sm">
                                                   {user.count}
                                               </span>
                                           </td>
                                       </tr>
                                   ))}
                                   {userCounts.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-400">ไม่มีข้อมูล</td></tr>}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </div>
           </section>

           {/* SECTION 5: SNAPSHOT TABLE (Refined Context) */}
           <section>
                <SectionHeader title="รายการล่าสุด" subtitle="Recent Activity Snapshot" icon="fa-table-list" />
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="relative w-full md:w-64">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                            <input 
                                type="text" 
                                placeholder="ค้นหา..." 
                                value={tableSearch}
                                onChange={e => setTableSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-slate-200 dark:text-white transition"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select 
                                value={tableFilterStatus}
                                onChange={e => setTableFilterStatus(e.target.value)}
                                className="flex-1 md:flex-none px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white outline-none cursor-pointer"
                            >
                                <option value="all">สถานะ: ทั้งหมด</option>
                                <option value="draft">ฉบับร่าง (Draft)</option>
                                <option value="submitted">ส่งแล้ว (Submitted)</option>
                                <option value="reviewed">กำลังตรวจ (Reviewing)</option>
                                <option value="accepted">ผ่าน/รางวัล (Accepted)</option>
                                <option value="rejected">ไม่ผ่าน (Rejected)</option>
                            </select>
                            <button 
                                onClick={onViewAll}
                                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 whitespace-nowrap shadow-sm"
                            >
                                ดูทั้งหมด <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 w-16 text-center">No.</th>
                                    <th className="p-4">หัวข้อผลงาน</th>
                                    <th className="p-4">ประเภท / สาขา</th>
                                    <th className="p-4">ผู้ส่ง / หน่วยงาน</th>
                                    <th className="p-4 text-center">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {tableData.length > 0 ? tableData.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                        <td className="p-4 font-mono text-slate-400 text-center">
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 dark:text-white max-w-[200px] truncate" title={s.fileName}>
                                                {s.fileName || '-'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                {new Date(s.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                                {WORK_TYPES.find(w => w.id === s.workType)?.label}
                                            </div>
                                            <div className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md inline-block border border-slate-200 dark:border-slate-600">
                                                {BRANCHES.find(b => b.id === s.branchId)?.label || `Branch ${s.branchId}`}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">{s.firstName} {s.lastName}</div>
                                            <div className="text-[10px] text-slate-500">{s.organization}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <Badge tone={getStatusBadgeTone(s.status)}>
                                                {getStatusLabel(s.status)}
                                            </Badge>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                            ไม่พบข้อมูลตามเงื่อนไข
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
           </section>

       </div>
    </div>
  );
};

export default Dashboard;
