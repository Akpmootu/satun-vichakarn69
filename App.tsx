
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
          
          <div className="flex items-center gap-4">
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
                    className="ml-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-bold hover:from-sky-500 hover:to-indigo-500 transition shadow-lg shadow-sky-200 dark:shadow-sky-900/30 flex items-center gap-2 transform hover:-translate-y-0.5"
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
      <footer className={`mt-20 pt-16 pb-8 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-900 text-slate-300'}`}>
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
                  
                  {/* Column 1: Organization & About */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-4">
                           <div className="h-12 w-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-900/20">
                               <i className="fa-solid fa-building-columns text-white text-xl"></i>
                           </div>
                           <div>
                               <h3 className="text-xl font-black text-white tracking-tight">SKMS</h3>
                               <p className="text-xs font-bold text-sky-500 uppercase tracking-wider">Satun Provincial Public Health</p>
                           </div>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-400">
                          ระบบบริหารจัดการองค์ความรู้ (Knowledge Management) <br/>
                          เพื่อความเป็นเลิศทางสุขภาพ "ต้นน้ำ กลางน้ำ ปลายน้ำ" <br/>
                          สำนักงานสาธารณสุขจังหวัดสตูล
                      </p>
                      
                      {/* Only Real Contact / Social Links (Removed Placeholders) */}
                      <div className="flex gap-3">
                          <a href="#" className="px-4 py-2 rounded-lg bg-slate-800 flex items-center gap-2 hover:bg-sky-600 hover:text-white transition text-slate-400 border border-slate-700 text-xs font-bold" aria-label="Visit Website">
                              <i className="fa-solid fa-globe"></i>
                              <span>เว็บไซต์หลัก</span>
                          </a>
                      </div>
                  </div>

                  {/* Column 2: System Menu */}
                  <div>
                      <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                          <span className="w-1 h-6 bg-sky-500 rounded-full"></span>
                          เมนูระบบ
                      </h4>
                      <ul className="space-y-3">
                          {[
                              { id: 'home', label: 'หน้าหลัก (KM Portal)', icon: 'fa-house' },
                              { id: 'register', label: 'นำเข้าองค์ความรู้', icon: 'fa-cloud-arrow-up' },
                              { id: 'history', label: 'คลังความรู้ (KM Bank)', icon: 'fa-book-open' },
                              { id: 'analytics', label: 'สรุปสถานการณ์', icon: 'fa-chart-pie' },
                              { id: 'settings', label: 'ตั้งค่าระบบ', icon: 'fa-gear' },
                          ].map((item) => (
                              <li key={item.id}>
                                  <button 
                                      onClick={() => handleTabChange(item.id)} 
                                      className="group flex items-center gap-3 text-sm text-slate-400 hover:text-sky-400 transition w-full p-2 rounded-lg hover:bg-slate-800/50"
                                  >
                                      <div className="h-6 w-6 rounded flex items-center justify-center bg-slate-800 text-slate-500 group-hover:bg-sky-500 group-hover:text-white transition text-xs">
                                          <i className={`fa-solid ${item.icon}`}></i>
                                      </div>
                                      {item.label}
                                      <i className="fa-solid fa-chevron-right text-[10px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                  </button>
                              </li>
                          ))}
                      </ul>
                  </div>

                  {/* Column 3: Contact Info (Buttons) */}
                  <div>
                      <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                          <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                          ติดต่อสอบถาม
                      </h4>
                      
                      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-800 mb-6">
                          <div className="flex items-start gap-3 mb-1">
                              <i className="fa-solid fa-map-location-dot mt-1 text-sky-500 text-lg"></i>
                              <span className="text-sm leading-relaxed text-slate-300">
                                  <strong className="text-white block mb-1">สำนักงานสาธารณสุขจังหวัดสตูล</strong>
                                  เลขที่ 123 ถ.สติล ต.พิมาน อ.เมือง <br/>จ.สตูล 91000
                              </span>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <a 
                             href="tel:074123456" 
                             className="flex items-center gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-white transition group hover:shadow-lg hover:shadow-emerald-900/20 active:scale-95 duration-200"
                          >
                              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 group-hover:bg-white/20 flex items-center justify-center transition">
                                  <i className="fa-solid fa-phone"></i>
                              </div>
                              <div className="flex-1">
                                  <div className="text-xs font-bold opacity-70">เบอร์โทรศัพท์</div>
                                  <div className="font-mono text-lg font-bold">074-123-456</div>
                              </div>
                              <i className="fa-solid fa-arrow-up-right-from-square text-xs opacity-50"></i>
                          </a>

                          <a 
                             href="mailto:skms@satunhealth.go.th" 
                             className="flex items-center gap-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500 hover:text-white transition group hover:shadow-lg hover:shadow-rose-900/20 active:scale-95 duration-200"
                          >
                              <div className="h-10 w-10 rounded-lg bg-rose-500/20 group-hover:bg-white/20 flex items-center justify-center transition">
                                  <i className="fa-solid fa-envelope"></i>
                              </div>
                              <div className="flex-1">
                                  <div className="text-xs font-bold opacity-70">อีเมล (E-mail)</div>
                                  <div className="text-sm font-bold">skms@satunhealth.go.th</div>
                              </div>
                              <i className="fa-solid fa-arrow-up-right-from-square text-xs opacity-50"></i>
                          </a>
                      </div>
                  </div>
              </div>

              {/* Bottom Copyright */}
              <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                       <i className="fa-solid fa-code text-sky-500"></i>
                       <span>พัฒนาโดย กลุ่มงานพัฒนายุทธศาสตร์สาธารณสุข (IT SSJ SATUN)</span>
                  </div>
                  <div className="flex gap-6">
                      <a href="#" className="hover:text-slate-300 transition">นโยบายความเป็นส่วนตัว</a>
                      <a href="#" className="hover:text-slate-300 transition">เงื่อนไขการใช้งาน</a>
                      <span>&copy; {BUDGET_YEAR} All rights reserved.</span>
                  </div>
              </div>
          </div>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
