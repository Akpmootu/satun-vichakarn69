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
    return submissions.filter((s) => {
      const okType = filter.workType === "all" ? true : s.workType === filter.workType;
      const okBranch = filter.branchId === "all" ? true : Number(s.branchId) === Number(filter.branchId);
      const okStatus = filter.status === "all" ? true : s.status === filter.status;

      const hay = [
        s.firstName,
        s.lastName,
        s.position,
        s.organization,
        workTypeLabel(s.workType),
        branchLabel(s.branchId),
      ]
        .join(" ")
        .toLowerCase();

      const okQ = !q ? true : hay.includes(q);
      return okType && okBranch && okStatus && okQ;
    });
  }, [submissions, filter]);

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
    a.download = `SATUN_VICHAKARN_export.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast({
      type: "success",
      title: "ส่งออกข้อมูลสำเร็จ",
      message: "ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว",
    });
  };

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg md:text-xl font-black text-slate-900">ประวัติการลงทะเบียน/ส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600">ค้นหา กรองข้อมูล และส่งออกเป็น CSV ได้</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="rounded-2xl px-4 py-2 text-sm font-bold ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition flex items-center gap-2"
          >
            <i className="fa-solid fa-file-export" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-900">ค้นหา</label>
          <input
            value={filter.q}
            onChange={(e) => setFilter((p) => ({ ...p, q: e.target.value }))}
            placeholder="ค้นหาจากชื่อ/ตำแหน่ง/หน่วยงาน"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-sky-100 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900">ประเภท</label>
          <select
            value={filter.workType}
            onChange={(e) => setFilter((p) => ({ ...p, workType: e.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition"
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
          <label className="block text-sm font-bold text-slate-900">สถานะ</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition"
          >
            <option value="all">ทั้งหมด</option>
            <option value="submitted">ส่งแล้ว</option>
            <option value="draft">ฉบับร่าง</option>
          </select>
        </div>
        <div className="md:col-span-4">
            <label className="block text-sm font-bold text-slate-900">สาขา</label>
            <select
                value={filter.branchId}
                onChange={(e) => setFilter((p) => ({ ...p, branchId: e.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:ring-4 focus:ring-sky-100 transition"
            >
                <option value="all">ทั้งหมด</option>
                {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                    {b.id}. {b.label}
                </option>
                ))}
            </select>
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
            <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-5 text-center">
              <div className="text-sm font-black text-slate-900">ไม่พบข้อมูล</div>
              <div className="mt-1 text-sm text-slate-600">ลองปรับเปลี่ยนเงื่อนไขการค้นหา</div>
            </div>
          ) : (
            filtered.map((s) => (
              <div key={s.id} className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-4 md:p-5 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-black text-slate-900">
                        {s.firstName} {s.lastName}
                      </div>
                      <Badge tone={s.status === "submitted" ? "green" : "amber"}>
                        {s.status === "submitted" ? "ส่งแล้ว" : "ฉบับร่าง"}
                      </Badge>
                      <Badge tone="navy">ปี {s.budgetYear}</Badge>
                    </div>

                    <div className="mt-2 text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                       <span><span className="font-bold">ตำแหน่ง:</span> {s.position || "-"}</span>
                       <span><span className="font-bold">สังกัด:</span> {s.organization || "-"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="slate">{workTypeLabel(s.workType)}</Badge>
                      <Badge tone="slate">{branchLabel(s.branchId)}</Badge>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      สร้าง {formatDateTimeTH(s.createdAt)} • อัปเดต {formatDateTimeTH(s.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "draft" ? (
                      <button
                        onClick={() => updateStatus(s.id, "submitted")}
                        className="rounded-xl px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-2"
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
                         <div className="text-xs text-slate-500 font-bold mb-1">ประวัติล่าสุด</div>
                         {s.audit.slice(-2).reverse().map((a, i) => (
                             <div key={i} className="text-xs text-slate-400">
                                 {formatDateTimeTH(a.at)}: {a.note}
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