
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRANCHES, BUDGET_YEAR, WORK_TYPES, HEALTH_POSITIONS, JOB_LEVELS } from '../constants';
import { AppSettings, Submission, UserProfile, SubmissionStatus, CoAuthor } from '../types';
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
        <div className="relative" ref={dropdownRef}>
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

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 animate-fade-in origin-top">
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
            {/* Styles for print inside the component */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                
                @media print {
                    @page { 
                        size: A4; 
                        margin: 2.5cm 2cm 2cm 3cm; /* Top, Right, Bottom, Left */
                    }
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        font-family: 'TH SarabunIT๙', 'THSarabunNew', 'Sarabun', sans-serif;
                        font-size: 16pt;
                        line-height: 1.4;
                        color: black;
                    }
                    .page-break { page-break-after: always; min-height: 90vh; position: relative; }
                    .garuda { width: 3cm; height: auto; display: block; margin: 0 auto; }
                    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
                    .indent-1 { text-indent: 2.5cm; }
                    .indent-2 { margin-left: 2cm; }
                    .indent-3 { margin-left: 3cm; }
                    .signature-box { margin-top: 30px; text-align: center; float: right; width: 8cm; }
                    .signature-row { display: flex; justify-content: space-between; margin-top: 30px; }
                    .signature-center { text-align: center; }
                    /* Updated Fill Style */
                    .print-fill {
                        border-bottom: 1px dotted #000;
                        display: inline-block;
                        text-align: center;
                        padding: 0 4px;
                        line-height: 1.2;
                        position: relative;
                        /* top: 1px; */ 
                    }
                    .bold { font-weight: bold; }
                    .text-justify { text-align: justify; }
                    .center { text-align: center; }
                    .right { text-align: right; }
                }
            `}</style>

            {/* PAGE 1: COVER LETTER (บันทึกข้อความ) */}
            <div className="page-break">
                {/* Garuda Image Updated */}
                <img src="/pic/garuda.png" className="garuda" alt="Garuda" />
                
                <div className="doc-header" style={{ marginTop: '10px' }}>
                    <div>ที่ สต <Fill t={toThaiNum(form.bookNo)} w="4cm" /></div>
                    <div className="right">
                        <Fill t={toThaiNum(currentUser.organization)} w="6cm" /><br/>
                        ........................................
                    </div>
                </div>

                <div className="center bold" style={{ margin: '10px 0' }}>
                    <Fill t={toThaiDate()} w="5cm" />
                </div>

                <div>
                    <div><span className="bold">เรื่อง</span> ขอส่งบทความเพื่อเผยแพร่ทางเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูล</div>
                    <div><span className="bold">เรียน</span> นายแพทย์สาธารณสุขจังหวัดสตูล</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div className="bold" style={{ minWidth: '80px' }}>สิ่งที่ส่งมาด้วย</div>
                        <div>
                            {toThaiNum(1)}. หนังสือรับรองบทความก่อนจะลงเผยแพร่ทางเว็บไซต์ จำนวน {toThaiNum(1)} ฉบับ<br/>
                            {toThaiNum(2)}. ประวัติผู้เขียน จำนวน {toThaiNum(1)} ฉบับ<br/>
                            {toThaiNum(3)}. หนังสือรับรองจากคณะกรรมการจริยธรรมงานวิจัย จำนวน {toThaiNum(1)} ฉบับ<br/>
                            {toThaiNum(4)}. หนังสือรับรองผลงานวิชาการ จำนวน {toThaiNum(1)} ฉบับ<br/>
                            {toThaiNum(5)}. บทความ จำนวน {toThaiNum(6)} ชุด
                        </div>
                    </div>
                </div>

                <div className="indent-1 text-justify" style={{ marginTop: '10px' }}>
                    ด้วย <Fill t={`${toThaiNum(currentUser.firstName)} ${toThaiNum(currentUser.lastName)}`} w="6cm" /> ตำแหน่ง <Fill t={toThaiNum(currentUser.position)} w="5cm" />
                    สังกัด <Fill t={toThaiNum(currentUser.organization)} w="6cm" />
                    มีความประสงค์ขอส่งบทความเพื่อเผยแพร่ในเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูลในประเภท
                    {WORK_TYPES.find(w => w.id === form.workType)?.label} เรื่อง “<Fill t={toThaiNum(form.title)} w="8cm" />”
                </div>
                
                <div className="indent-1 text-justify" style={{ marginTop: '10px' }}>
                    โรงพยาบาล / สำนักงานสาธารณสุขอำเภอ <Fill t={toThaiNum(currentUser.organization)} w="5cm" /> ขอส่งบทความและเอกสาร
                    ที่เกี่ยวข้องเพื่อเสนอคณะทำงานพิจารณาบทความที่ลงเผยแพร่ในเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูล
                    รายละเอียดปรากฏตามสิ่งที่ส่งมาด้วย
                </div>
                
                <div className="indent-1" style={{ marginTop: '20px' }}>
                    จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการต่อไป
                </div>

                <div className="signature-box">
                    ขอแสดงความนับถือ
                    <br/><br/><br/>
                    (<Fill t="............................................................" w="5cm" />)<br/>
                    ตำแหน่ง <Fill t="................................................" w="5cm" />
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '14pt' }}>
                    กลุ่มงาน....................<br/>
                    โทร. <Fill t={toThaiNum(currentUser.phone)} w="4cm" /><br/>
                    โทรสาร .....................
                </div>
            </div>

            {/* PAGE 2: CERTIFICATION (หนังสือรับรองบทความ) */}
            <div className="page-break">
                <div className="center bold" style={{ fontSize: '20pt', marginTop: '20px', marginBottom: '20px' }}>
                    หนังสือรับรองบทความก่อนจะลงเผยแพร่ทางเว็บไซต์
                </div>
                
                <div className="right">
                    ตามที่ นาย/นาง/นางสาว <Fill t={`${toThaiNum(currentUser.firstName)} ${toThaiNum(currentUser.lastName)}`} w="5cm" /> ตำแหน่ง/ระดับ <Fill t={toThaiNum(currentUser.position)} w="4cm" /> <br/>
                    สังกัด <Fill t={toThaiNum(currentUser.organization)} w="8cm" />
                </div>

                <div className="indent-1 text-justify" style={{ marginTop: '10px' }}>
                    ได้ส่งบทความรายงานการวิจัย / บทความวิชาการ / รายงานกรณีศึกษา เรื่อง “<Fill t={toThaiNum(form.title)} w="8cm" />”
                    เพื่อเผยแพร่ทางเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูล ทั้งนี้ ข้าพเจ้าและผู้เขียนร่วม (ถ้ามี) ขอรับรองว่า
                </div>

                <div style={{ marginLeft: '1.5cm' }}>
                    <div>{toThaiNum(1)}. เป็นบทความของบุคลากรในสังกัดของสำนักงานสาธารณสุขจังหวัดสตูล</div>
                    <div>{toThaiNum(2)}. บทความ ไม่มีการละเมิดลิขสิทธิ์ทางปัญญาของผู้อื่น ไม่ลอกเลียนหรือคัดลอกมาจากที่ใด</div>
                    <div>{toThaiNum(3)}. บทความ ไม่ใช่ผลงานวิจัยหรือวิทยานิพนธ์ที่เป็นส่วนหนึ่งของการศึกษาเพื่อขอรับปริญญา
                    หรือประกาศนียบัตร หรือเป็นส่วนหนึ่งของการฝึกอบรม</div>
                    <div>{toThaiNum(4)}. บทความ ไม่เคยเผยแพร่หรือตีพิมพ์ที่ใดมาก่อน</div>
                    <div>{toThaiNum(5)}. รายงานการวิจัย ต้องผ่านการรับรองจริยธรรมการวิจัยในมนุษย์</div>
                </div>

                <div className="indent-1 text-justify" style={{ marginTop: '10px' }}>
                    และร่วมยอมรับหลักเกณฑ์การพิจารณาต้นฉบับ ทั้งยินยอมให้คณะทำงานพิจารณาบทความที่ลงเผยแพร่ทาง
                    เว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูล มีสิทธิพิจารณาและตรวจแก้ต้นฉบับได้ตามที่เห็นสมควร หากมีการ
                    ฟ้องร้องเรื่องการละเมิดลิขสิทธิ์เกี่ยวกับภาพ กราฟ ข้อความส่วนใดส่วนหนึ่ง และ/หรือข้อคิดเห็นที่ปรากฏ
                    ในบทความ ข้าพเจ้าและผู้เขียนร่วม ยินยอมรับผิดชอบแต่เพียงฝ่ายเดียว
                </div>

                <div className="indent-1 text-justify" style={{ marginTop: '10px' }}>
                    หากคณะกรรมการฯ ตรวจพบว่า คำรับรองดังกล่าวไม่เป็นความจริง ทางคณะกรรมการฯ
                    มีสิทธิ์ยกเลิกบทความของผู้เขียนออกจากเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูลทันทีได้โดยไม่ต้องแจ้งให้
                    ผู้เขียนทราบล่วงหน้า และผู้เขียนทุกท่านขอรับรองและยินยอมปฏิบัติตามข้อตกลงดังกล่าว พร้อมทั้งลงนาม
                    รับรองไว้ที่ข้างท้ายของหนังสือรับรองฉบับนี้
                </div>

                <div className="signature-row">
                    <div className="signature-center" style={{ width: '45%' }}>
                        ลงนามผู้เขียนหลัก (ชื่อที่ {toThaiNum(1)})
                        <br/><br/>
                        .....................................................<br/>
                        (<Fill t={`${toThaiNum(currentUser.firstName)} ${toThaiNum(currentUser.lastName)}`} w="5cm" />)<br/>
                        ........../...................../..............
                    </div>
                    {/* Render first co-author if exists */}
                    {coAuthors.length > 0 && (
                        <div className="signature-center" style={{ width: '45%' }}>
                            ลงนามผู้เขียนร่วม (ชื่อที่ {toThaiNum(2)})
                            <br/><br/>
                            .....................................................<br/>
                            (<Fill t={`${toThaiNum(coAuthors[0].firstName)} ${toThaiNum(coAuthors[0].lastName)}`} w="5cm" />)<br/>
                            ........../...................../..............
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '30px' }}>
                    <div className="bold">ความเห็นของผู้บังคับบัญชา</div>
                    <div style={{ marginLeft: '1cm', marginTop: '5px' }}>
                        <div style={{ marginBottom: '5px' }}>
                            <span style={{ fontSize: '20px' }}>&#9744;</span> เห็นชอบส่งบทความเพื่อเผยแพร่ในเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูล
                        </div>
                        <div>
                            <span style={{ fontSize: '20px' }}>&#9744;</span> ไม่เห็นชอบให้ส่งบทความเพื่อเผยแพร่ในเว็บไซต์สำนักงานสาธารณสุขจังหวัดสตูล
                        </div>
                    </div>
                    
                    <div className="signature-box" style={{ marginTop: '20px' }}>
                        .....................................................<br/>
                        ( <Fill t={toThaiNum(form.bossName)} w="5cm" /> )<br/>
                        <Fill t={form.bossPosition || "ผอ.รพช./สสอ./หน.กลุ่มงานฯ"} w="5cm" /><br/>
                        ........../...................../..............
                    </div>
                </div>
            </div>

            {/* PAGE 3: PROFILE (แบบฟอร์มประวัติผู้เขียน) */}
            <div className="page-break">
                <div className="center bold" style={{ fontSize: '20pt', marginTop: '20px', marginBottom: '30px' }}>
                    แบบฟอร์มประวัติผู้เขียน
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <span className="bold">ชื่อ-สกุล ผู้เขียนหลัก (ชื่อที่ {toThaiNum(1)})</span> <Fill t={`${toThaiNum(currentUser.firstName)} ${toThaiNum(currentUser.lastName)}`} w="10cm" />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <span className="bold">สถานที่ปฏิบัติงานปัจจุบัน</span> <Fill t={toThaiNum(currentUser.organization)} w="12cm" />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <span className="bold">สถานที่ติดต่อได้สะดวก</span> 
                    {currentUser.addressInfo ? (
                        <span className="ml-2 border-b border-dotted border-black px-2">
                            {toThaiNum(currentUser.addressInfo.houseNo)} หมู่ {toThaiNum(currentUser.addressInfo.moo)} ต.{currentUser.addressInfo.subDistrict} อ.{currentUser.addressInfo.district} จ.{currentUser.addressInfo.province} {toThaiNum(currentUser.addressInfo.zipCode)}
                        </span>
                    ) : (
                        <Fill t="" w="12cm" />
                    )}
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <span className="bold">เบอร์โทรศัพท์</span> <Fill t={toThaiNum(currentUser.phone)} w="5cm" /> <span className="bold">E-mail</span> <Fill t={currentUser.email} w="6cm" />
                </div>
                <div style={{ marginBottom: '30px' }}>
                    <span className="bold">ประวัติการศึกษา (ตั้งแต่ปริญญาตรีจนถึงการศึกษาสูงสุด ระบุสาขาที่จบ)</span><br/>
                    {currentUser.educationHistory && currentUser.educationHistory.length > 0 ? (
                        <div className="ml-8 mt-2 space-y-2">
                            {currentUser.educationHistory.map((edu, i) => (
                                <div key={i} className="border-b border-dotted border-black pb-1">
                                    - {toThaiNum(edu.degree)} สาขา{edu.major} สถาบัน{edu.institution} ({toThaiNum(edu.year)})
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div style={{ borderBottom: '1px dotted #000', height: '1.5em', marginTop: '10px' }}></div>
                            <div style={{ borderBottom: '1px dotted #000', height: '1.5em', marginTop: '10px' }}></div>
                        </>
                    )}
                </div>

                {/* Co-Author Sections (Iterate over added co-authors) */}
                {coAuthors.map((ca, idx) => (
                    <div key={idx} style={{ marginTop: '20px' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <span className="bold">ชื่อ-สกุล ผู้เขียนร่วม (ชื่อที่ {toThaiNum(idx + 2)})</span> <Fill t={`${toThaiNum(ca.firstName)} ${toThaiNum(ca.lastName)}`} w="10cm" />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <span className="bold">สถานที่ปฏิบัติงานปัจจุบัน</span> <Fill t={toThaiNum(ca.organization)} w="12cm" />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <span className="bold">เบอร์โทรศัพท์</span> <Fill t={toThaiNum(ca.phone)} w="5cm" /> <span className="bold">E-mail</span> <Fill t={ca.email} w="6cm" />
                        </div>
                    </div>
                ))}
            </div>

            {/* PAGE 4: ACADEMIC CERT (หนังสือรับรองผลงานวิชาการ) */}
            <div className="page-break">
                {/* Garuda Image Updated */}
                <img src="/pic/garuda.png" className="garuda" alt="Garuda" />
                
                <div className="doc-header" style={{ marginTop: '10px' }}>
                    <div>ที่ สต <Fill t={toThaiNum(form.bookNo)} w="4cm" /></div>
                    <div className="right">
                        (ส่วนราชการ.......<br/>
                        ........................................<br/>
                        ........................................
                    </div>
                </div>

                <div className="center bold" style={{ fontSize: '20pt', margin: '20px 0' }}>
                    หนังสือรับรองผลงานวิชาการ
                </div>

                <div className="indent-1">
                    หนังสือรับรองฉบับนี้ให้ไว้เพื่อรับรองว่า นาย/นาง/นางสาว <Fill t={`${toThaiNum(currentUser.firstName)} ${toThaiNum(currentUser.lastName)}`} w="8cm" />
                </div>
                <div>
                    ได้จัดทำผลงานวิชาการ เรื่อง <Fill t={toThaiNum(form.title)} w="12cm" />
                </div>
                <div>
                    <Fill t="" w="100%" />
                </div>
                <div>
                    เพื่อขอประเมินแต่งตั้งให้ดำรงตำแหน่ง <Fill t="" w="6cm" /> ตำแหน่งเลขที่ <Fill t="" w="3cm" />
                </div>
                <div>
                    ส่วนราชการ <Fill t="" w="12cm" />
                </div>
                <div className="text-justify">
                    โดยผลงานวิชาการของข้าราชการเผยแพร่ทาง Website ของสำนักงานสาธารณสุขจังหวัดสตูล 
                    เมื่อวันที่ <Fill t="" w="3cm" /> โดยสามารถสืบค้นได้จาก https://www.satunhealth.go.th และผลงาน
                    วิชาการดังกล่าวไม่ใช่ผลงานวิจัยหรือวิทยานิพนธ์ ที่เป็นส่วนหนึ่งของการศึกษาเพื่อขอรับปริญญาหรือ
                    ประกาศนียบัตร หรือเป็นส่วนหนึ่งของการฝึกอบรม
                </div>

                <div style={{ marginTop: '20px' }}>
                    <div className="bold">{toThaiNum(1)}. คำรับรองของผู้ขอรับการประเมิน</div>
                    <div className="signature-box" style={{ float: 'none', marginLeft: 'auto', marginRight: '0' }}>
                        ลงชื่อ.............................................................<br/>
                        (<Fill t={`${toThaiNum(currentUser.firstName)} ${toThaiNum(currentUser.lastName)}`} w="5cm" />)<br/>
                        ตำแหน่ง <Fill t={toThaiNum(currentUser.position)} w="5cm" /><br/>
                        วันที่....................................................... .........
                    </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <div className="bold">{toThaiNum(2)}. คำรับรองของผู้บังคับบัญชาที่ควบคุมดูแลการปฏิบัติงาน</div>
                    <div style={{ marginLeft: '1cm' }}>ความเห็น................................................................................................................................................................</div>
                    <div className="signature-box" style={{ float: 'none', marginLeft: 'auto', marginRight: '0' }}>
                        ลงชื่อ.............................................................<br/>
                        (.............................................................)<br/>
                        ตำแหน่ง.........................................................<br/>
                        วันที่....................................................... .........
                    </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <div className="bold">{toThaiNum(3)}. คำรับรองของผู้บังคับบัญชาเหนือขึ้นไป {toThaiNum(1)} ระดับ</div>
                    <div style={{ marginLeft: '1cm' }}>ความเห็น................................................................................................................................................................</div>
                    <div className="signature-box" style={{ float: 'none', marginLeft: 'auto', marginRight: '0' }}>
                        ลงชื่อ.............................................................<br/>
                        (.............................................................)<br/>
                        ตำแหน่ง.........................................................<br/>
                        วันที่....................................................... .........
                    </div>
                </div>

                <div style={{ marginTop: '20px', fontSize: '14pt' }}>
                    *หมายเหตุ : ลงนามรับรองผลงาน โดยผู้บังคับบัญชา {toThaiNum(2)} คน {toThaiNum(2)} ระดับ
                </div>
            </div>
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
            
            {/* --- SECTION 1: WORK INFO --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-sky-500 text-white text-xs">1</span>
                        ข้อมูลผลงาน (Work Information)
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* New Field: Work Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ชื่อเรื่องผลงาน <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            value={form.title}
                            onChange={e => onChangeField("title", e.target.value)}
                            placeholder="ระบุชื่อเรื่องเต็มของผลงาน..."
                            className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-900 outline-none focus:ring-2 dark:text-white ${errors.title ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-600 focus:ring-sky-200'}`}
                        />
                        {errors.title && <p className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-circle-exclamation"></i> {errors.title}</p>}
                    </div>

                    {/* Work Type Grid (New Design) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            ประเภทผลงาน <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {WORK_TYPES.map(t => {
                                const isSelected = form.workType === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onChangeField("workType", t.id)}
                                        type="button" 
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-lg flex flex-col gap-3 group outline-none
                                            ${isSelected 
                                                ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 shadow-sky-100 dark:shadow-none' 
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-700'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start justify-between w-full">
                                            {/* Icon Box */}
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl transition-colors
                                                ${isSelected ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-500'}
                                            `}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                                </svg>
                                            </div>
                                            
                                            {/* Selection Indicator */}
                                            {isSelected ? (
                                                <div className="h-6 w-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs animate-bounce-in shadow-sm">
                                                    <i className="fa-solid fa-check"></i>
                                                </div>
                                            ) : (
                                                <div className="h-6 w-6 rounded-full border-2 border-slate-200 dark:border-slate-600 group-hover:border-sky-300 transition-colors"></div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className={`font-bold text-base mb-1 ${isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-800 dark:text-white'}`}>
                                                {t.label}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
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

            {/* --- SECTION 1.5: OFFICIAL DOC INFO (New Section) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white text-xs">2</span>
                        ข้อมูลสำหรับออกหนังสือราชการ (Official Doc Info)
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">เลขที่หนังสือส่ง (ถ้ามี)</label>
                            <input 
                                value={form.bookNo}
                                onChange={e => onChangeField("bookNo", e.target.value)}
                                placeholder="เช่น สต 0032/..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                            />
                        </div>
                        {/* Removed Simple CoAuthor Input in favor of Dynamic List below */}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">ชื่อผู้บังคับบัญชา (ผอ./สสอ.)</label>
                            <input 
                                value={form.bossName}
                                onChange={e => onChangeField("bossName", e.target.value)}
                                placeholder="ระบุชื่อผู้เซ็นรับรอง..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">ตำแหน่งผู้บังคับบัญชา</label>
                            <select 
                                value={form.bossPosition}
                                onChange={e => onChangeField("bossPosition", e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                            >
                                <option>ผู้อำนวยการโรงพยาบาล</option>
                                <option>สาธารณสุขอำเภอ</option>
                                <option>หัวหน้ากลุ่มงาน</option>
                                <option>รักษาการในตำแหน่ง...</option>
                            </select>
                        </div>
                    </div>

                    {/* Co-Authors Dynamic List */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                ผู้ร่วมส่งผลงาน (Co-Authors) <span className="text-xs text-slate-400 font-normal">(ถ้ามี)</span>
                            </label>
                            <button onClick={addCoAuthor} className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition">
                                <i className="fa-solid fa-plus mr-1"></i> เพิ่มรายชื่อ
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
                                        <input 
                                            value={ca.organization} 
                                            onChange={e => updateCoAuthor(ca.id, 'organization', e.target.value)}
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

            {/* --- SECTION 2: ATTACHMENTS (Updated Number to 3) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500 text-white text-xs">3</span>
                        ไฟล์แนบผลงาน (Attachments)
                    </h3>
                </div>
                <div className="p-6">
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
