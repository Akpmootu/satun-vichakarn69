
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES, HEALTH_POSITIONS, JOB_LEVELS } from '../constants';
import { AppSettings, Submission, UserProfile, SubmissionStatus, CoAuthor } from '../types';
import { apiCreateSubmission, apiUpdateSubmission, nowISO } from '../services/apiService';
import Badge from './ui/Badge';
import OrgAutocomplete from './ui/OrgAutocomplete';

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

// --- Helper: Convert Arabic to Thai Numerals ---
const toThaiNum = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null) return "";
    return num.toString().replace(/\d/g, (d) => "๐๑๒๓๔๕๖๗๘๙"[parseInt(d)]);
};

// --- Helper: Convert Date to Thai Official Format (เลขไทย) ---
const toThaiDate = (date: Date = new Date()) => {
    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    
    return `${toThaiNum(day)} ${month} ${toThaiNum(year)}`;
};

// --- Branch Group Data for Combobox ---
const BRANCH_GROUPS = [
    { label: "การแพทย์และสหวิชาชีพ", ids: [1, 2, 3, 4, 10, 11, 12] },
    { label: "การพยาบาล", ids: [5, 6, 7, 8, 9] },
    { label: "การส่งเสริมสุขภาพและป้องกันโรค", ids: [13, 14, 15, 16, 17] },
    { label: "บริหารและยุทธศาสตร์", ids: [18, 19, 20] }
];

// --- Sub-Component: Branch Selector ---
const BranchSelector: React.FC<{ 
    value: string; 
    onChange: (val: string) => void; 
    error?: string;
}> = ({ value, onChange, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedBranch = BRANCHES.find(b => b.id === Number(value));
    const displayValue = selectedBranch ? `${String(selectedBranch.id).padStart(2, '0')} – ${selectedBranch.label}` : "-- กรุณาเลือกสาขา --";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) setSearch("");
    }, [isOpen]);

    return (
        <div className={`relative ${isOpen ? 'z-[100]' : 'z-0'}`} ref={dropdownRef}>
            <div className="relative">
                <i className="fa-solid fa-sitemap absolute left-4 top-3.5 text-slate-400 z-10"></i>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full text-left pl-10 pr-4 py-3 rounded-xl border flex justify-between items-center bg-white dark:bg-slate-900 transition outline-none focus:ring-2
                        ${error 
                            ? 'border-rose-300 focus:ring-rose-200 text-rose-600' 
                            : 'border-slate-200 dark:border-slate-600 focus:ring-sky-200 text-slate-700 dark:text-white'}
                    `}
                >
                    <span className={!value ? 'text-slate-400' : 'font-bold'}>{displayValue}</span>
                    <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 animate-fade-in origin-top">
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
                    </div>
                </div>
            )}
            {error && <p className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-circle-exclamation mr-1"></i> {error}</p>}
        </div>
    );
};

const Registration: React.FC<RegistrationProps> = ({ settings, onSuccess, showToast, currentUser, editingSubmission, onCancelEdit, onNavigateToProfile }) => {
  // --- Form State ---
  const [form, setForm] = useState({
    workType: "",
    branchId: "",
    title: "", // ชื่อเรื่อง (New)
    bookNo: "", // เลขที่หนังสือ (New)
    bossName: "", // ผอ./หัวหน้า (New)
    bossPosition: "ผู้อำนวยการโรงพยาบาล/สาธารณสุขอำเภอ", // (New)
  });
  
  const [coAuthors, setCoAuthors] = useState<CoAuthor[]>([]);
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
            title: editingSubmission.fileName || "",
            bookNo: "", // Not stored yet, could be added to DB if needed
            bossName: "",
            bossPosition: "ผู้อำนวยการโรงพยาบาล/สาธารณสุขอำเภอ"
        });
        
        // Co-Authors
        setCoAuthors(editingSubmission.coAuthors || []);

        try {
            if (editingSubmission.fileUrl && editingSubmission.fileUrl.startsWith('[')) {
                 setAttachments(JSON.parse(editingSubmission.fileUrl));
            } else if (editingSubmission.fileUrl) {
                 setAttachments([{ type: 'file', value: editingSubmission.fileUrl, name: 'ไฟล์แนบเดิม', size: 0 }]);
            }
        } catch(e) { setAttachments([]); }

    } else {
        setForm({ 
            workType: "", 
            branchId: "", 
            title: "", 
            bookNo: "",
            bossName: "",
            bossPosition: "ผู้อำนวยการโรงพยาบาล/สาธารณสุขอำเภอ"
        });
        setCoAuthors([]);
        setAttachments([]);
    }
  }, [editingSubmission]);

  const isProfileComplete = useMemo(() => {
      return currentUser && currentUser.firstName && currentUser.lastName && currentUser.position && currentUser.organization && currentUser.phone;
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

  // Co-Author Logic
  const addCoAuthor = () => {
      setCoAuthors([...coAuthors, { id: Math.random().toString(36).substr(2, 9), firstName: '', lastName: '', position: '', level: '', organization: '', phone: '', email: '' }]);
  };
  const removeCoAuthor = (id: string) => {
      setCoAuthors(coAuthors.filter(c => c.id !== id));
  };
  const updateCoAuthor = (id: string, field: keyof CoAuthor, value: string) => {
      setCoAuthors(coAuthors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // --- Handlers (File, DragDrop, Links) ---
  const handleFile = (file: File) => {
      if (attachments.length >= 5) { showToast({ type: "error", title: "ครบจำนวนแล้ว", message: "อนุญาตให้อัปโหลดได้สูงสุด 5 ไฟล์" }); return; }
      if (attachments.some(att => att.name === file.name)) { showToast({ type: "error", title: "ไฟล์ซ้ำ", message: "มีไฟล์นี้อยู่ในรายการแล้ว" }); return; }
      if (file.size > 10 * 1024 * 1024) { showToast({ type: "error", title: "ไฟล์ใหญ่เกินไป", message: `ขนาดไฟล์ ${file.name} เกิน 10MB` }); return; }
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) { showToast({ type: "error", title: "นามสกุลไม่ถูกต้อง", message: "รองรับเฉพาะ PDF, JPG, PNG เท่านั้น" }); return; }

      const reader = new FileReader();
      reader.onloadend = () => {
          setAttachments(prev => [...prev, { type: 'file', value: reader.result as string, name: file.name, size: file.size }]);
          showToast({ type: "success", title: "อัปโหลดสำเร็จ", message: file.name });
      };
      reader.readAsDataURL(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (files) Array.from(files).forEach(file => handleFile(file as File)); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const files = e.dataTransfer.files; if (files) Array.from(files).forEach(file => handleFile(file as File)); };
  const handleAddLink = () => { if (!linkInput.url.startsWith('http')) { showToast({ type: "error", title: "ลิงก์ไม่ถูกต้อง", message: "ต้องขึ้นต้นด้วย http:// หรือ https://" }); return; } setAttachments(prev => [...prev, { type: 'link', value: linkInput.url, name: linkInput.name || linkInput.url, size: 0 }]); setLinkInput({ url: '', name: '' }); };
  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };
  const formatFileSize = (bytes?: number) => { if (!bytes) return ''; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `(${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]})`; };

  // --- Validate & Submit ---
  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.workType) e.workType = "กรุณาเลือกประเภทผลงาน";
    if (!form.branchId) e.branchId = "กรุณาเลือกสาขา";
    if (!form.title) e.title = "กรุณาระบุชื่อเรื่องผลงาน";
    if (!isProfileComplete) { showToast({ type: 'error', title: 'ข้อมูลส่วนตัวไม่ครบ', message: 'กรุณาอัปเดตข้อมูลในหน้าโปรไฟล์ก่อนส่งผลงาน' }); return false; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (mode: 'draft' | 'submit') => {
    if (mode === 'submit' && !validateForm()) { showToast({ type: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณากรอกข้อมูลให้ครบถ้วน" }); return; }
    
    const confirmText = mode === 'submit' ? (editingSubmission ? 'ยืนยันการแก้ไขและส่งผลงาน?' : 'ยืนยันการส่งผลงาน?') : 'บันทึกแบบร่างไว้ทำต่อภายหลัง?';
    const result = await Swal.fire({ title: confirmText, text: mode === 'submit' ? 'กรุณาตรวจสอบความถูกต้องของข้อมูล' : '', icon: 'question', showCancelButton: true, confirmButtonColor: mode === 'submit' ? '#0f172a' : '#64748b', confirmButtonText: mode === 'submit' ? 'ยืนยันส่งผลงาน' : 'บันทึกร่าง', cancelButtonText: 'ยกเลิก', customClass: { popup: 'rounded-3xl' } });
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
        fileName: form.title, 
        fileUrl: filePayload, 
        status: nextStatus,
        coAuthors: coAuthors // Pass JSON array
      };

      if (editingSubmission) {
           let action = mode === 'submit' ? 'UPDATE_SUBMIT' : 'UPDATE_DRAFT';
           let note = mode === 'submit' ? 'แก้ไขและส่งผลงาน' : 'แก้ไขฉบับร่าง';
           if (editingSubmission.status === 'reviewed' && mode === 'submit') { action = 'USER_FIXED'; note = 'แก้ไขงานตามข้อเสนอแนะ'; payload.status = 'submitted'; }
           const newAudit = [...(editingSubmission.audit || []), { at: nowISO(), action, note }];
           await apiUpdateSubmission(settings, editingSubmission.id, { ...payload, audit: newAudit });
      } else {
           const newPayload: Submission = { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), ...payload, createdAt: nowISO(), updatedAt: nowISO(), audit: [{ at: nowISO(), action: mode === 'submit' ? 'SUBMIT' : 'SAVE_DRAFT', note: mode === 'submit' ? 'ส่งผลงานครั้งแรก' : 'บันทึกฉบับร่าง' }] };
           await apiCreateSubmission(settings, newPayload);
      }

      if (mode === 'submit') { await Swal.fire({ title: 'สำเร็จ!', text: 'ส่งผลงานเรียบร้อยแล้ว', icon: 'success', confirmButtonColor: '#0ea5e9', customClass: { popup: 'rounded-3xl' } }); } else { showToast({ type: "success", title: "บันทึกร่างสำเร็จ", message: "ระบบบันทึกความคืบหน้าแล้ว" }); }
      if (!editingSubmission) { 
          setForm({ workType: "", branchId: "", title: "", bookNo: "", bossName: "", bossPosition: "ผู้อำนวยการโรงพยาบาล/สาธารณสุขอำเภอ" }); 
          setCoAuthors([]);
          setAttachments([]); 
          setLinkInput({ url: '', name: '' }); 
      }
      onSuccess();
    } catch (e: any) { showToast({ type: 'error', title: 'ผิดพลาด', message: e.message }); } finally { setSaving(false); }
  };

  const handlePrint = () => {
      if (!form.title) {
          showToast({ type: 'error', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อเรื่องผลงานก่อนพิมพ์เอกสาร' });
          return;
      }
      window.print();
  };

  // Helper for Print Fill
  const Fill = ({ t, w }: { t: any, w?: string }) => (
    <span className="print-fill" style={{ minWidth: w }}>
        {t || "\u00A0"}
    </span>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12 fade-in">
        
        {/* --- PRINTABLE SECTION (HIDDEN ON SCREEN) --- */}
        <div className="hidden print:block bg-white print-container">
            {/* ... (Printable content remains unchanged) ... */}
        </div>
        {/* --- END PRINTABLE SECTION --- */}

        {/* Screen Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <i className="fa-solid fa-file-signature text-sky-500"></i>
                    {editingSubmission ? 'แก้ไขผลงาน' : `ลงทะเบียนส่งผลงาน ปี ${BUDGET_YEAR}`}
                </h1>
                <p className="text-slate-500 text-sm mt-1">กรอกข้อมูลผลงานและแนบไฟล์เอกสารเพื่อเข้าร่วมการประกวด</p>
            </div>
            <div className="flex gap-2">
                {editingSubmission && (
                    <button onClick={onCancelEdit} className="text-sm font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition">
                        <i className="fa-solid fa-xmark mr-1"></i> ยกเลิก
                    </button>
                )}
                {/* Print Button */}
                <button onClick={handlePrint} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-100 transition border border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center gap-2">
                    <i className="fa-solid fa-print"></i> พิมพ์เอกสารนำส่ง
                </button>
            </div>
        </div>

        {/* --- SENDER PROFILE CARD --- */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 mb-6 flex flex-col md:flex-row items-center gap-5 relative overflow-hidden group print:hidden">
            {/* ... (Profile card content remains the same) ... */}
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
                        <i className="fa-solid fa-briefcase mr-1.5 opacity-70"></i>{currentUser.position || 'ระบุตำแหน่ง'}
                    </span>
                    <span className="hidden md:inline text-slate-300">|</span>
                    <span className={!currentUser.organization ? 'text-rose-500 font-bold' : ''}>
                        <i className="fa-solid fa-building mr-1.5 opacity-70"></i>{currentUser.organization || 'ระบุหน่วยงาน'}
                    </span>
                </div>
                <div className="text-xs text-slate-400 mt-2 flex flex-wrap justify-center md:justify-start gap-x-4">
                    <span><i className="fa-solid fa-envelope mr-1"></i> {currentUser.email}</span>
                    <span className={!currentUser.phone ? 'text-rose-500 font-bold' : ''}>
                        <i className="fa-solid fa-phone mr-1"></i>{currentUser.phone || 'ระบุเบอร์โทร'}
                    </span>
                </div>
            </div>
            <div className="shrink-0 z-10 w-full md:w-auto">
                <button onClick={onNavigateToProfile} className={`w-full md:w-auto px-4 py-2 rounded-xl border text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 ${!isProfileComplete ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600 animate-bounce' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-600'}`}>
                    <i className="fa-solid fa-user-pen"></i> {!isProfileComplete ? 'ไปหน้าโปรไฟล์เพื่อแก้ไข' : 'แก้ไขข้อมูลส่วนตัว'}
                </button>
            </div>
        </div>

        {/* --- VALIDATION WARNING BANNER --- */}
        {!isProfileComplete && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-pulse print:hidden">
                <div className="text-amber-600 mt-0.5"><i className="fa-solid fa-triangle-exclamation text-lg"></i></div>
                <div>
                    <h4 className="text-sm font-bold text-amber-800">กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วนก่อนส่งผลงาน</h4>
                    <p className="text-xs text-amber-700 mt-1">ระบบจำเป็นต้องใช้ข้อมูล <b>เบอร์โทรศัพท์, ตำแหน่ง และหน่วยงาน</b> เพื่อใช้ในการติดต่อประสานงาน และออกเอกสารราชการ</p>
                </div>
            </div>
        )}

        {/* Form Content */}
        <div className={`space-y-6 transition-opacity duration-300 print:hidden ${!isProfileComplete ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            
            {/* --- SECTION 1: WORK INFO (Contains Branch Dropdown - Z-30) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 relative z-30">
                {/* Watermark Container */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <i className="fa-solid fa-briefcase absolute -bottom-4 -right-4 text-9xl text-slate-100 dark:text-slate-700/50 opacity-50 transform -rotate-12 z-0"></i>
                </div>
                
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl relative z-10">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-sky-500 text-white text-xs">1</span>
                        <i className="fa-solid fa-briefcase text-sky-500"></i>
                        ข้อมูลผลงาน (Work Information)
                    </h3>
                </div>
                <div className="p-6 space-y-6 relative z-10">
                    {/* New Field: Work Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ชื่อเรื่องผลงาน <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <i className="fa-solid fa-heading absolute left-4 top-3.5 text-slate-400"></i>
                            <input 
                                value={form.title}
                                onChange={e => onChangeField("title", e.target.value)}
                                placeholder="ระบุชื่อเรื่องเต็มของผลงาน..."
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-900 outline-none focus:ring-2 dark:text-white ${errors.title ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-600 focus:ring-sky-200'}`}
                            />
                        </div>
                        {errors.title && <p className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-circle-exclamation"></i> {errors.title}</p>}
                    </div>

                    {/* Work Type Grid (Color Coded & Watermark) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            ประเภทผลงาน <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                            {WORK_TYPES.map(t => {
                                const isSelected = form.workType === t.id;
                                
                                // Color Theme Config based on ID
                                const styles: any = {
                                    oral: {
                                        selected: 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 shadow-sky-100 dark:shadow-none',
                                        hover: 'hover:border-sky-300 dark:hover:border-sky-700',
                                        iconSelected: 'bg-sky-500 text-white',
                                        iconHover: 'group-hover:bg-sky-100 group-hover:text-sky-500',
                                        textSelected: 'text-sky-700 dark:text-sky-300',
                                        watermark: 'text-sky-500'
                                    },
                                    eposter: {
                                        selected: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-indigo-100 dark:shadow-none',
                                        hover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
                                        iconSelected: 'bg-indigo-500 text-white',
                                        iconHover: 'group-hover:bg-indigo-100 group-hover:text-indigo-500',
                                        textSelected: 'text-indigo-700 dark:text-indigo-300',
                                        watermark: 'text-indigo-500'
                                    },
                                    innovation: {
                                        selected: 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 shadow-amber-100 dark:shadow-none',
                                        hover: 'hover:border-amber-300 dark:hover:border-amber-700',
                                        iconSelected: 'bg-amber-500 text-white',
                                        iconHover: 'group-hover:bg-amber-100 group-hover:text-amber-500',
                                        textSelected: 'text-amber-700 dark:text-amber-300',
                                        watermark: 'text-amber-500'
                                    }
                                };

                                const s = styles[t.id] || styles.oral; // Fallback to oral style

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onChangeField("workType", t.id)}
                                        type="button" 
                                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-lg flex flex-col gap-3 group outline-none overflow-hidden h-full min-h-[160px]
                                            ${isSelected 
                                                ? s.selected 
                                                : `bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 ${s.hover}`
                                            }
                                        `}
                                    >
                                        {/* Background Watermark Icon */}
                                        <div className={`absolute -right-6 -bottom-6 transition-all duration-500 z-0 pointer-events-none
                                            ${isSelected 
                                                ? `opacity-20 ${s.watermark} rotate-0 scale-110` 
                                                : 'opacity-5 text-slate-400 -rotate-12 scale-100 group-hover:opacity-10 group-hover:scale-110 group-hover:rotate-0'
                                            }
                                        `}>
                                            <i className={`${t.icon} text-[8rem]`}></i>
                                        </div>

                                        <div className="flex items-start justify-between w-full relative z-10">
                                            {/* Icon Box */}
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl transition-colors shadow-sm
                                                ${isSelected 
                                                    ? s.iconSelected 
                                                    : `bg-slate-100 dark:bg-slate-700 text-slate-400 ${s.iconHover}`
                                                }
                                            `}>
                                                <i className={t.icon}></i>
                                            </div>
                                            
                                            {/* Selection Indicator */}
                                            {isSelected ? (
                                                <div className={`h-6 w-6 rounded-full ${s.iconSelected} flex items-center justify-center text-xs animate-bounce-in shadow-sm`}>
                                                    <i className="fa-solid fa-check"></i>
                                                </div>
                                            ) : (
                                                <div className="h-6 w-6 rounded-full border-2 border-slate-200 dark:border-slate-600 group-hover:border-slate-300 transition-colors"></div>
                                            )}
                                        </div>

                                        <div className="relative z-10 mt-2">
                                            <h4 className={`font-bold text-lg mb-1 ${isSelected ? s.textSelected : 'text-slate-800 dark:text-white'}`}>
                                                {t.label}
                                            </h4>
                                            <p className={`text-sm leading-relaxed font-medium ${isSelected ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {t.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.workType && <p className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-circle-exclamation"></i> {errors.workType}</p>}
                    </div>

                    {/* Branch Select */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            สาขาการประกวด <span className="text-rose-500">*</span>
                        </label>
                        <BranchSelector value={form.branchId} onChange={(val) => onChangeField("branchId", val)} error={errors.branchId} />
                    </div>
                </div>
            </div>

            {/* --- SECTION 1.5: OFFICIAL DOC INFO (New Section - Z-20) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 relative z-20">
                {/* Watermark Container */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <i className="fa-solid fa-file-contract absolute -bottom-4 -right-4 text-9xl text-slate-100 dark:text-slate-700/50 opacity-50 transform -rotate-12 z-0"></i>
                </div>

                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl relative z-10">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white text-xs">2</span>
                        <i className="fa-solid fa-file-contract text-amber-500"></i>
                        ข้อมูลสำหรับออกหนังสือราชการ (Official Doc Info)
                    </h3>
                </div>
                <div className="p-6 space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">เลขที่หนังสือส่ง (ถ้ามี)</label>
                            <div className="relative">
                                <i className="fa-solid fa-book absolute left-4 top-3 text-slate-400"></i>
                                <input 
                                    value={form.bookNo}
                                    onChange={e => onChangeField("bookNo", e.target.value)}
                                    placeholder="เช่น สต 0032/..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">ชื่อผู้บังคับบัญชา (ผอ./สสอ.)</label>
                            <div className="relative">
                                <i className="fa-solid fa-user-tie absolute left-4 top-3 text-slate-400"></i>
                                <input 
                                    value={form.bossName}
                                    onChange={e => onChangeField("bossName", e.target.value)}
                                    placeholder="ระบุชื่อผู้เซ็นรับรอง..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">ตำแหน่งผู้บังคับบัญชา</label>
                            <div className="relative">
                                <i className="fa-solid fa-sitemap absolute left-4 top-3 text-slate-400 z-10"></i>
                                <select 
                                    value={form.bossPosition}
                                    onChange={e => onChangeField("bossPosition", e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-200 dark:text-white appearance-none cursor-pointer"
                                >
                                    <option>ผู้อำนวยการโรงพยาบาล</option>
                                    <option>สาธารณสุขอำเภอ</option>
                                    <option>หัวหน้ากลุ่มงาน</option>
                                    <option>รักษาการในตำแหน่ง...</option>
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-4 top-3.5 text-xs text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>
                    </div>

                    {/* Co-Authors Dynamic List */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <i className="fa-solid fa-users text-slate-400"></i>
                                ผู้ร่วมส่งผลงาน (Co-Authors) <span className="text-xs text-slate-400 font-normal">(ถ้ามี)</span>
                            </label>
                            <button onClick={addCoAuthor} className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition flex items-center gap-1">
                                <i className="fa-solid fa-plus"></i> เพิ่มรายชื่อ
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {coAuthors.map((ca, index) => (
                                <div key={ca.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 relative group">
                                    <button onClick={() => removeCoAuthor(ca.id)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 transition">
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                    <div className="text-xs font-bold text-slate-400 mb-2">ลำดับที่ {index + 2} (ผู้ร่วมวิจัย)</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <input 
                                            value={ca.firstName} 
                                            onChange={e => updateCoAuthor(ca.id, 'firstName', e.target.value)}
                                            placeholder="ชื่อจริง" 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none"
                                        />
                                        <input 
                                            value={ca.lastName} 
                                            onChange={e => updateCoAuthor(ca.id, 'lastName', e.target.value)}
                                            placeholder="นามสกุล" 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none"
                                        />
                                        <select 
                                            value={ca.position} 
                                            onChange={e => updateCoAuthor(ca.id, 'position', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none"
                                        >
                                            <option value="">-- ตำแหน่ง --</option>
                                            {HEALTH_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <OrgAutocomplete 
                                            value={ca.organization}
                                            onChange={(val) => updateCoAuthor(ca.id, 'organization', val)}
                                            placeholder="หน่วยงาน"
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none"
                                        />
                                        <input 
                                            value={ca.phone} 
                                            onChange={e => updateCoAuthor(ca.id, 'phone', e.target.value)}
                                            placeholder="เบอร์โทร" 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none"
                                        />
                                        <input 
                                            value={ca.email} 
                                            onChange={e => updateCoAuthor(ca.id, 'email', e.target.value)}
                                            placeholder="อีเมล" 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                            {coAuthors.length === 0 && <div className="text-center text-slate-400 text-xs italic py-2">ไม่มีรายชื่อผู้ร่วม (คลิกเพิ่มรายชื่อหากต้องการ)</div>}
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl flex gap-3 items-center border border-amber-100 dark:border-amber-800">
                        <i className="fa-solid fa-print text-amber-500 text-xl pl-2"></i>
                        <div className="text-xs text-amber-800 dark:text-amber-200">
                            <b>Tips:</b> ข้อมูลในส่วนนี้จะถูกนำไปสร้างเอกสารราชการ (Cover Letter & Certification) อัตโนมัติ ท่านสามารถกดปุ่ม <b>"พิมพ์เอกสารนำส่ง"</b> ด้านบนเพื่อดูตัวอย่าง
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: ATTACHMENTS (Updated Number to 3 - Z-10) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 relative z-10">
                {/* Watermark Container */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <i className="fa-solid fa-paperclip absolute -bottom-4 -right-4 text-9xl text-slate-100 dark:text-slate-700/50 opacity-50 transform -rotate-12 z-0"></i>
                </div>

                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 relative z-10 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500 text-white text-xs">3</span>
                        <i className="fa-solid fa-paperclip text-indigo-500"></i>
                        ไฟล์แนบผลงาน (Attachments)
                    </h3>
                </div>
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">อัปโหลดเอกสาร</label>
                        <span className="text-xs text-slate-400">อนุญาตสูงสุด 5 ไฟล์ (รวมไม่เกิน 10MB)</span>
                    </div>
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-indigo-400'}`}
                    >
                        <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-indigo-500'}`}>
                            <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                        </div>
                        <div className="font-bold text-slate-700 dark:text-white text-sm mb-1">คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่</div>
                        <div className="text-xs text-slate-400">รองรับไฟล์ PDF, JPG, PNG (ขนาดไม่เกิน 10MB ต่อไฟล์)</div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/png,image/jpeg" className="hidden" multiple />
                    </div>
                    {attachments.length > 0 && (
                        <div className="mt-4 space-y-2 animate-fade-in">
                            {attachments.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 group">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${item.type === 'link' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'}`}>
                                        <i className={`fa-solid ${item.type === 'link' ? 'fa-link' : 'fa-file-lines'}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="uppercase bg-slate-200 dark:bg-slate-600 px-1.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.type}</span>
                                            {item.type === 'file' && item.size ? <span>{formatFileSize(item.size)}</span> : null}
                                            {item.type === 'link' && <span className="truncate max-w-[200px] text-indigo-500">{item.value}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => removeAttachment(idx)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition flex items-center justify-center" title="ลบรายการ">
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">แนบลิงก์ผลงาน (ถ้ามี)</label>
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200"><i className="fa-solid fa-lightbulb mr-1"></i> อย่าลืมเปิดสิทธิ์ Public</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <i className="fa-solid fa-link absolute left-4 top-3 text-slate-400"></i>
                                <input value={linkInput.url} onChange={e => setLinkInput({...linkInput, url: e.target.value})} placeholder="วาง URL ที่นี่ (เช่น Google Drive, Canva, YouTube)" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                            </div>
                            <div className="w-1/3">
                                <input value={linkInput.name} onChange={e => setLinkInput({...linkInput, name: e.target.value})} placeholder="ชื่อเรียก (ระบุ)" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                            </div>
                            <button onClick={handleAddLink} className="px-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-sm shrink-0"><i className="fa-solid fa-plus"></i> เพิ่ม</button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 ml-1">* กรณีไฟล์มีขนาดใหญ่กว่า 10MB แนะนำให้อัปโหลดขึ้น Cloud แล้วนำลิงก์มาวางที่นี่</p>
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: ACTIONS & INFO --- */}
            <div className="space-y-4">
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-4">
                        <div className="w-full md:w-auto flex flex-col items-center">
                            <button onClick={() => submit('draft')} disabled={saving} className="w-full md:w-auto px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2">
                                <i className="fa-solid fa-floppy-disk"></i> บันทึกร่าง
                            </button>
                            <span className="text-[10px] text-slate-400 mt-2">* แก้ไขได้ภายหลัง (ก่อนปิดรับ)</span>
                        </div>
                        <div className="w-full md:w-auto flex flex-col items-center">
                            <button onClick={() => submit('submit')} disabled={saving} className="w-full md:w-auto px-8 py-3 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 min-w-[180px]">
                                {saving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                                {editingSubmission ? 'ยืนยันการแก้ไข' : 'ส่งผลงาน'}
                            </button>
                            <span className="text-[10px] text-rose-500 mt-2 font-medium">* ส่งแล้วไม่สามารถแก้ไขข้อมูลได้</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Registration;
