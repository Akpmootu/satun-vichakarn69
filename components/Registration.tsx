import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES } from '../constants';
import { AppSettings, Submission, UserProfile, SubmissionStatus } from '../types';
import { apiCreateSubmission, apiUpdateSubmission, nowISO } from '../services/apiService';

// Declare Swal globally since it's loaded via CDN
declare const Swal: any;

interface RegistrationProps {
  settings: AppSettings;
  onSuccess: () => void;
  showToast: (t: any) => void;
  currentUser: UserProfile | null;
  editingSubmission?: Submission | null;
  onCancelEdit?: () => void;
}

interface Attachment {
    type: 'file' | 'link';
    value: string; // Base64 or URL
    name: string;
}

const Registration: React.FC<RegistrationProps> = ({ settings, onSuccess, showToast, currentUser, editingSubmission, onCancelEdit }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    position: "",
    organization: "",
    email: "",
    phone: "",
    workType: "",
    branchId: "",
  });
  
  // New Attachment State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkInput, setLinkInput] = useState({ url: '', name: '' });
  const [attachTab, setAttachTab] = useState<'file' | 'link'>('file');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto fill if user exists or Editing
  useEffect(() => {
    if (editingSubmission) {
        // Mode: Editing
        setForm({
            firstName: editingSubmission.firstName,
            lastName: editingSubmission.lastName,
            position: editingSubmission.position,
            organization: editingSubmission.organization,
            email: editingSubmission.email,
            phone: editingSubmission.phone,
            workType: editingSubmission.workType,
            branchId: String(editingSubmission.branchId),
        });
        
        // Parse Attachments
        try {
            if (editingSubmission.fileUrl && editingSubmission.fileUrl.startsWith('[')) {
                 setAttachments(JSON.parse(editingSubmission.fileUrl));
            } else if (editingSubmission.fileUrl) {
                 setAttachments([{ type: 'file', value: editingSubmission.fileUrl, name: 'ไฟล์แนบเดิม' }]);
            }
        } catch(e) { setAttachments([]); }

    } else if (currentUser) {
        // Mode: New Entry (Only if not editing)
        if (!editingSubmission) {
            setForm(prev => ({
                ...prev,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                position: currentUser.position || "",
                organization: currentUser.organization || "",
                email: currentUser.email || "",
                phone: currentUser.phone || ""
            }));
            setAttachments([]); 
        }
    }
  }, [currentUser, editingSubmission]);

  // Calculate Progress Real-time
  const progress = useMemo(() => {
      let filled = 0;
      const total = 9;

      if (form.firstName.trim()) filled++;
      if (form.lastName.trim()) filled++;
      if (form.position.trim()) filled++;
      if (form.organization.trim()) filled++;
      
      // Email Check (Generic format)
      if (form.email.trim() && 
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) filled++;
      
      // Phone Check (approx length of formatted string)
      if (form.phone.trim() && form.phone.length >= 10) filled++;
      
      if (form.workType) filled++;
      if (form.branchId) filled++;
      if (attachments.length > 0) filled++;

      return Math.round((filled / total) * 100);
  }, [form, attachments]);

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
          // 1. Duplicate Check (Check by Filename)
          const isDuplicate = attachments.some(att => att.name === file.name);
          if (isDuplicate) {
              Swal.fire({
                  icon: 'warning',
                  title: 'ไฟล์ซ้ำ',
                  text: `ไฟล์ชื่อ "${file.name}" ถูกเพิ่มไปแล้ว กรุณาตรวจสอบหรือเปลี่ยนชื่อไฟล์`,
                  confirmButtonText: 'ตกลง',
                  confirmButtonColor: '#f59e0b',
                  customClass: { popup: 'rounded-3xl' }
              });
              // Reset input
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
          }

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
              const newAttachment: Attachment = {
                  type: 'file',
                  value: reader.result as string,
                  name: file.name
              };
              setAttachments(prev => [...prev, newAttachment]);
              showToast({ type: "success", title: "เพิ่มไฟล์สำเร็จ", message: file.name });
          };
          reader.readAsDataURL(file);
          
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const handleAddLink = () => {
      if (!linkInput.url) {
          showToast({ type: "error", title: "ข้อมูลไม่ครบ", message: "กรุณาระบุ URL" });
          return;
      }
      // Simple URL validation
      if (!linkInput.url.startsWith('http')) {
          showToast({ type: "error", title: "ลิงก์ไม่ถูกต้อง", message: "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://" });
          return;
      }

      // Duplicate Check for Link (by URL)
      if (attachments.some(a => a.value === linkInput.url)) {
           Swal.fire({
              icon: 'warning',
              title: 'ลิงก์ซ้ำ',
              text: "คุณได้แนบลิงก์นี้ไปแล้ว",
              confirmButtonText: 'ตกลง',
              confirmButtonColor: '#f59e0b',
              customClass: { popup: 'rounded-3xl' }
           });
           return;
      }

      const newAttachment: Attachment = {
          type: 'link',
          value: linkInput.url,
          name: linkInput.name || linkInput.url
      };
      setAttachments(prev => [...prev, newAttachment]);
      setLinkInput({ url: '', name: '' });
      showToast({ type: "success", title: "เพิ่มลิงก์สำเร็จ", message: "แนบลิงก์เรียบร้อยแล้ว" });
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Real-time validation
  const handleBlur = (key: string) => {
      // Removed strict domain check
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!form.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (!form.position.trim()) e.position = "กรุณากรอกตำแหน่ง";
    if (!form.organization.trim()) e.organization = "กรุณากรอกสังกัด/หน่วยงาน";
    
    // Email Validation (Generic)
    if (!form.email.trim()) {
        e.email = "กรุณากรอกอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        e.email = "รูปแบบอีเมลไม่ถูกต้อง";
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

    // 2. Dialog Construction
    let title = '';
    let html = '';
    let confirmBtnText = '';
    let icon = 'question';
    let confirmColor = '';
    const isUpdate = !!editingSubmission;

    if (mode === 'submit') {
        const workTypeLabel = WORK_TYPES.find(w => w.id === form.workType)?.label || '-';
        const branchLabel = BRANCHES.find(b => b.id === Number(form.branchId))?.label || '-';

        title = isUpdate ? 'ยืนยันการแก้ไขข้อมูล?' : 'ยืนยันการส่งผลงาน?';
        // Beautiful Summary HTML
        html = `
          <div class="text-left space-y-3 font-sans mt-2">
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                 <div class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">ผู้ส่งผลงาน</div>
                 <div class="text-2xl font-black text-slate-900 leading-tight">
                     ${form.firstName} ${form.lastName}
                 </div>
                 <div class="text-sm text-slate-600 mt-1">${form.position}</div>
              </div>

              <div class="py-2 space-y-3 px-1">
                  <div class="flex items-start gap-3">
                      <div class="w-8 text-center pt-0.5"><i class="fa-solid fa-shapes text-sky-500 text-lg"></i></div>
                      <div>
                          <div class="text-xs font-bold text-slate-500">ประเภทผลงาน</div>
                          <div class="text-sm font-bold text-slate-800">${workTypeLabel}</div>
                      </div>
                  </div>
                  <div class="flex items-start gap-3">
                      <div class="w-8 text-center pt-0.5"><i class="fa-solid fa-code-branch text-emerald-500 text-lg"></i></div>
                      <div>
                           <div class="text-xs font-bold text-slate-500">สาขาการประกวด</div>
                           <div class="text-sm font-bold text-slate-800 leading-snug">${branchLabel}</div>
                      </div>
                  </div>
                   <div class="flex items-start gap-3">
                      <div class="w-8 text-center pt-0.5"><i class="fa-solid fa-building text-indigo-500 text-lg"></i></div>
                      <div>
                           <div class="text-xs font-bold text-slate-500">หน่วยงาน</div>
                           <div class="text-sm font-bold text-slate-800">${form.organization}</div>
                      </div>
                  </div>
              </div>

              <div class="border-t border-slate-100 pt-3 mt-2">
                  ${attachments.length === 0 
                    ? '<div class="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation text-lg"></i> ท่านยังไม่ได้แนบไฟล์ผลงาน</div>' 
                    : `<div class="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex items-center gap-2"><i class="fa-solid fa-paperclip text-lg"></i> แนบไฟล์/ลิงก์ จำนวน ${attachments.length} รายการ</div>`
                  }
                  <p class="text-[10px] text-slate-400 mt-2 text-center">
                    ${isUpdate ? '*การแก้ไขข้อมูลจะถูกบันทึกแทนที่ข้อมูลเดิม' : '*กรุณาตรวจสอบข้อมูลก่อนกดยืนยัน หากส่งแล้วจะไม่สามารถแก้ไขได้ทันที'}
                  </p>
              </div>
          </div>
        `;
        confirmBtnText = isUpdate ? '<i class="fa-solid fa-save mr-2"></i>บันทึกการแก้ไข' : '<i class="fa-solid fa-paper-plane mr-2"></i>ยืนยันส่งผลงาน';
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
        icon: mode === 'submit' ? undefined : icon, // No icon for submit mode, use custom HTML
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
      // Serialize attachments to JSON string
      const filePayload = attachments.length > 0 ? JSON.stringify(attachments) : "";

      // Common fields
      const basePayload = {
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
        fileUrl: filePayload, 
        status: (mode === 'submit' ? 'submitted' : 'draft') as SubmissionStatus,
      };

      if (editingSubmission) {
           // --- UPDATE MODE ---
           // Preserve existing audit log and add new entry
           const newAudit = [
               ...(editingSubmission.audit || []),
               {
                   at: nowISO(),
                   action: mode === 'submit' ? 'UPDATE_SUBMIT' : 'UPDATE_DRAFT',
                   note: mode === 'submit' ? 'แก้ไขและส่งผลงาน' : 'แก้ไขฉบับร่าง'
               }
           ];
           
           await apiUpdateSubmission(settings, editingSubmission.id, {
               ...basePayload,
               audit: newAudit
           });

           if (mode === 'submit') {
                await Swal.fire({
                    title: 'แก้ไขข้อมูลสำเร็จ!',
                    text: 'ข้อมูลของท่านได้รับการปรับปรุงเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonColor: '#0ea5e9',
                    confirmButtonText: 'ตกลง',
                    customClass: { popup: 'rounded-3xl' }
                });
           } else {
               showToast({ type: "success", title: "บันทึกร่างสำเร็จ", message: "อัปเดตฉบับร่างเรียบร้อยแล้ว" });
           }

      } else {
           // --- CREATE MODE ---
           const newPayload: Submission = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                ...basePayload,
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

           await apiCreateSubmission(settings, newPayload);
           
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
                showToast({ type: "success", title: "บันทึกร่างสำเร็จ", message: "ระบบบันทึกความคืบหน้าของท่านแล้ว" });
           }
      }

      // Cleanup
      if (editingSubmission && onCancelEdit) {
           onCancelEdit(); // Clear editing state
      }

      // Reset form if not editing (or if finished editing)
      if (!editingSubmission) {
        setForm(prev => ({
            ...prev,
            workType: "", 
            branchId: "",
        }));
        setAttachments([]);
        setLinkInput({ url: '', name: '' });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      
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
    <div className="relative fade-in">
      
      {/* Background Decor Layer (Absolute) - Handles Clipping */}
      <div className="absolute inset-0 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm rounded-3xl overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-0 right-0 p-10 opacity-5 mt-20">
              <i className="fa-solid fa-pen-nib text-9xl text-slate-800 dark:text-white"></i>
          </div>
      </div>

      {/* Content Layer - Relative to allow scrolling behavior for sticky elements */}
      <div className="relative z-10 px-5 md:px-8 pb-8 pt-0 rounded-3xl">

        {/* Sticky Header with Progress Bar */}
        {/* top-20 accounts for the Main App Header height (80px) */}
        <div className="sticky top-20 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-6 pb-4 -mx-5 md:-mx-8 px-5 md:px-8 border-b border-slate-100 dark:border-slate-800 transition-all mb-6 rounded-t-3xl">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {editingSubmission ? (
                        <>
                            <i className="fa-solid fa-pen-to-square text-amber-500"></i>
                            แก้ไขข้อมูลผลงาน
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-file-signature text-sky-500"></i>
                            แบบฟอร์มลงทะเบียนส่งผลงาน
                        </>
                    )}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 hidden md:block">
                    ปีงบประมาณ {BUDGET_YEAR} • ผู้ส่ง: {currentUser.firstName} {currentUser.lastName}
                </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-black transition-colors duration-300 ${progress === 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-white'}`}>
                        {progress}%
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700">
                <div 
                    className={`h-full transition-all duration-700 ease-out rounded-full ${getProgressColor()}`}
                    style={{ width: `${progress}%` }}
                >
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>
            
            {/* Edit Mode Warning Banner */}
            {editingSubmission && (
                <div className="mt-3 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        กำลังแก้ไขผลงานเดิม (ID: {editingSubmission.id.substring(0,8)}...)
                    </span>
                    {onCancelEdit && (
                        <button onClick={onCancelEdit} className="text-amber-600 dark:text-amber-400 hover:underline font-bold">
                            ยกเลิก
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Scrollable Content Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            {/* Basic Info */}
            <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                <i className="fa-solid fa-user mr-2 text-slate-400"></i>ชื่อ <span className="text-rose-600">*</span>
            </label>
            <input
                value={form.firstName}
                onChange={(e) => onChangeField("firstName", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.firstName ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                placeholder="ชื่อจริง (ภาษาไทย)"
            />
            {errors.firstName && <div className="text-xs text-rose-600 mt-1">{errors.firstName}</div>}
            </div>

            <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                <i className="fa-regular fa-user mr-2 text-slate-400"></i>นามสกุล <span className="text-rose-600">*</span>
            </label>
            <input
                value={form.lastName}
                onChange={(e) => onChangeField("lastName", e.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.lastName ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                placeholder="นามสกุล (ภาษาไทย)"
            />
            {errors.lastName && <div className="text-xs text-rose-600 mt-1">{errors.lastName}</div>}
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-id-card-clip mr-2 text-slate-400"></i>ตำแหน่ง <span className="text-rose-600">*</span>
                </label>
                <input
                    value={form.position}
                    onChange={(e) => onChangeField("position", e.target.value)}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.position ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                    placeholder="เช่น พยาบาลวิชาชีพ"
                />
                {errors.position && <div className="text-xs text-rose-600 mt-1">{errors.position}</div>}
            </div>
            
            <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-building mr-2 text-slate-400"></i>สังกัด/หน่วยงาน <span className="text-rose-600">*</span>
                </label>
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
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-envelope mr-2 text-slate-400"></i>อีเมล (Email) <span className="text-rose-600">*</span>
                </label>
                <input
                    value={form.email}
                    onChange={(e) => onChangeField("email", e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.email ? 'border-rose-300 focus:ring-rose-100 bg-rose-50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                    placeholder="example@email.com"
                    type="email"
                />
                {errors.email && <div className="text-xs text-rose-600 mt-1">{errors.email}</div>}
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-phone mr-2 text-slate-400"></i>เบอร์โทรศัพท์ <span className="text-rose-600">*</span>
                </label>
                <input
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition bg-white dark:bg-slate-800 dark:text-white ${errors.phone ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 dark:border-slate-700 focus:ring-sky-100 focus:ring-4 dark:focus:ring-sky-900'}`}
                    placeholder="0xx-xxx-xxxx"
                    type="tel"
                    maxLength={12}
                />
                {errors.phone && <div className="text-xs text-rose-600 mt-1">{errors.phone}</div>}
            </div>

            {/* Work Type */}
            <div className="md:col-span-2 mt-2">
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200 mb-3">
                    <i className="fa-solid fa-shapes mr-2 text-slate-400"></i>ประเภทผลงาน <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {WORK_TYPES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => onChangeField("workType", t.id)}
                            className={`relative overflow-hidden text-left p-4 rounded-2xl transition ring-1 group ${form.workType === t.id ? 'bg-slate-900 dark:bg-sky-600 text-white ring-slate-900 dark:ring-sky-600 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            {/* Background Faded Icon */}
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1} 
                                stroke="currentColor" 
                                className={`absolute -bottom-4 -right-4 w-20 h-20 opacity-10 transition-transform group-hover:scale-110 ${form.workType === t.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                            </svg>

                            <div className="relative z-10 flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${form.workType === t.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                    </svg>
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
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-code-branch mr-2 text-slate-400"></i>สาขา (เลือก 1 สาขา) <span className="text-rose-600">*</span>
                </label>
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

            {/* Attachments Section */}
            <div className="md:col-span-2 mt-6 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-paperclip text-sky-500"></i> เอกสารและไฟล์แนบ
                </label>
                
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setAttachTab('file')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${attachTab === 'file' ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-400 ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <i className="fa-solid fa-cloud-arrow-up"></i> อัปโหลดไฟล์
                    </button>
                    <button 
                        onClick={() => setAttachTab('link')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${attachTab === 'link' ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-400 ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <i className="fa-solid fa-link"></i> แนบลิงก์ (Canva/Drive)
                    </button>
                </div>

                {/* Input Area */}
                <div className="mb-4">
                    {attachTab === 'file' ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-sky-500 dark:hover:border-sky-400 hover:bg-white dark:hover:bg-slate-700 transition group"
                        >
                            <div className="text-slate-400 group-hover:text-sky-500 transition mb-2">
                                <i className="fa-solid fa-file-circle-plus text-2xl"></i>
                            </div>
                            <div className="text-sm font-bold text-slate-600 dark:text-slate-300">คลิกเพื่อเลือกไฟล์ (สูงสุด 10MB)</div>
                            <div className="text-xs text-slate-400">PDF, JPG, PNG</div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange}
                                accept="image/*,application/pdf"
                                className="hidden" 
                            />
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                                <input 
                                    value={linkInput.url}
                                    onChange={e => setLinkInput({...linkInput, url: e.target.value})}
                                    placeholder="วางลิงก์ที่นี่ (https://...)"
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white text-sm"
                                />
                                <input 
                                    value={linkInput.name}
                                    onChange={e => setLinkInput({...linkInput, name: e.target.value})}
                                    placeholder="ชื่อลิงก์ (เช่น Canva Slide, Google Drive)"
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white text-sm"
                                />
                            </div>
                            <button 
                                onClick={handleAddLink}
                                className="px-4 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-sm"
                            >
                                <i className="fa-solid fa-plus"></i> เพิ่ม
                            </button>
                        </div>
                    )}
                </div>

                {/* Attachments List */}
                {attachments.length > 0 && (
                    <div className="space-y-2">
                        {attachments.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm animate-fade-in">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${item.type === 'file' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <i className={`fa-solid ${item.type === 'file' ? 'fa-file-lines' : 'fa-link'}`}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.type === 'link' ? item.value : 'File Uploaded'}</div>
                                </div>
                                <button 
                                    onClick={() => removeAttachment(idx)}
                                    className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-600 transition flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        ))}
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
                    <span>{editingSubmission ? 'บันทึกร่าง (แก้ไข)' : 'บันทึกร่าง'}</span>
                </button>
                <button
                    onClick={() => confirmAndSubmit('submit')}
                    disabled={saving} 
                    className="w-full md:w-auto justify-center px-6 py-3 rounded-2xl font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200 dark:shadow-none bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 hover:scale-[1.02] active:scale-100"
                >
                    {saving ? <i className="fa-solid fa-spinner animate-spin"/> : <i className="fa-solid fa-paper-plane"/>}
                    <span>{editingSubmission ? 'ยืนยันแก้ไข' : 'ส่งผลงาน'}</span>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Registration;