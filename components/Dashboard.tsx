
import React, { useMemo, useState, useEffect } from 'react';
import { Submission, SubmissionStatus, AppFeedback } from '../types';
import { BRANCHES, WORK_TYPES, BUDGET_YEAR } from '../constants';
import Badge from './ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { apiGetFeedbacks } from '../services/apiService';

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
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterWorkType, setFilterWorkType] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('all');
  const [feedbacks, setFeedbacks] = useState<AppFeedback[]>([]);

  useEffect(() => {
    apiGetFeedbacks().then(data => setFeedbacks(data)).catch(err => console.error("Error loading feedbacks:", err));
  }, []);

  const feedbackStats = useMemo(() => {
      if (feedbacks.length === 0) return { avg: 0, total: 0, distribution: [], avgEase: 0, avgDesign: 0, avgContent: 0 };
      const avg = feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length;
      const easeSums = feedbacks.reduce((acc, curr) => acc + (curr.ratingEase || curr.rating), 0);
      const designSums = feedbacks.reduce((acc, curr) => acc + (curr.ratingDesign || curr.rating), 0);
      const contentSums = feedbacks.reduce((acc, curr) => acc + (curr.ratingContent || curr.rating), 0);
      
      const distribution = [5, 4, 3, 2, 1].map(r => ({
          rating: r,
          count: feedbacks.filter(f => f.rating === r).length,
          percentage: (feedbacks.filter(f => f.rating === r).length / feedbacks.length) * 100
      }));
      return { 
          avg: avg.toFixed(1), 
          total: feedbacks.length, 
          distribution,
          avgEase: (easeSums / feedbacks.length).toFixed(1),
          avgDesign: (designSums / feedbacks.length).toFixed(1),
          avgContent: (contentSums / feedbacks.length).toFixed(1)
      };
  }, [feedbacks]);

  const { stats, orgOptions, monthlyData, tableData, userCounts, donutGradient } = useMemo(() => {
    // 0. Pre-process
    const orgs = Array.from(new Set(submissions.map(s => s.organization?.trim()).filter(Boolean))).sort();

    // 1. Filter Data
    const filtered = submissions.filter(s => {
        const d = new Date(s.createdAt);
        const matchYear = String(s.budgetYear) === filterYear;
        const matchMonth = filterMonth === 'all' || String(d.getMonth() + 1) === filterMonth;
        const matchOrg = filterOrg === 'all' || s.organization === filterOrg;
        const matchBranch = filterBranch === 'all' || String(s.branchId) === filterBranch;
        const matchType = filterWorkType === 'all' || s.workType === filterWorkType;
        return matchYear && matchMonth && matchOrg && matchBranch && matchType;
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
    const branchCountsAll = BRANCHES.map(b => ({
        ...b,
        count: filtered.filter(s => s.branchId === b.id).length
    }));
    const branchCounts = [...branchCountsAll].filter(b => b.count > 0).sort((a, b) => b.count - a.count);

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
        stats: { total, uniqueOrgs, uniqueAuthors, completionRate, statusCounts, typeCounts, orgCounts, branchCounts, branchCountsAll },
        orgOptions: orgs, // Fixed: Explicitly map local 'orgs' to 'orgOptions' property
        monthlyData: { data: mData, max: maxMonthly },
        tableData: tData,
        userCounts,
        donutGradient
    };
  }, [submissions, filterYear, filterMonth, filterOrg, filterBranch, filterWorkType, tableSearch, tableFilterStatus]);

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
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition min-w-[120px]"
                  >
                      <option value={String(BUDGET_YEAR)}>📅 ปีงบ {BUDGET_YEAR}</option>
                      <option value={String(BUDGET_YEAR - 1)}>📅 ปีงบ {BUDGET_YEAR - 1}</option>
                  </select>

                  <select 
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition min-w-[120px]"
                  >
                      <option value="all">🗓️ ทุกเดือน</option>
                      {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((m, i) => (
                          <option key={i} value={String(i + 1)}>{m}</option>
                      ))}
                  </select>
                  
                  <select 
                    value={filterWorkType}
                    onChange={e => setFilterWorkType(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition min-w-[150px] max-w-[200px]"
                  >
                      <option value="all">🏷️ ทุกประเภท</option>
                      {WORK_TYPES.map((w, i) => (
                          <option key={i} value={w.id}>{w.label}</option>
                      ))}
                  </select>

                  <select 
                    value={filterBranch}
                    onChange={e => setFilterBranch(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition max-w-[200px] truncate"
                  >
                      <option value="all">🌱 ทุกสาขา</option>
                      {BRANCHES.map((b, i) => (
                          <option key={i} value={String(b.id)}>{b.label}</option>
                      ))}
                  </select>

                  <select 
                    value={filterOrg}
                    onChange={e => setFilterOrg(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-white outline-none hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition max-w-[200px] truncate"
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
                  
                  {/* Left: Work Type (Pie Chart) - Now prioritized */}
                  <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col order-1 lg:order-1">
                     <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-shapes text-indigo-500"></i> สัดส่วนประเภทผลงาน
                     </h3>
                     
                     <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                      data={stats.typeCounts} 
                                      dataKey="count" 
                                      nameKey="label" 
                                      cx="50%" 
                                      cy="50%" 
                                      innerRadius={70}
                                      outerRadius={110} 
                                      paddingAngle={3}
                                      labelLine={false}
                                    >
                                        {
                                            stats.typeCounts.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))
                                        }
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                     </div>
                     <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-6 text-xs font-bold px-4">
                         {stats.typeCounts.map((t, i) => (
                             <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }}></div>
                                 <span className="text-slate-700 dark:text-slate-300 text-sm">{t.label}: {t.count} ({t.percent.toFixed(1)}%)</span>
                             </div>
                         ))}
                     </div>
                  </div>

                  {/* Right: Monthly Trend (Vertical Bar Chart) */}
                  <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col order-2 lg:order-2">
                     <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fa-solid fa-chart-column text-sky-500"></i> ปริมาณส่งรายเดือน
                         </h3>
                         <div className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">Unit: เรื่อง</div>
                     </div>
                     
                     <div className="flex-1 flex items-end gap-3 md:gap-4 relative pt-6 border-b border-slate-200 dark:border-slate-700 pb-2 min-h-[300px]">
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
               </div>
           </section>

           {/* SECTION 3.5: BRANCHES (PIE & RADAR) */}
           <section>
               <SectionHeader title="ผลงานรายสาขา (15 สาขา)" subtitle="Branches Distribution" icon="fa-chart-pie" />
               
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                   {stats.branchCountsAll.map(b => {
                       let icon = "fa-chart-pie";
                       if (b.id === 1) icon = "fa-stethoscope";
                       else if (b.id === 2) icon = "fa-user-doctor";
                       else if (b.id === 3) icon = "fa-tooth";
                       else if (b.id === 4) icon = "fa-pills";
                       else if (b.id === 5) icon = "fa-user-nurse";
                       else if (b.id === 6) icon = "fa-hospital-user";
                       else if (b.id === 7) icon = "fa-clipboard-user";
                       else if (b.id === 8) icon = "fa-flask";
                       else if (b.id === 9) icon = "fa-person-walking-with-cane";
                       else if (b.id === 10) icon = "fa-leaf";
                       else if (b.id === 11) icon = "fa-seedling";
                       else if (b.id === 12) icon = "fa-shield-virus";
                       else if (b.id === 13) icon = "fa-brain";
                       else if (b.id === 14) icon = "fa-briefcase-medical";
                       else if (b.id === 15) icon = "fa-microchip";

                       return (
                           <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition group overflow-hidden relative">
                               <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-900/10 opacity-50 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                               <div className="flex items-center gap-3 mb-2 relative z-10">
                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${b.count > 0 ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                                       <i className={`fa-solid ${icon}`}></i>
                                   </div>
                                   <div className="flex-1 flex justify-end">
                                        <div className={`text-2xl font-black ${b.count > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{b.count}</div>
                                   </div>
                               </div>
                               <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-tight relative z-10" title={b.label}>
                                   {b.label}
                               </div>
                           </div>
                       );
                   })}
               </div>

               <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                   <h3 className="font-bold text-slate-800 dark:text-white mb-6 w-full text-left flex items-center gap-2">
                       <i className="fa-solid fa-radar text-emerald-500"></i> Radar Chart แสดงภาพรวมสาขา
                   </h3>
                   <div className="h-[400px] w-full relative">
                        {stats.branchCountsAll.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.branchCountsAll}>
                                    <PolarGrid strokeOpacity={0.2} />
                                    <PolarAngleAxis 
                                        dataKey="label" 
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                        tickFormatter={(val: string) => {
                                            const maxLen = 20;
                                            return val.length > maxLen ? val.substring(0, maxLen) + "..." : val;
                                        }}
                                    />
                                    <PolarRadiusAxis 
                                        angle={90} 
                                        domain={[0, 'auto']} 
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    />
                                    <Radar 
                                        name="จำนวนผลงานระดับสาขา" 
                                        dataKey="count" 
                                        stroke="#0ea5e9" 
                                        strokeWidth={2}
                                        fill="#0ea5e9" 
                                        fillOpacity={0.4} 
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                   </div>
               </div>
           </section>

           {/* SECTION 4: TOP LISTS (SCALABLE TABLES) */}
           <section>
               <SectionHeader title="อันดับสูงสุด" subtitle="Top Rankings" icon="fa-trophy" />
               <div className="grid grid-cols-1 gap-6">
                   
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
                                       <th className="pb-2 pr-2 font-bold text-right">จำนวนผลงาน</th>
                                   </tr>
                               </thead>
                               <tbody className="text-xs">
                                   {stats.orgCounts.map((org, idx) => (
                                       <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition border-b border-slate-50 dark:border-slate-800 last:border-0">
                                           <td className="py-3 pl-2 font-bold text-slate-500 group-hover:text-amber-500 transition">{idx + 1}</td>
                                           <td className="py-3 font-medium text-slate-700 dark:text-slate-300 truncate" title={org.name}>
                                               {org.name}
                                           </td>
                                           <td className="py-3 pr-2 text-right">
                                               <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-md font-bold shadow-sm">
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
               </div>
           </section>

           {/* SECTION 6: SNAPSHOT TABLE (Refined Context) */}
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

           {/* SECTION 7: FEEDBACK RATING STATS */}
           <section>
               <SectionHeader title="ความพึงพอใจในการใช้งานระบบ" subtitle="Platform Experience & Satisfaction" icon="fa-heart" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-8 shadow-sm border border-amber-200 dark:border-slate-700 flex flex-col justify-center items-center relative overflow-hidden group text-center">
                        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none bg-amber-400"></div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2 relative z-10 text-lg">คะแนนเฉลี่ย</h4>
                        <div className="text-6xl font-black text-amber-600 dark:text-amber-500 relative z-10 flex items-end justify-center mb-4">
                            {feedbackStats.avg} <span className="text-xl font-bold text-amber-800/50 dark:text-amber-600/50 ml-1 mb-1">/ 5</span>
                        </div>
                        <div className="flex justify-center gap-1 mb-2 relative z-10 text-2xl">
                           {[1, 2, 3, 4, 5].map((star) => (
                               <i key={star} className={`fa-solid fa-star ${Number(feedbackStats.avg) >= star ? 'text-amber-500' : Number(feedbackStats.avg) >= star - 0.5 ? 'fa-star-half-stroke text-amber-500' : 'text-amber-200 dark:text-slate-600'}`}></i>
                           ))}
                        </div>
                        <p className="text-amber-700 dark:text-amber-200/50 relative z-10 text-sm mt-2">จากผู้ประเมินทั้งหมด {feedbackStats.total} คน</p>
                   </div>
                   
                   <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                       <h4 className="font-bold text-slate-800 dark:text-white mb-6">คะแนนแยกรายข้อ</h4>
                       <div className="space-y-6">
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group transition hover:border-amber-200">
                               <div>
                                   <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">1. ความง่ายและสะดวกในการใช้งาน</div>
                                   <div className="flex text-[10px] text-slate-300 dark:text-slate-600">
                                       {[1, 2, 3, 4, 5].map((s) => (
                                           <i key={s} className={`fa-solid fa-star ${s <= Math.round(Number(feedbackStats.avgEase)) ? 'text-amber-400' : ''}`}></i>
                                       ))}
                                   </div>
                               </div>
                               <div className="text-xl font-black text-sky-600 dark:text-sky-400">{feedbackStats.avgEase}</div>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group transition hover:border-amber-200">
                               <div>
                                   <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">2. ความสวยงามและเป็นระเบียบ</div>
                                   <div className="flex text-[10px] text-slate-300 dark:text-slate-600">
                                       {[1, 2, 3, 4, 5].map((s) => (
                                           <i key={s} className={`fa-solid fa-star ${s <= Math.round(Number(feedbackStats.avgDesign)) ? 'text-amber-400' : ''}`}></i>
                                       ))}
                                   </div>
                               </div>
                               <div className="text-xl font-black text-rose-500 dark:text-rose-400">{feedbackStats.avgDesign}</div>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group transition hover:border-amber-200">
                               <div>
                                   <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">3. ความครบถ้วนของเนื้อหา</div>
                                   <div className="flex text-[10px] text-slate-300 dark:text-slate-600">
                                       {[1, 2, 3, 4, 5].map((s) => (
                                           <i key={s} className={`fa-solid fa-star ${s <= Math.round(Number(feedbackStats.avgContent)) ? 'text-amber-400' : ''}`}></i>
                                       ))}
                                   </div>
                               </div>
                               <div className="text-xl font-black text-emerald-500 dark:text-emerald-400">{feedbackStats.avgContent}</div>
                           </div>
                       </div>
                   </div>
               </div>
           </section>

       </div>
    </div>
  );
};

export default Dashboard;
