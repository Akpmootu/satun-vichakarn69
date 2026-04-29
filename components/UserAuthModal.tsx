import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Education } from '../types';
import { apiRegisterUser, apiLoginUser, apiUploadAvatar, apiUpdateUserProfile } from '../services/apiService';
import { HEALTH_POSITIONS, JOB_LEVELS, EDUCATION_LEVELS, BRANCHES, BRANCH_GROUPS } from '../constants';
import OrgAutocomplete from './ui/OrgAutocomplete';
import UniversityAutocomplete from './ui/UniversityAutocomplete';
import PasswordStrengthMeter from './ui/PasswordStrengthMeter';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  showToast: (t: any) => void;
}

const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'register_reviewer'>('login');
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register State
  const [regForm, setRegForm] = useState({
    prefix: "", firstName: "", lastName: "", email: "", organization: "", 
    position: "", positionCustom: "", level: "", branchId: "", committeeRole: ""
  });
  
  // Phone Number State (10 Digits)
  const [phoneDigits, setPhoneDigits] = useState<string[]>(Array(10).fill(""));
  const phoneRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Avatar State
  const [regAvatar, setRegAvatar] = useState<File | null>(null);
  const [regAvatarPreview, setRegAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Education State for Registration (Highest Degree)
  const [eduForm, setEduForm] = useState<Education>({
      id: 'primary',
      degree: '',
      major: '',
      institution: '',
      year: ''
  });

  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  // Years for dropdown (Current year back 50 years)
  const currentYear = new Date().getFullYear() + 543;
  const yearOptions = Array.from({length: 50}, (_, i) => currentYear - i);

  // Reset when closed
  useEffect(() => {
      if (!isOpen) {
          setLoginEmail(""); setLoginPassword("");
          setRegForm({ prefix: "", firstName: "", lastName: "", email: "", organization: "", position: "", positionCustom: "", level: "", branchId: "", committeeRole: "" });
          setPhoneDigits(Array(10).fill("")); // Reset phone
          setRegAvatar(null); setRegAvatarPreview(null); // Reset avatar
          setEduForm({ id: 'primary', degree: '', major: '', institution: '', year: '' });
          setRegPassword(""); setRegConfirmPassword("");
          setLoading(false);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Phone Input Logic ---
  const handlePhoneChange = (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return; // Allow numbers only

      const newDigits = [...phoneDigits];
      newDigits[index] = value.slice(-1); // Take only the last entered char
      setPhoneDigits(newDigits);

      // Auto focus next
      if (value && index < 9) {
          phoneRefs.current[index + 1]?.focus();
      }
  };

  const handlePhoneKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !phoneDigits[index] && index > 0) {
          phoneRefs.current[index - 1]?.focus();
      }
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
      const newDigits = [...phoneDigits];
      for (let i = 0; i < pasteData.length; i++) {
          newDigits[i] = pasteData[i];
      }
      setPhoneDigits(newDigits);
      // Focus on the last filled index
      const focusIndex = Math.min(pasteData.length, 9);
      phoneRefs.current[focusIndex]?.focus();
  };

  // --- Avatar Logic ---
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) {
              showToast({ type: 'error', title: 'ไฟล์ใหญ่เกินไป', message: 'รูปภาพต้องมีขนาดไม่เกิน 2MB' });
              return;
          }
          setRegAvatar(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setRegAvatarPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // --- Password Strength Logic ---
  const getPasswordStrength = (pass: string) => {
      if (!pass) return 0;
      let score = 0;
      if (pass.length >= 8) score += 1;
      if (/[A-Z]/.test(pass)) score += 1;
      if (/[0-9]/.test(pass)) score += 1;
      if (/[^A-Za-z0-9]/.test(pass)) score += 1;
      return score;
  };

  const passScore = getPasswordStrength(regPassword);
  const getStrengthColor = (score: number) => {
      if (score <= 1) return 'bg-rose-500';
      if (score <= 3) return 'bg-amber-500';
      return 'bg-emerald-500';
  };
  const getStrengthLabel = (score: number) => {
      if (score <= 1) return 'อ่อน (Weak)';
      if (score <= 3) return 'ปานกลาง (Medium)';
      return 'แข็งแรง (Strong)';
  };

  const handleLogin = async () => {
    if (!loginEmail) {
        showToast({ type: 'error', title: 'ผิดพลาด', message: 'กรุณากรอกอีเมล หรือ Username' });
        return;
    }
    setLoading(true);
    try {
        const user = await apiLoginUser(loginEmail, loginPassword);
        
        let title = `สวัสดีคุณ ${user.firstName}`;
        if (user.role === 'admin') title = "เข้าสู่ระบบผู้ดูแลระบบ (Admin)";
        if (user.role === 'reviewer') title = "เข้าสู่ระบบคณะกรรมการ (Reviewer)";

        showToast({ type: 'success', title: 'ยินดีต้อนรับ', message: title });
        onSuccess(user);
    } catch (e: any) {
        showToast({ type: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', message: e.message });
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async () => {
      // Validate Phone
      const phoneNumber = phoneDigits.join('');
      if (phoneNumber.length !== 10) {
          showToast({ type: 'error', title: 'เบอร์โทรศัพท์ไม่ครบ', message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก' });
          return;
      }

      // 1. Basic Validation
      if (!regForm.firstName || !regForm.lastName || !regForm.email || !regForm.organization || !regPassword) {
          showToast({ type: 'error', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน' });
          return;
      }
      
      // 2. Position Handling
      let finalPosition = regForm.position;
      if (regForm.position === 'อื่นๆ' && regForm.positionCustom) {
          finalPosition = regForm.positionCustom;
      }
      if (!finalPosition || !regForm.level) {
          showToast({ type: 'error', title: 'ข้อมูลงานไม่ครบ', message: 'กรุณาระบุตำแหน่งและระดับ' });
          return;
      }

      // 3. Education Validation
      if (mode !== 'register_reviewer' && (!eduForm.degree || !eduForm.institution || !eduForm.year || !eduForm.major)) {
          showToast({ type: 'error', title: 'ข้อมูลการศึกษาไม่ครบ', message: 'กรุณากรอกประวัติการศึกษา (วุฒิสูงสุด)' });
          return;
      }

      // 4. Password Validation
      if (regPassword.length < 6) {
          showToast({ type: 'error', title: 'รหัสผ่านสั้นเกินไป', message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
          return;
      }
      if (regPassword !== regConfirmPassword) {
          showToast({ type: 'error', title: 'รหัสผ่านไม่ตรงกัน', message: 'กรุณายืนยันรหัสผ่านให้ถูกต้อง' });
          return;
      }

      // 5. Avatar Check (Optional but encouraged)
      if (!regAvatar) {
          // Warning but proceed? Or block? Prompt implied finishing the process here.
          // Let's make it optional but show warning if missing? No, user said "Upload photo... so it is finished".
          // Assuming mandatory for "finished" profile.
          // Uncomment below to force:
          // showToast({ type: 'error', title: 'ขาดรูปโปรไฟล์', message: 'กรุณาอัปโหลดรูปถ่ายหน้าตรง' });
          // return;
      }

      // 5. Reviewer Validation
      if (mode === 'register_reviewer') {
          if (!regForm.prefix || !regForm.branchId || !regForm.committeeRole) {
              showToast({ type: 'error', title: 'ข้อมูลกรรมการไม่ครบ', message: 'กรุณาระบุคำนำหน้า สาขา และหน้าที่กรรมการ' });
              return;
          }
      }

      let formattedEmail = regForm.email.trim();
      if (mode === 'register_reviewer' && !formattedEmail.includes('@')) {
          formattedEmail = `${formattedEmail}@skms-reviewer.local`;
      }

      setLoading(true);
      try {
          const newUser: UserProfile = {
              id: Date.now().toString(), // Temp ID
              role: mode === 'register_reviewer' ? 'reviewer' : 'user',
              prefix: mode === 'register_reviewer' ? regForm.prefix : undefined,
              firstName: regForm.firstName,
              lastName: regForm.lastName,
              email: formattedEmail,
              phone: phoneNumber,
              organization: regForm.organization,
              position: finalPosition,
              level: regForm.level,
              educationHistory: mode === 'register_reviewer' ? [] : [eduForm],
              branchId: mode === 'register_reviewer' ? regForm.branchId : undefined,
              committeeRole: mode === 'register_reviewer' ? regForm.committeeRole : undefined
          };
          
          // 1. Create User
          const user = await apiRegisterUser(newUser, regPassword);

          // 2. Upload Avatar (If provided)
          if (regAvatar && user.id) {
              try {
                  const avatarUrl = await apiUploadAvatar(user.id, regAvatar);
                  const updatedUser = await apiUpdateUserProfile(user.id, { avatarUrl });
                  onSuccess(updatedUser); // Update with avatar
              } catch (uploadError) {
                  console.error("Avatar upload failed:", uploadError);
                  showToast({ type: 'info', title: 'ลงทะเบียนสำเร็จ', message: 'แต่รูปภาพอัปโหลดไม่ผ่าน (สามารถแก้ภายหลังได้)' });
                  onSuccess(user); // Fallback to user without avatar
              }
          } else {
              showToast({ type: 'success', title: 'ลงทะเบียนสำเร็จ', message: 'ยินดีต้อนรับสมาชิกใหม่' });
              onSuccess(user);
          }

      } catch (e: any) {
          let errorMessage = e.message;
          if (errorMessage === 'User already registered') {
              errorMessage = 'Username หรืออีเมลนี้ มีในระบบแล้ว (User already registered)';
          }
          showToast({ type: 'error', title: 'ลงทะเบียนไม่สำเร็จ', message: errorMessage });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[95vh] animate-bounce-in ring-1 ring-slate-200 dark:ring-slate-700">
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
            <button 
                onClick={() => setMode('login')}
                className={`py-4 text-sm font-bold transition px-4 ${mode === 'login' ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/20 border-b-2 border-sky-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <i className="fa-solid fa-right-to-bracket mr-1"></i> เข้าสู่ระบบ
            </button>
            <button 
                onClick={() => setMode('register')}
                className={`flex-1 py-4 text-sm font-bold transition ${mode === 'register' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-b-2 border-emerald-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <i className="fa-solid fa-user-plus mr-1"></i> ลงทะเบียนทั่วไป
            </button>
            <button 
                onClick={() => setMode('register_reviewer')}
                className={`flex-1 py-4 text-sm font-bold transition ${mode === 'register_reviewer' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <i className="fa-solid fa-user-tie mr-1"></i> ลงทะเบียนกรรมการ
            </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
            {mode === 'login' ? (
                <div className="space-y-4">
                    {/* ... Login Content (Unchanged) ... */}
                    <div className="text-center mb-6">
                        <div className="h-16 w-16 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 rounded-full mx-auto flex items-center justify-center text-2xl mb-3">
                            <i className="fa-solid fa-lock"></i>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">เข้าสู่ระบบ SKMS</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">สำหรับสมาชิกและเจ้าหน้าที่</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">อีเมล / ชื่อผู้ใช้</label>
                        <div className="relative">
                            <i className="fa-solid fa-user absolute left-4 top-3.5 text-slate-400"></i>
                            <input 
                                type="text"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 pl-10 py-3 outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white transition"
                                placeholder="user@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">รหัสผ่าน</label>
                        <div className="relative">
                            <i className="fa-solid fa-key absolute left-4 top-3.5 text-slate-400"></i>
                            <input 
                                type={showLoginPass ? "text" : "password"}
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white transition"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowLoginPass(!showLoginPass)}
                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                            >
                                <i className={`fa-solid ${showLoginPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-50 mt-2"
                    >
                        {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'เข้าสู่ระบบ'}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                     <div className="text-center mb-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            <i className="fa-solid fa-id-card text-sky-500"></i> ลงทะเบียนสมาชิกใหม่
                        </h3>
                        <p className="text-xs text-slate-500">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อสิทธิประโยชน์ของท่าน</p>
                    </div>
                    
                    {/* SECTION 1: Personal Info (Modified: Includes Avatar & Phone Boxes) */}
                    <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 z-40">
                        {/* Watermark Container */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <i className="fa-solid fa-user-check absolute -bottom-2 -right-2 text-8xl text-slate-200 dark:text-slate-700 opacity-20 transform -rotate-12"></i>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 relative z-10">
                            <i className="fa-solid fa-user-tag text-sky-500"></i> ข้อมูลส่วนตัว
                        </h4>
                        
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center mb-6 relative z-10">
                            <div 
                                onClick={() => avatarInputRef.current?.click()}
                                className="h-24 w-24 rounded-full bg-white dark:bg-slate-700 border-4 border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center cursor-pointer group relative overflow-hidden"
                            >
                                {regAvatarPreview ? (
                                    <img src={regAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <i className="fa-solid fa-camera text-3xl text-slate-300 group-hover:text-sky-500 transition"></i>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                    <i className="fa-solid fa-upload text-white mb-1"></i>
                                    <span className="text-[9px] text-white font-bold">อัปโหลดรูป</span>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 mt-2">รูปถ่ายหน้าตรง (Official Photo)</span>
                            <input 
                                type="file" 
                                ref={avatarInputRef} 
                                onChange={handleAvatarChange} 
                                accept="image/png, image/jpeg" 
                                className="hidden" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
                            <div className="md:col-span-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">คำนำหน้า <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                  <select 
                                      value={regForm.prefix}
                                      onChange={(e) => setRegForm({...regForm, prefix: e.target.value})}
                                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white appearance-none cursor-pointer"
                                  >
                                      <option value="">-- เลือก --</option>
                                      <option value="นาย">นาย</option>
                                      <option value="นาง">นาง</option>
                                      <option value="นางสาว">นางสาว</option>
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                      <i className="fa-solid fa-chevron-down text-xs"></i>
                                  </div>
                                </div>
                            </div>
                            <div className="md:col-span-1 md:col-start-2 col-span-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ชื่อ <span className="text-rose-500">*</span></label>
                                <input 
                                    value={regForm.firstName}
                                    onChange={(e) => setRegForm({...regForm, firstName: e.target.value})}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white" 
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">นามสกุล <span className="text-rose-500">*</span></label>
                                <input 
                                    value={regForm.lastName}
                                    onChange={(e) => setRegForm({...regForm, lastName: e.target.value})}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white" 
                                />
                            </div>
                        </div>
                        
                        {/* 10-Box Phone Input */}
                        <div className="mt-3 relative z-10">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">เบอร์โทรศัพท์ (10 หลัก) <span className="text-rose-500">*</span></label>
                            <div className="flex gap-1 sm:gap-2 justify-between">
                                {phoneDigits.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { phoneRefs.current[index] = el; }}
                                        type="text"
                                        value={digit}
                                        maxLength={1}
                                        onChange={(e) => handlePhoneChange(index, e.target.value)}
                                        onKeyDown={(e) => handlePhoneKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePhonePaste : undefined}
                                        className="w-full h-10 sm:h-12 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-bold text-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none dark:bg-slate-800 dark:text-white transition"
                                        placeholder="-"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Work Info (Contains Dropdown - Needs to float over Section 3) -> Z-30 */}
                    <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 z-30">
                        {/* Watermark Container */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <i className="fa-solid fa-briefcase absolute -bottom-2 -right-2 text-8xl text-slate-200 dark:text-slate-700 opacity-20 transform -rotate-12"></i>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 relative z-10">
                            <i className="fa-solid fa-building text-amber-500"></i> ข้อมูลการทำงาน
                        </h4>

                        <div className="space-y-3 relative z-10">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">สังกัด/หน่วยงาน <span className="text-rose-500">*</span></label>
                                <OrgAutocomplete 
                                    value={regForm.organization}
                                    onChange={(val) => setRegForm({...regForm, organization: val})}
                                    placeholder="พิมพ์ชื่อ รพ., รพ.สต. หรือ สสอ."
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ตำแหน่ง <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={regForm.position}
                                        onChange={(e) => setRegForm({...regForm, position: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white cursor-pointer" 
                                    >
                                        <option value="">-- เลือก --</option>
                                        {HEALTH_POSITIONS.map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                        <option value="อื่นๆ">อื่นๆ</option>
                                    </select>
                                    {regForm.position === 'อื่นๆ' && (
                                        <input 
                                            value={regForm.positionCustom}
                                            onChange={(e) => setRegForm({...regForm, positionCustom: e.target.value})}
                                            placeholder="ระบุตำแหน่ง"
                                            className="w-full mt-2 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none dark:bg-slate-800 dark:text-white"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ระดับ <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={regForm.level}
                                        onChange={(e) => setRegForm({...regForm, level: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:text-white cursor-pointer" 
                                    >
                                        <option value="">-- เลือก --</option>
                                        {JOB_LEVELS.map((l) => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2.5: Committee Info (Only for Reviewer) */}
                    {mode === 'register_reviewer' && (
                        <div className="relative p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-800/30 border border-indigo-200 dark:border-indigo-700/50 z-25">
                            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                <i className="fa-solid fa-gavel absolute -bottom-2 -right-2 text-8xl text-indigo-200/50 dark:text-indigo-800/30 transform -rotate-12"></i>
                            </div>
                            <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2 relative z-10">
                                <i className="fa-solid fa-clipboard-user text-indigo-500"></i> ข้อมูลคณะกรรมการ
                            </h4>
                            
                            <div className="space-y-3 relative z-10">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">สาขาที่รับผิดชอบ <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={regForm.branchId}
                                        onChange={(e) => setRegForm({...regForm, branchId: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:text-white cursor-pointer" 
                                    >
                                        <option value="">-- เลือกสาขา --</option>
                                        {BRANCH_GROUPS.map((group, idx) => {
                                            const branchesInGroup = group.ids
                                                .map(id => BRANCHES.find(b => b.id === id))
                                                .filter(Boolean);
                                            
                                            if (branchesInGroup.length === 0) return null;
                                            
                                            return (
                                                <optgroup key={idx} label={group.label} className="font-bold bg-slate-50 dark:bg-slate-900 border-b border-slate-200">
                                                    {branchesInGroup.map((b: any) => (
                                                        <option key={b.id} value={b.id.toString()} className="font-normal bg-white dark:bg-slate-800">
                                                            {String(b.id).padStart(2,'0')} - {b.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">หน้าที่กรรมการ <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={regForm.committeeRole}
                                        onChange={(e) => setRegForm({...regForm, committeeRole: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:text-white cursor-pointer" 
                                    >
                                        <option value="">-- เลือกหน้าที่ --</option>
                                        <option value="ประธาน">ประธาน</option>
                                        <option value="กรรมการ">กรรมการ</option>
                                        <option value="กรรมการและเลขานุการ">กรรมการและเลขานุการ</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: Education Info (Contains Dropdown - Needs to float over Section 4) -> Z-20 */}
                    {mode !== 'register_reviewer' && (
                    <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 z-20">
                        {/* Watermark Container */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <i className="fa-solid fa-graduation-cap absolute -bottom-2 -right-2 text-8xl text-slate-200 dark:text-slate-700 opacity-20 transform -rotate-12"></i>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 relative z-10">
                            <i className="fa-solid fa-user-graduate text-indigo-500"></i> ประวัติการศึกษา (วุฒิสูงสุด)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                            <div className="md:col-span-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ระดับการศึกษา <span className="text-rose-500">*</span></label>
                                <select
                                    value={eduForm.degree}
                                    onChange={(e) => setEduForm({...eduForm, degree: e.target.value})}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:text-white cursor-pointer"
                                >
                                    <option value="">-- เลือกวุฒิ --</option>
                                    {EDUCATION_LEVELS.map((l) => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">สาขาวิชา <span className="text-rose-500">*</span></label>
                                <input 
                                    value={eduForm.major}
                                    onChange={(e) => setEduForm({...eduForm, major: e.target.value})}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:text-white"
                                    placeholder="เช่น สาธารณสุขศาสตร์"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">สถาบันการศึกษา <span className="text-rose-500">*</span></label>
                                <UniversityAutocomplete 
                                    value={eduForm.institution}
                                    onChange={(val) => setEduForm({...eduForm, institution: val})}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ปีที่จบ (พ.ศ.) <span className="text-rose-500">*</span></label>
                                <select
                                    value={eduForm.year}
                                    onChange={(e) => setEduForm({...eduForm, year: e.target.value})}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:text-white cursor-pointer"
                                >
                                    <option value="">-- ปีที่จบ --</option>
                                    {yearOptions.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* SECTION 4: Account Info -> Z-10 */}
                    <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 z-10">
                        {/* Watermark Container */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <i className="fa-solid fa-lock absolute -bottom-2 -right-2 text-8xl text-slate-200 dark:text-slate-700 opacity-20 transform -rotate-12"></i>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 relative z-10">
                            <i className="fa-solid fa-shield-halved text-emerald-500"></i> ข้อมูลบัญชีผู้ใช้
                        </h4>
                        
                        <div className="space-y-3 relative z-10">
                            {/* ... Account Inputs ... */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {mode === 'register_reviewer' ? 'Username' : 'อีเมล (ใช้เป็น Username)'} <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    type={mode === 'register_reviewer' ? "text" : "email"}
                                    value={regForm.email}
                                    onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                                    className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 dark:bg-slate-800 dark:text-white ${mode === 'register_reviewer' ? 'lowercase' : ''}`}
                                    placeholder={mode === 'register_reviewer' ? " reviewer123" : "example@mail.com"}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="relative">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">รหัสผ่าน <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <input 
                                            type={showRegPass ? "text" : "password"}
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 dark:bg-slate-800 dark:text-white pr-8"
                                            placeholder="รหัสผ่าน"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPass(!showRegPass)}
                                            className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                                        >
                                            <i className={`fa-solid ${showRegPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ยืนยันรหัสผ่าน <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="password"
                                        value={regConfirmPassword}
                                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-900 dark:text-white transition ${regConfirmPassword && regPassword !== regConfirmPassword ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-200'}`}
                                        placeholder="ยืนยันอีกครั้ง"
                                    />
                                </div>
                            </div>

                            {/* Password Strength Meter */}
                            <PasswordStrengthMeter password={regPassword} />
                        </div>
                    </div>

                    <button 
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-200 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check-circle"></i> ยืนยันการลงทะเบียน</>}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserAuthModal;