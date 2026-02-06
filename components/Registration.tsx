import React, { useState } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES } from '../constants';
import { AppSettings, Submission } from '../types';
import { apiCreateSubmission, nowISO } from '../services/apiService';

interface RegistrationProps {
  settings: AppSettings;
  onSuccess: () => void;
  showToast: (t: any) => void;
}

const Registration: React.FC<RegistrationProps> = ({ settings, onSuccess, showToast }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    position: "",
    organization: "",
    workType: "",
    branchId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const onChangeField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!form.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (!form.position.trim()) e.position = "กรุณากรอกตำแหน่ง";
    if (!form.organization.trim()) e.organization = "กรุณากรอกสังกัด/หน่วยงาน";
    if (!form.workType) e.workType = "กรุณาเลือกประเภทผลงาน";
    if (!form.branchId) e.branchId = "กรุณาเลือกสาขา";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (mode: 'draft' | 'submit') => {
    if (!validateForm()) {
      showToast({ type: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณาตรวจสอบช่องที่มีสีแดง" });
      return;
    }

    setSaving(true);
    try {
      const payload: Submission = {
        // Generate a pseudo-UUID
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        budgetYear: BUDGET_YEAR,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position.trim(),
        organization: form.organization.trim(),
        workType: form.workType,
        branchId: Number(form.branchId),
        status: mode === 'submit' ? 'submitted' : 'draft',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        audit: [
          {
            at: nowISO(),
            action: mode === 'submit' ? 'SUBMIT' : 'SAVE_DRAFT',
            note: mode === 'submit' ? 'ส่งผลงานครั้งแรก' : 'บันทึกฉบับร่างครั้งแรก'
          }
        ]
      };

      await apiCreateSubmission(settings, payload);
      
      showToast({
        type: "success",
        title: mode === 'submit' ? "ส่งผลงานสำเร็จ" : "บันทึกร่างสำเร็จ",
        message: "ระบบได้บันทึกข้อมูลของท่านเรียบร้อยแล้ว"
      });

      // Reset form
      setForm({
        firstName: "", lastName: "", position: "", organization: "", workType: "", branchId: "",
      });
      onSuccess();
    } catch (e: any) {
      showToast({ type: "error", title: "เกิดข้อผิดพลาด", message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-lg md:text-xl font-black text-slate-900">แบบฟอร์มลงทะเบียนส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600">
            ปีงบประมาณ {BUDGET_YEAR}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-bold text-slate-900">ชื่อ <span className="text-rose-600">*</span></label>
          <input
            value={form.firstName}
            onChange={(e) => onChangeField("firstName", e.target.value)}
            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${errors.firstName ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
            placeholder="ชื่อจริง (ภาษาไทย)"
          />
          {errors.firstName && <div className="text-xs text-rose-600 mt-1">{errors.firstName}</div>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900">นามสกุล <span className="text-rose-600">*</span></label>
          <input
            value={form.lastName}
            onChange={(e) => onChangeField("lastName", e.target.value)}
            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${errors.lastName ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
            placeholder="นามสกุล (ภาษาไทย)"
          />
          {errors.lastName && <div className="text-xs text-rose-600 mt-1">{errors.lastName}</div>}
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-900">ตำแหน่ง <span className="text-rose-600">*</span></label>
            <input
                value={form.position}
                onChange={(e) => onChangeField("position", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${errors.position ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
                placeholder="เช่น พยาบาลวิชาชีพ, นักวิชาการสาธารณสุข"
            />
            {errors.position && <div className="text-xs text-rose-600 mt-1">{errors.position}</div>}
        </div>
        
        <div>
            <label className="block text-sm font-bold text-slate-900">สังกัด/หน่วยงาน <span className="text-rose-600">*</span></label>
            <input
                value={form.organization}
                onChange={(e) => onChangeField("organization", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${errors.organization ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
                placeholder="เช่น โรงพยาบาล..."
            />
            {errors.organization && <div className="text-xs text-rose-600 mt-1">{errors.organization}</div>}
        </div>

        {/* Work Type */}
        <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-bold text-slate-900 mb-3">ประเภทผลงาน <span className="text-rose-600">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {WORK_TYPES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onChangeField("workType", t.id)}
                        className={`relative overflow-hidden text-left p-4 rounded-2xl transition ring-1 ${form.workType === t.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-50'}`}
                    >
                        <i className={`fa-solid ${t.icon} absolute -bottom-4 -right-2 text-6xl opacity-10`} />
                        <div className="relative z-10 flex items-center gap-3">
                             <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${form.workType === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                                <i className={`fa-solid ${t.icon} text-sm`} />
                             </div>
                             <span className="font-bold text-sm">{t.label}</span>
                        </div>
                    </button>
                ))}
            </div>
            {errors.workType && <div className="text-xs text-rose-600 mt-1">{errors.workType}</div>}
        </div>

        {/* Branch */}
        <div className="md:col-span-2 mt-2">
             <label className="block text-sm font-bold text-slate-900">สาขา (เลือก 1 สาขา) <span className="text-rose-600">*</span></label>
             <select
                value={form.branchId}
                onChange={(e) => onChangeField("branchId", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm bg-white outline-none transition ${errors.branchId ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
             >
                 <option value="">-- กรุณาเลือกสาขา --</option>
                 {BRANCHES.map(b => (
                     <option key={b.id} value={b.id}>{b.id}. {b.label}</option>
                 ))}
             </select>
             {errors.branchId && <div className="text-xs text-rose-600 mt-1">{errors.branchId}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 rounded-2xl bg-slate-50 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="text-xs text-slate-500">
            <i className="fa-solid fa-circle-info mr-2" />
            ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก
         </div>
         <div className="flex gap-3 w-full md:w-auto">
             <button
                onClick={() => submit('draft')}
                disabled={saving}
                className="flex-1 md:flex-none justify-center px-6 py-3 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition flex items-center gap-2 disabled:opacity-50"
             >
                {saving ? <i className="fa-solid fa-spinner animate-spin"/> : <i className="fa-solid fa-floppy-disk"/>}
                <span>บันทึกร่าง</span>
             </button>
             <button
                onClick={() => submit('submit')}
                disabled={saving}
                className="flex-1 md:flex-none justify-center px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200"
             >
                {saving ? <i className="fa-solid fa-spinner animate-spin"/> : <i className="fa-solid fa-paper-plane"/>}
                <span>ส่งผลงาน</span>
             </button>
         </div>
      </div>
    </div>
  );
};

export default Registration;