
import React, { useState, useEffect } from 'react';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface CookiePreferences {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean; // Keep for future proofing, even if not used yet
}

const DEFAULT_PREFERENCES: CookiePreferences = {
    necessary: true, // Always true and locked
    analytics: true,
    marketing: false
};

const CookieConsent: React.FC = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
    
    useEffect(() => {
        // Check local storage for existing consent
        const consent = localStorage.getItem('svk_cookie_consent');
        if (!consent) {
            // Delay slightly for animation effect on load
            setTimeout(() => setShowBanner(true), 1000);
        } else {
            try {
                setPreferences(JSON.parse(consent));
            } catch (e) {
                // If error parsing, reset
                localStorage.removeItem('svk_cookie_consent');
                setShowBanner(true);
            }
        }

        // Listen for an event to reopen settings (triggered from footer)
        const handleOpenSettings = () => {
             const current = localStorage.getItem('svk_cookie_consent');
             if(current) setPreferences(JSON.parse(current));
             setShowSettings(true);
        };
        
        window.addEventListener('open-cookie-settings', handleOpenSettings);
        return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
    }, []);

    const savePreferences = (prefs: CookiePreferences) => {
        localStorage.setItem('svk_cookie_consent', JSON.stringify(prefs));
        setPreferences(prefs);
        setShowBanner(false);
        setShowSettings(false);
    };

    const handleAcceptAll = () => {
        const allEnabled = { necessary: true, analytics: true, marketing: true };
        savePreferences(allEnabled);
    };

    const handleSaveSettings = () => {
        savePreferences(preferences);
    };

    const togglePreference = (key: keyof CookiePreferences) => {
        if (key === 'necessary') return; // Cannot toggle necessary
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <>
            {/* --- Cookie Banner (Bottom Fixed) --- */}
            {showBanner && !showSettings && (
                <div className="fixed bottom-0 left-0 right-0 z-[140] bg-slate-950 border-t border-slate-800 p-4 md:p-6 shadow-2xl animate-fade-in">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-slate-300 text-sm md:text-base flex-1">
                            <h4 className="text-white font-bold mb-1">เว็บไซต์ของเราใช้คุกกี้</h4>
                            <p className="leading-relaxed opacity-90 text-xs md:text-sm">
                                เราใช้คุกกี้เพื่อเพิ่มประสิทธิภาพและประสบการณ์ที่ดีในการใช้งานเว็บไซต์ของท่าน 
                                ท่านสามารถศึกษารายละเอียดได้ที่ <button onClick={() => setShowPolicy(true)} className="text-sky-400 hover:text-sky-300 underline font-bold">นโยบายคุกกี้</button> 
                                และสามารถจัดการความเป็นส่วนตัวของท่านได้โดยคลิกที่ปุ่มตั้งค่า
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                            <button 
                                onClick={() => setShowSettings(true)}
                                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                            >
                                ตั้งค่า
                            </button>
                            <button 
                                onClick={handleAcceptAll}
                                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 transition shadow-lg shadow-sky-900/50"
                            >
                                ยอมรับทั้งหมด
                            </button>
                            <button 
                                onClick={() => setShowBanner(false)}
                                className="md:hidden h-10 w-10 flex items-center justify-center text-slate-500"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Settings Modal --- */}
            {showSettings && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col ring-1 ring-slate-200 dark:ring-slate-700 animate-bounce-in overflow-hidden">
                        
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">ตั้งค่าความเป็นส่วนตัว</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                คุณสามารถเลือกการตั้งค่าคุกกี้โดยเปิด/ปิด คุกกี้ในแต่ละประเภทได้ตามความต้องการ ยกเว้นคุกกี้ที่จำเป็น
                            </p>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex items-center justify-end">
                                <button onClick={handleAcceptAll} className="text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline">
                                    ยอมรับทั้งหมด
                                </button>
                            </div>

                            {/* Section 1: Necessary */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        คุกกี้ที่มีความจำเป็น
                                        <span className="text-xs font-normal text-slate-400">(Strictly Necessary Cookies)</span>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-500">เปิดใช้งานตลอด</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    คุกกี้ประเภทนี้มีความจำเป็นต่อการให้บริการเว็บไซต์ของสำนักงานสาธารณสุขจังหวัดสตูล 
                                    เพื่อให้ท่านสามารถเข้าใช้งานในส่วนต่างๆ ของเว็บไซต์ได้ รวมถึงช่วยจดจำข้อมูลที่ท่านเคยให้ไว้ผ่านเว็บไซต์ 
                                    การปิดการใช้งานคุกกี้ประเภทนี้จะส่งผลให้ท่านไม่สามารถใช้บริการในสาระสำคัญของระบบ SKMS ได้
                                </p>
                            </div>

                            {/* Section 2: Analytics */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        คุกกี้เพื่อการวิเคราะห์
                                        <span className="text-xs font-normal text-slate-400">(Performance Cookies)</span>
                                    </div>
                                    {/* Toggle Switch */}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={preferences.analytics}
                                            onChange={() => togglePreference('analytics')}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    คุกกี้ประเภทนี้ช่วยให้เราทราบถึงการปฏิสัมพันธ์ของผู้ใช้งานในการใช้บริการเว็บไซต์ 
                                    รวมถึงหน้าเพจหรือพื้นที่ใดของเว็บไซต์ที่ได้รับความนิยม ตลอดจนการวิเคราะห์ข้อมูลด้านอื่น ๆ 
                                    เพื่อนำมาใช้ในการปรับปรุงการทำงานของเว็บไซต์ และเข้าใจพฤติกรรมของผู้ใช้งานมากขึ้น 
                                    (ข้อมูลจะถูกเก็บแบบไม่ระบุตัวตน)
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowSettings(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={handleSaveSettings}
                                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg"
                            >
                                บันทึกการตั้งค่า
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Privacy Policy Full Text Modal --- */}
            <PrivacyPolicyModal isOpen={showPolicy} onClose={() => setShowPolicy(false)} />
        </>
    );
};

export default CookieConsent;
