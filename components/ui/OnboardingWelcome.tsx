import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';

interface OnboardingWelcomeProps {
    currentUser: UserProfile | null;
    bannerUrl?: string; // Optional custom banner URL
    onWelcomeClose?: () => void; // Callback when closed
}

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ currentUser, bannerUrl, onWelcomeClose }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (currentUser) {
            const hasSeen = sessionStorage.getItem(`hasSeenOnboarding_${currentUser.id}`);
            if (!hasSeen) {
                setIsOpen(true);
            }
        }
    }, [currentUser]);

    if (!isOpen || !currentUser) return null;

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem(`hasSeenOnboarding_${currentUser.id}`, 'true');
        if (onWelcomeClose) {
            onWelcomeClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={handleClose}></div>
            
            <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl animate-flow-up z-10 flex flex-col md:flex-row">
                
                {/* Left Side: Large Banner Image */}
                <div className="w-full md:w-1/2 bg-sky-600 relative overflow-hidden flex items-center justify-center min-h-[250px] md:min-h-[500px] shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-sky-600 to-sky-900"></div>
                    <img 
                        src={bannerUrl || "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"}
                        alt="Welcome Banner" 
                        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                        referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 p-8 text-center md:text-left flex flex-col items-center md:items-start text-white">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/30">
                            <i className="fa-solid fa-rocket text-4xl text-white"></i>
                        </div>
                        <h2 className="text-3xl font-black mb-2 leading-tight">ระบบจัดการ<br/>องค์ความรู้จังหวัดสตูล</h2>
                        <p className="text-sky-100 font-light mt-4">แพลตฟอร์มส่วนกลางสำหรับการส่งผลงานวิชาการ แลกเปลี่ยนเรียนรู้ และสร้างนวัตกรรมสุขภาพอย่างยั่งยืน</p>
                    </div>
                </div>

                {/* Right Side: Welcome Message & Guide */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative pb-16 md:pb-12">
                    <div className="inline-block px-3 py-1 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 font-bold text-xs rounded-full mb-4 w-max">
                        เริ่มใช้งานระบบ
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        ยินดีต้อนรับ, คุณ{currentUser.firstName} <i className="fa-solid fa-face-smile text-amber-500"></i>
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                        ขอบคุณสำหรับการเข้าสู่ระบบ เราได้ออกแบบและพัฒนาระบบนี้ขึ้นเพื่อเป็นศูนย์กลางการขับเคลื่อนความรู้ของบุคลากรทางสาธารณสุข จังหวัดสตูล
                    </p>

                    <div className="space-y-6 mb-10">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-cloud-arrow-up text-sky-500"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">การนำเข้าผลงานง่ายขึ้น</h4>
                                <p className="text-xs text-slate-500 mt-1">อัปโหลดไฟล์ จัดเก็บข้อมูลอย่างเป็นระเบียบ พร้อมระบบติดตามสถานะ</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-chart-pie text-violet-500"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">วิเคราะห์ข้อมูลแบบ Real-time</h4>
                                <p className="text-xs text-slate-500 mt-1">ดูสถิติแยกตามสาขาและพื้นที่ ด้วยกราฟแบบ Interative</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ข้อมูลปลอดภัยด้วยเทคโนโลยีทันสมัย</h4>
                                <p className="text-xs text-slate-500 mt-1">มาตรฐานความปลอดภัยระดับสูง เก็บข้อมูลอย่างมิดชิด</p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleClose}
                        className="w-full py-4 bg-slate-900 dark:bg-sky-600 text-white font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-sky-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 mt-auto"
                    >
                        เริ่มต้นใช้งาน <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
                    </button>

                    <div className="mt-8 text-[10px] text-slate-400 dark:text-slate-500 font-light flex flex-col items-center text-center">
                        <i className="fa-solid fa-code text-sky-500 mb-1"></i>
                        <span className="font-medium text-slate-600 dark:text-slate-400 leading-tight">พัฒนาโดย กลุ่มงานสุขภาพดิจิทัล</span>
                        <span className="leading-tight">สำนักงานสาธารณสุขจังหวัดสตูล 2569</span>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default OnboardingWelcome;
