
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES } from '../constants';
import { AppSettings, Submission, UserProfile, SubmissionStatus } from '../types';
import { apiCreateSubmission, apiUpdateSubmission, nowISO } from '../services/apiService';
import Badge from './ui/Badge';

// Declare Swal globally since it's loaded via CDN
declare const Swal: any;

interface RegistrationProps {
  settings: AppSettings;
  onSuccess: () => void;
  showToast: (t: any) => void;
  currentUser: UserProfile | null;
  editingSubmission?: Submission | null;
  onCancelEdit?: () => void;
  onNavigateToProfile: () => void;
}

interface Attachment {
    type: 'file' | 'link';
    value: string; // Base64 or URL
    name: string;
    size?: number; // Size in bytes
}

// --- Branch Group Data for Combobox ---
const BRANCH_GROUPS = [
    { label: "การแพทย์และสหวิชาชีพ", ids: [1, 2, 3, 4, 10, 11, 12] },
    { label: "การพยาบาล", ids: [5, 6, 7, 8, 9] },
    { label: "การส่งเสริมสุขภาพและป้องกันโรค", ids: [13, 14, 15, 16, 17] },
    { label: "บริหารและยุทธศาสตร์", ids: [18, 19, 20] }
];

// --- Sub-Component: Branch Selector (Searchable Combobox) ---
const BranchSelector: React.FC<{ 
    value: string; 
    onChange: (val: string) => void; 
    error?: string;
}> = ({ value, onChange, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Selected Label Display
    const selectedBranch = BRANCHES.find(b => b.id === Number(value));
    const displayValue = selectedBranch ? `${String(selectedBranch.id).padStart(2, '0')} – ${selectedBranch.label}` : "-- กรุณาเลือกสาขา --";

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Clear search when opening
    useEffect(() => {
        if (isOpen) setSearch("");
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left px-4 py-3 rounded-xl border flex justify-between items-center bg-white dark:bg-slate-900 transition outline-none focus:ring-2
                    ${error 
                        ? 'border-rose-300 focus:ring-rose-200 text-rose-600' 
                        : 'border-slate-200 dark:border-slate-600 focus:ring-sky-200 text-slate-700 dark:text-white'}
                `}
            >
                <span className={!value ? 'text-slate-400' : 'font-bold'}>{displayValue}</span>
                <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 animate-fade-in origin-top">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 sticky top-0 rounded-t-xl">
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                            <input 
                                type="text"
                                autoFocus
                                placeholder="พิมพ์ชื่อสาขา หรือเลขสาขา..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-sky-400 outline-none dark:text-white placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Options List with Groups */}
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {BRANCH_GROUPS.map((group) => {
                            const groupBranches = group.ids
                                .map(id => BRANCHES.find(b => b.id === id))
                                .filter(b => b && (
                                    b.label.toLowerCase().includes(search.toLowerCase()) || 
                                    String(b.id).includes(search)
                                ));

                            if (groupBranches.length === 0) return null;

                            return (
                                <div key={group.label}>
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-700/30 mt-1 first:mt-0 rounded-md">
                                        {group.label}
                                    </div>
                                    {groupBranches.map(b => (
                                        <button
                                            key={b!.id}
                                            onClick={() => {
                                                onChange(String(b!.id));
                                                setIsOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2.5 text-sm rounded-lg flex items-center justify-between transition group
                                                ${String(b!.id) === value 
                                                    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold' 
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
                                            `}
                                        >
                                            <span className="truncate">
                                                <span className="inline-block w-8 font-mono text-slate-400 group-hover:text-sky-500 dark:group-hover:text-sky-400 font-bold">{String(b!.id).padStart(2, '0')}</span> 
                                                {b!.label}
                                            </span>
                                            {String(b!.id) === value && <i className="fa-solid fa-check text-sky-500"></i>}
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                        {BRANCH_GROUPS.every(g => 
                            g.ids.map(id => BRANCHES.find(b => b.id === id))
                                .filter(b => b && (b.label.toLowerCase().includes(search.toLowerCase()) || String(b.id).includes(search)))
                                .length === 0
                        ) && (
                            <div className="p-8 text-center text-sm text-slate-400">
                                <i className="fa-solid fa-file-circle-question text-2xl mb-2 opacity-50"></i>
                                <div>ไม่พบสาขาที่ค้นหา</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {error && <p className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-circle-exclamation mr-1"></i> {error}</p>}
        </div>
    );
};

const Registration: React.FC<RegistrationProps> = ({ settings, onSuccess, showToast, currentUser, editingSubmission, onCancelEdit, onNavigateToProfile }) => {
  // Form tracks only work-related data
  const [form, setForm] = useState({
    workType: "",
    branchId: "",
  });
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkInput, setLinkInput] = useState({ url: '', name: '' });
  const [isDragging, setIsDragging] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Data
  useEffect(() => {
    if (editingSubmission) {
        setForm({
            workType: editingSubmission.workType,
            branchId: String(editingSubmission.branchId),
        });
        
        try {
            if (editingSubmission.fileUrl && editingSubmission.fileUrl.startsWith('[')) {
                 setAttachments(JSON.parse(editingSubmission.fileUrl));
            } else if (editingSubmission.fileUrl) {
                 setAttachments([{ type: 'file', value: editingSubmission.fileUrl, name: 'ไฟล์แนบเดิม', size: 0 }]);
            }
        } catch(e) { setAttachments([]); }

    } else {
        setForm({ workType: "", branchId: "" });
        setAttachments([]);
    }
  }, [editingSubmission]);

  // Check valid profile (Reactive to currentUser changes)
  const isProfileComplete = useMemo(() => {
      return currentUser && 
             currentUser.firstName && 
             currentUser.lastName && 
             currentUser.position && 
             currentUser.organization &&
             currentUser.phone && 
             currentUser.phone.length >= 9;
  }, [currentUser]);

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

  const handleFile = (file: File) => {
      // Validate Max Files (e.g. 5)
      if (attachments.length >= 5) {
          showToast({ type: "error", title: "ครบจำนวนแล้ว", message: "อนุญาตให้อัปโหลดได้สูงสุด 5 ไฟล์" });
          return;
      }
      
      // Validate Duplicate
      if (attachments.some(att => att.name === file.name)) {
          showToast({ type: "error", title: "ไฟล์ซ้ำ", message: "มีไฟล์นี้อยู่ในรายการแล้ว" });
          return;
      }
      
      // Validate Size (10MB)
      if (file.size > 10 * 1024 * 1024) {
          showToast({ type: "error", title: "ไฟล์ใหญ่เกินไป", message: `ขนาดไฟล์ ${file.name} เกิน 10MB` });
          return;
      }

      // Validate Type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
          showToast({ type: "error", title: "นามสกุลไม่ถูกต้อง", message: "รองรับเฉพาะ PDF, JPG, PNG เท่านั้น" });
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          setAttachments(prev => [...prev, { 
              type: 'file', 
              value: reader.result as string, 
              name: file.name,
              size: file.size
          }]);
          showToast({ type: "success", title: "อัปโหลดสำเร็จ", message: file.name });
      };
      reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach(file => handleFile(file));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
          Array.from(files).forEach(file => handleFile(file));
      }
  };

  const handleAddLink = () => {
      if (!linkInput.url || !linkInput.url.startsWith('http')) {
          showToast({ type: "error", title: "ลิงก์ไม่ถูกต้อง", message: "ต้องขึ้นต้นด้วย http:// หรือ https://" });
          return;
      }
      setAttachments(prev => [...prev, { type: 'link', value: linkInput.url, name: linkInput.name || linkInput.url, size: 0 }]);
      setLinkInput({ url: '', name: '' });
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
      if (!bytes) return '';
      if (bytes === 0) return '';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `(${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]})`;
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.workType) e.workType = "กรุณาเลือกประเภทผลงาน";
    if (!form.branchId) e.branchId = "กรุณาเลือกสาขา";
    
    if (!isProfileComplete) {
        showToast({ type: 'error', title: 'ข้อมูลส่วนตัวไม่ครบ', message: 'กรุณาอัปเดตข้อมูลในหน้าโปรไฟล์ก่อนส่งผลงาน' });
        return false;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (mode: 'draft' | 'submit') => {
    if (mode === 'submit' && !validateForm()) {
        showToast({ type: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        return;
    }

    const confirmText = mode === 'submit' 
        ? (editingSubmission ? 'ยืนยันการแก้ไขและส่งผลงาน?' : 'ยืนยันการส่งผลงาน?') 
        : 'บันทึกแบบร่างไว้ทำต่อภายหลัง?';

    const result = await Swal.fire({
        title: confirmText,
        text: mode === 'submit' ? 'กรุณาตรวจสอบความถูกต้องของข้อมูล' : '',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: mode === 'submit' ? '#0f172a' : '#64748b',
        confirmButtonText: mode === 'submit' ? 'ยืนยันส่งผลงาน' : 'บันทึกร่าง',
        cancelButtonText: 'ยกเลิก',
        customClass: { popup: 'rounded-3xl' }
    });

    if (!result.isConfirmed) return;

    setSaving(true);
    try {
      const filePayload = attachments.length > 0 ? JSON.stringify(attachments) : "";
      const nextStatus: SubmissionStatus = mode === 'submit' ? 'submitted' : 'draft';
      
      const payload = {
        userId: currentUser.id,
        budgetYear: BUDGET_YEAR,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        position: currentUser.position || "",
        organization: currentUser.organization || "",
        email: currentUser.email,
        phone: currentUser.phone || "",
        workType: form.workType,
        branchId: Number(form.branchId),
        fileUrl: filePayload, 
        status: nextStatus,
      };

      if (editingSubmission) {
           let action = mode === 'submit' ? 'UPDATE_SUBMIT' : 'UPDATE_DRAFT';
           let note = mode === 'submit' ? 'แก้ไขและส่งผลงาน' : 'แก้ไขฉบับร่าง';
           if (editingSubmission.status === 'reviewed' && mode === 'submit') {
                action = 'USER_FIXED';
                note = 'แก้ไขงานตามข้อเสนอแนะ';
                payload.status = 'submitted';
           }
           const newAudit = [...(editingSubmission.audit || []), { at: nowISO(), action, note }];
           await apiUpdateSubmission(settings, editingSubmission.id, { ...payload, audit: newAudit });
      } else {
           const newPayload: Submission = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                ...payload,
                createdAt: nowISO(),
                updatedAt: nowISO(),
                audit: [{ at: nowISO(), action: mode === 'submit' ? 'SUBMIT' : 'SAVE_DRAFT', note: mode === 'submit' ? 'ส่งผลงานครั้งแรก' : 'บันทึกฉบับร่าง' }]
           };
           await apiCreateSubmission(settings, newPayload);
      }

      if (mode === 'submit') {
          await Swal.fire({ title: 'สำเร็จ!', text: 'ส่งผลงานเรียบร้อยแล้ว', icon: 'success', confirmButtonColor: '#0ea5e9', customClass: { popup: 'rounded-3xl' } });
      } else {
          showToast({ type: "success", title: "บันทึกร่างสำเร็จ", message: "ระบบบันทึกความคืบหน้าแล้ว" });
      }
      
      if (!editingSubmission) {
        setForm({ workType: "", branchId: "" });
        setAttachments([]);
        setLinkInput({ url: '', name: '' });
      }
      onSuccess();
    } catch (e: any) {
      showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 fade-in">
        
        {/* Header Title */}
        <div className="mb-6 flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <i className="fa-solid fa-file-signature text-sky-500"></i>
                    {editingSubmission ? 'แก้ไขผลงาน' : `ลงทะเบียนส่งผลงาน ปี ${BUDGET_YEAR}`}
                </h1>
                <p className="text-slate-500 text-sm mt-1">กรอกข้อมูลผลงานและแนบไฟล์เอกสารเพื่อเข้าร่วมการประกวด</p>
            </div>
            {editingSubmission && (
                <button onClick={onCancelEdit} className="text-sm font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition">
                    <i className="fa-solid fa-xmark mr-1"></i> ยกเลิกการแก้ไข
                </button>
            )}
        </div>

        {/* --- SENDER PROFILE CARD (Enhanced) --- */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 mb-6 flex flex-col md:flex-row items-center gap-5 relative overflow-hidden group">
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 dark:bg-sky-900/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            
            <div className="shrink-0 relative">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-600 shadow-md flex items-center justify-center overflow-hidden">
                    {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl font-bold text-slate-400">{currentUser.firstName.charAt(0)}</span>
                    )}
                </div>
                <div className={`absolute -bottom-1 -right-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white flex items-center gap-1 ${isProfileComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                    {isProfileComplete ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-exclamation"></i>}
                    ผู้ส่ง
                </div>
            </div>

            <div className="flex-1 text-center md:text-left min-w-0 z-10 w-full">
                <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">
                        {currentUser.firstName} {currentUser.lastName}
                    </h3>
                    {!isProfileComplete ? (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 animate-pulse">
                            ⚠ ข้อมูลไม่ครบ
                        </span>
                    ) : (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                            ✓ ข้อมูลครบถ้วน
                        </span>
                    )}
                </div>
                
                <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-1">
                    <span className={!currentUser.position ? 'text-rose-500 font-bold' : ''}>
                        <i className="fa-solid fa-briefcase mr-1.5 opacity-70"></i>
                        {currentUser.position || 'ระบุตำแหน่ง'}
                    </span>
                    <span className="hidden md:inline text-slate-300">|</span>
                    <span className={!currentUser.organization ? 'text-rose-500 font-bold' : ''}>
                        <i className="fa-solid fa-building mr-1.5 opacity-70"></i>
                        {currentUser.organization || 'ระบุหน่วยงาน'}
                    </span>
                </div>
                
                <div className="text-xs text-slate-400 mt-2 flex flex-wrap justify-center md:justify-start gap-x-4">
                    <span><i className="fa-solid fa-envelope mr-1"></i> {currentUser.email}</span>
                    <span className={!currentUser.phone ? 'text-rose-500 font-bold' : ''}>
                        <i className="fa-solid fa-phone mr-1"></i> 
                        {currentUser.phone || 'ระบุเบอร์โทร'}
                    </span>
                </div>
            </div>

            <div className="shrink-0 z-10 w-full md:w-auto">
                <button 
                    onClick={onNavigateToProfile}
                    className={`w-full md:w-auto px-4 py-2 rounded-xl border text-xs font-bold transition shadow-sm flex items-center justify-center gap-2
                        ${!isProfileComplete 
                            ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600 animate-bounce' 
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-600'}
                    `}
                >
                    <i className="fa-solid fa-user-pen"></i> 
                    {!isProfileComplete ? 'ไปหน้าโปรไฟล์เพื่อแก้ไข' : 'แก้ไขข้อมูลส่วนตัว'}
                </button>
            </div>
        </div>

        {/* --- VALIDATION WARNING BANNER --- */}
        {!isProfileComplete && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-pulse">
                <div className="text-amber-600 mt-0.5"><i className="fa-solid fa-triangle-exclamation text-lg"></i></div>
                <div>
                    <h4 className="text-sm font-bold text-amber-800">กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อนส่งผลงาน</h4>
                    <p className="text-xs text-amber-700 mt-1">
                        ระบบจำเป็นต้องใช้ข้อมูล <b>เบอร์โทรศัพท์, ตำแหน่ง และหน่วยงาน</b> เพื่อใช้ในการติดต่อประสานงาน 
                        ท่านสามารถกดปุ่ม "ไปหน้าโปรไฟล์เพื่อแก้ไข" ด้านบน
                    </p>
                </div>
            </div>
        )}

        {/* Form Content (Disabled visual if profile incomplete) */}
        <div className={`space-y-6 transition-opacity duration-300 ${!isProfileComplete ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            
            {/* --- SECTION 1: WORK INFO (Unchanged) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-sky-500 text-white text-xs">1</span>
                        ข้อมูลผลงาน
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* Work Type Grid */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ประเภทผลงาน <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mb-3">เลือกรูปแบบผลงานที่ท่านต้องการนำเสนอ (เลือกได้ 1 ประเภท)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {WORK_TYPES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => onChangeField("workType", t.id)}
                                    className={`relative p-4 rounded-xl border text-left transition-all hover:shadow-md flex items-start gap-4 group
                                        ${form.workType === t.id 
                                            ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500 z-10' 
                                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-sky-300'}
                                    `}
                                >
                                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                        ${form.workType === t.id ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-transparent'}
                                    `}>
                                        <div className={`h-2 w-2 rounded-full bg-white transition-transform ${form.workType === t.id ? 'scale-100' : 'scale-0'}`}></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-600 ${form.workType === t.id ? 'text-sky-600' : 'text-slate-500'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                                </svg>
                                            </div>
                                            <span className={`font-bold text-sm ${form.workType === t.id ? 'text-sky-800' : 'text-slate-800 dark:text-white'}`}>
                                                {t.label}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                                            {t.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {errors.workType && <p className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-circle-exclamation"></i> {errors.workType}</p>}
                    </div>

                    {/* Branch Select */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            สาขาการประกวด <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mb-2">เลือกสาขาที่ตรงกับเนื้อหาผลงานของท่านมากที่สุด</p>
                        <BranchSelector 
                            value={form.branchId}
                            onChange={(val) => onChangeField("branchId", val)}
                            error={errors.branchId}
                        />
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: ATTACHMENTS (UPDATED) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500 text-white text-xs">2</span>
                        ไฟล์แนบผลงาน
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                            อัปโหลดเอกสาร
                        </label>
                        <span className="text-xs text-slate-400">อนุญาตสูงสุด 5 ไฟล์ (รวมไม่เกิน 10MB)</span>
                    </div>

                    {/* 1. Dropzone Area */}
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group
                            ${isDragging 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' 
                                : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-indigo-400'}
                        `}
                    >
                        <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110
                            ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-indigo-500'}
                        `}>
                            <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                        </div>
                        <div className="font-bold text-slate-700 dark:text-white text-sm mb-1">
                            คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่
                        </div>
                        <div className="text-xs text-slate-400">
                            รองรับไฟล์ PDF, JPG, PNG (ขนาดไม่เกิน 10MB ต่อไฟล์)
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="application/pdf,image/png,image/jpeg" 
                            className="hidden" 
                            multiple 
                        />
                    </div>

                    {/* 2. Attachment List */}
                    {attachments.length > 0 && (
                        <div className="mt-4 space-y-2 animate-fade-in">
                            {attachments.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 group">
                                    {/* Icon based on type */}
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0 
                                        ${item.type === 'link' 
                                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' 
                                            : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'
                                        }`}
                                    >
                                        <i className={`fa-solid ${item.type === 'link' ? 'fa-link' : 'fa-file-lines'}`}></i>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="uppercase bg-slate-200 dark:bg-slate-600 px-1.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                {item.type}
                                            </span>
                                            {item.type === 'file' && item.size ? <span>{formatFileSize(item.size)}</span> : null}
                                            {item.type === 'link' && <span className="truncate max-w-[200px] text-indigo-500">{item.value}</span>}
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => removeAttachment(idx)} 
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition flex items-center justify-center"
                                        title="ลบรายการ"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. Link Input (Separate Section) */}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                แนบลิงก์ผลงาน (ถ้ามี)
                            </label>
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                                <i className="fa-solid fa-lightbulb mr-1"></i> อย่าลืมเปิดสิทธิ์ Public
                            </span>
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <i className="fa-solid fa-link absolute left-4 top-3 text-slate-400"></i>
                                <input 
                                    value={linkInput.url}
                                    onChange={e => setLinkInput({...linkInput, url: e.target.value})}
                                    placeholder="วาง URL ที่นี่ (เช่น Google Drive, Canva, YouTube)"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div className="w-1/3">
                                <input 
                                    value={linkInput.name}
                                    onChange={e => setLinkInput({...linkInput, name: e.target.value})}
                                    placeholder="ชื่อเรียก (ระบุ)"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <button 
                                onClick={handleAddLink} 
                                className="px-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-sm shrink-0"
                            >
                                <i className="fa-solid fa-plus"></i> เพิ่ม
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 ml-1">
                            * กรณีไฟล์มีขนาดใหญ่กว่า 10MB แนะนำให้อัปโหลดขึ้น Cloud (Google Drive/OneDrive) แล้วนำลิงก์มาวางที่นี่
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: ACTIONS & INFO (UPDATED) --- */}
            <div className="space-y-4">
                {/* Info Banner */}
                <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-2xl p-4 flex items-start gap-3">
                    <div className="bg-sky-100 dark:bg-sky-800 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-circle-info text-sky-600 dark:text-sky-400"></i>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-sky-800 dark:text-sky-300">ตรวจสอบความถูกต้องก่อนยืนยัน</h4>
                        <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 leading-relaxed">
                            กรุณาตรวจสอบข้อมูลและไฟล์แนบให้ครบถ้วน หากยังไม่พร้อมส่ง สามารถกด "บันทึกร่าง" เพื่อกลับมาดำเนินการต่อภายหลังได้
                        </p>
                    </div>
                </div>

                {/* Buttons Area */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-4">
                        
                        {/* Draft Button */}
                        <div className="w-full md:w-auto flex flex-col items-center">
                            <button 
                                onClick={() => submit('draft')}
                                disabled={saving}
                                className="w-full md:w-auto px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-floppy-disk"></i> บันทึกร่าง
                            </button>
                            <span className="text-[10px] text-slate-400 mt-2">
                                * แก้ไขได้ภายหลัง (ก่อนปิดรับ)
                            </span>
                        </div>

                        {/* Submit Button */}
                        <div className="w-full md:w-auto flex flex-col items-center">
                            <button 
                                onClick={() => submit('submit')}
                                disabled={saving}
                                className="w-full md:w-auto px-8 py-3 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 min-w-[180px]"
                            >
                                {saving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                                {editingSubmission ? 'ยืนยันการแก้ไข' : 'ส่งผลงาน'}
                            </button>
                            <span className="text-[10px] text-rose-500 mt-2 font-medium">
                                * ส่งแล้วไม่สามารถแก้ไขข้อมูลได้
                            </span>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Registration;
