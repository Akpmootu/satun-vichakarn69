
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { apiUpdateUserProfile, apiUploadAvatar, apiChangePassword } from '../services/apiService';
import { HEALTH_POSITIONS, JOB_LEVELS } from '../constants';

interface ProfileSettingsProps {
    currentUser: UserProfile;
    onUpdateUser: (updatedUser: UserProfile) => void;
    showToast: (t: any) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdateUser, showToast }) => {
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
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [passLoading, setPassLoading] = useState(false);

    // --- Avatar Logic ---
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        
        const file = event.target.files[0];
        // Validate size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
             showToast({ type: 'error', title: 'ไฟล์ใหญ่เกินไป', message: 'รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2MB' });
             return;
        }

        try {
            setUploading(true);
            const publicUrl = await apiUploadAvatar(currentUser.id, file);
            
            // Immediately update profile with new avatar URL
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

    // --- Phone Number Formatting Logic ---
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove all non-digits
        let raw = e.target.value.replace(/\D/g, '');
        
        // Limit to 9 digits (since '0' is handled by prefix)
        if (raw.length > 9) raw = raw.substring(0, 9);

        // Apply masking XX-XXXX-XXX
        let formatted = "";
        if (raw.length > 0) {
            formatted += raw.substring(0, 2);
        }
        if (raw.length >= 3) {
            formatted += "-" + raw.substring(2, 6);
        }
        if (raw.length >= 7) {
            formatted += "-" + raw.substring(6, 9);
        }

        // Save full number to state (prepend '0')
        // If empty, just set empty string
        const finalValue = raw.length > 0 ? `0${formatted}` : '';
        setForm({ ...form, phone: finalValue });
    };

    // Helper to get display value for input (remove leading '0')
    const getPhoneDisplayValue = () => {
        if (!form.phone) return "";
        // If it starts with 0, strip it for the input field
        return form.phone.startsWith('0') ? form.phone.substring(1) : form.phone;
    };

    // --- Save Profile Logic ---
    const handleSave = async () => {
        if (!form.firstName || !form.lastName) {
            showToast({ type: 'error', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อและนามสกุล' });
            return;
        }

        // Validate Phone Length
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

    // --- Password Strength Logic ---
    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return 0;
        if (pass.length >= 8) score += 1; // Base length
        if (/[A-Z]/.test(pass)) score += 1; // Uppercase
        if (/[0-9]/.test(pass)) score += 1; // Number
        if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Special char
        return score;
    };

    const strength = calculateStrength(newPassword);
    
    const getStrengthColor = (s: number) => {
        if (s <= 1) return 'bg-rose-500';
        if (s <= 2) return 'bg-amber-500';
        if (s <= 3) return 'bg-emerald-400';
        return 'bg-emerald-600';
    };

    const getStrengthLabel = (s: number) => {
        if (s <= 1) return 'อ่อน (Weak)';
        if (s <= 2) return 'ปานกลาง (Medium)';
        if (s <= 3) return 'ดี (Good)';
        return 'ดีมาก (Strong)';
    };

    // --- Change Password Logic ---
    const handleChangePassword = async () => {
        // Validation
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
            setShowPasswordSection(false);
        } catch (e: any) {
            showToast({ type: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', message: e.message });
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-12 space-y-8">
            
            {/* 1. General Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-sky-500 to-indigo-600 relative">
                     <div className="absolute inset-0 bg-black/10"></div>
                </div>

                <div className="px-8 pb-8">
                    {/* Avatar Section */}
                    <div className="relative -mt-16 mb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative group">
                            <div 
                                onClick={handleAvatarClick}
                                className={`h-32 w-32 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden cursor-pointer bg-white dark:bg-slate-700 flex items-center justify-center relative ${uploading ? 'opacity-50' : ''}`}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-slate-300 dark:text-slate-500">
                                        {currentUser.firstName.charAt(0)}
                                    </span>
                                )}
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i className="fa-solid fa-camera text-white text-2xl"></i>
                                </div>
                            </div>
                            
                            {/* Hidden Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/png, image/jpeg" 
                                className="hidden" 
                            />
                            
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <i className="fa-solid fa-spinner animate-spin text-white text-2xl drop-shadow-md"></i>
                                </div>
                            )}
                        </div>

                        <div className="text-center md:text-left flex-1 pb-2">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {form.firstName} {form.lastName}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold">{currentUser.email}</p>
                            <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                                {currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : currentUser.role === 'reviewer' ? 'คณะกรรมการ' : 'สมาชิกทั่วไป'}
                            </span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ชื่อ</label>
                            <input 
                                value={form.firstName}
                                onChange={e => setForm({...form, firstName: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">นามสกุล</label>
                            <input 
                                value={form.lastName}
                                onChange={e => setForm({...form, lastName: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">เบอร์โทรศัพท์</label>
                            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 transition">
                                {/* Fixed Prefix '0' */}
                                <div className="bg-slate-100 dark:bg-slate-600 px-4 py-3 border-r border-slate-200 dark:border-slate-500 text-slate-500 dark:text-slate-300 font-bold select-none">
                                    0
                                </div>
                                <input 
                                    value={getPhoneDisplayValue()}
                                    onChange={handlePhoneChange}
                                    className="w-full px-4 py-3 outline-none bg-transparent dark:text-white placeholder-slate-400"
                                    placeholder="__ - ____ - ___"
                                    inputMode="numeric"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">* กรอกเฉพาะตัวเลข 9 หลักหลัง (ไม่ต้องใส่ 0 นำหน้า)</p>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">หน่วยงาน/สังกัด</label>
                            <input 
                                value={form.organization}
                                onChange={e => setForm({...form, organization: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ตำแหน่ง</label>
                            <input 
                                list="positions"
                                value={form.position}
                                onChange={e => setForm({...form, position: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white transition"
                            />
                            <datalist id="positions">
                                {HEALTH_POSITIONS.map(p => <option key={p} value={p} />)}
                            </datalist>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ระดับ</label>
                            <select 
                                value={form.level}
                                onChange={e => setForm({...form, level: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white transition"
                            >
                                <option value="">-- เลือกระดับ --</option>
                                {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Security / Password Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                        ความปลอดภัยและรหัสผ่าน
                    </h3>
                    <button 
                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition flex items-center gap-2
                            ${showPasswordSection ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'}
                        `}
                    >
                        {showPasswordSection ? 'ซ่อน' : 'เปลี่ยนรหัสผ่าน'}
                    </button>
                </div>

                {showPasswordSection && (
                    <div className="animate-fade-in bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">รหัสผ่านใหม่</label>
                                <div className="relative">
                                    <input 
                                        type={showPass ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-800 dark:text-white"
                                        placeholder="อย่างน้อย 8 ตัวอักษร"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                                    >
                                        <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                                
                                {/* Strength Meter */}
                                {newPassword && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <span>ระดับความปลอดภัย:</span>
                                            <span className={`${strength <= 1 ? 'text-rose-500' : strength <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {getStrengthLabel(strength)}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-300 ${getStrengthColor(strength)}`} 
                                                style={{ width: `${(strength / 4) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            * ควรมี 8 ตัวอักษรขึ้นไป, ตัวพิมพ์ใหญ่, ตัวเลข, และอักขระพิเศษ
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ยืนยันรหัสผ่าน</label>
                                <input 
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        showToast({ type: 'info', title: 'ห้ามวาง', message: 'กรุณาพิมพ์ยืนยันรหัสผ่านด้วยตนเอง' });
                                    }}
                                    className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 dark:bg-slate-800 dark:text-white transition
                                        ${confirmPassword && newPassword !== confirmPassword ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-600 focus:ring-sky-500'}
                                    `}
                                    placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                                />
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <div className="text-xs text-rose-500 mt-1">รหัสผ่านไม่ตรงกัน</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleChangePassword}
                                disabled={passLoading || !newPassword || newPassword !== confirmPassword || strength < 2}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {passLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-key"></i>}
                                ยืนยันเปลี่ยนรหัสผ่าน
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ProfileSettings;
