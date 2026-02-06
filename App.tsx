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
  const [showAuth, setShowAuth] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getCurrentUser());

  // Shared Data State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // Check Session for News Popup
  useEffect(() => {
    const dontShowAgain = localStorage.getItem("svk_dont_show_news");
    const hasSeenSession = sessionStorage.getItem("svk_has_seen_news");
    
    if (!dontShowAgain && !hasSeenSession) {
      setTimeout(() => setShowNews(true), 1500); // Small delay to let initial load finish
    }
  }, []);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10 flex flex-col">
      
      {/* Full Screen Loading Overlay */}
      <LoadingOverlay isLoading={isPageLoading} />

      {/* News Popup Modal */}
      <NewsModal isOpen={showNews} onClose={handleCloseNews} />
      
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
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
             className="cursor-pointer hover:opacity-80 transition"
             onClick={() => handleTabChange('home')}
          >
             <Logo />
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:block px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200 tracking-wider">
                {settings.mode === 'mock' ? 'MOCK SYSTEM' : 'LIVE SYSTEM'}
             </div>
             
             {currentUser ? (
                 <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                     <div className="hidden md:block text-right">
                         <div className="text-xs font-bold text-slate-900">{currentUser.firstName}</div>
                         <div className="text-[10px] text-slate-500">{currentUser.position}</div>
                     </div>
                     <button 
                        onClick={handleLogout}
                        className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-lg shadow-slate-300"
                        title="ออกจากระบบ"
                     >
                         <i className="fa-solid fa-power-off"></i>
                     </button>
                 </div>
             ) : (
                 <button 
                    onClick={() => setShowAuth(true)}
                    className="ml-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-300 flex items-center gap-2"
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
                className={`whitespace-nowrap flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                    activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-300 transform -translate-y-1' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 hover:text-slate-700'
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
      <footer className="mt-20 bg-slate-900 text-white pt-16 pb-8 border-t-4 border-sky-500">
          <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                  {/* Column 1: Organization */}
                  <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                           <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
                               <i className="fa-solid fa-building-columns text-slate-900 text-xl"></i>
                           </div>
                           <div>
                               <h3 className="text-lg font-bold leading-tight">สำนักงานสาธารณสุข</h3>
                               <p className="text-sm text-slate-400">จังหวัดสตูล</p>
                           </div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          มุ่งมั่นพัฒนาวิชาการ นวัตกรรม และเทคโนโลยีสารสนเทศ 
                          เพื่อยกระดับบริการสาธารณสุข สู่คุณภาพชีวิตที่ดีของประชาชน
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
                      <h4 className="text-lg font-bold mb-6 border-l-4 border-sky-500 pl-3">เมนูระบบ</h4>
                      <ul className="space-y-3 text-sm text-slate-300">
                          <li><button onClick={() => handleTabChange('home')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> หน้าหลัก</button></li>
                          <li><button onClick={() => handleTabChange('register')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> ลงทะเบียนส่งผลงาน</button></li>
                          <li><button onClick={() => handleTabChange('history')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> ตรวจสอบสถานะ</button></li>
                          <li><button onClick={() => handleTabChange('analytics')} className="hover:text-sky-400 transition flex items-center gap-2"><i className="fa-solid fa-chevron-right text-xs"></i> สรุปผลการดำเนินงาน</button></li>
                      </ul>
                  </div>

                  {/* Column 3: Contact */}
                  <div>
                      <h4 className="text-lg font-bold mb-6 border-l-4 border-emerald-500 pl-3">ติดต่อสอบถาม</h4>
                      <ul className="space-y-4 text-sm text-slate-300">
                          <li className="flex items-start gap-3">
                              <i className="fa-solid fa-map-location-dot mt-1 text-sky-500"></i>
                              <span>สำนักงานสาธารณสุขจังหวัดสตูล<br/>เลขที่ 123 ถ.สติล ต.พิมาน อ.เมือง จ.สตูล 91000</span>
                          </li>
                          <li className="flex items-center gap-3">
                              <i className="fa-solid fa-phone text-emerald-500"></i>
                              <span>074-123-456 ต่อ 110-112</span>
                          </li>
                          <li className="flex items-center gap-3">
                              <i className="fa-solid fa-envelope text-rose-500"></i>
                              <span>admin@satunhealth.go.th</span>
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