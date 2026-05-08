
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES, HEALTH_POSITIONS, JOB_LEVELS } from '../constants';
import { AppSettings, Submission, UserProfile, SubmissionStatus, CoAuthor } from '../types';
import { apiCreateSubmission, apiUpdateSubmission, nowISO, apiCheckTitleUnique, apiSearchUsers, apiSubmitFeedback, apiUploadFile } from '../services/apiService';
import Badge from './ui/Badge';
import OrgAutocomplete from './ui/OrgAutocomplete';
import { CoAuthorSearchModal } from './CoAuthorSearchModal';
import SubmitConfirmModal from './SubmitConfirmModal';

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

// Helper for Print Fill (Moved outside to prevent re-mounting)
const Fill = ({ t, w }: { t: any, w?: string }) => (
    <span className="print-fill" style={{ minWidth: w }}>
        {t || "\u00A0"}
    </span>
);

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
                        {BRANCH_GROUPS.every(group => 
                            group.ids.every(id => {
                                const b = BRANCHES.find(br => br.id === id);
                                return !(b && (b.label.toLowerCase().includes(search.toLowerCase()) || String(b.id).includes(search)));
                            })
                        ) && (
                            <div className="p-4 text-center text-slate-400 text-xs">ไม่พบสาขาที่ค้นหา</div>
                        )}
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showCoAuthorSearch, setShowCoAuthorSearch] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{isOpen: boolean, mode: 'submit' | 'draft' | null}>({isOpen: false, mode: null});

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
  
  const handleSelectCoAuthor = (user: UserProfile) => {
      setCoAuthors([...coAuthors, {
          id: Math.random().toString(36).substr(2, 9),
          firstName: user.firstName,
          lastName: user.lastName,
          position: user.position || '',
          organization: user.organization || '',
          province: 'สตูล',
          phone: user.phone || '',
          email: user.email || '',
          lineId: '',
          photoUrl: user.avatarUrl || '',
          isVerified: user.isVerified || false,
          isSystemUser: true
      }]);
  };

  const addCoAuthorManual = () => {
      setCoAuthors([...coAuthors, { id: Math.random().toString(36).substr(2, 9), firstName: '', lastName: '', position: '', organization: '', province: 'สตูล', phone: '', email: '', lineId: '', photoUrl: '' }]);
  };
  const removeCoAuthor = (id: string) => {
      setCoAuthors(coAuthors.filter(c => c.id !== id));
  };
  const updateCoAuthor = (id: string, field: keyof CoAuthor, value: string) => {
      setCoAuthors(coAuthors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleCoAuthorPhotoChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              updateCoAuthor(id, 'photoUrl', reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
          showToast({ type: 'error', title: 'ไฟล์มีขนาดใหญ่เกินไป', message: 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 50MB' });
          return;
      }

      setIsUploading(true);
      try {
          const publicUrl = await apiUploadFile(currentUser.id, 'work_files', file);
          setAttachments(prev => [...prev, { 
              type: 'file', 
              value: publicUrl, 
              name: file.name, 
              size: file.size 
          }]);
          showToast({ type: 'success', title: 'อัปโหลดสำเร็จ', message: `ไฟล์ ${file.name} ถูกแนบแล้ว` });
          // Clear input
          e.target.value = '';
      } catch (err: any) {
          showToast({ type: 'error', title: 'อัปโหลดล้มเหลว', message: err.message });
      } finally {
          setIsUploading(false);
      }
  };

  // --- Handlers (Links) ---
  const handleAddLink = () => { if (!linkInput.url.startsWith('http')) { showToast({ type: "error", title: "ลิงก์ไม่ถูกต้อง", message: "ต้องขึ้นต้นด้วย http:// หรือ https://" }); return; } setAttachments(prev => [...prev, { type: 'link', value: linkInput.url, name: linkInput.name || linkInput.url, size: 0 }]); setLinkInput({ url: '', name: '' }); setErrors(prev => { const next = {...prev}; delete next.attachments; return next; }); };
  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };

  // --- Validate & Submit ---

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.workType) e.workType = "กรุณาเลือกประเภทผลงาน";
    if (!form.branchId) e.branchId = "กรุณาเลือกสาขา";
    if (!form.title) e.title = "กรุณาระบุชื่อเรื่องผลงาน";
    if (attachments.length === 0) e.attachments = "กรุณาแนบลิงก์ผลงาน";
    if (!isProfileComplete) { showToast({ type: 'error', title: 'ข้อมูลส่วนตัวไม่ครบ', message: 'กรุณาอัปเดตข้อมูลในหน้าโปรไฟล์ก่อนส่งผลงาน' }); return false; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (mode: 'draft' | 'submit') => {
    if (mode === 'submit' && !validateForm()) { showToast({ type: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณากรอกข้อมูลและอัปโหลดรูปลิงก์ให้ครบถ้วน" }); return; }
    
    setSaving(true);
    
    // Check Title Unique
    if (form.title) {
         const isUnique = await apiCheckTitleUnique(form.title, editingSubmission?.id);
         if (!isUnique) {
              showToast({ type: "error", title: "ชื่อผลงานซ้ำ", message: "มีชื่อเรื่องนี้อยู่ในระบบแล้ว ไม่สามารถส่งเข้าประกวดได้" });
              setErrors(prev => ({...prev, title: "มีชื่อเรื่องนี้ซ้ำในระบบ"}));
              setSaving(false);
              return;
         }
    }

    if (mode === 'submit') {
        setSaving(false);
        setConfirmModalState({ isOpen: true, mode });
    } else {
        const confirmText = 'บันทึกแบบร่างไว้ทำต่อภายหลัง?';
        const result = await Swal.fire({ title: confirmText, icon: 'question', showCancelButton: true, confirmButtonColor: '#64748b', confirmButtonText: 'บันทึกร่าง', cancelButtonText: 'ยกเลิก', customClass: { popup: 'rounded-3xl' } });
        if (!result.isConfirmed) {
            setSaving(false);
            return;
        }
        processSubmit('draft');
    }
  };

  const processSubmit = async (mode: 'draft' | 'submit', rating?: number, ratingEase?: number, ratingDesign?: number, ratingContent?: number, comment?: string) => {
    setConfirmModalState({ isOpen: false, mode: null });
    setSaving(true);
    try {
      if (mode === 'submit' && rating && ratingEase && ratingDesign && ratingContent) {
          try { await apiSubmitFeedback(currentUser.id, rating, ratingEase, ratingDesign, ratingContent, comment || ''); } catch (err) { console.error('Feedback save error', err); }
      }

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
        coAuthors: coAuthors, // Pass JSON array
        authorPhoto: currentUser.avatarUrl // Use user's avatar
      };

      if (editingSubmission) {
           let action = mode === 'submit' ? 'UPDATE_SUBMIT' : 'UPDATE_DRAFT';
           let note = mode === 'submit' ? 'แก้ไขและส่งผลงาน' : 'แก้ไขฉบับร่าง';
           if (editingSubmission.status === 'revision_requested' && mode === 'submit') { action = 'USER_FIXED'; note = 'ส่งผลงานที่คลายล็อค/แก้ไขแล้ว'; payload.status = 'submitted'; }
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

  return (
    <>
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
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate flex items-center gap-1">
                        {currentUser.firstName} {currentUser.lastName}
                        {currentUser.isVerified && (
                             <i className="fa-solid fa-circle-check text-blue-500 text-sm" title={currentUser.verifiedBy ? "ยืนยันโดยแอดมินแล้ว" : "ยืนยันตัวตนแล้ว"}></i>
                        )}
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
                    
                    {/* Author Photo Display */}
                    <div className="flex flex-col sm:flex-row gap-6 items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="shrink-0 flex flex-col items-center gap-2">
                            <div className="w-32 h-40 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center relative">
                                {currentUser?.avatarUrl ? (
                                    <>
                                        <img src={currentUser.avatarUrl} alt="Author" className="w-full h-full object-cover" />
                                        {currentUser?.isVerified && (
                                            <div className="absolute top-1 right-1 bg-sky-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white" title="ยืนยันตัวตนแล้ว">
                                                <i className="fa-solid fa-check text-[10px]"></i>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <i className="fa-solid fa-user text-3xl mb-1"></i>
                                        <div className="text-[10px]">ไม่มีรูปภาพ</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                รูปถ่ายหน้าตรง (Official Photo)
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                                รูปภาพนี้ดึงมาจากข้อมูลโปรไฟล์ของคุณโดยอัตโนมัติ เพื่อใช้ในการประชาสัมพันธ์และทำทำเนียบผู้ส่งผลงาน 
                                หากต้องการเปลี่ยนรูป กรุณาไปแก้ไขที่ "บัญชีของฉัน"
                            </p>
                        </div>
                    </div>

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

            {/* --- SECTION 1.5: CO-AUTHORS (New Section - Z-20) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 relative z-20">
                {/* Watermark Container */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <i className="fa-solid fa-users absolute -bottom-4 -right-4 text-9xl text-slate-100 dark:text-slate-700/50 opacity-50 transform -rotate-12 z-0"></i>
                </div>

                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl relative z-10 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white text-xs">2</span>
                        <i className="fa-solid fa-users text-amber-500"></i>
                        ผู้ร่วมส่งผลงาน (Co-Authors) <span className="text-xs text-slate-400 font-normal">(ถ้ามี)</span>
                    </h3>
                    <button onClick={() => setShowCoAuthorSearch(true)} className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition flex items-center gap-1">
                        <i className="fa-solid fa-plus"></i> เพิ่มรายชื่อ
                    </button>
                </div>
                <div className="p-6 space-y-6 relative z-10">
                    <div className="space-y-4">
                        {coAuthors.map((ca, index) => (
                            <div key={ca.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 relative group">
                                <button onClick={() => removeCoAuthor(ca.id)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 transition">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                                <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
                                    <span>ผู้ร่วมวิจัยคนที่ {index + 1}
                                        {ca.isVerified && (
                                            <i className="fa-solid fa-circle-check text-blue-500 ml-2" title="ยืนยันตัวตนแล้ว"></i>
                                        )}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Photo Upload */}
                                    <div className="md:col-span-3 lg:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase text-center">รูปถ่าย</label>
                                        <div className="relative w-24 h-32 mx-auto rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 group/photo cursor-pointer flex items-center justify-center">
                                            {ca.photoUrl ? (
                                                <>
                                                    <img src={ca.photoUrl} alt="Co-Author" className="w-full h-full object-cover" />
                                                    {ca.isVerified && (
                                                        <div className="absolute top-1 right-1 bg-sky-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white" title="ยืนยันตัวตนแล้ว">
                                                            <i className="fa-solid fa-check text-[10px]"></i>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-slate-400 flex flex-col items-center">
                                                    <i className="fa-solid fa-camera text-2xl mb-1"></i>
                                                    <span className="text-[10px] font-bold">อัปโหลดรูป</span>
                                                </div>
                                            )}
                                            {!ca.isSystemUser && <input type="file" accept="image/*" onChange={(e) => handleCoAuthorPhotoChange(ca.id, e)} className="absolute inset-0 opacity-0 cursor-pointer" />}
                                        </div>
                                    </div>

                                    {/* Info Fields */}
                                    <div className="md:col-span-9 lg:col-span-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ชื่อจริง</label>
                                            <input readOnly={ca.isSystemUser} value={ca.firstName} onChange={e => updateCoAuthor(ca.id, 'firstName', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">นามสกุล</label>
                                            <input readOnly={ca.isSystemUser} value={ca.lastName} onChange={e => updateCoAuthor(ca.id, 'lastName', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ตำแหน่ง</label>
                                            <input list="health-positions" readOnly={ca.isSystemUser} value={ca.position} onChange={e => updateCoAuthor(ca.id, 'position', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">สถานที่ปฏิบัติงาน</label>
                                            <OrgAutocomplete disabled={ca.isSystemUser} value={ca.organization} onChange={(val) => updateCoAuthor(ca.id, 'organization', val)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-700/50 disabled:text-slate-500 disabled:opacity-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">จังหวัด</label>
                                            <input readOnly={ca.isSystemUser} value={ca.province} onChange={e => updateCoAuthor(ca.id, 'province', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">โทรศัพท์/มือถือ</label>
                                            <input readOnly={ca.isSystemUser} value={ca.phone} onChange={e => updateCoAuthor(ca.id, 'phone', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">E-mail</label>
                                            <input readOnly={ca.isSystemUser} value={ca.email} onChange={e => updateCoAuthor(ca.id, 'email', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ID Line</label>
                                            <input readOnly={ca.isSystemUser} value={ca.lineId} onChange={e => updateCoAuthor(ca.id, 'lineId', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none read-only:bg-slate-100 dark:read-only:bg-slate-700/50 read-only:text-slate-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {coAuthors.length === 0 && <div className="text-center text-slate-400 text-sm italic py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">ไม่มีรายชื่อผู้ร่วม (คลิกเพิ่มรายชื่อหากมีผู้ร่วมส่งผลงาน)</div>}
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
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">แนบลิงก์ผลงาน <span className="text-rose-500">*</span></label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                เพื่อป้องกันปัญหาพื้นที่จัดเก็บข้อมูลเต็ม ระบบรองรับเฉพาะการแนบ "ลิงก์" เท่านั้น 
                                (เช่น Google Drive, Canva, OneDrive, YouTube)
                            </p>
                        </div>
                        <span className="text-xs text-slate-400">อนุญาตสูงสุด 5 ลิงก์</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1 relative">
                            <i className="fa-solid fa-link absolute left-4 top-3 text-slate-400"></i>
                            <input value={linkInput.url} onChange={e => setLinkInput({...linkInput, url: e.target.value})} placeholder="วาง URL ผลงานที่นี่..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div className="md:w-1/3">
                            <input value={linkInput.name} onChange={e => setLinkInput({...linkInput, name: e.target.value})} placeholder="ชื่อเรียก (ระบุ)" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                        </div>
                        <button onClick={handleAddLink} className="px-5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-sm shrink-0 flex items-center justify-center gap-2"><i className="fa-solid fa-plus"></i> เพิ่มลิงก์</button>
                    </div>

                    <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-900/10 hover:border-sky-300 dark:hover:border-sky-800 transition-all group relative">
                        <input 
                            type="file" 
                            accept=".pdf,.doc,.docx,.zip,.rar" 
                            onChange={handleFileUpload} 
                            disabled={isUploading}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        />
                        <div className="flex flex-col items-center py-2">
                            {isUploading ? (
                                <div className="flex flex-col items-center">
                                    <i className="fa-solid fa-spinner animate-spin text-3xl text-sky-500 mb-2"></i>
                                    <span className="text-sm font-bold text-sky-600">กำลังอัปโหลดไฟล์...</span>
                                </div>
                             ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-500 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                                        <i className="fa-solid fa-cloud-arrow-up"></i>
                                    </div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">คลิกที่นี่เพื่ออัปโหลดไฟล์ผลงานจริง (Direct Upload)</div>
                                    <p className="text-xs text-slate-500 mt-1">รองรับ PDF, Word, ZIP (สูงสุด 50MB)</p>
                                </>
                             )}
                        </div>
                    </div>


                    {attachments.length > 0 ? (
                        <div className="space-y-2 animate-fade-in">
                            {attachments.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 group shadow-sm hover:border-indigo-300 transition-colors">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                                        <i className="fa-solid fa-link"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</div>
                                        <div className="text-xs text-slate-500 m-0.5 mt-1 block">
                                            <a href={item.value} target="_blank" rel="noreferrer" className="truncate block hover:text-indigo-600 hover:underline">{item.value}</a>
                                        </div>
                                    </div>
                                    <button onClick={() => removeAttachment(idx)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition flex items-center justify-center" title="ลบรายการ">
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`text-center py-8 border-2 border-dashed rounded-xl ${errors.attachments ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                            <i className={`fa-solid fa-link text-3xl mb-2 ${errors.attachments ? 'text-rose-400' : 'text-slate-300'}`}></i>
                            <div className={`text-sm font-bold ${errors.attachments ? 'text-rose-500' : 'text-slate-400'}`}>ยังไม่มีลิงก์ผลงาน</div>
                            {errors.attachments && <div className="text-xs text-rose-500 mt-2"><i className="fa-solid fa-circle-exclamation"></i> {errors.attachments}</div>}
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-center">
                         <span className="text-xs bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1.5 rounded-full font-bold border border-amber-200 dark:border-amber-800"><i className="fa-solid fa-lightbulb mr-1.5"></i> ข้อควรระวัง: กรุณาตั้งค่าลิงก์เป็น "สาธารณะ (Public)" หรือ "ทุกคนที่มีลิงก์ (Anyone with the link)" เพื่อให้กรรมการสามารถตรวจสอบได้</span>
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
    
    {showCoAuthorSearch && (
        <CoAuthorSearchModal 
             onClose={() => setShowCoAuthorSearch(false)}
             onSelect={handleSelectCoAuthor}
             onAddManual={addCoAuthorManual}
        />
    )}

    <SubmitConfirmModal 
        isOpen={confirmModalState.isOpen}
        title={editingSubmission ? 'ยืนยันการแก้ไขและส่งผลงาน?' : 'ยืนยันการส่งผลงาน?'}
        text="กรุณาตรวจสอบความถูกต้องของข้อมูล (หลังส่งแล้วจะไม่สามารถแก้ไขได้อีก)"
        confirmText="ยืนยันส่งผลงาน"
        cancelText="ยกเลิก"
        saving={saving}
        requireFeedback={true}
        onConfirm={(rating, ratingEase, ratingDesign, ratingContent, comment) => processSubmit(confirmModalState.mode!, rating, ratingEase, ratingDesign, ratingContent, comment)}
        onCancel={() => setConfirmModalState({ isOpen: false, mode: null })}
    />

    <datalist id="health-positions">
        {HEALTH_POSITIONS.map(p => <option key={p} value={p} />)}
    </datalist>
  </>
  );
};

export default Registration;
