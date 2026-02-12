import React, { useMemo, useState, useEffect } from 'react';
import { Submission, AppSettings, SubmissionStatus } from '../types';
import { BRANCHES, WORK_TYPES } from '../constants';
import Badge from './ui/Badge';
import { apiUpdateSubmission, apiDeleteSubmission } from '../services/apiService';

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
const STATUS_CONFIG: Record<SubmissionStatus, { label: string; tone: any; icon: string; desc: string; hintColor: string }> = {
  draft: { 
      label: 'ฉบับร่าง', 
      tone: 'amber', 
      icon: 'fa-pen-ruler', 
      desc: 'ยังไม่ส่ง',
      hintColor: 'text-amber-600'
  },
  submitted: { 
      label: 'ส่งแล้ว', 
      tone: 'navy', 
      icon: 'fa-paper-plane', 
      desc: 'รอการพิจารณา',
      hintColor: 'text-indigo-600'
  },
  reviewed: { 
      label: 'กำลังพิจารณา', 
      tone: 'indigo', 
      icon: 'fa-magnifying-glass', 
      desc: 'อยู่ระหว่างตรวจสอบ',
      hintColor: 'text-indigo-600'
  },
  accepted: { 
      label: 'ผ่านการคัดเลือก', 
      tone: 'green', 
      icon: 'fa-circle-check', 
      desc: 'ได้รับคัดเลือก',
      hintColor: 'text-emerald-600'
  },
  rejected: { 
      label: 'ไม่ผ่านการคัดเลือก', 
      tone: 'red', 
      icon: 'fa-circle-xmark', 
      desc: 'ไม่ผ่านเกณฑ์',
      hintColor: 'text-rose-600'
  },
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
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseAttachments = (fileUrl?: string) => {
    if (!fileUrl) return [];
    try {
        if (fileUrl.startsWith('[')) {
            return JSON.parse(fileUrl);
        }
        // Legacy single file support
        return [{ type: 'file', value: fileUrl, name: 'ไฟล์แนบ' }];
    } catch (e) {
        return [];
    }
  };

  const getActionColors = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('SUBMIT')) return { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' };
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

    // Sort Logic
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

  // Pagination Logic
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
      setFilter({
        q: "",
        workType: "all",
        branchId: "all",
        status: "all",
        startDate: "",
        endDate: "",
      });
      setSortOption("updated_desc");
  };

  const handleDelete = async (s: Submission) => {
     const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        html: `
            <div class="text-slate-600 text-sm">
                คุณต้องการลบผลงานของ <b>"${s.firstName} ${s.lastName}"</b> ใช่หรือไม่?<br/>
                <span class="text-rose-500 font-bold mt-2 block"><i class="fa-solid fa-triangle-exclamation"></i> การกระทำนี้ไม่สามารถย้อนกลับได้</span>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e', // rose-500
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fa-solid fa-trash-can mr-2"></i>ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        focusCancel: true,
        customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl px-4 py-2',
            cancelButton: 'rounded-xl px-4 py-2'
        }
    });

    if (result.isConfirmed) {
        try {
            await apiDeleteSubmission(settings, s.id);
            showToast({ type: "success", title: "ลบสำเร็จ", message: "ลบข้อมูลเรียบร้อยแล้ว" });
            await refreshList();
        } catch (e: any) {
            showToast({ type: "error", title: "เกิดข้อผิดพลาด", message: e.message || "ลบไม่สำเร็จ" });
        }
    }
  };

  const updateStatus = async (id: string, nextStatus: SubmissionStatus) => {
    try {
        const existing = submissions.find(s => s.id === id);
        if (!existing) return;

        const config = STATUS_CONFIG[nextStatus];
        const newLog = {
            at: new Date().toISOString(),
            action: nextStatus.toUpperCase(),
            note: `เปลี่ยนสถานะเป็น: ${config.label}`
        };

        const updatedAudit = [...(existing.audit || []), newLog];

      await apiUpdateSubmission(settings, id, {
        status: nextStatus,
        audit: updatedAudit
      });

      showToast({ type: "success", title: "อัปเดตสถานะสำเร็จ", message: "ระบบได้ปรับปรุงข้อมูลเรียบร้อยแล้ว" });
      await refreshList();
    } catch (e: any) {
      showToast({ type: "error", title: "อัปเดตไม่สำเร็จ", message: e?.message || "เกิดข้อผิดพลาด" });
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-5 md:p-6 fade-in min-h-[500px] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">ประวัติการลงทะเบียน/ส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ค้นหา กรองข้อมูล และจัดการสถานะผลงาน</div>
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

      {/* Filters Section */}
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
             {/* Main Search (4 cols) */}
             <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">ค้นหา (Search)</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fa-solid fa-magnifying-glass text-slate-400 group-focus-within:text-sky-500 transition"></i>
                    </div>
                    <input
                        value={filter.q}
                        onChange={(e) => setFilter((p) => ({ ...p, q: e.target.value }))}
                        placeholder="ชื่อผู้ส่ง, ชื่อผลงาน, หรือหน่วยงาน..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 pl-11 pr-10 py-2.5 text-sm outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 bg-white dark:bg-slate-800 dark:text-white transition shadow-sm"
                    />
                    {filter.q && (
                        <button
                        onClick={() => setFilter(p => ({ ...p, q: '' }))}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-rose-500 transition"
                        >
                        <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                    )}
                </div>
             </div>

             <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">สถานะ (Status)</label>
                 <select
                    value={filter.status}
                    onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition shadow-sm"
                 >
                    <option value="all">ทั้งหมด</option>
                    <option value="submitted">ส่งแล้ว</option>
                    <option value="draft">ฉบับร่าง</option>
                    <option value="reviewed">กำลังพิจารณา</option>
                    <option value="accepted">ผ่านการคัดเลือก</option>
                    <option value="rejected">ไม่ผ่านการคัดเลือก</option>
                 </select>
             </div>

             <div className="md:col-span-3">
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">ประเภท (Type)</label>
                 <select
                    value={filter.workType}
                    onChange={(e) => setFilter((p) => ({ ...p, workType: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition shadow-sm"
                 >
                    <option value="all">ทั้งหมด</option>
                    {WORK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                        {t.label}
                    </option>
                    ))}
                 </select>
             </div>

             {/* Sorting (3 cols) */}
             <div className="md:col-span-3">
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">เรียงลำดับ (Sort)</label>
                 <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition shadow-sm"
                 >
                     <option value="updated_desc">อัปเดตล่าสุด</option>
                     <option value="updated_asc">อัปเดตเก่าสุด</option>
                     <option value="created_desc">สร้างล่าสุด</option>
                     <option value="created_asc">สร้างเก่าสุด</option>
                     <option value="status">สถานะ</option>
                 </select>
             </div>
        </div>
        
        {/* Advanced Filters (Toggleable) */}
        {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-fade-in">
                <div className="md:col-span-3 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">สาขา (Branch)</label>
                    <select
                        value={filter.branchId}
                        onChange={(e) => setFilter((p) => ({ ...p, branchId: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition shadow-sm"
                    >
                        <option value="all">ทุกสาขา</option>
                        {BRANCHES.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.id}. {b.label}
                        </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">ตั้งแต่วันที่</label>
                    <input 
                        type="date"
                        value={filter.startDate}
                        onChange={(e) => setFilter((p) => ({ ...p, startDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition shadow-sm text-slate-600 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">ถึงวันที่</label>
                    <input 
                        type="date"
                        value={filter.endDate}
                        onChange={(e) => setFilter((p) => ({ ...p, endDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition shadow-sm text-slate-600 dark:text-white"
                    />
                </div>
                
                <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition flex items-center gap-2"
                    >
                        <i className="fa-solid fa-rotate-right"></i>
                        <span>ล้างตัวกรอง</span>
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Results List */}
      <div className="mt-6 flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
            พบข้อมูล {filtered.length} รายการ
          </div>
          {loading && (
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <i className="fa-solid fa-spinner animate-spin" />
              <span>กำลังโหลด...</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {paginatedItems.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">
                 <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">ไม่พบข้อมูล</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง</div>
              <button onClick={resetFilters} className="mt-4 text-sky-600 dark:text-sky-400 font-bold text-sm hover:underline">
                  ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            paginatedItems.map((s) => {
              const status = STATUS_CONFIG[s.status] || STATUS_CONFIG['draft'];
              const attachments = parseAttachments(s.fileUrl);

              // Logic to lock editing: only draft and submitted can be edited
              const canEdit = s.status === 'draft' || s.status === 'submitted';

              return (
                <div key={s.id} className="rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-4 md:p-5 hover:shadow-md transition group">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="text-base font-black text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400 transition">
                          {s.firstName} {s.lastName}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </div>

                        <Badge tone="navy">ปี {s.budgetYear}</Badge>
                      </div>

                      <div className="text-sm text-slate-700 dark:text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                         <span className="flex items-center gap-2"><i className="fa-solid fa-user-tag text-slate-400 text-xs w-4"></i> {s.position || "-"}</span>
                         <span className="flex items-center gap-2"><i className="fa-solid fa-building text-slate-400 text-xs w-4"></i> {s.organization || "-"}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="slate">{workTypeLabel(s.workType)}</Badge>
                        <Badge tone="slate">{branchLabel(s.branchId)}</Badge>
                      </div>

                      {attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                              {attachments.map((file: any, idx: number) => (
                                  <a key={idx} href={file.value} target="_blank" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-700 text-xs text-sky-600 dark:text-sky-400 hover:underline border border-slate-100 dark:border-slate-600">
                                      <i className={`fa-solid ${file.type === 'link' ? 'fa-link' : 'fa-paperclip'}`}></i>
                                      {file.name || 'ไฟล์แนบ'}
                                  </a>
                              ))}
                          </div>
                      )}

                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
                        <span><i className="fa-regular fa-clock mr-1"></i> สร้าง {formatDateTimeTH(s.createdAt)}</span>
                        <span><i className="fa-solid fa-pen-to-square mr-1"></i> อัปเดต {formatDateTimeTH(s.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 md:self-center">
                      {/* Send Button: Only for drafts */}
                      {s.status === "draft" && (
                        <button
                          onClick={() => updateStatus(s.id, "submitted")}
                          className="rounded-xl px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition flex items-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none"
                        >
                          <i className="fa-solid fa-paper-plane" />
                          <span>ส่ง</span>
                        </button>
                      )}
                      
                      {/* Edit Button: Enabled for Draft/Submitted, Locked for Accepted/Rejected/Reviewed */}
                      {canEdit ? (
                        <button
                          onClick={() => onEdit(s)}
                          className="rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-slate-200 dark:ring-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center gap-2 dark:text-slate-200"
                        >
                          <i className="fa-solid fa-pen" />
                          <span>แก้ไข</span>
                        </button>
                      ) : (
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 cursor-not-allowed border border-slate-200 dark:border-slate-700" title="ไม่สามารถแก้ไขได้ในสถานะนี้">
                           <i className="fa-solid fa-lock"></i>
                           <span>ถูกล็อค</span>
                        </div>
                      )}
                      
                      {/* Delete Button */}
                      <button 
                         onClick={() => handleDelete(s)}
                         className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center justify-center border border-rose-100 dark:border-rose-900/50"
                         title="ลบรายการ"
                      >
                         <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>

                  {/* Audit Log Section */}
                  {s.audit && s.audit.length > 0 && (
                        <div className="mt-6 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-4 flex items-center gap-2 tracking-wider">
                                <i className="fa-solid fa-clock-rotate-left"></i>
                                ประวัติการดำเนินการ (Audit Timeline)
                            </div>
                            <div className="relative pl-2 ml-1 space-y-6">
                                {/* Vertical Connector Line */}
                                <div className="absolute top-2 bottom-2 left-[19px] w-[2px] bg-slate-100 dark:bg-slate-700"></div>

                                {s.audit.slice().reverse().map((log, idx) => {
                                    const style = getActionColors(log.action);
                                    return (
                                        <div key={idx} className="relative flex items-start gap-4">
                                            {/* Dot */}
                                            <div className={`relative z-10 h-3 w-3 mt-1.5 rounded-full ${style.dot} ring-4 ring-white dark:ring-slate-800`}></div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {formatDateTimeTH(log.at)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${style.bg} ${style.text}`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                                                    {log.note}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Pagination Controls ... (Same as before) */}
      {filtered.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                 แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
              </div>
              
              <div className="flex items-center gap-2">
                  <button
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(p => p - 1)}
                     className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600 dark:text-slate-300"
                  >
                     <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>

                  <div className="flex items-center gap-1">
                      {getPageNumbers().map((p, i) => (
                          typeof p === 'number' ? (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(p)}
                                className={`h-9 w-9 rounded-lg font-bold text-sm transition ${currentPage === p ? 'bg-slate-900 text-white shadow-md dark:bg-sky-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                {p}
                            </button>
                          ) : (
                            <span key={i} className="h-9 w-9 flex items-center justify-center text-slate-400">...</span>
                          )
                      ))}
                  </div>

                  <button
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(p => p + 1)}
                     className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600 dark:text-slate-300"
                  >
                     <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
              </div>
              
              <select 
                 value={itemsPerPage}
                 onChange={(e) => setItemsPerPage(Number(e.target.value))}
                 className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 bg-white dark:bg-slate-800 dark:text-white cursor-pointer hover:border-slate-300 transition"
              >
                  <option value={10}>10 รายการ / หน้า</option>
                  <option value={20}>20 รายการ / หน้า</option>
                  <option value={50}>50 รายการ / หน้า</option>
                  <option value={100}>100 รายการ / หน้า</option>
              </select>
          </div>
      )}
    </div>
  );
};

export default History;