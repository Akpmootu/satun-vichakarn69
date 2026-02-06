import React, { useState } from 'react';
import { UserProfile } from '../types';
import { apiRegisterUser, apiLoginUser } from '../services/apiService';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  showToast: (t: any) => void;
}

const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState("");

  // Register State
  const [regForm, setRegForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", organization: "", position: ""
  });

  if (!isOpen) return null;

  const handleLogin = async () => {
    if (!loginEmail) {
        showToast({ type: 'error', title: 'ผิดพลาด', message: 'กรุณากรอกอีเมล' });
        return;
    }
    setLoading(true);
    try {
        const user = await apiLoginUser(loginEmail);
        showToast({ type: 'success', title: 'ยินดีต้อนรับ', message: `สวัสดีคุณ ${user.firstName}` });
        onSuccess(user);
    } catch (e: any) {
        showToast({ type: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', message: e.message });
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async () => {
      // Validate simple
      if (!regForm.firstName || !regForm.email) {
          showToast({ type: 'error', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' });
          return;
      }

      setLoading(true);
      try {
          const newUser: UserProfile = {
              id: Date.now().toString(),
              ...regForm
          };
          const user = await apiRegisterUser(newUser);
          showToast({ type: 'success', title: 'ลงทะเบียนสำเร็จ', message: 'ยินดีต้อนรับสมาชิกใหม่' });
          onSuccess(user);
      } catch (e: any) {
          showToast({ type: 'error', title: 'ลงทะเบียนไม่สำเร็จ', message: e.message });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in">
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => setMode('login')}
                className={`flex-1 py-4 text-sm font-bold transition ${mode === 'login' ? 'text-sky-600 bg-sky-50 border-b-2 border-sky-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                เข้าสู่ระบบ
            </button>
            <button 
                onClick={() => setMode('register')}
                className={`flex-1 py-4 text-sm font-bold transition ${mode === 'register' ? 'text-sky-600 bg-sky-50 border-b-2 border-sky-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                ลงทะเบียนใหม่
            </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
            {mode === 'login' ? (
                <div className="space-y-4">
                    <div className="text-center mb-6">
                        <div className="h-16 w-16 bg-sky-100 text-sky-600 rounded-full mx-auto flex items-center justify-center text-2xl mb-3">
                            <i className="fa-solid fa-lock"></i>
                        </div>
                        <h3 className="text-xl font-black text-slate-900">เข้าสู่ระบบสมาชิก</h3>
                        <p className="text-sm text-slate-500">เพื่อส่งผลงานและติดตามสถานะ</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">อีเมล</label>
                        <input 
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="user@example.com"
                        />
                    </div>

                    <button 
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                        {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'เข้าสู่ระบบ'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                     <div className="text-center mb-4">
                        <h3 className="text-lg font-black text-slate-900">ลงทะเบียนสมาชิกใหม่</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700">ชื่อ</label>
                            <input 
                                value={regForm.firstName}
                                onChange={(e) => setRegForm({...regForm, firstName: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700">นามสกุล</label>
                            <input 
                                value={regForm.lastName}
                                onChange={(e) => setRegForm({...regForm, lastName: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700">อีเมล (สำหรับล็อกอิน)</label>
                        <input 
                            type="email"
                            value={regForm.email}
                            onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="example@mail.com"
                        />
                    </div>

                     <div>
                        <label className="text-xs font-bold text-slate-700">เบอร์โทรศัพท์</label>
                        <input 
                            value={regForm.phone}
                            onChange={(e) => setRegForm({...regForm, phone: e.target.value})}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700">ตำแหน่ง</label>
                            <input 
                                value={regForm.position}
                                onChange={(e) => setRegForm({...regForm, position: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700">หน่วยงาน</label>
                            <input 
                                value={regForm.organization}
                                onChange={(e) => setRegForm({...regForm, organization: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition shadow-lg shadow-sky-200 mt-2 disabled:opacity-50"
                    >
                        {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'ยืนยันการลงทะเบียน'}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserAuthModal;