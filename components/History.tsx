import React, { useMemo, useState } from 'react';
import { Submission, AppSettings } from '../types';
import { BRANCHES, WORK_TYPES } from '../constants';
import Badge from './ui/Badge';
import { apiUpdateSubmission } from '../services/apiService';

interface HistoryProps {
  submissions: Submission[];
  loading: boolean;
  refreshList: () => Promise<void>;
  settings: AppSettings;
  showToast: (t: any) => void;
}

const History: React.FC<HistoryProps> = ({ submissions, loading, refreshList, settings, showToast }) => {
  const [filter, setFilter] = useState({
    q: "",
    workType: "all",
    branchId: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });

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

  const filtered = useMemo(() => {
    const q = String(filter.q || "").trim().toLowerCase();
    // Split keywords by space to allow multi-word search (e.g. "Nurse Satun")
    const keywords = q.split(/\s+/).filter(k => k.length > 0);

    return submissions.filter((s) => {
      const okType = filter.workType === "all" ? true : s.workType === filter.workType;
      const okBranch = filter.branchId === "all" ? true : Number(s.branchId) === Number(filter.branchId);
      const okStatus = filter.status === "all" ? true : s.status === filter.status;

      // Date Range Filtering (Local Time)
      const itemDate = new Date(s.createdAt);
      let okDate = true;

      if (filter.startDate) {
          const [y, m, d] = filter.startDate.split('-').map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0); // Start of day local
          if (itemDate < start) okDate = false;
      }
      
      if (okDate && filter.endDate) {
          const [y, m, d] = filter.endDate.split('-').map(Number);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999); // End of day local
          if (itemDate > end) okDate = false;
      }

      // Construct searchable text from Name, Position, Organization
      const hay = [
        s.firstName,
        s.lastName,
        s.position,
        s.organization,
        workTypeLabel(s.workType), // Include work type label for convenience
        branchLabel(s.branchId),   // Include branch label for convenience
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Check if ALL keywords are present in the searchable text
      const okQ = keywords.length === 0 ? true : keywords.every(k => hay.includes(k));

      return okType && okBranch && okStatus && okQ && okDate;
    });
  }, [submissions, filter]);

  const resetFilters = () => {
      setFilter({
        q: "",
        workType: "all",
        branchId: "all",
        status: "all",
        startDate: "",
        endDate: "",
      });
  };

  const updateStatus = async (id: string, nextStatus: 'draft' | 'submitted') => {
    try {
        const existing = submissions.find(s => s.id === id);
        if (!existing) return;

        const newLog = {
            at: new Date().toISOString(),
            action: nextStatus === 'submitted' ? 'SUBMIT' : 'SAVE_DRAFT',
            note: nextStatus === 'submitted' ? 'เปลี่ยนสถานะเป็นส่งแล้ว' : 'เปลี่ยนสถานะเป็นฉบับร่าง'
        };

        const updatedAudit = [...(existing.audit || []), newLog];

      await apiUpdateSubmission(settings, id, {
        status: nextStatus,
        audit: updatedAudit
      });

      showToast({
        type: "success",
        title: "อัปเดตสถานะสำเร็จ",
        message: "ระบบได้ปรับปรุงข้อมูลเรียบร้อยแล้ว",
      });

      await refreshList();
    } catch (e: any) {
      showToast({
        type: "error",
        title: "อัปเดตไม่สำเร็จ",
        message: e?.message || "เกิดข้อผิดพลาด",
      });
    }
  };

  const exportCSV = () => {
    const header = [
      "รหัสรายการ", "ปีงบประมาณ", "ชื่อ", "นามสกุล", "ตำแหน่ง",
      "สังกัด/หน่วยงาน", "ประเภทผลงาน", "สาขา", "สถานะ", "วันที่สร้าง", "วันที่อัปเดต"
    ];

    const rows = filtered.map((s) => [
      s.id, s.budgetYear, s.firstName, s.lastName, s.position,
      s.organization, workTypeLabel(s.workType), branchLabel(s.branchId),
      s.status === "submitted" ? "ส่งแล้ว" : "ฉบับร่าง",
      formatDateTimeTH(s.createdAt), formatDateTimeTH(s.updatedAt),
    ]);

    const escape = (v: any) => {
      const str = String(v ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [header.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SATUN_VICHAKARN_export_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast({
      type: "success",
      title: "ส่งออกข้อมูลสำเร็จ",
      message: `ดาวน์โหลด ${filtered.length} รายการเรียบร้อยแล้ว`,
    });
  };

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg md:text-xl font-black text-slate-900">ประวัติการลงทะเบียน/ส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600">ค้นหา กรองข้อมูล และจัดการสถานะผลงาน</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-900 mb-2">ค้นหา</label>
          <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fa-solid fa-magnifying-glass text-slate-400 group-focus-within:text-sky-500 transition"></i>
              </div>
              <input
                value={filter.q}
                onChange={(e) => setFilter((p) => ({ ...p, q: e.target.value }))}
                placeholder="ค้นหาจากชื่อ, ตำแหน่ง, หรือหน่วยงาน..."
                className="w-full rounded-2xl border border-slate-200 pl-11 pr-10 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-100 transition shadow-sm"
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
        
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">ประเภท</label>
          <select
            value={filter.workType}
            onChange={(e) => setFilter((p) => ({ ...p, workType: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition shadow-sm"
          >
            <option value="all">ทั้งหมด</option>
            {WORK_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">สถานะ</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition shadow-sm"
          >
            <option value="all">ทั้งหมด</option>
            <option value="submitted">ส่งแล้ว</option>
            <option value="draft">ฉบับร่าง</option>
          </select>
        </div>
        
        {/* Row 2 */}
        <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-900 mb-2">สาขา</label>
            <select
                value={filter.branchId}
                onChange={(e) => setFilter((p) => ({ ...p, branchId: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition shadow-sm"
            >
                <option value="all">ทั้งหมด</option>
                {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                    {b.id}. {b.label}
                </option>
                ))}
            </select>
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">ตั้งแต่วันที่</label>
            <input 
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition shadow-sm text-slate-600"
            />
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">ถึงวันที่</label>
            <input 
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition shadow-sm text-slate-600"
            />
        </div>

        {/* Row 3 Actions */}
        <div className="md:col-span-4 flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100 mt-2">
            <button
                onClick={resetFilters}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-rotate-right"></i>
                <span>ล้างตัวกรอง</span>
            </button>
            <div className="flex-1"></div>
            <button
                onClick={exportCSV}
                className="px-6 py-3 rounded-2xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 w-full md:w-auto"
            >
                <i className="fa-solid fa-file-csv text-lg"></i>
                <span>Export CSV</span>
            </button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            แสดงผล {filtered.length} รายการ จากทั้งหมด {submissions.length} รายการ
          </div>
          {loading && (
            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i className="fa-solid fa-spinner animate-spin" />
              <span>กำลังโหลดข้อมูล</span>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-10 text-center">
              <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">
                 <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <div className="text-lg font-black text-slate-900">ไม่พบข้อมูล</div>
              <div className="mt-1 text-sm text-slate-600">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง</div>
              <button onClick={resetFilters} className="mt-4 text-sky-600 font-bold text-sm hover:underline">
                  ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            filtered.map((s) => (
              <div key={s.id} className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5 hover:shadow-md transition group">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-black text-slate-900 group-hover:text-sky-700 transition">
                        {s.firstName} {s.lastName}
                      </div>
                      <Badge tone={s.status === "submitted" ? "green" : "amber"}>
                        {s.status === "submitted" ? "ส่งแล้ว" : "ฉบับร่าง"}
                      </Badge>
                      <Badge tone="navy">ปี {s.budgetYear}</Badge>
                    </div>

                    <div className="mt-2 text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                       <span className="flex items-center gap-2"><i className="fa-solid fa-user-tag text-slate-400 text-xs"></i> {s.position || "-"}</span>
                       <span className="flex items-center gap-2"><i className="fa-solid fa-building text-slate-400 text-xs"></i> {s.organization || "-"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="slate">{workTypeLabel(s.workType)}</Badge>
                      <Badge tone="slate">{branchLabel(s.branchId)}</Badge>
                    </div>

                    <div className="mt-3 text-xs text-slate-500 flex items-center gap-3">
                      <span><i className="fa-regular fa-clock mr-1"></i> สร้าง {formatDateTimeTH(s.createdAt)}</span>
                      <span><i className="fa-solid fa-pen-to-square mr-1"></i> อัปเดต {formatDateTimeTH(s.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "draft" ? (
                      <button
                        onClick={() => updateStatus(s.id, "submitted")}
                        className="rounded-xl px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200"
                      >
                        <i className="fa-solid fa-paper-plane" />
                        <span>ส่ง</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(s.id, "draft")}
                        className="rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition flex items-center gap-2"
                      >
                        <i className="fa-solid fa-rotate-left" />
                        <span>แก้</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Minimal Audit Log */}
                {s.audit && s.audit.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                         <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Activity Log</div>
                         {s.audit.slice(-2).reverse().map((a, i) => (
                             <div key={i} className="text-xs text-slate-500 flex items-center gap-2">
                                 <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                 <span className="font-mono text-slate-400">{formatDateTimeTH(a.at)}</span>
                                 <span>{a.note}</span>
                             </div>
                         ))}
                    </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default History;