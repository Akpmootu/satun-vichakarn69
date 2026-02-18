
import React, { useMemo, useState } from 'react';
import { Submission } from '../types';
import { BRANCHES, WORK_TYPES, BUDGET_YEAR } from '../constants';
import Badge from './ui/Badge';

// --- UI Components ---

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: string;
  trend?: number; 
  tone?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon, trend, tone = 'blue' }) => {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900",
    rose: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900",
    slate: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  };

  const c = colors[tone];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${c} border`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs">
         {subValue && <span className="text-slate-400 font-medium truncate max-w-[70%]">{subValue}</span>}
         
         {trend !== undefined && (
             <div className={`flex items-center gap-1 font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                 <i className={`fa-solid ${trend >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                 <span>{Math.abs(trend)}%</span>
             </div>
         )}
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

interface DashboardProps {
    submissions: Submission[];
    onViewAll?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ submissions, onViewAll }) => {
  // --- Filter State (Global Dashboard) ---
  const [filterYear, setFilterYear] = useState<string>(String(BUDGET_YEAR));
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterOrg, setFilterOrg] = useState<string>('all');

  // --- Table State (Local Snapshot) ---
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('all');

  // --- Data Processing (Memoized) ---
  const { stats, filteredData, orgOptions, monthlyData, tableData, userCounts } = useMemo(() => {
    // 0. Pre-process for Org Options (from ALL data)
    const orgs = Array.from(new Set(submissions.map(s => s.organization?.trim()).filter(Boolean))).sort();

    // 1. Filter Data (Global)
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

    // 4. Distribution: By Org (Top 10)
    const orgCounts = orgs.map(org => ({
        name: org,
        count: filtered.filter(s => s.organization === org).length
    })).filter(o => o.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);

    // 5. Distribution: By Branch
    const branchCounts = BRANCHES.map(b => ({
        ...b,
        count: filtered.filter(s => s.branchId === b.id).length
    })).filter(b => b.count > 0).sort((a, b) => b.count - a.count);

    // 6. Distribution: By Work Type
    const typeCounts = WORK_TYPES.map(t => ({
        ...t,
        count: filtered.filter(s => s.workType === t.id).length,
        percent: total > 0 ? (filtered.filter(s => s.workType === t.id).length / total) * 100 : 0
    }));

    // 7. Person Dimension: Top Submitters (New)
    const userCounts = Object.values(
      filtered.reduce((acc: Record<string, { name: string; org: string; count: number; initial: string }>, s) => {
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
      }, {})
    ).sort((a, b) => b.count - a.count).slice(0, 5);

    // 8. Status Breakdown
    const statusCounts = {
        draft: filtered.filter(s => s.status === 'draft').length,
        submitted: filtered.filter(s => s.status === 'submitted').length,
        reviewed: filtered.filter(s => s.status === 'reviewed').length,
        accepted: filtered.filter(s => s.status === 'accepted').length,
        rejected: filtered.filter(s => s.status === 'rejected').length,
    };

    // 9. Table Snapshot Data
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
        filteredData: filtered,
        orgOptions: orgs,
        monthlyData: { data: mData, max: maxMonthly },
        tableData: tData,
        userCounts
    };
  }, [submissions, filterYear, filterMonth, filterOrg, tableSearch, tableFilterStatus]);

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
    <div className="space-y-6 fade-in pb-12 relative">
       {/* Background Watermark */}
       <div className="absolute top-20 right-0 -z-10 opacity-[0.03] pointer-events-none fixed">
           <i className="fa-solid fa-chart-line text-[400px] text-slate-900 dark:text-white transform -rotate-12 translate-x-40"></i>
       </div>

       {/* --- 1. Top Bar: Title & Filters --- */}
       <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-20 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-800/90 transition-all duration-300">
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-sky-500"></i>
                Dashboard วิเคราะห์ข้อมูล
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">ภาพรวมสถิติประจำปีงบประมาณ {BUDGET_YEAR}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
              <select 
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                  <option value={String(BUDGET_YEAR)}>ปีงบ {BUDGET_YEAR}</option>
                  <option value={String(BUDGET_YEAR - 1)}>ปีงบ {BUDGET_YEAR - 1}</option>
              </select>

              <select 
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                  <option value="all">ทุกเดือน</option>
                  {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                      <option key={i} value={String(i + 1)}>{m}</option>
                  ))}
              </select>

              <select 
                value={filterOrg}
                onChange={e => setFilterOrg(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 max-w-[150px] cursor-pointer"
              >
                  <option value="all">ทุกหน่วยงาน</option>
                  {orgOptions.map((org, i) => (
                      <option key={i} value={org}>{org}</option>
                  ))}
              </select>
          </div>
       </div>

       {/* --- 2. Summary KPIs --- */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <StatCard 
            title="จำนวนผลงานทั้งหมด" 
            value={stats.total.toLocaleString()} 
            subValue="Files Uploaded"
            icon="fa-folder-open" 
            tone="blue"
            trend={12} 
          />
          <StatCard 
            title="หน่วยงานที่เข้าร่วม" 
            value={stats.uniqueOrgs.toLocaleString()} 
            subValue="Active Organizations"
            icon="fa-hospital" 
            tone="indigo"
            trend={5}
          />
          <StatCard 
            title="ผู้ส่งผลงาน (คน)" 
            value={stats.uniqueAuthors.toLocaleString()} 
            subValue="Active Submitters"
            icon="fa-users" 
            tone="emerald"
            trend={8}
          />
          <StatCard 
            title="อัตราการส่งครบถ้วน" 
            value={`${stats.completionRate.toFixed(1)}%`} 
            subValue="Completion Rate"
            icon="fa-clipboard-check" 
            tone="amber"
            trend={stats.completionRate > 80 ? 2 : -1}
          />
       </div>

       {/* --- 3. Main Chart Grid --- */}
       <div className="grid grid-cols-12 gap-6">
          
          {/* Row 1 Left: Volume over time */}
          <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-arrow-trend-up text-sky-500"></i> แนวโน้มการส่งผลงาน (รายเดือน)
                 </h3>
             </div>
             
             <div className="h-64 flex items-end gap-2 md:gap-4 relative pt-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                     <div className="border-t border-slate-300 dark:border-slate-500 w-full h-0"></div>
                     <div className="border-t border-slate-300 dark:border-slate-500 w-full h-0"></div>
                     <div className="border-t border-slate-300 dark:border-slate-500 w-full h-0"></div>
                     <div className="border-t border-slate-300 dark:border-slate-500 w-full h-0"></div>
                 </div>

                 {monthlyData.data.map((d, idx) => {
                     const heightPercent = (d.count / monthlyData.max) * 100;
                     return (
                         <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                             <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                 {d.label}: {d.count}
                             </div>
                             <div 
                                className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out hover:brightness-110 ${heightPercent > 0 ? 'bg-sky-500 dark:bg-sky-600' : 'bg-slate-100 dark:bg-slate-700'}`}
                                style={{ height: `${heightPercent > 5 ? heightPercent : 5}%` }}
                             ></div>
                             <div className="text-[10px] text-slate-400 mt-2 font-medium">{d.label}</div>
                         </div>
                     );
                 })}
             </div>
          </div>

          {/* Row 1 Right: Work Type Comparison */}
          <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
             <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <i className="fa-solid fa-shapes text-indigo-500"></i> สัดส่วนประเภทผลงาน
             </h3>
             <div className="flex-1 space-y-5">
                {stats.typeCounts.map((t) => (
                  <div key={t.id} className="group">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <i className={`${t.icon} w-4 text-center text-slate-400`}></i>
                          {t.label}
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                          {t.count} ({t.percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                       <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-400" 
                          style={{ width: `${t.percent}%` }}
                       ></div>
                    </div>
                  </div>
                ))}
             </div>
             <div className="mt-auto pt-6 text-center">
                 <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</div>
                 <div className="text-xs text-slate-400 uppercase">Total Submissions</div>
             </div>
          </div>

          {/* Row 2 Left: Org Ranking (Distribution) */}
          <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-trophy text-amber-500"></i> Top 10 หน่วยงานที่ส่งผลงาน
                 </h3>
             </div>
             
             <div className="space-y-4">
                 {stats.orgCounts.map((org, idx) => (
                     <div key={idx} className="relative group">
                         <div className="flex justify-between items-end text-xs mb-1 relative z-10">
                             <span className="font-bold text-slate-700 dark:text-slate-300 flex gap-2">
                                 <span className="w-4 text-slate-400">#{idx + 1}</span> 
                                 <span className="truncate max-w-[200px]">{org.name}</span>
                             </span>
                             <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{org.count}</span>
                         </div>
                         <div className="h-6 w-full bg-slate-50 dark:bg-slate-900 rounded-md overflow-hidden relative">
                             <div 
                                className="h-full bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 rounded-md transition-all duration-1000 ease-out"
                                style={{ width: `${(org.count / stats.orgCounts[0].count) * 100}%` }}
                             ></div>
                         </div>
                     </div>
                 ))}
                 {stats.orgCounts.length === 0 && <div className="text-center text-slate-400 py-4">ไม่มีข้อมูล</div>}
             </div>
          </div>

          {/* Row 2 Right: Top Contributors (Person Dimension) */}
          <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
             <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <i className="fa-solid fa-user-astronaut text-emerald-500"></i> Top 5 ผู้ส่งผลงานสูงสุด
             </h3>
             <div className="space-y-4">
                {userCounts.length > 0 ? (
                    userCounts.map((user, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition group">
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2
                                ${idx === 0 ? 'bg-amber-100 text-amber-600 border-amber-200' : 
                                  idx === 1 ? 'bg-slate-200 text-slate-600 border-slate-300' :
                                  idx === 2 ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                  'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'}
                            `}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.org}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{user.count}</div>
                                <div className="text-[10px] text-slate-400">เรื่อง</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-400 py-8">ไม่มีข้อมูลผู้ส่งผลงาน</div>
                )}
             </div>
          </div>

          {/* Row 3: Branch Distribution (Heatmap Style) */}
          <div className="col-span-12 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-sitemap text-indigo-500"></i> การกระจายตัวรายสาขา (Branch Distribution)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {stats.branchCounts.map((b) => {
                      // Calculate intensity based on max count
                      const maxCount = stats.branchCounts[0]?.count || 1;
                      const intensity = b.count / maxCount;
                      let bgClass = "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700";
                      let textClass = "text-slate-500 dark:text-slate-400";
                      
                      if (b.count > 0) {
                          if (intensity > 0.7) { bgClass = "bg-indigo-600 border-indigo-600"; textClass = "text-white"; }
                          else if (intensity > 0.4) { bgClass = "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800"; textClass = "text-indigo-700 dark:text-indigo-300"; }
                          else { bgClass = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"; textClass = "text-slate-700 dark:text-slate-300"; }
                      }

                      return (
                          <div key={b.id} className={`p-3 rounded-lg border flex justify-between items-center ${bgClass} transition-all hover:scale-105`}>
                              <div className={`text-[10px] font-bold truncate max-w-[80%] ${textClass}`} title={b.label}>
                                  {b.label}
                              </div>
                              <div className={`text-xs font-black ${textClass}`}>{b.count}</div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Row 4: Quality & Status Pipeline */}
          <div className="col-span-12 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-rose-500"></i> สถานะการดำเนินการ (Project Pipeline)
                  </h3>
                  
                  {stats.statusCounts.draft > 0 && (
                      <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 animate-pulse">
                          <i className="fa-solid fa-circle-exclamation"></i>
                          <span>มีงานค้างสถานะ "ร่าง" จำนวน <b>{stats.statusCounts.draft}</b> รายการ (ยังไม่สมบูรณ์)</span>
                      </div>
                  )}
              </div>

              {/* Status Pipeline Visualization */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                      { id: 'draft', label: 'แบบร่าง', count: stats.statusCounts.draft, color: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
                      { id: 'submitted', label: 'ส่งแล้ว', count: stats.statusCounts.submitted, color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200' },
                      { id: 'reviewed', label: 'รอตรวจ', count: stats.statusCounts.reviewed, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200' },
                      { id: 'accepted', label: 'ผ่าน/รางวัล', count: stats.statusCounts.accepted, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200' },
                      { id: 'rejected', label: 'ไม่ผ่าน', count: stats.statusCounts.rejected, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200' },
                  ].map((s, idx) => (
                      <div key={s.id} className={`relative p-4 rounded-xl border border-transparent ${s.color} flex flex-col items-center justify-center text-center`}>
                          <div className="text-3xl font-black mb-1">{s.count}</div>
                          <div className="text-xs font-bold uppercase tracking-wider">{s.label}</div>
                          {/* Arrow connector */}
                          {idx < 3 && (
                              <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-600">
                                  <i className="fa-solid fa-chevron-right"></i>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>

          {/* --- Row 5: Data Table Section (Snapshot) --- */}
          <div className="col-span-12 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                    <i className="fa-solid fa-table-list text-slate-500"></i> รายการผลงานล่าสุด (Snapshot)
                  </h3>
                  
                  {/* Table Actions / Filters */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-none">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                          <input 
                              type="text" 
                              placeholder="ค้นหาชื่อ/หน่วยงาน..." 
                              value={tableSearch}
                              onChange={e => setTableSearch(e.target.value)}
                              className="w-full md:w-48 pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-xs font-bold focus:ring-2 focus:ring-slate-200 outline-none dark:text-white"
                          />
                      </div>
                      <select 
                          value={tableFilterStatus}
                          onChange={e => setTableFilterStatus(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
                      >
                          <option value="all">ทุกสถานะ</option>
                          <option value="submitted">ส่งแล้ว</option>
                          <option value="reviewed">รอตรวจ</option>
                          <option value="accepted">ผ่าน</option>
                          <option value="rejected">ไม่ผ่าน</option>
                      </select>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          <tr>
                              <th className="p-3 rounded-l-lg">รหัส</th>
                              <th className="p-3">ชื่อผลงาน</th>
                              <th className="p-3">ผู้ส่ง / หน่วยงาน</th>
                              <th className="p-3">ประเภท / สาขา</th>
                              <th className="p-3">วันที่ส่ง</th>
                              <th className="p-3 rounded-r-lg text-center">สถานะ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {tableData.length > 0 ? tableData.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                  <td className="p-3 font-mono text-slate-400">
                                      {s.id.substring(0, 8)}...
                                  </td>
                                  <td className="p-3 font-bold text-slate-800 dark:text-white max-w-[200px] truncate" title={s.fileName}>
                                      {s.fileName || '-'}
                                  </td>
                                  <td className="p-3">
                                      <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-300">
                                              {s.firstName.charAt(0)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-700 dark:text-slate-300">{s.firstName} {s.lastName}</div>
                                              <div className="text-[10px] text-slate-500">{s.organization}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-3">
                                      <div className="flex flex-col gap-1">
                                          <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                                              <i className={`text-[10px] ${WORK_TYPES.find(w => w.id === s.workType)?.icon}`}></i>
                                              {WORK_TYPES.find(w => w.id === s.workType)?.label}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                              {BRANCHES.find(b => b.id === s.branchId)?.label}
                                          </span>
                                      </div>
                                  </td>
                                  <td className="p-3 font-mono text-slate-500">
                                      {new Date(s.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </td>
                                  <td className="p-3 text-center">
                                      <Badge tone={getStatusBadgeTone(s.status)}>
                                          {s.status}
                                      </Badge>
                                  </td>
                              </tr>
                          )) : (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                      ไม่พบข้อมูลตามเงื่อนไข
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Table Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                  <button 
                      onClick={onViewAll}
                      className="px-6 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2"
                  >
                      ดูรายการทั้งหมด <i className="fa-solid fa-arrow-right"></i>
                  </button>
              </div>
          </div>

       </div>
    </div>
  );
};

export default Dashboard;
