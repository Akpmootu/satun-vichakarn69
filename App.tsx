
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { BUDGET_YEAR, BRANCHES } from "./constants";
import { AppSettings, Submission, ToastMessage, UserProfile, VisitorStats, NewsItem } from "./types";
import { apiListSubmissions, loadSettings, getCurrentUser, logoutUser, apiGetUserProfile, subscribeToVisitorPresence, subscribeToStatsUpdates, apiGetVisitorStats, apiRecordVisit, apiFetchNewsAsync } from "./services/apiService";
import { supabase } from "./lib/supabaseClient";
import Registration from "./components/Registration";
import History from "./components/History";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import Home from "./components/Home";
import AdminPanel from "./components/AdminPanel";
import ReviewerPanel from "./components/ReviewerPanel";
import ProfileSettings from "./components/ProfileSettings";
import NewsModal from "./components/NewsModal";
import UserAuthModal from "./components/UserAuthModal";
import FeedbackModal from "./components/FeedbackModal";
import Toast from "./components/ui/Toast";
import Logo from "./components/ui/Logo";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import CookieConsent from "./components/privacy/CookieConsent";
import PrivacyPolicyModal from "./components/privacy/PrivacyPolicyModal";
import OnboardingWelcome from "./components/ui/OnboardingWelcome";

// Declare Swal globally
declare const Swal: any;

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNews, setShowNews] = useState(false);
  const [newsStartIndex, setNewsStartIndex] = useState(0);
  const [newsList, setNewsList] = useState<NewsItem[]>([]); // News State
  const [showAuth, setShowAuth] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  // ...

  // Fetch News
  const fetchNews = async () => {
    try {
      const news = await apiFetchNewsAsync();
      setNewsList(news);
    } catch (e) {
      console.error("Failed to fetch news", e);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // ... (rest of the code)
  
  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false); // For desktop dropdown
  
  // Privacy Modals State
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

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
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // Stats State
  const [visitorStats, setVisitorStats] = useState<VisitorStats>({ online: 1, today: 0, week: 0, month: 0, year: 0, total: 0 });

  // Auto Logout Timer Ref
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 Minutes
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Helper to check if special view
  const isAdmin = currentUser?.role === 'admin';
  const isReviewer = currentUser?.role === 'reviewer';

  const mySubmissions = useMemo(() => {
     if (!currentUser) return [];
     return allSubmissions.filter(s => {
         if (s.userId === currentUser.id) return true;
         // Check if user is a co-author (match by ID or Email)
         if (s.coAuthors && Array.isArray(s.coAuthors)) {
             return s.coAuthors.some(ca => ca.id === currentUser.id || (currentUser.email && ca.email === currentUser.email));
         }
         return false;
     });
  }, [allSubmissions, currentUser]);

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

  // Scroll to Top Listener
  useEffect(() => {
      const handleScroll = () => {
          if (window.scrollY > 300) {
              setShowScrollTop(true);
          } else {
              setShowScrollTop(false);
          }
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside listener for profile menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
              setShowProfileMenu(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Profile Sync Logic ---
  useEffect(() => {
      // Listen for auth state changes (e.g. invalid refresh token, signed out)
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session && currentUser)) {
              logoutUser();
              setCurrentUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session) {
              // Note: You can sync the session if needed here
          }
      });

      if (currentUser) {
          apiGetUserProfile(currentUser.id)
            .then(freshProfile => {
                if (JSON.stringify(freshProfile) !== JSON.stringify(currentUser)) {
                    setCurrentUser(freshProfile);
                    localStorage.setItem("svk_supabase_user", JSON.stringify(freshProfile));
                    if (freshProfile.role !== currentUser.role) {
                        showToast({type: 'info', title: 'อัปเดตสิทธิ์', message: `สิทธิ์ของคุณเปลี่ยนเป็น: ${freshProfile.role.toUpperCase()}`});
                    }
                }
            })
            .catch(err => {
                console.error("Sync profile failed:", err);
                if (err.message?.includes("Invalid Refresh Token") || err.message?.includes("Refresh Token Not Found") || err.message?.includes("token")) {
                    logoutUser();
                    setCurrentUser(null);
                }
            });
      }

      return () => {
          authListener.subscription.unsubscribe();
      };
  }, []); 

  // --- Visitor Stats & Logging Logic ---
  useEffect(() => {
      // 1. Presence (Who is online right now)
      const unsubscribePresence = subscribeToVisitorPresence((count) => {
          setVisitorStats(prev => ({ ...prev, online: count }));
      });

      // 2. Fetch Initial Aggregated Stats (Total, Week, etc)
      apiGetVisitorStats().then(data => {
          setVisitorStats(prev => ({ ...prev, ...data }));
      }).catch(err => console.error("Visitor stats load error:", err));

      // 3. Realtime Stats Updates (Listen for new logs)
      const unsubscribeStats = subscribeToStatsUpdates((newStats) => {
          setVisitorStats(prev => ({ ...prev, ...newStats }));
      });

      // 4. Record Visit (Once per session)
      const hasRecorded = sessionStorage.getItem('svk_visit_recorded');
      if (!hasRecorded) {
          let clientId = localStorage.getItem('svk_client_id');
          if (!clientId) {
              clientId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
              localStorage.setItem('svk_client_id', clientId);
          }
          apiRecordVisit(clientId, currentUser?.id);
          sessionStorage.setItem('svk_visit_recorded', 'true');
      }

      return () => {
          unsubscribePresence();
          unsubscribeStats();
      };
  }, []);

  // Check Session for News Popup
  useEffect(() => {
    const dontShowAgain = localStorage.getItem("svk_dont_show_news");
    const hasSeenSession = sessionStorage.getItem("svk_has_seen_news");
    
    // Check if onboarding needs to be shown for the logged-in user
    let willShowOnboarding = false;
    if (currentUser) {
        const hasSeenOnb = sessionStorage.getItem(`hasSeenOnboarding_${currentUser.id}`);
        if (!hasSeenOnb) willShowOnboarding = true;
    }
    
    if (!willShowOnboarding && !dontShowAgain && !hasSeenSession && (!currentUser || currentUser.role === 'user')) {
      setTimeout(() => setShowNews(true), 1500); 
    }
  }, [currentUser]);

  // --- Auto Logout Logic ---
  const performLogoutAction = useCallback((isAuto: boolean = false) => {
    logoutUser();
    setCurrentUser(null);
    setAllSubmissions([]); 
    setEditingSubmission(null);
    handleTabChange('home');
    setShowProfileMenu(false);

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
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('keydown', resetInactivityTimer);
        window.addEventListener('click', resetInactivityTimer);
        window.addEventListener('scroll', resetInactivityTimer);
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
          confirmButtonColor: '#f43f5e', 
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
      const data = await apiListSubmissions(settings, undefined);
      setAllSubmissions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (!e.message?.includes("Refresh Token") && !e.message?.includes("session") && !e.message?.includes("token")) {
          showToast({ type: "error", title: "Error loading data", message: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId: string) => {
      if (tabId === activeTab && tabId !== 'home') return;

      if ((tabId === 'register' || tabId === 'history' || tabId === 'profile') && !currentUser) {
          showToast({ type: 'info', title: 'ต้องเข้าสู่ระบบ', message: 'กรุณาเข้าสู่ระบบก่อนใช้งานเมนูนี้' });
          setShowAuth(true);
          return;
      }

      if (tabId === 'register') {
          setEditingSubmission(null);
      }

      setIsPageLoading(true);
      setIsMobileMenuOpen(false); // Close mobile menu
      setShowProfileMenu(false); // Close profile dropdown
      
      // Increased delay to 2.5s (2500ms) as requested
      setTimeout(() => {
          setActiveTab(tabId);
          setIsPageLoading(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2500);
  };

  const handleEditSubmission = (submission: Submission) => {
      setEditingSubmission(submission);
      setIsPageLoading(true);
      setTimeout(() => {
          setActiveTab('register');
          setIsPageLoading(false);
      }, 2500); // Also increase edit navigation delay
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
      setCurrentUser(updatedUser);
  };

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'analytics' || currentUser) {
       loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, activeTab, currentUser]);

  const triggerCookieSettings = () => {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
  };

  // --- Navigation Data Logic (Reordered) ---
  const allTabs = [
    { id: "home", label: "หน้าหลัก", icon: "fa-house" },
    { id: "analytics", label: "วิเคราะห์", icon: "fa-chart-pie" },
    { id: "register", label: "ลงทะเบียนส่งผลงาน", icon: "fa-pen-to-square" },
    { id: "history", label: "ประวัติผลงาน", icon: "fa-clock-rotate-left" },
    { id: "assessment", label: "ประเมินผลงาน", icon: "fa-clipboard-check" },
    { id: "settings", label: "ตั้งค่าระบบ", icon: "fa-gear" },
  ];

  // Filter tabs
  const navTabs = useMemo(() => {
      return allTabs.filter(tab => {
          if (tab.id === 'settings') return isAdmin;
          if (tab.id === 'assessment') return isReviewer;
          if (isReviewer) {
              if (tab.id === 'home' || tab.id === 'register' || tab.id === 'history') return false;
          } else {
              if (tab.id === 'assessment') return false;
          }
          return true;
      });
  }, [isAdmin, isReviewer]);

  // Adjust active tab when role changes
  useEffect(() => {
      if (isReviewer && (activeTab === 'home' || activeTab === 'register' || activeTab === 'history')) {
          setActiveTab('assessment');
      }
      if (isAdmin && activeTab === 'home') {
          setActiveTab('settings');
      }
  }, [isReviewer, isAdmin, activeTab]);

  return (
    <div className={`min-h-screen font-sans pb-10 flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Privacy Components */}
      <CookieConsent />
      <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} />

      {/* Full Screen Loading Overlay */}
      <LoadingOverlay isLoading={isPageLoading} />

      {/* News Popup Modal */}
      <NewsModal isOpen={showNews} onClose={handleCloseNews} initialIndex={newsStartIndex} newsList={newsList.filter(n => n.type === 'news')} />
      
      {/* Auth Modal */}
      <UserAuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        onSuccess={(user) => {
            setCurrentUser(user);
            setShowAuth(false);
            if (user.role === 'reviewer') {
                setActiveTab('assessment');
            } else if (user.role === 'admin') {
                setActiveTab('settings');
            }
        }}
        showToast={showToast}
      />

      {/* Feedback Modal */}
      {currentUser && (
          <FeedbackModal 
            isOpen={showFeedbackModal} 
            onClose={() => setShowFeedbackModal(false)} 
            userId={currentUser.id} 
            showToast={showToast} 
          />
      )}
      
      {/* Onboarding Welcome */}
      <OnboardingWelcome 
        currentUser={currentUser} 
        bannerUrl={newsList.find(n => n.type === 'welcome_banner')?.imageUrl || undefined}
        onWelcomeClose={() => {
            const dontShowAgain = localStorage.getItem("svk_dont_show_news");
            const hasSeenSession = sessionStorage.getItem("svk_has_seen_news");
            if (!dontShowAgain && !hasSeenSession && (!currentUser || currentUser.role === 'user')) {
                setTimeout(() => setShowNews(true), 500); 
            }
        }}
      />

      {/* --- Sticky Top Header --- */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} border-b backdrop-blur-md`}>
        {/* ... Header Content ... */}
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          
          {/* 1. Logo */}
          <div 
             className="cursor-pointer hover:opacity-80 transition flex-shrink-0"
             onClick={() => handleTabChange('home')}
          >
             <Logo className="h-10 md:h-12" />
          </div>
          
          {/* 2. Desktop Navigation */}
          {!isAdmin && (
              <nav className="hidden lg:flex items-center gap-1">
                  {navTabs.map(tab => {
                      const isActive = activeTab === tab.id;
                      if(tab.id === 'settings') return null; // Already filtered but just in case
                      return (
                          <button
                              key={tab.id}
                              onClick={() => handleTabChange(tab.id)}
                              className={`
                                  relative px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2
                                  ${isActive 
                                      ? (darkMode ? 'bg-slate-800 text-sky-400' : 'bg-slate-100 text-sky-600') 
                                      : (darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50')
                                  }
                              `}
                          >
                              <i className={`fa-solid ${tab.icon} ${isActive ? '' : 'opacity-70'}`}></i>
                              {tab.label}
                              {isActive && (
                                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-sky-500 rounded-t-full"></span>
                              )}
                          </button>
                      );
                  })}
              </nav>
          )}

          {/* 3. Right Side Actions */}
          <div className="flex items-center gap-3">
             
             {/* Desktop Dark Mode */}
             <button
                onClick={toggleDarkMode}
                className={`hidden md:flex h-10 w-10 rounded-full items-center justify-center transition shadow-sm ${darkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                title="Toggle Dark Mode"
             >
                <i className={`fa-solid ${darkMode ? 'fa-moon' : 'fa-sun'}`}></i>
             </button>
             
             {currentUser ? (
                 <div className="relative pl-2" ref={profileMenuRef}>
                     {/* User Profile Trigger */}
                     <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className={`cursor-pointer flex items-center gap-3 px-1 md:px-3 py-1.5 rounded-full md:rounded-2xl transition-all duration-300 md:border md:shadow-sm select-none
                        ${darkMode ? 'md:bg-slate-800/50 md:border-slate-700 hover:bg-slate-800' : 'md:bg-white md:border-slate-200 hover:bg-slate-50'}`}
                     >
                         {/* Avatar */}
                         <div className="relative shrink-0">
                             <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold border-2 overflow-hidden
                                ${isAdmin ? 'bg-rose-100 text-rose-600 border-rose-200' : 
                                  isReviewer ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 
                                  'bg-sky-100 text-sky-600 border-sky-200'}
                             `}>
                                 {currentUser.avatarUrl ? (
                                     <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                 ) : currentUser.prefix === 'นาย' ? (
                                     <i className="fa-solid fa-user-tie"></i>
                                 ) : currentUser.prefix === 'นาง' || currentUser.prefix === 'นางสาว' ? (
                                     <i className="fa-solid fa-user-nurse"></i>
                                 ) : (
                                     currentUser.firstName.charAt(0)
                                 )}
                             </div>
                             {currentUser.isVerified && (
                                 <div 
                                    className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full w-4 h-4 flex items-center justify-center" 
                                    title={currentUser.verifiedBy ? "ยืนยันตัวตนแล้วโดยแอดมิน" : "ยืนยันตัวตนแล้ว"}
                                 >
                                     <i className="fa-solid fa-circle-check text-blue-500 text-sm"></i>
                                 </div>
                             )}
                         </div>

                         {/* Text Info */}
                         <div className="text-right leading-tight hidden md:block">
                             <div className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                 {currentUser.prefix && `${currentUser.prefix} `}{currentUser.firstName} {currentUser.lastName}
                             </div>
                             <div className="text-[10px] text-slate-500 font-medium">
                                 {currentUser.role === 'reviewer' && currentUser.branchId ? (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5">
                                        สาขา: {BRANCHES.find((b: any) => b.id.toString() === currentUser.branchId?.toString())?.label || currentUser.branchId}
                                    </span>
                                 ) : null}
                                 {currentUser.position || 'สมาชิกทั่วไป'}
                                 {currentUser.level && (
                                     <span className="ml-1.5 text-sky-600 dark:text-sky-400 font-bold">
                                         {currentUser.level}
                                     </span>
                                 )}
                             </div>
                         </div>

                         {/* Dropdown Icon */}
                         <i className={`fa-solid fa-chevron-down text-xs text-slate-400 hidden md:block transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}></i>
                     </div>

                     {/* Dropdown Menu */}
                     {showProfileMenu && (
                         <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden animate-fade-in z-50">
                             <div className="p-4 border-b border-slate-100 dark:border-slate-700 md:hidden">
                                 <div className="font-bold text-slate-900 dark:text-white">{currentUser.firstName}</div>
                                 <div className="text-xs text-slate-500">{currentUser.email}</div>
                             </div>
                             
                             <button 
                                onClick={() => handleTabChange('profile')}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition"
                             >
                                 <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 flex items-center justify-center">
                                     <i className="fa-solid fa-user-pen"></i>
                                 </div>
                                 แก้ไขข้อมูลส่วนตัว
                             </button>

                             {isAdmin && (
                                 <button 
                                    onClick={() => handleTabChange('settings')}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition"
                                 >
                                     <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center">
                                         <i className="fa-solid fa-gear"></i>
                                     </div>
                                     ตั้งค่าระบบ
                                 </button>
                             )}

                             <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                             
                             <button 
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3 text-sm font-bold text-rose-600 transition"
                             >
                                 <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center">
                                     <i className="fa-solid fa-right-from-bracket"></i>
                                 </div>
                                 ออกจากระบบ
                             </button>
                         </div>
                     )}
                 </div>
             ) : (
                 <button 
                    onClick={() => setShowAuth(true)}
                    className="ml-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-bold hover:from-sky-500 hover:to-indigo-500 transition shadow-lg shadow-sky-200 dark:shadow-sky-900/30 flex items-center gap-2 transform hover:-translate-y-0.5"
                 >
                    <i className="fa-solid fa-right-to-bracket"></i>
                    <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                 </button>
             )}

             {/* Hamburger Button (Mobile Only) */}
             {!isAdmin && !isReviewer && (
                 <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`lg:hidden ml-1 h-10 w-10 rounded-xl flex items-center justify-center transition border ${isMobileMenuOpen ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                 >
                    <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}></i>
                 </button>
             )}
          </div>
        </div>

        {/* --- Mobile Dropdown Menu --- */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-screen opacity-100 border-t border-slate-100 dark:border-slate-800' : 'max-h-0 opacity-0'}`}>
            <div className={`p-4 space-y-2 shadow-lg ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                {navTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition ${activeTab === tab.id 
                            ? (darkMode ? 'bg-slate-800 text-sky-400 font-bold' : 'bg-sky-50 text-sky-700 font-bold') 
                            : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${activeTab === tab.id ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <i className={`fa-solid ${tab.icon} text-sm`}></i>
                        </div>
                        {tab.label}
                    </button>
                ))}
                
                {/* Mobile Dark Mode Toggle */}
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <span className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <i className={`fa-solid ${darkMode ? 'fa-moon text-amber-400' : 'fa-sun text-slate-500'}`}></i>
                            </div>
                            {darkMode ? 'โหมดกลางคืน (On)' : 'โหมดกลางคืน (Off)'}
                        </span>
                        <div className={`w-10 h-5 rounded-full relative transition ${darkMode ? 'bg-sky-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${darkMode ? 'left-6' : 'left-1'}`}></div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 mt-8">
        {/* Back to Home Button */}
        {activeTab !== 'home' && (
            <div className="mb-6">
                <button 
                   onClick={() => handleTabChange('home')}
                   className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 text-sm font-semibold rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700 transition hover:shadow-md hover:-translate-y-0.5"
                >
                   <i className="fa-solid fa-house"></i>
                   กลับสู่หน้าหลัก
                </button>
            </div>
        )}
        
        {/* ... Main Content Logic ... */}
        {isAdmin ? (
            activeTab === 'profile' ? (
                <ProfileSettings 
                    currentUser={currentUser!} 
                    onUpdateUser={handleUpdateUser} 
                    showToast={showToast} 
                />
            ) : (
                <AdminPanel 
                    submissions={allSubmissions} 
                    settings={settings} 
                    refreshData={loadData} 
                    showToast={showToast}
                    newsList={newsList}
                    onNewsUpdate={fetchNews}
                    currentUser={currentUser}
                />
            )
        ) : isReviewer ? (
             <div className="min-h-[600px] animate-fade-in">
                {activeTab === 'home' && (
                    <Home 
                        onNavigate={handleTabChange} 
                        currentUser={currentUser}
                        onLoginRequest={() => setShowAuth(true)}
                        userSubmissions={mySubmissions}
                        showToast={showToast}
                        onOpenNews={handleOpenNews}
                        newsList={newsList}
                    />
                )}
                {activeTab === 'analytics' && (
                    <Dashboard 
                        submissions={allSubmissions} 
                        onViewAll={() => handleTabChange('history')}
                    />
                )}
                {activeTab === 'profile' && (
                    <ProfileSettings 
                        currentUser={currentUser!} 
                        onUpdateUser={handleUpdateUser} 
                        showToast={showToast} 
                    />
                )}
                {activeTab === 'assessment' && (
                    <ReviewerPanel 
                        submissions={allSubmissions} 
                        settings={settings} 
                        refreshData={loadData} 
                        showToast={showToast}
                        currentUser={currentUser!}
                        onTriggerFeedback={() => setShowFeedbackModal(true)}
                    />
                )}
            </div>
        ) : (
            <div className="min-h-[600px] animate-fade-in">
                {activeTab === 'home' && (
                    <Home 
                        onNavigate={handleTabChange} 
                        currentUser={currentUser}
                        onLoginRequest={() => setShowAuth(true)}
                        userSubmissions={mySubmissions}
                        showToast={showToast}
                        onOpenNews={handleOpenNews}
                        newsList={newsList}
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
                        onNavigateToProfile={() => handleTabChange('profile')}
                    />
                )}
                
                {activeTab === 'history' && (
                    <History 
                        submissions={mySubmissions}
                        loading={loading} 
                        refreshList={loadData} 
                        settings={settings} 
                        showToast={showToast} 
                        onEdit={handleEditSubmission}
                        currentUser={currentUser!}
                    />
                )}
                
                {activeTab === 'analytics' && (
                    <Dashboard 
                        submissions={allSubmissions} 
                        onViewAll={() => handleTabChange('history')}
                    />
                )}
                
                {activeTab === 'profile' && currentUser && (
                    <ProfileSettings 
                        currentUser={currentUser} 
                        onUpdateUser={handleUpdateUser} 
                        showToast={showToast} 
                    />
                )}
            </div>
        )}
      </main>

      {/* Scroll To Top Button */}
      <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-slate-900 dark:bg-sky-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center border-2 border-white/20 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
          aria-label="Scroll to top"
      >
          <i className="fa-solid fa-arrow-up text-lg"></i>
      </button>

      {/* Footer */}
      <footer className={`mt-20 pt-16 pb-8 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-900 text-slate-300'}`}>
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
                  
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
                              { id: 'analytics', label: 'สรุปสถานการณ์', icon: 'fa-chart-pie' },
                              { id: 'register', label: 'นำเข้าองค์ความรู้', icon: 'fa-cloud-arrow-up' },
                              { id: 'history', label: 'คลังความรู้ (KM Bank)', icon: 'fa-book-open' },
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
                      
                      <a href="https://satun.moph.go.th" target="_blank" rel="noopener noreferrer" className="block group mb-4">
                          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-800 group-hover:border-sky-500/50 group-hover:bg-slate-800 transition relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition group-hover:scale-110">
                                  <i className="fa-solid fa-globe text-6xl text-white"></i>
                              </div>
                              <div className="relative z-10 flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-xl group-hover:bg-sky-500 group-hover:text-white transition">
                                      <i className="fa-solid fa-location-dot"></i>
                                  </div>
                                  <div>
                                      <div className="text-xs text-slate-400 font-bold uppercase mb-1">เว็บไซต์หน่วยงาน</div>
                                      <div className="text-white font-bold text-sm">สำนักงานสาธารณสุขจังหวัดสตูล</div>
                                      <div className="text-sky-500 text-xs mt-1 flex items-center gap-1">
                                          ไปที่เว็บไซต์ <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </a>

                      <div className="space-y-3">
                          <a 
                             href="tel:074711071" 
                             className="flex items-center gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-white transition group hover:shadow-lg hover:shadow-emerald-900/20 active:scale-95 duration-200"
                          >
                              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 group-hover:bg-white/20 flex items-center justify-center transition">
                                  <i className="fa-solid fa-phone"></i>
                              </div>
                              <div className="flex-1">
                                  <div className="text-xs font-bold opacity-70">เบอร์โทรศัพท์</div>
                                  <div className="font-mono text-lg font-bold">074-711-071</div>
                              </div>
                              <i className="fa-solid fa-arrow-up-right-from-square text-xs opacity-50"></i>
                          </a>
                      </div>
                  </div>
              </div>

              {/* Visitor Stats Section */}
              <div className="mb-8 border-t border-slate-800 pt-6">
                  <div className="flex flex-wrap items-center justify-center md:justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <i className="fa-solid fa-chart-simple text-sky-500"></i> สถิติการเข้าชม
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Online</span>
                              <span className="text-emerald-400 font-mono font-bold text-lg flex items-center gap-1.5">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  {visitorStats.online.toLocaleString()}
                              </span>
                          </div>
                          <div className="w-px h-8 bg-slate-800 hidden md:block"></div>

                          {/* Added Today Stat */}
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">รายวัน</span>
                              <span className="text-white font-mono font-bold text-lg">{visitorStats.today.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">รายสัปดาห์</span>
                              <span className="text-white font-mono font-bold text-lg">{visitorStats.week.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">รายเดือน</span>
                              <span className="text-white font-mono font-bold text-lg">{visitorStats.month.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">รายปี</span>
                              <span className="text-white font-mono font-bold text-lg">{visitorStats.year.toLocaleString()}</span>
                          </div>
                          <div className="w-px h-8 bg-slate-800 hidden md:block"></div>
                          
                          <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">ทั้งหมด</span>
                              <span className="text-sky-400 font-mono font-bold text-lg">{visitorStats.total.toLocaleString()}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Bottom Copyright with Privacy Actions */}
              <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                       <i className="fa-solid fa-code text-sky-500"></i>
                       <span>พัฒนาโดย IT SSJ Satun 2569 | <a href="#" onClick={(e) => {e.preventDefault(); Swal.fire({title: 'รายละเอียดอัปเดต v1.3.16', html: '<ul class="text-left space-y-2 text-sm"><li>✅ <b>Reviewer Branches:</b> คณะกรรมการสามารถเลือปรับผิดชอบได้มากกว่า 1 สาขา (v1.3.16)</li><li>🔍 <b>Reviewer Filter:</b> ระบบหน้าจอของคณะกรรมการเพิ่มแถบกรองและค้นหา (v1.3.16)</li><li>🔧 <b>Auto View:</b> ระบบคณะกรรมการจะแสดงผลงานในสาขาที่รับผิดชอบให้ทันทีโดยอัตโนมัติ (v1.3.16)</li><li>🔧 <b>Filter Fix:</b> แก้ไขแถบกรองข้อมูลล้นหน้าจอ (v1.3.15)</li><li>🏢 <b>Org Autocomplete:</b> เพิ่มระบบ Dropdown เสนอชื่อหน่วยงานขณะค้นหา (v1.3.15)</li><li>👤 <b>Audit Logs:</b> เพิ่มชื่อผู้ดำเนินการในประวัติบันทึกการทำงาน (v1.3.15)</li></ul>', icon: 'info', confirmButtonColor: '#0ea5e9'}); }}>v1.3.16</a></span>
                  </div>
                  <div className="flex gap-6">
                      <button onClick={() => setShowPrivacyPolicy(true)} className="hover:text-slate-300 transition">นโยบายความเป็นส่วนตัว</button>
                      <button onClick={triggerCookieSettings} className="hover:text-slate-300 transition">ตั้งค่าคุกกี้</button>
                      <span>&copy; {BUDGET_YEAR} All rights reserved.</span>
                  </div>
              </div>
          </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-center">
        {currentUser && currentUser.role !== 'reviewer' && (
          <button 
              onClick={() => setShowFeedbackModal(true)}
              className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-emerald-300 transition-all hover:-translate-y-1 flex items-center justify-center border-2 border-white/20 tooltip-trigger"
              title="ประเมินความพึงพอใจการใช้งาน"
          >
              <i className="fa-regular fa-comment-dots text-xl"></i>
          </button>
        )}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`w-12 h-12 rounded-full bg-slate-900 dark:bg-sky-600 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center border-2 border-white/20 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
          title="เลื่อนขึ้นบนสุด"
        >
          <i className="fa-solid fa-arrow-up text-lg"></i>
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
