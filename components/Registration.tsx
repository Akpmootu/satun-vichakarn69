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
    fileName: "" // Track filename locally for UI
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
            position: currentUser.position || "",
            organization: currentUser.organization || "",
            email: currentUser.email || "",
            phone: currentUser.phone || ""
        }));
    }
  }, [currentUser]);

  // Calculate Progress Real-time
  const progress = useMemo(() => {
      let filled = 0;
      const total = 9;

      if (form.firstName.trim()) filled++;
      if (form.lastName.trim()) filled++;
      if (form.position.trim()) filled++;
      if (form.organization.trim()) filled++;
      
      // Strict Email Check
      if (form.email.trim() && 
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && 
          form.email.endsWith('@satunhealth.go.th')) filled++;
      
      // Phone Check (approx length of formatted string)
      if (form.phone.trim() && form.phone.length >= 10) filled++;
      
      if (form.workType) filled++;
      if (form.branchId) filled++;
      if (form.fileUrl) filled++;

      return Math.round((filled / total) * 100);
  }, [form]);

  if (!currentUser) {
      return (
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-10 text-center ring-1 ring-slate-200 dark:ring-slate-700">
              <i className="fa-solid fa-lock text-4xl text-slate-300 mb-4"></i>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">กรุณาเข้าสู่ระบบก่อนส่งผลงาน</h2>
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

  // Phone Input Masking
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 10) val = val.substring(0, 10);
      
      let formatted = val;
      if (val.length > 6) {
          formatted = `${val.slice(0,3)}-${val.slice(3,6)}-${val.slice(6)}`;
      } else if (val.length > 3) {
          formatted = `${val.slice(0,3)}-${val.slice(3)}`;
      }
      
      onChangeField("phone", formatted);
  };

  // Handle File Upload (Image or PDF)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validate Size (Max 10MB)
          if (file.size > 10 * 1024 * 1024) {
              showToast({ type: "error", title: "ไฟล์มีขนาดใหญ่เกินไป", message: "กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 10MB" });
              return;
          }

          const isPdf = file.type === 'application/pdf';
          const isImage = file.type.startsWith('image/');

          if (!isPdf && !isImage) {
              showToast({ type: "error", title: "ชนิดไฟล์ไม่ถูกต้อง", message: "กรุณาอัปโหลดไฟล์รูปภาพ (jpg, png) หรือ PDF" });
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setForm(prev => ({ 
                  ...prev, 
                  fileUrl: reader.result as string,
                  fileName: file.name
              }));
          };
          reader.readAsDataURL(file);
      }
  };

  const removeFile = () => {
      setForm(prev => ({ ...prev, fileUrl: "", fileName: "" }));
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  // Real-time validation
  const handleBlur = (key: string) => {
      if (key === 'email') {
          if (form.email.trim() && !form.email.endsWith('@satunhealth.go.th')) {
              setErrors(prev => ({ ...prev, email: "กรุณาใช้อีเมลองค์กร (@satunhealth.go.th)" }));
          }
      }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!form.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (!form.position.trim()) e.position = "กรุณากรอกตำแหน่ง";
    if (!form.organization.trim()) e.organization = "กรุณากรอกสังกัด/หน่วยงาน";
    
    // Email Validation (Strict Domain)
    if (!form.email.trim()) {
        e.email = "กรุณากรอกอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    } else if (!form.email.endsWith('@satunhealth.go.th')) {
        e.email = "กรุณาใช้อีเมลองค์กร (@satunhealth.go.th)";
    }

    if (!form.phone.trim()) {
        e.phone = "กรุณากรอกเบอร์โทรศัพท์";
    } else if (form.phone.length < 10) {
        e.phone = "เบอร์โทรศัพท์ไม่ครบถ้วน";
    }

    if (!form.workType) e.workType = "กรุณาเลือกประเภทผลงาน";
    if (!form.branchId) e.branchId = "กรุณาเลือกสาขา";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const confirmAndSubmit = async (mode: 'draft' | 'submit') => {
    // 1. Validation Logic
    if (mode === 'submit') {
        if (!validateForm()) {
            showToast({ type: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณาตรวจสอบช่องที่มีสีแดง" });
            return;
        }
    } else {
        // Draft: Minimal Validation
        if (!form.firstName.trim() || !form.lastName.trim()) {
             showToast({ type: "error", title: "ข้อมูลระบุตัวตนไม่ครบ", message: "กรุณากรอกชื่อและนามสกุลเพื่อบันทึกร่าง" });
             return;
        }
    }

    // 2. Dialog
    let title = '';
    let html = '';
    let confirmBtnText = '';
    let icon = 'question';
    let confirmColor = '';

    if (mode === 'submit') {
        title = 'ยืนยันการส่งผลงาน?';
        html = `
            <div class="text-left text-sm text-slate-600">
                <p>ท่านกำลังจะส่งผลงาน: <b>${form.firstName} ${form.lastName}</b></p>
                <p class="mt-2">ข้อมูลจะถูกส่งเข้าสู่ระบบการพิจารณา กรุณาตรวจสอบความถูกต้อง</p>
            </div>
        `;
        confirmBtnText = '<i class="fa-solid fa-paper-plane mr-2"></i>ยืนยันส่งผลงาน';
        confirmColor = '#0f172a'; // slate-900
    } else {
        title = 'ยืนยันการบันทึกฉบับร่าง?';
        html = `
            <div class="text-left text-sm text-slate-600">
                <p>ระบบจะบันทึกข้อมูลของท่านไว้ เพื่อให้กลับมาแก้ไขภายหลังได้</p>
            </div>
        `;
        confirmBtnText = '<i class="fa-solid fa-floppy-disk mr-2"></i>บันทึกร่าง';
        confirmColor = '#334155'; // slate-700
        icon = 'info';
    }

    const result = await Swal.fire({
        title: title,
        html: html,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#94a3b8',
        confirmButtonText: confirmBtnText,
        cancelButtonText: 'ยกเลิก',
        focusCancel: true,
        customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl px-4 py-2',
            cancelButton: 'rounded-xl px-4 py-2'
        }
    });

    if (!result.isConfirmed) return;

    await submit(mode);
  };

  const submit = async (mode: 'draft' | 'submit') => {
    setSaving(true);
    try {
      const payload: Submission = {
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
        fileUrl: form.fileUrl,
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

      // Reset form (Keep persistent user info, clear submission specific info)
      setForm(prev => ({
        ...prev,
        workType: "", 
        branchId: "",
        fileUrl: "",
        fileName: ""
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

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm p-5 md:p-6 fade-in relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <i className="fa-solid fa-pen-nib text-9xl text-slate-800 dark:text-white"></i>
      </div>

      <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
        <div>
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">แบบฟอร์มลงทะเบียนส่งผลงาน</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            ปีงบประมาณ {BUDGET_YEAR} • ผู้ส่ง: {currentUser.firstName} {currentUser.lastName}
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="mb-8 relative z-10">
          <div className="flex items-end justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ความคืบหน้า</span>
              <span className={`text-xs font-bold transition-colors duration-300 ${progress === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {progress === 100 ? 'ข้อมูลครบถ้วน พร้อมส่งผลงาน! 🎉' : `${progress}%`}
              </span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700">
              <div 
                  className={`h-full transition-all duration-700 ease-out rounded-full ${getProgressColor()}`}
                  style={{ width: `${progress}%` }}
              >
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">ชื่อ <span className="text-rose-600">*</span></label>
          <input
            value={form.firstName}
            onChange={(e) => onChangeField("firstName", e.target.value)}
            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.firstName ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
            placeholder="ชื่อจริง (ภาษาไทย)"
          />
          {errors.firstName && <div className="text-xs text-rose-600 mt-1">{errors.firstName}</div>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">นามสกุล <span className="text-rose-600">*</span></label>
          <input
            value={form.lastName}
            onChange={(e) => onChangeField("lastName", e.target.value)}
            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.lastName ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
            placeholder="นามสกุล (ภาษาไทย)"
          />
          {errors.lastName && <div className="text-xs text-rose-600 mt-1">{errors.lastName}</div>}
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">ตำแหน่ง <span className="text-rose-600">*</span></label>
            <input
                value={form.position}
                onChange={(e) => onChangeField("position", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.position ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                placeholder="เช่น พยาบาลวิชาชีพ"
            />
            {errors.position && <div className="text-xs text-rose-600 mt-1">{errors.position}</div>}
        </div>
        
        <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">สังกัด/หน่วยงาน <span className="text-rose-600">*</span></label>
            <input
                value={form.organization}
                onChange={(e) => onChangeField("organization", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.organization ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                placeholder="เช่น โรงพยาบาล..."
            />
            {errors.organization && <div className="text-xs text-rose-600 mt-1">{errors.organization}</div>}
        </div>

        {/* Contact Info */}
        <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">อีเมล (@satunhealth.go.th) <span className="text-rose-600">*</span></label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-regular fa-envelope"></i>
                </div>
                <input
                    value={form.email}
                    onChange={(e) => onChangeField("email", e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`mt-2 w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.email ? 'border-rose-300 focus:ring-rose-100 bg-rose-50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                    placeholder="name@satunhealth.go.th"
                    type="email"
                />
            </div>
            {errors.email && <div className="text-xs text-rose-600 mt-1">{errors.email}</div>}
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">เบอร์โทรศัพท์ <span className="text-rose-600">*</span></label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-phone"></i>
                </div>
                <input
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className={`mt-2 w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.phone ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                    placeholder="0xx-xxx-xxxx"
                    type="tel"
                    maxLength={12}
                />
            </div>
            {errors.phone && <div className="text-xs text-rose-600 mt-1">{errors.phone}</div>}
        </div>

        {/* Work Type */}
        <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200 mb-3">ประเภทผลงาน <span className="text-rose-600">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {WORK_TYPES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onChangeField("workType", t.id)}
                        className={`relative overflow-hidden text-left p-4 rounded-2xl transition ring-1 ${form.workType === t.id ? 'bg-slate-900 dark:bg-sky-600 text-white ring-slate-900 dark:ring-sky-600 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <i className={`fa-solid ${t.icon} absolute -bottom-4 -right-2 text-6xl opacity-10`} />
                        <div className="relative z-10 flex items-center gap-3">
                             <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${form.workType === t.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
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
             <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">สาขา (เลือก 1 สาขา) <span className="text-rose-600">*</span></label>
             <select
                value={form.branchId}
                onChange={(e) => onChangeField("branchId", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm bg-white dark:bg-slate-800 dark:text-white outline-none transition ${errors.branchId ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
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
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200 mb-2">
                อัปโหลดไฟล์ผลงาน (PDF / รูปภาพ) <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(ถ้ามี)</span>
            </label>
            
            {!form.fileUrl ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 text-center cursor-pointer hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition group"
                >
                    <div className="h-12 w-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-600 group-hover:text-sky-500 transition">
                        <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                    </div>
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-sky-700 dark:group-hover:text-sky-400">คลิกเพื่ออัปโหลดไฟล์</div>
                    <div className="text-xs text-slate-400 mt-1">รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10MB</div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="hidden" 
                    />
                </div>
            ) : (
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 group bg-slate-50 dark:bg-slate-800 p-4 flex items-center gap-4">
                    {/* Preview Icon/Image */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-white dark:bg-slate-700 ring-1 ring-slate-100 dark:ring-slate-600 flex items-center justify-center shrink-0">
                         {form.fileUrl.startsWith('data:image') ? (
                             <img src={form.fileUrl} alt="Preview" className="w-full h-full object-cover" />
                         ) : (
                             <i className="fa-solid fa-file-pdf text-3xl text-rose-500"></i>
                         )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{form.fileName || 'ไฟล์แนบ'}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                            <i className="fa-solid fa-circle-check"></i> อัปโหลดสำเร็จ
                        </div>
                    </div>

                    <button 
                        onClick={removeFile}
                        className="h-10 w-10 rounded-full bg-white dark:bg-slate-700 text-rose-500 ring-1 ring-slate-200 dark:ring-slate-600 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:ring-rose-200 transition"
                        title="ลบไฟล์"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 border border-slate-100 dark:border-slate-700">
         <div className="text-xs text-slate-500 dark:text-slate-400">
            <i className="fa-solid fa-circle-info mr-2" />
            ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก
         </div>
         <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <button
                onClick={() => confirmAndSubmit('draft')}
                disabled={saving}
                className="w-full md:w-auto justify-center px-6 py-3 rounded-2xl bg-white dark:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition flex items-center gap-2 disabled:opacity-50"
             >
                {saving ? <i className="fa-solid fa-spinner animate-spin"/> : <i className="fa-solid fa-floppy-disk"/>}
                <span>บันทึกร่าง</span>
             </button>
             <button
                onClick={() => confirmAndSubmit('submit')}
                disabled={saving || progress < 100} 
                title={progress < 100 ? "กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่ง" : ""}
                className={`w-full md:w-auto justify-center px-6 py-3 rounded-2xl font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200 dark:shadow-none 
                    ${progress === 100 ? 'bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
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