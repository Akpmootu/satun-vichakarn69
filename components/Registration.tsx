import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES } from '../constants';
import { AppSettings, Submission, UserProfile } from '../types';
import { apiCreateSubmission, nowISO } from '../services/apiService';

// Declare Swal globally since it's loaded via CDN
declare const Swal: any;

interface RegistrationProps {
  settings: AppSettings;
  onSuccess: () => void;
  showToast: (t: any) => void;
  currentUser: UserProfile | null;
}

const Registration: React.FC<RegistrationProps> = ({ settings, onSuccess, showToast, currentUser }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    position: "",
    organization: "",
    email: "",
    phone: "",
    workType: "",
    branchId: "",
    fileUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto fill if user exists
  useEffect(() => {
    if (currentUser) {
        setForm(prev => ({
            ...prev,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            position: currentUser.position,
            organization: currentUser.organization,
            email: currentUser.email || "",
            phone: currentUser.phone || ""
        }));
    }
  }, [currentUser]);

  // Calculate Progress Real-time
  const progress = useMemo(() => {
      let filled = 0;
      const total = 9; // Added fileUrl as a step

      if (form.firstName.trim()) filled++;
      if (form.lastName.trim()) filled++;
      if (form.position.trim()) filled++;
      if (form.organization.trim()) filled++;
      // Email must match regex to count
      if (form.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) filled++;
      if (form.phone.trim()) filled++;
      if (form.workType) filled++;
      if (form.branchId) filled++;
      if (form.fileUrl) filled++; // Count file upload

      return Math.round((filled / total) * 100);
  }, [form]);

  if (!currentUser) {
      return (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200">
              <i className="fa-solid fa-lock text-4xl text-slate-300 mb-4"></i>
              <h2 className="text-xl font-bold text-slate-700">กรุณาเข้าสู่ระบบก่อนส่งผลงาน</h2>
          </div>
      );
  }

  const onChangeField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Handle File Upload (Convert to Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validate Size (Max 5MB)
          if (file.size > 5 * 1024 * 1024) {
              showToast({ type: "error", title: "ไฟล์มีขนาดใหญ่เกินไป", message: "กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5MB" });
              return;
          }

          // Validate Type (Images only for this example)
          if (!file.type.startsWith('image/')) {
              showToast({ type: "error", title: "ชนิดไฟล์ไม่ถูกต้อง", message: "กรุณาอัปโหลดไฟล์รูปภาพ (jpg, png)" });
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setForm(prev => ({ ...prev, fileUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const removeFile = () => {
      setForm(prev => ({ ...prev, fileUrl: "" }));
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  // Real-time validation when focus leaves the field
  const handleBlur = (key: string) => {
      if (key === 'email') {
          if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
              setErrors(prev => ({ ...prev, email: "รูปแบบอีเมลไม่ถูกต้อง (เช่น user@example.com)" }));
          }
      }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!form.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (!form.position.trim()) e.position = "กรุณากรอกตำแหน่ง";
    if (!form.organization.trim()) e.organization = "กรุณากรอกสังกัด/หน่วยงาน";
    
    // Email Validation
    if (!form.email.trim()) {
        e.email = "กรุณากรอกอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        e.email = "รูปแบบอีเมลไม่ถูกต้อง (เช่น user@example.com)";
    }

    if (!form.phone.trim()) e.phone = "กรุณากรอกเบอร์โทรศัพท์";
    if (!form.workType) e.workType = "กรุณาเลือกประเภทผลงาน";
    if (!form.branchId) e.branchId = "กรุณาเลือกสาขา";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const confirmAndSubmit = async (mode: 'draft' | 'submit') => {
    // Logic Split: Draft vs Submit
    if (mode === 'submit') {
        // Strict Validation for Submit
        if (!validateForm()) {
            showToast({ type: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณาตรวจสอบช่องที่มีสีแดง" });
            return;
        }

        // Confirmation Dialog
        const result = await Swal.fire({
            title: 'ยืนยันการส่งผลงาน?',
            html: `
                <div class="text-left text-sm text-slate-600">
                    <p>ท่านกำลังจะส่งผลงาน: <b>${form.firstName} ${form.lastName}</b></p>
                    <p class="mt-2">ข้อมูลจะถูกส่งเข้าสู่ระบบการพิจารณา กรุณาตรวจสอบความถูกต้อง</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0f172a', // slate-900
            cancelButtonColor: '#64748b',  // slate-500
            confirmButtonText: '<i class="fa-solid fa-paper-plane mr-2"></i>ยืนยันส่งผลงาน',
            cancelButtonText: 'แก้ไขก่อน',
            focusCancel: true,
            customClass: {
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl px-4 py-2',
                cancelButton: 'rounded-xl px-4 py-2'
            }
        });

        if (!result.isConfirmed) return;

    } else {
        // Minimal Validation for Draft (Just Name)
        if (!form.firstName.trim() || !form.lastName.trim()) {
             showToast({ type: "error", title: "ข้อมูลระบุตัวตนไม่ครบ", message: "กรุณากรอกชื่อและนามสกุลเพื่อบันทึกร่าง" });
             setErrors(prev => ({
                 ...prev, 
                 firstName: !form.firstName.trim() ? "กรุณากรอกชื่อ" : "",
                 lastName: !form.lastName.trim() ? "กรุณากรอกนามสกุล" : ""
             }));
             return;
        }
    }

    await submit(mode);
  };

  const submit = async (mode: 'draft' | 'submit') => {
    setSaving(true);
    try {
      const payload: Submission = {
        // Generate a pseudo-UUID
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        userId: currentUser.id,
        budgetYear: BUDGET_YEAR,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position.trim(),
        organization: form.organization.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        workType: form.workType,
        branchId: Number(form.branchId),
        fileUrl: form.fileUrl, // Include File
        status: mode === 'submit' ? 'submitted' : 'draft',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        audit: [
          {
            at: nowISO(),
            action: mode === 'submit' ? 'SUBMIT' : 'SAVE_DRAFT',
            note: mode === 'submit' ? 'ส่งผลงานครั้งแรก' : 'บันทึกฉบับร่าง'
          }
        ]
      };

      await apiCreateSubmission(settings, payload);
      
      if (mode === 'submit') {
          await Swal.fire({
            title: 'ส่งผลงานสำเร็จ!',
            text: 'ระบบได้รับข้อมูลของท่านเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#0ea5e9',
            confirmButtonText: 'ตกลง',
            customClass: { popup: 'rounded-3xl' }
          });
      } else {
        showToast({
            type: "success",
            title: "บันทึกร่างสำเร็จ",
            message: "ระบบบันทึกความคืบหน้าของท่านแล้ว"
        });
      }

      // Reset form (keep name/org as user might send another)
      setForm(prev => ({
        ...prev,
        workType: "", 
        branchId: "",
        fileUrl: ""
      }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
    } catch (e: any) {
      Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: e.message,
          icon: 'error',
          confirmButtonText: 'ปิด',
          customClass: { popup: 'rounded-3xl' }
      });
    } finally {
      setSaving(false);
    }
  };

  // Progress Bar Helper
  const getProgressColor = () => {
      if (progress === 100) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      if (progress >= 50) return 'bg-sky-500';
      return 'bg-amber-400';
  };

  const getProgressMessage = () => {
      if (progress === 100) return "ข้อมูลครบถ้วน พร้อมส่งผลงาน! 🎉";
      if (progress >= 50) return "มาครึ่งทางแล้ว สู้ๆ! 💪";
      return "เริ่มกรอกข้อมูลกันเลย ✍️";
  };

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 fade-in relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <i className="fa-solid fa-pen-nib text-9xl text-slate-800"></i>
      </div>

      <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
        <div>
          <div className="text-lg md:text-xl font-black text-slate-900">แบบฟอร์มลงทะเบียนส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600">
            ปีงบประมาณ {BUDGET_YEAR} • ผู้ส่ง: {currentUser.firstName} {currentUser.lastName}
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="mb-8 relative z-10">
          <div className="flex items-end justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ความคืบหน้า</span>
              <span className={`text-xs font-bold transition-colors duration-300 ${progress === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {getProgressMessage()} ({progress}%)
              </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-200/50">
              <div 
                  className={`h-full transition-all duration-700 ease-out rounded-full ${getProgressColor()}`}
                  style={{ width: `${progress}%` }}
              >
                  {/* Shimmer Effect */}
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
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

        {/* Contact Info */}
        <div>
            <label className="block text-sm font-bold text-slate-900">อีเมล (Email) <span className="text-rose-600">*</span></label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-regular fa-envelope"></i>
                </div>
                <input
                    value={form.email}
                    onChange={(e) => onChangeField("email", e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`mt-2 w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition ${errors.email ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
                    placeholder="example@mail.com"
                    type="email"
                />
            </div>
            {errors.email && <div className="text-xs text-rose-600 mt-1">{errors.email}</div>}
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-900">เบอร์โทรศัพท์ <span className="text-rose-600">*</span></label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-phone"></i>
                </div>
                <input
                    value={form.phone}
                    onChange={(e) => onChangeField("phone", e.target.value)}
                    className={`mt-2 w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition ${errors.phone ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-sky-100 focus:ring-4'}`}
                    placeholder="08x-xxx-xxxx"
                    maxLength={15}
                />
            </div>
            {errors.phone && <div className="text-xs text-rose-600 mt-1">{errors.phone}</div>}
        </div>

        {/* Work Type */}
        <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-bold text-slate-900 mb-3">ประเภทผลงาน <span className="text-rose-600">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {WORK_TYPES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onChangeField("workType", t.id)}
                        className={`relative overflow-hidden text-left p-4 rounded-2xl transition ring-1 ${form.workType === t.id ? 'bg-slate-900 text-white ring-slate-900 shadow-md transform scale-[1.02]' : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-50'}`}
                    >
                        <i className={`fa-solid ${t.icon} absolute -bottom-4 -right-2 text-6xl opacity-10`} />
                        <div className="relative z-10 flex items-center gap-3">
                             <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${form.workType === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                                <i className={`fa-solid ${t.icon} text-sm`} />
                             </div>
                             <span className="font-bold text-sm">{t.label}</span>
                        </div>
                         {form.workType === t.id && (
                             <div className="absolute top-2 right-2 text-emerald-400">
                                 <i className="fa-solid fa-circle-check"></i>
                             </div>
                         )}
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

        {/* File Upload Section */}
        <div className="md:col-span-2 mt-4">
            <label className="block text-sm font-bold text-slate-900 mb-2">
                อัปโหลดรูปภาพผลงาน / e-Poster <span className="text-xs font-normal text-slate-500">(ถ้ามี)</span>
            </label>
            
            {!form.fileUrl ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-sky-500 hover:bg-sky-50 transition group"
                >
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:bg-white group-hover:text-sky-500 transition">
                        <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                    </div>
                    <div className="text-sm font-bold text-slate-600 group-hover:text-sky-700">คลิกเพื่ออัปโหลดรูปภาพ</div>
                    <div className="text-xs text-slate-400 mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB</div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden" 
                    />
                </div>
            ) : (
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-slate-200 group">
                    <img src={form.fileUrl} alt="Preview" className="w-full h-48 md:h-64 object-cover bg-slate-100" />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button 
                            onClick={removeFile}
                            className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-rose-600 transition flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0"
                        >
                            <i className="fa-solid fa-trash"></i> ลบรูปภาพ
                        </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-lg shadow-sm">
                        <i className="fa-solid fa-check mr-1"></i> อัปโหลดแล้ว
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 rounded-2xl bg-slate-50 p-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 border border-slate-100">
         <div className="text-xs text-slate-500">
            <i className="fa-solid fa-circle-info mr-2" />
            ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก
         </div>
         <div className="flex gap-3 w-full md:w-auto">
             <button
                onClick={() => confirmAndSubmit('draft')}
                disabled={saving}
                className="flex-1 md:flex-none justify-center px-6 py-3 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition flex items-center gap-2 disabled:opacity-50"
             >
                {saving ? <i className="fa-solid fa-spinner animate-spin"/> : <i className="fa-solid fa-floppy-disk"/>}
                <span>บันทึกร่าง</span>
             </button>
             <button
                onClick={() => confirmAndSubmit('submit')}
                disabled={saving || progress < 100} 
                title={progress < 100 ? "กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่ง" : ""}
                className={`flex-1 md:flex-none justify-center px-6 py-3 rounded-2xl font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200 
                    ${progress === 100 ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
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