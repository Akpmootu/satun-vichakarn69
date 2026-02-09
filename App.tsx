import React, { useEffect, useState } from "react";
import { BUDGET_YEAR } from "./constants";
import { AppSettings, Submission, ToastMessage, UserProfile } from "./types";
import { apiListSubmissions, loadSettings, getCurrentUser, logoutUser } from "./services/apiService";

import Registration from "./components/Registration";
import History from "./components/History";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import Home from "./components/Home";
import NewsModal from "./components/NewsModal";
import UserAuthModal from "./components/UserAuthModal";
import Toast from "./components/ui/Toast";
import Logo from "./components/ui/Logo";
import LoadingOverlay from "./components/ui/LoadingOverlay";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNews, setShowNews] = useState(false);
  const [newsStartIndex, setNewsStartIndex] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
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

  // Check Session for News Popup
  useEffect(() => {
    const dontShowAgain = localStorage.getItem("svk_dont_show_news");
    const hasSeenSession = sessionStorage.getItem("svk_has_seen_news");
    
    if (!dontShowAgain && !hasSeenSession) {
      setTimeout(() => setShowNews(true), 1500); // Small delay to let initial load finish
    }
  }, []);

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

  const handleLogout = () => {
      logoutUser();
      setCurrentUser(null);
      setSubmissions([]); 
      handleTabChange('home');
      showToast({ type: 'info', title: 'ออกจากระบบ', message: 'ไว้พบกันใหม่ครับ' });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const userId = currentUser?.id; 
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
      if (tabId === activeTab) return;

      if ((tabId === 'register' || tabId === 'history') && !currentUser) {
          showToast({ type: 'info', title: 'ต้องเข้าสู่ระบบ', message: 'กรุณาเข้าสู่ระบบก่อนใช้งานเมนูนี้' });
          setShowAuth(true);
          return;
      }

      setIsPageLoading(true);
      setTimeout(() => {
          setActiveTab(tabId);
          setIsPageLoading(false);
      }, 2500); // Increased delay to 2.5s for better reading experience
  };

  // Reload data when settings change or tab switches to history/analytics
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'analytics' || (activeTab === 'home' && currentUser)) {
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

  return (
    <div className={`min-h-screen font-sans pb-10 flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Full Screen Loading Overlay */}
      <LoadingOverlay isLoading={isPageLoading} />

      {/* News Popup Modal */}
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
                 <div className={`flex items-center gap-3 pl-3 border-l transition-colors duration-300 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                     <div className="hidden md:block text-right">
                         <div className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{currentUser.firstName}</div>
                         <div className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{currentUser.position}</div>
                     </div>
                     <button 
                        onClick={handleLogout}
                        className={`h-10 w-10 rounded-full flex items-center justify-center hover:bg-slate-700 transition shadow-lg ${darkMode ? 'bg-slate-800 text-white shadow-slate-900' : 'bg-slate-900 text-white shadow-slate-300'}`}
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
        
        {/* Navigation Tabs */}
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
             />
           )}
           
           {activeTab === 'history' && (
             <History 
                submissions={submissions}
                loading={loading} 
                refreshList={loadData} 
                settings={settings} 
                showToast={showToast} 
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