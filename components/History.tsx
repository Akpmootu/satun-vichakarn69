
import React, { useMemo, useState, useEffect } from 'react';
import { Submission, AppSettings, SubmissionStatus } from '../types';
import { BRANCHES, WORK_TYPES } from '../constants';
import Badge from './ui/Badge';
import { apiDeleteSubmission } from '../services/apiService'; // Keep import but might not use for delete action anymore

// Declare Swal globally since it's loaded via CDN
declare const Swal: any;

interface HistoryProps {
  submissions: Submission[];
  loading: boolean;
  refreshList: () => Promise<void>;
  settings: AppSettings;
  showToast: (t: any) => void;
  onEdit: (submission: Submission) => void;
}

// Configuration for all possible statuses
const STATUS_CONFIG: Record<SubmissionStatus, { label: string; tone: any; icon: string; desc: string; step: number; colorClass: string }> = {
  draft: { 
      label: 'ฉบับร่าง', 
      tone: 'amber', 
      icon: 'fa-pen-ruler', 
      desc: 'รอการยืนยัน',
      step: 1,
      colorClass: 'text-amber-500 bg-amber-500'
  },
  submitted: { 
      label: 'ส่งแล้ว', 
      tone: 'navy', 
      icon: 'fa-paper-plane', 
      desc: 'รอเจ้าหน้าที่รับเรื่อง',
      step: 2,
      colorClass: 'text-sky-500 bg-sky-500'
  },
  reviewed: { 
      label: 'กำลังตรวจสอบ', 
      tone: 'indigo', 
      icon: 'fa-magnifying-glass-chart', 
      desc: 'อยู่ระหว่างการพิจารณา',
      step: 3,
      colorClass: 'text-indigo-500 bg-indigo-500'
  },
  accepted: { 
      label: 'ผ่านการคัดเลือก', 
      tone: 'green', 
      icon: 'fa-trophy', 
      desc: 'ประกาศผลสำเร็จ',
      step: 4,
      colorClass: 'text-emerald-500 bg-emerald-500'
  },
  rejected: { 
      label: 'ไม่ผ่านการคัดเลือก', 
      tone: 'red', 
      icon: 'fa-circle-xmark', 
      desc: 'สิ้นสุดกระบวนการ',
      step: 4,
      colorClass: 'text-rose-500 bg-rose-500'
  },
};

// Sub-component: Visual Status Stepper
const StatusStepper: React.FC<{ currentStatus: SubmissionStatus }> = ({ currentStatus }) => {
    const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['draft'];
    const currentStep = config.step;
    
    const steps = [
        { id: 1, label: 'ร่างผลงาน', icon: 'fa-pen' },
        { id: 2, label: 'ส่งระบบ', icon: 'fa-cloud-arrow-up' },
        { id: 3, label: 'ตรวจสอบ', icon: 'fa-magnifying-glass' },
        { id: 4, label: 'ประกาศผล', icon: 'fa-flag-checkered' },
    ];

    return (
        <div className="w-full mb-6 px-2">
            <div className="relative flex items-center justify-between">
                {/* Connecting Line Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full -z-10"></div>
                
                {/* Connecting Line Progress */}
                <div 
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full -z-10 transition-all duration-1000 ease-out bg-gradient-to-r ${currentStatus === 'rejected' ? 'from-slate-300 to-rose-400' : 'from-sky-400 to-emerald-400'}`}
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = step.id <= currentStep;
                    const isCurrent = step.id === currentStep;
                    
                    let activeColor = "bg-emerald-500 border-emerald-500 text-white";
                    if (currentStatus === 'rejected' && step.id === 4) activeColor = "bg-rose-500 border-rose-500 text-white";
                    else if (step.id === currentStep && currentStatus !== 'accepted' && currentStatus !== 'rejected') activeColor = "bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-200";

                    return (
                        <div key={step.id} className="flex flex-col items-center group relative">
                            <div 
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all duration-500 z-10
                                    ${isActive ? activeColor : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400'}
                                `}
                            >
                                <i className={`fa-solid ${step.icon}`}></i>
                            </div>
                            <div className={`text-[10px] font-bold mt-2 absolute top-8 whitespace-nowrap transition-colors ${isCurrent ? 'text-slate-800 dark:text-white scale-110' : 'text-slate-400'}`}>
                                {step.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const History: React.FC<HistoryProps> = ({ submissions, loading, refreshList, settings, showToast, onEdit }) => {
  const [filter, setFilter] = useState({
    q: "",
    workType: "all",
    branchId: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });

  const [sortOption, setSortOption] = useState("updated_desc"); // Default sort
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, itemsPerPage, sortOption]);

  const workTypeLabel = (id: string) => WORK_TYPES.find((x) => x.id === id)?.label || "-";
  const branchLabel = (id: number) => BRANCHES.find((x) => x.id === Number(id))?.label || "-";
  
  const formatDateTimeTH = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (id: string) => {
      const newSet = new Set(expandedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedItems(newSet);
  };

  const parseAttachments = (fileUrl?: string) => {
    if (!fileUrl) return [];
    try {
        if (fileUrl.startsWith('[')) {
            return JSON.parse(fileUrl);
        }
        return [{ type: 'file', value: fileUrl, name: 'ไฟล์แนบ' }];
    } catch (e) {
        return [];
    }
  };

  const getActionColors = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('SUBMIT') || act.includes('FIXED')) return { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' };
    if (act.includes('DRAFT') || act.includes('SAVE')) return { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' };
    if (act.includes('REVIEW')) return { dot: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' };
    if (act.includes('ACCEPT')) return { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' };
    if (act.includes('REJECT')) return { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' };
    if (act.includes('DELETE')) return { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' };
    return { dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
  };

  const filtered = useMemo(() => {
    const q = String(filter.q || "").trim().toLowerCase();
    const keywords = q.split(/\s+/).filter(k => k.length > 0);

    let result = submissions.filter((s) => {
      const okType = filter.workType === "all" ? true : s.workType === filter.workType;
      const okBranch = filter.branchId === "all" ? true : Number(s.branchId) === Number(filter.branchId);
      const okStatus = filter.status === "all" ? true : s.status === filter.status;

      const itemDate = new Date(s.createdAt);
      let okDate = true;

      if (filter.startDate) {
          const [y, m, d] = filter.startDate.split('-').map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0); 
          if (itemDate < start) okDate = false;
      }
      
      if (okDate && filter.endDate) {
          const [y, m, d] = filter.endDate.split('-').map(Number);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999); 
          if (itemDate > end) okDate = false;
      }

      const hay = [
        s.firstName, s.lastName, s.position, s.organization,
        workTypeLabel(s.workType), branchLabel(s.branchId),
        STATUS_CONFIG[s.status]?.label || ''
      ].filter(Boolean).join(" ").toLowerCase();

      const okQ = keywords.length === 0 ? true : keywords.every(k => hay.includes(k));

      return okType && okBranch && okStatus && okQ && okDate;
    });

    return result.sort((a, b) => {
        switch (sortOption) {
            case "created_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case "created_asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case "updated_desc": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            case "updated_asc": return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            case "status": return a.status.localeCompare(b.status);
            default: return 0;
        }
    });
  }, [submissions, filter, sortOption]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisibleButtons = 5;
    if (totalPages <= maxVisibleButtons) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 3) end = Math.min(totalPages - 1, 4);
        if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 3);
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
    }
    return pages;
  };

  const resetFilters = () => {
      setFilter({ q: "", workType: "all", branchId: "all", status: "all", startDate: "", endDate: "" });
      setSortOption("updated_desc");
  };

  // --- CHANGED: Delete Logic to Show Contact Info ---
  const handleDeleteRequest = async (s: Submission) => {
     await Swal.fire({
        title: 'ต้องการลบข้อมูล?',
        html: `
            <div class="text-left text-sm text-slate-600 space-y-4">
                <p>หากท่านต้องการลบผลงานออกจากระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการ:</p>
                <div class="bg-slate-100 p-4 rounded-xl border border-slate-200 text-center">
                    <strong class="block text-slate-800 text-lg mb-1">ผู้จัดการข้อมูล (Data Manager)</strong>
                    <span class="block text-slate-500 mb-2">กลุ่มงานทรัพยากรบุคคล สำนักงานสาธารณสุขจังหวัดสตูล</span>
                    <a href="tel:0888888888" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition shadow-md">
                        <i class="fa-solid fa-phone"></i> 088-888-8888
                    </a>
                </div>
                <p class="text-xs text-rose-500">* การลบข้อมูลจะต้องผ่านการตรวจสอบเพื่อป้องกันความผิดพลาด</p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#0f172a',
        customClass: { popup: 'rounded-3xl' }
    });
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-5 md:p-6 fade-in min-h-[500px] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">ประวัติการลงทะเบียน/ส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ติดตามสถานะและประวัติการส่งผลงาน</div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
            <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 border ${showAdvancedFilters ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
                <i className={`fa-solid ${showAdvancedFilters ? 'fa-filter-circle-xmark' : 'fa-filter'}`}></i>
                {showAdvancedFilters ? 'ซ่อนตัวกรอง' : 'ตัวกรองขั้นสูง'}
            </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-fade-in">
                {/* ... filters implementation ... */}
                <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                    <button onClick={resetFilters} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition flex items-center gap-2">
                        <i className="fa-solid fa-rotate-right"></i> <span>ล้างตัวกรอง</span>
                    </button>
                </div>
            </div>
        )}
      </div>

      <div className="mt-6 flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">พบข้อมูล {filtered.length} รายการ</div>
          {loading && <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i className="fa-solid fa-spinner animate-spin" /><span>กำลังโหลด...</span></div>}
        </div>

        <div className="space-y-4">
          {paginatedItems.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full mx-auto flex items-center justify-center text-3xl mb-4"><i className="fa-solid fa-magnifying-glass"></i></div>
              <div className="text-lg font-black text-slate-900 dark:text-white">ไม่พบข้อมูล</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง</div>
              <button onClick={resetFilters} className="mt-4 text-sky-600 dark:text-sky-400 font-bold text-sm hover:underline">ล้างตัวกรองทั้งหมด</button>
            </div>
          ) : (
            paginatedItems.map((s) => {
              const status = STATUS_CONFIG[s.status] || STATUS_CONFIG['draft'];
              const attachments = parseAttachments(s.fileUrl);
              const isExpanded = expandedItems.has(s.id);
              
              // Only show the latest 2 logs if collapsed, or all if expanded
              const auditLogs = s.audit || [];
              const visibleLogs = isExpanded ? auditLogs.slice().reverse() : auditLogs.slice().reverse().slice(0, 1);

              return (
                <div key={s.id} className="rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-5 md:p-6 hover:shadow-md transition group relative overflow-hidden">
                  {/* Visual Status Stepper */}
                  <StatusStepper currentStatus={s.status} />

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="text-lg font-black text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400 transition">
                          {s.fileName || `${s.firstName} ${s.lastName}`}
                        </div>
                        <Badge tone={status.tone} className="shadow-sm">{status.label}</Badge>
                        <Badge tone="navy">ปี {s.budgetYear}</Badge>
                      </div>

                      <div className="text-sm text-slate-700 dark:text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mb-3">
                         <span className="flex items-center gap-2"><i className="fa-solid fa-user-tag text-slate-400 text-xs w-4"></i> {s.firstName} {s.lastName}</span>
                         <span className="flex items-center gap-2"><i className="fa-solid fa-building text-slate-400 text-xs w-4"></i> {s.organization || "-"}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {workTypeLabel(s.workType)}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {branchLabel(s.branchId)}
                        </span>
                      </div>

                      {attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                              {attachments.map((file: any, idx: number) => (
                                  <a key={idx} href={file.value} target="_blank" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-xs text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 font-bold border border-sky-100 dark:border-sky-800 transition">
                                      <i className={`fa-solid ${file.type === 'link' ? 'fa-link' : 'fa-file-pdf'}`}></i>
                                      {file.name || 'เอกสารแนบ'}
                                  </a>
                              ))}
                          </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0 md:self-start">
                      {/* Edit/Export Button */}
                      <button
                        onClick={() => onEdit(s)}
                        className="rounded-xl px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none min-w-[140px]"
                      >
                        <i className="fa-solid fa-file-pen" />
                        <span>ออกหนังสือ/แก้ไข</span>
                      </button>
                      
                      {/* Delete (Contact Info) Button */}
                      <button 
                         onClick={() => handleDeleteRequest(s)}
                         className="rounded-xl px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 text-rose-500 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition flex items-center justify-center gap-2"
                      >
                         <i className="fa-solid fa-trash-can"></i>
                         <span>แจ้งลบข้อมูล</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Audit Log Section */}
                  {auditLogs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 -mx-5 -mb-5 px-5 pb-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2 tracking-wider">
                                    <i className="fa-solid fa-clock-rotate-left"></i>
                                    ประวัติการดำเนินการ ({auditLogs.length})
                                </div>
                                {auditLogs.length > 1 && (
                                    <button 
                                        onClick={() => toggleExpand(s.id)}
                                        className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
                                    >
                                        {isExpanded ? 'ย่อรายการ' : 'ดูทั้งหมด'} 
                                        <i className={`fa-solid fa-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                                    </button>
                                )}
                            </div>
                            
                            <div className="relative pl-2 ml-1 space-y-4">
                                {/* Vertical Line */}
                                <div className="absolute top-2 bottom-2 left-[19px] w-[2px] bg-slate-200 dark:bg-slate-700"></div>

                                {visibleLogs.map((log, idx) => {
                                    const style = getActionColors(log.action);
                                    return (
                                        <div key={idx} className="relative flex items-start gap-4 animate-fade-in">
                                            <div className={`relative z-10 h-3 w-3 mt-1.5 rounded-full ${style.dot} ring-4 ring-white dark:ring-slate-800`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {formatDateTimeTH(log.at)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                                                    {log.note}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {!isExpanded && auditLogs.length > 1 && (
                                    <div className="relative flex items-start gap-4 opacity-50">
                                        <div className="relative z-10 h-2 w-2 mt-2 ml-0.5 rounded-full bg-slate-300 ring-4 ring-white dark:ring-slate-800"></div>
                                        <div className="text-xs text-slate-400 italic mt-1">... รายการก่อนหน้าอีก {auditLogs.length - 1} รายการ</div>
                                    </div>
                                )}
                            </div>
                        </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Pagination Controls */}
      {filtered.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                 แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
              </div>
              
              <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition text-slate-600 dark:text-slate-300">
                     <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <div className="flex items-center gap-1">
                      {getPageNumbers().map((p, i) => (
                          typeof p === 'number' ? (
                            <button key={i} onClick={() => setCurrentPage(p)} className={`h-9 w-9 rounded-lg font-bold text-sm transition ${currentPage === p ? 'bg-slate-900 text-white shadow-md dark:bg-sky-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                {p}
                            </button>
                          ) : <span key={i} className="h-9 w-9 flex items-center justify-center text-slate-400">...</span>
                      ))}
                  </div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition text-slate-600 dark:text-slate-300">
                     <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
              </div>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 px-3 text-sm outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-white cursor-pointer hover:border-slate-300 transition">
                  <option value={10}>10 รายการ / หน้า</option>
                  <option value={20}>20 รายการ / หน้า</option>
                  <option value={50}>50 รายการ / หน้า</option>
              </select>
          </div>
      )}
    </div>
  );
};

export default History;
