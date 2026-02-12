
import React, { useEffect, useState, useRef, useCallback } from "react";
import { BUDGET_YEAR } from "./constants";
import { AppSettings, Submission, ToastMessage, UserProfile } from "./types";
import { apiListSubmissions, loadSettings, getCurrentUser, logoutUser, apiGetUserProfile } from "./services/apiService";

import Registration from "./components/Registration";
import History from "./components/History";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import Home from "./components/Home";
import AdminPanel from "./components/AdminPanel";
import ReviewerPanel from "./components/ReviewerPanel";
import NewsModal from "./components/NewsModal";
import UserAuthModal from "./components/UserAuthModal";
import Toast from "./components/ui/Toast";
import Logo from "./components/ui/Logo";
import LoadingOverlay from "./components/ui/LoadingOverlay";

// Declare Swal globally
declare const Swal: any;

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNews, setShowNews] = useState(false);
  const [newsStartIndex, setNewsStartIndex] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // Editing State
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("svk_dark_mode");
    return saved ? JSON.parse(saved) : false;
  });

  // User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getCurrentUser());

  // Shared Data State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto Logout Timer Ref
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 Minutes

  // Apply Dark Mode Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem("svk_dark_mode", JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // --- Profile Sync Logic ---
  useEffect(() => {
      // If user is logged in, try to fetch the latest profile from DB to check for Role updates
      if (currentUser) {
          apiGetUserProfile(currentUser.id)
            .then(freshProfile => {
                // If role or details changed in DB, update local state
                if (JSON.stringify(freshProfile) !== JSON.stringify(currentUser)) {
                    setCurrentUser(freshProfile);
                    localStorage.setItem("svk_supabase_user", JSON.stringify(freshProfile));
                    if (freshProfile.role !== currentUser.role) {
                        showToast({type: 'info', title: 'อัปเดตสิทธิ์', message: `สิทธิ์ของคุณเปลี่ยนเป็น: ${freshProfile.role.toUpperCase()}`});
                    }
                }
            })
            .catch(err => console.error("Sync profile failed:", err));
      }
  }, []); // Run once on mount

  // Check Session for News Popup
  useEffect(() => {
    const dontShowAgain = localStorage.getItem("svk_dont_show_news");
    const hasSeenSession = sessionStorage.getItem("svk_has_seen_news");
    
    // Only show news for regular users or guests
    if (!dontShowAgain && !hasSeenSession && (!currentUser || currentUser.role === 'user')) {
      setTimeout(() => setShowNews(true), 1500); 
    }
  }, [currentUser]);

  // --- Auto Logout Logic ---
  const performLogoutAction = useCallback((isAuto: boolean = false) => {
    logoutUser();
    setCurrentUser(null);
    setSubmissions([]); 
    setEditingSubmission(null);
    handleTabChange('home');

    if (isAuto) {
        Swal.fire({
            title: 'หมดเวลาการใช้งาน',
            text: 'ระบบออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานเกิน 30 นาที',
            icon: 'info',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#0ea5e9',
            customClass: { popup: 'rounded-3xl' }
        });
    } else {
        showToast({ type: 'info', title: 'ออกจากระบบ', message: 'ไว้พบกันใหม่ครับ' });
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    if (currentUser) {
        inactivityTimer.current = setTimeout(() => {
            performLogoutAction(true);
        }, INACTIVITY_LIMIT);
    }
  }, [currentUser, performLogoutAction]);

  useEffect(() => {
    if (currentUser) {
        // Add event listeners to detect activity
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('keydown', resetInactivityTimer);
        window.addEventListener('click', resetInactivityTimer);
        window.addEventListener('scroll', resetInactivityTimer);
        
        // Initial start
        resetInactivityTimer();
    } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    }

    return () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        window.removeEventListener('mousemove', resetInactivityTimer);
        window.removeEventListener('keydown', resetInactivityTimer);
        window.removeEventListener('click', resetInactivityTimer);
        window.removeEventListener('scroll', resetInactivityTimer);
    };
  }, [currentUser, resetInactivityTimer]);
  // -------------------------

  const handleOpenNews = (index: number = 0) => {
      setNewsStartIndex(index);
      setShowNews(true);
  };

  const handleCloseNews = (dontShow: boolean) => {
    setShowNews(false);
    sessionStorage.setItem("svk_has_seen_news", "true");
    if (dontShow) {
        localStorage.setItem("svk_dont_show_news", "true");
    }
  };

  const showToast = (t: ToastMessage) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
      const result = await Swal.fire({
          title: 'ยืนยันการออกจากระบบ?',
          text: 'คุณต้องการออกจากระบบใช่หรือไม่',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#f43f5e', // rose-500
          cancelButtonColor: '#64748b',
          confirmButtonText: '<i class="fa-solid fa-right-from-bracket mr-2"></i>ออกจากระบบ',
          cancelButtonText: 'ยกเลิก',
          focusCancel: true,
          customClass: {
              popup: 'rounded-3xl',
              confirmButton: 'rounded-xl px-4 py-2',
              cancelButton: 'rounded-xl px-4 py-2'
          }
      });

      if (result.isConfirmed) {
          performLogoutAction(false);
      }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Pass null userId if admin or reviewer to fetch all
      const userId = (currentUser?.role === 'admin' || currentUser?.role === 'reviewer') ? undefined : currentUser?.id; 
      const data = await apiListSubmissions(settings, userId);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast({ type: "error", title: "Error loading data", message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Simulate Page Loading when switching tabs
  const handleTabChange = (tabId: string) => {
      // Allow re-clicking home to reset view or just return if same tab
      if (tabId === activeTab && tabId !== 'home') return;

      if ((tabId === 'register' || tabId === 'history') && !currentUser) {
          showToast({ type: 'info', title: 'ต้องเข้าสู่ระบบ', message: 'กรุณาเข้าสู่ระบบก่อนใช้งานเมนูนี้' });
          setShowAuth(true);
          return;
      }

      // If user clicks register tab manually, clear any pending edit session
      if (tabId === 'register') {
          setEditingSubmission(null);
      }

      setIsPageLoading(true);
      setTimeout(() => {
          setActiveTab(tabId);
          setIsPageLoading(false);
      }, 800); // Reduced delay slightly for snappier feel
  };

  const handleEditSubmission = (submission: Submission) => {
      setEditingSubmission(submission);
      setIsPageLoading(true);
      setTimeout(() => {
          setActiveTab('register');
          setIsPageLoading(false);
      }, 800);
  };

  // Reload data when settings change or tab switches to history/analytics
  // OR if user just logged in as admin/reviewer
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'analytics' || currentUser) {
       loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, activeTab, currentUser]);

  const tabs = [
    { id: "home", label: "หน้าหลัก", icon: "fa-house" },
    { id: "register", label: "ลงทะเบียนส่งงาน", icon: "fa-pen-to-square" },
    { id: "history", label: "ประวัติผลงาน", icon: "fa-clock-rotate-left" },
    { id: "analytics", label: "วิเคราะห์", icon: "fa-chart-pie" },
    { id: "settings", label: "ตั้งค่า", icon: "fa-gear" },
  ];

  // Helper to check if special view
  const isAdmin = currentUser?.role === 'admin';
  const isReviewer = currentUser?.role === 'reviewer';

  return (
    <div className={`min-h-screen font-sans pb-10 flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Full Screen Loading Overlay */}
      <LoadingOverlay isLoading={isPageLoading} />

      {/* News Popup Modal (Only standard flow) */}
      <NewsModal isOpen={showNews} onClose={handleCloseNews} initialIndex={newsStartIndex} />
      
      {/* Auth Modal */}
      <UserAuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        onSuccess={(user) => {
            setCurrentUser(user);
            setShowAuth(false);
        }}
        showToast={showToast}
      />

      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
             className="cursor-pointer hover:opacity-80 transition"
             onClick={() => handleTabChange('home')}
          >
             <Logo />
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:block px-3 py-1 rounded-full text-[10px] font-bold border tracking-wider transition-colors duration-300
                ${darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}">
                {settings.mode === 'mock' ? 'MOCK SYSTEM' : 'LIVE SYSTEM'}
             </div>

             {/* Dark Mode Toggle */}
             <button
                onClick={toggleDarkMode}
                className={`h-10 w-10 rounded-full flex items-center justify-center transition shadow-lg ${darkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-white text-slate-400 hover:text-slate-600 shadow-slate-200'}`}
                title="Toggle Dark Mode"
             >
                <i className={`fa-solid ${darkMode ? 'fa-moon' : 'fa-sun'}`}></i>
             </button>
             
             {currentUser ? (
                 <div className="flex items-center gap-3 pl-3">
                     <div className={`hidden md:flex items-center gap-3 px-3 py-1.5 rounded-2xl border transition-all duration-300 shadow-sm
                        ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                         
                         {/* Avatar Circle */}
                         <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold border-2
                            ${isAdmin ? 'bg-rose-100 text-rose-600 border-rose-200' : 
                              isReviewer ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 
                              'bg-sky-100 text-sky-600 border-sky-200'}
                         `}>
                             {currentUser.firstName.charAt(0)}
                         </div>

                         <div className="text-right leading-tight">
                             <div className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                 {currentUser.firstName} {currentUser.lastName}
                             </div>
                             <div className="flex items-center justify-end gap-2">
                                 <span className="text-[10px] text-slate-500 font-medium">{currentUser.position || 'สมาชิกทั่วไป'}</span>
                                 {isAdmin && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-bold uppercase tracking-wider">Admin</span>}
                                 {isReviewer && <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider">Reviewer</span>}
                             </div>
                         </div>
                     </div>

                     <div className={`h-8 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} mx-1 hidden md:block`}></div>

                     <button 
                        onClick={handleLogout}
                        className={`h-10 w-10 rounded-full flex items-center justify-center hover:bg-slate-700 hover:scale-105 active:scale-95 transition shadow-lg border-2 ${darkMode ? 'bg-slate-800 text-rose-400 border-slate-700 shadow-slate-900' : 'bg-white text-rose-500 border-slate-100 shadow-slate-200'}`}
                        title="ออกจากระบบ"
                     >
                         <i className="fa-solid fa-power-off"></i>
                     </button>
                 </div>
             ) : (
                 <button 
                    onClick={() => setShowAuth(true)}
                    className="ml-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-300 flex items-center gap-2 dark:bg-sky-600 dark:hover:bg-sky-500 dark:shadow-sky-900/30"
                 >
                    <i className="fa-solid fa-right-to-bracket"></i>
                    <span>เข้าสู่ระบบ</span>
                 </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 mt-8">
        
        {/* Render Special Panels for Admin/Reviewer OR Standard Tabs for Users */}
        {isAdmin ? (
            <AdminPanel 
                submissions={submissions} 
                settings={settings} 
                refreshData={loadData} 
                showToast={showToast} 
            />
        ) : isReviewer ? (
            <ReviewerPanel 
                submissions={submissions} 
                settings={settings} 
                refreshData={loadData} 
                showToast={showToast} 
            />
        ) : (
            <>
                {/* Navigation Tabs (Only for standard users) */}
                <nav className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-6 justify-center md:justify-start">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`whitespace-nowrap flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 border ${
                            activeTab === tab.id 
                            ? (darkMode ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-900/50 transform -translate-y-1' : 'bg-slate-900 text-white shadow-lg shadow-slate-300 transform -translate-y-1 border-slate-900')
                            : (darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200 hover:border-slate-300 hover:text-slate-700')
                        }`}
                        >
                        <i className={`fa-solid ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
                </nav>

                {/* Content Area */}
                <div className="min-h-[600px] animate-fade-in">
                {activeTab === 'home' && (
                    <Home 
                        onNavigate={handleTabChange} 
                        currentUser={currentUser}
                        onLoginRequest={() => setShowAuth(true)}
                        userSubmissions={submissions.filter(s => s.userId === currentUser?.id)}
                        showToast={showToast}
                        onOpenNews={handleOpenNews}
                    />
                )}

                {activeTab === 'register' && (
                    <Registration 
                        settings={settings} 
                        showToast={showToast}
                        currentUser={currentUser} 
                        onSuccess={() => {
                            loadData(); 
                            handleTabChange('history');
                        }} 
                        editingSubmission={editingSubmission}
                        onCancelEdit={() => setEditingSubmission(null)}
                    />
                )}
                
                {activeTab === 'history' && (
                    <History 
                        submissions={submissions}
                        loading={loading} 
                        refreshList={loadData} 
                        settings={settings} 
                        showToast={showToast} 
                        onEdit={handleEditSubmission}
                    />
                )}
                
                {activeTab === 'analytics' && (
                    <Dashboard submissions={submissions} />
                )}
                
                {activeTab === 'settings' && (
                    <Settings 
                        settings={settings} 
                        onUpdate={setSettings} 
                        showToast={showToast} 
                    />
                )}
                </div>
            </>
        )}

      </main>

      {/* Official Footer */}
      <footer className={`mt-20 pt-16 pb-8 border-t-4 border-sky-500 transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-300 border-t-sky-600' : 'bg-slate-900 text-white'}`}>
          <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                  {/* Column 1: Organization */}
                  <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                           <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
                               <i className="fa-solid fa-building-columns text-slate-900 text-xl"></i>
                           </div>
                           <div>
                               <h3 className="text-lg font-bold leading-tight text-white">SKMS</h3>
                               <p className="text-sm text-slate-400">สำนักงานสาธารณสุขจังหวัดสตูล</p>
                           </div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          Satun Knowledge Management Systems <br/>
                          "ต้นน้ำ กลางน้ำ ปลายน้ำ" <br/>
                          ระบบรวบรวมและบริหารจัดการองค์ความรู้เพื่อความเป็นเลิศทางสุขภาพ
                      </p>
                      <div className="flex gap-4 pt-2">
                          <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-sky-600 transition text-white">
                              <i className="fa-brands fa-facebook-f"></i>
                          </a>
                          <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-sky-500 transition text-white">
                              <i className="fa-brands fa-twitter"></i>
                          </a>
                          <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-500 transition text-white">
                              <i className="fa-brands fa-line"></i>
                          </a>
                      </div>
                  </div>

                  {/* Column 2: Quick Links */}
                  <div>
                      <h4 className="text-lg font-bold mb-6 border-l-4 border-sky-500 pl-3 text-white">เมนูระบบ</h4>
                      <ul className="space-y-3 text-sm text-slate-300">
                          <li><button onClick={() => handleTabChange('home')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> หน้าหลัก (KM Portal)</button></li>
                          <li><button onClick={() => handleTabChange('register')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> นำเข้าองค์ความรู้</button></li>
                          <li><button onClick={() => handleTabChange('history')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> คลังความรู้ (KM Bank)</button></li>
                          <li><button onClick={() => handleTabChange('analytics')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> สรุปสถานการณ์</button></li>
                          <li><button onClick={() => handleTabChange('settings')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> ตั้งค่าระบบ</button></li>
                      </ul>
                  </div>

                  {/* Column 3: Contact */}
                  <div>
                      <h4 className="text-lg font-bold mb-6 border-l-4 border-emerald-500 pl-3 text-white">ติดต่อสอบถาม</h4>
                      <ul className="space-y-4 text-sm text-slate-300">
                          <li className="flex items-start gap-3">
                              <i className="fa-solid fa-map-location-dot mt-1 text-sky-500"></i>
                              <span>สำนักงานสาธารณสุขจังหวัดสตูล<br/>เลขที่ 123 ถ.สติล ต.พิมาน อ.เมือง จ.สตูล 91000</span>
                          </li>
                          <li className="flex items-center gap-3">
                              <i className="fa-solid fa-phone text-emerald-500"></i>
                              <a href="tel:074123456" className="hover:text-emerald-400 transition">074-123-456 ต่อ 110-112</a>
                          </li>
                          <li className="flex items-center gap-3">
                              <i className="fa-solid fa-envelope text-rose-500"></i>
                              <a href="mailto:skms@satunhealth.go.th" className="hover:text-rose-400 transition">skms@satunhealth.go.th</a>
                          </li>
                      </ul>
                  </div>
              </div>

              {/* Bottom Copyright */}
              <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                       <i className="fa-solid fa-code"></i>
                       <span>พัฒนาโดย กลุ่มงานพัฒนายุทธศาสตร์สาธารณสุข (IT SSJ SATUN)</span>
                  </div>
                  <div>
                      &copy; {BUDGET_YEAR} Satun Provincial Public Health Office. All rights reserved.
                  </div>
              </div>
          </div>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
