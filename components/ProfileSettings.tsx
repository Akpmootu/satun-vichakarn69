
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { apiUpdateUserProfile, apiUploadAvatar, apiChangePassword } from '../services/apiService';
import { HEALTH_POSITIONS, JOB_LEVELS } from '../constants';

interface ProfileSettingsProps {
    currentUser: UserProfile;
    onUpdateUser: (updatedUser: UserProfile) => void;
    showToast: (t: any) => void;
}

type TabKey = 'general' | 'security';

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdateUser, showToast }) => {
    const [activeTab, setActiveTab] = useState<TabKey>('general');
    
    // General Profile State
    const [form, setForm] = useState({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: currentUser.phone || '',
        organization: currentUser.organization || '',
        position: currentUser.position || '',
        level: currentUser.level || ''
    });
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser.avatarUrl);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Change State
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [passLoading, setPassLoading] = useState(false);

    // --- Logic Handlers ---

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        if (file.size > 2 * 1024 * 1024) {
             showToast({ type: 'error', title: 'ไฟล์ใหญ่เกินไป', message: 'รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2MB' });
             return;
        }
        try {
            setUploading(true);
            const publicUrl = await apiUploadAvatar(currentUser.id, file);
            const updated = await apiUpdateUserProfile(currentUser.id, { avatarUrl: publicUrl });
            setAvatarUrl(publicUrl);
            onUpdateUser(updated);
            showToast({ type: 'success', title: 'อัปโหลดสำเร็จ', message: 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว' });
        } catch (e: any) {
            showToast({ type: 'error', title: 'อัปโหลดไม่สำเร็จ', message: e.message });
        } finally {
            setUploading(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(/\D/g, '');
        if (raw.length > 9) raw = raw.substring(0, 9);
        let formatted = "";
        if (raw.length > 0) formatted += raw.substring(0, 2);
        if (raw.length >= 3) formatted += "-" + raw.substring(2, 6);
        if (raw.length >= 7) formatted += "-" + raw.substring(6, 9);
        const finalValue = raw.length > 0 ? `0${formatted}` : '';
        setForm({ ...form, phone: finalValue });
    };

    const getPhoneDisplayValue = () => {
        if (!form.phone) return "";
        return form.phone.startsWith('0') ? form.phone.substring(1) : form.phone;
    };

    const handleSaveProfile = async () => {
        if (!form.firstName || !form.lastName) {
            showToast({ type: 'error', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อและนามสกุล' });
            return;
        }
        const rawPhone = form.phone.replace(/\D/g, '');
        if (rawPhone.length > 0 && rawPhone.length < 10) {
             showToast({ type: 'error', title: 'เบอร์โทรศัพท์ไม่ครบ', message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบถ้วน' });
             return;
        }
        setLoading(true);
        try {
            const updated = await apiUpdateUserProfile(currentUser.id, form);
            onUpdateUser(updated);
            showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'ปรับปรุงข้อมูลส่วนตัวเรียบร้อยแล้ว' });
        } catch (e: any) {
            showToast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: e.message });
        } finally {
            setLoading(false);
        }
    };

    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;
        return score;
    };
    const strength = calculateStrength(newPassword);

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            showToast({ type: 'error', title: 'รหัสผ่านสั้นเกินไป', message: 'ต้องมีความยาวอย่างน้อย 8 ตัวอักษร' });
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast({ type: 'error', title: 'รหัสผ่านไม่ตรงกัน', message: 'กรุณายืนยันรหัสผ่านให้ถูกต้อง' });
            return;
        }
        if (strength < 2) {
             showToast({ type: 'error', title: 'รหัสผ่านง่ายเกินไป', message: 'กรุณาเพิ่มตัวเลข หรือตัวอักษรใหญ่เพื่อความปลอดภัย' });
             return;
        }
        setPassLoading(true);
        try {
            await apiChangePassword(newPassword);
            showToast({ type: 'success', title: 'สำเร็จ', message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            showToast({ type: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', message: e.message });
        } finally {
            setPassLoading(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'ข้อมูลทั่วไป', icon: 'fa-user-gear' },
        { id: 'security', label: 'ความปลอดภัย', icon: 'fa-shield-halved' },
    ];

    return (
        <div className="max-w-6xl mx-auto pb-12 animate-fade-in">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">ตั้งค่าบัญชีผู้ใช้</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">จัดการข้อมูลส่วนตัวและตั้งค่าความปลอดภัย</p>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-8">
                {/* Left Sidebar / Top Nav (Mobile) */}
                <div className="md:col-span-3 lg:col-span-3">
                    <div className="sticky top-24">
                        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabKey)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                        ${activeTab === tab.id 
                                            ? 'bg-slate-900 text-white shadow-md dark:bg-sky-600' 
                                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                        }
                                    `}
                                >
                                    <i className={`fa-solid ${tab.icon} w-5 text-center`}></i>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        
                        {/* Short Info Widget (Desktop Only) */}
                        <div className="hidden md:block mt-8 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                             <div className="flex items-center gap-3 mb-3">
                                 <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                     {avatarUrl ? (
                                         <img src={avatarUrl} className="h-full w-full object-cover" alt="Profile" />
                                     ) : (
                                         <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">{currentUser.firstName.charAt(0)}</div>
                                     )}
                                 </div>
                                 <div className="min-w-0">
                                     <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser.firstName} {currentUser.lastName}</div>
                                     <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                                 </div>
                             </div>
                             <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                 สิทธิ์การใช้งาน: {currentUser.role}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="md:col-span-9 lg:col-span-9 space-y-6">
                    
                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            
                            {/* Card: Avatar & Basic Info */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-6 md:p-8">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 border-b border-slate-100 dark:border-slate-700 pb-8">
                                    <div className="relative group shrink-0">
                                        <div 
                                            onClick={handleAvatarClick}
                                            className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-700 ring-4 ring-white dark:ring-slate-600 shadow-lg overflow-hidden cursor-pointer relative"
                                        >
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-300">
                                                    {currentUser.firstName.charAt(0)}
                                                </div>
                                            )}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <i className="fa-solid fa-spinner animate-spin text-white"></i>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i className="fa-solid fa-camera text-white"></i>
                                            </div>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            accept="image/png, image/jpeg" 
                                            className="hidden" 
                                        />
                                    </div>
                                    <div className="text-center sm:text-left flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">รูปโปรไฟล์</h3>
                                        <p className="text-sm text-slate-500 mb-4 max-w-sm">
                                            รองรับไฟล์ .jpg หรือ .png ขนาดไม่เกิน 2MB รูปภาพจะถูกแสดงในหน้าโปรไฟล์และคอมเมนต์
                                        </p>
                                        <button 
                                            onClick={handleAvatarClick}
                                            disabled={uploading}
                                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition shadow-sm"
                                        >
                                            <i className="fa-solid fa-upload mr-2"></i> อัปโหลดรูปใหม่
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">ข้อมูลส่วนตัว</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">ชื่อจริง</label>
                                        <input 
                                            value={form.firstName}
                                            onChange={e => setForm({...form, firstName: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">นามสกุล</label>
                                        <input 
                                            value={form.lastName}
                                            onChange={e => setForm({...form, lastName: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card: Contact & Work */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-6 md:p-8">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">การติดต่อและการทำงาน</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">อีเมล</label>
                                        <div className="relative">
                                            <i className="fa-regular fa-envelope absolute left-4 top-3 text-slate-400"></i>
                                            <input 
                                                value={currentUser.email}
                                                disabled
                                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 pl-10 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">เบอร์โทรศัพท์</label>
                                        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 transition">
                                            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2.5 border-r border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-bold select-none text-sm">
                                                0
                                            </div>
                                            <input 
                                                value={getPhoneDisplayValue()}
                                                onChange={handlePhoneChange}
                                                className="w-full px-3 py-2.5 text-sm outline-none bg-transparent dark:text-white placeholder-slate-400"
                                                placeholder="XX-XXXX-XXX"
                                                inputMode="numeric"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700 my-2"></div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">หน่วยงาน/สังกัด</label>
                                        <input 
                                            value={form.organization}
                                            onChange={e => setForm({...form, organization: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">ตำแหน่ง</label>
                                        <input 
                                            list="positions"
                                            value={form.position}
                                            onChange={e => setForm({...form, position: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white transition"
                                        />
                                        <datalist id="positions">
                                            {HEALTH_POSITIONS.map(p => <option key={p} value={p} />)}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">ระดับ</label>
                                        <select 
                                            value={form.level}
                                            onChange={e => setForm({...form, level: e.target.value})}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white transition"
                                        >
                                            <option value="">-- เลือกระดับ --</option>
                                            {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-2">
                                <button 
                                    onClick={handleSaveProfile}
                                    disabled={loading}
                                    className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                                    บันทึกการเปลี่ยนแปลง
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- SECURITY TAB --- */}
                    {activeTab === 'security' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-6 md:p-8 animate-fade-in">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">เปลี่ยนรหัสผ่าน</h3>
                            <p className="text-sm text-slate-500 mb-6">เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านที่มีความยาวอย่างน้อย 8 ตัวอักษร</p>

                            <div className="max-w-md space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">รหัสผ่านใหม่</label>
                                    <div className="relative">
                                        <input 
                                            type={showPass ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900 dark:text-white transition"
                                            placeholder="New Password"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                        >
                                            <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                    
                                    {/* Strength Meter */}
                                    <div className="mt-2 flex gap-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div 
                                                key={step} 
                                                className={`flex-1 transition-all duration-300 ${strength >= step 
                                                    ? (strength <= 1 ? 'bg-rose-500' : strength <= 2 ? 'bg-amber-500' : 'bg-emerald-500') 
                                                    : 'bg-transparent'}`} 
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">ยืนยันรหัสผ่านใหม่</label>
                                    <input 
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            showToast({ type: 'info', title: 'ห้ามวาง', message: 'กรุณาพิมพ์ยืนยันรหัสผ่านด้วยตนเอง' });
                                        }}
                                        className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 dark:bg-slate-900 dark:text-white transition
                                            ${confirmPassword && newPassword !== confirmPassword ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-600 focus:ring-sky-500'}
                                        `}
                                        placeholder="Confirm New Password"
                                    />
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <div className="text-xs text-rose-500 mt-1 font-bold"><i className="fa-solid fa-triangle-exclamation mr-1"></i> รหัสผ่านไม่ตรงกัน</div>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <button 
                                        onClick={handleChangePassword}
                                        disabled={passLoading || !newPassword || newPassword !== confirmPassword || strength < 2}
                                        className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {passLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check"></i>}
                                        ยืนยันการเปลี่ยนรหัสผ่าน
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
