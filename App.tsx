import React, { useEffect, useState } from "react";
import { APP_NAME, BUDGET_YEAR } from "./constants";
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

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNews, setShowNews] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
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
      setShowNews(true);
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
      setSubmissions([]); // Clear data
      setActiveTab('home');
      showToast({ type: 'info', title: 'ออกจากระบบ', message: 'ไว้พบกันใหม่ครับ' });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // If we have a user, we might want to filter by user ID (but for history viewing all, maybe admin view?)
      // For now, let's just load everything, but in History we will filter if needed, 
      // or maybe we want to see ONLY my submissions?
      // Let's pass the userId to the API to simulate filtering
      const userId = currentUser?.id; 
      const data = await apiListSubmissions(settings, userId);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast({ type: "error", title: "Error loading data", message: e.message });
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div 
             className="flex items-center gap-3 md:gap-4 cursor-pointer hover:opacity-80 transition"
             onClick={() => setActiveTab('home')}
          >
             <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
               <i className="fa-solid fa-graduation-cap text-lg md:text-xl"></i>
             </div>
             <div>
                <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 leading-tight">{APP_NAME}</h1>
                <p className="text-xs text-slate-500 font-medium">Academic System {BUDGET_YEAR}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden md:block px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
                {settings.mode === 'mock' ? 'MOCK DATA' : 'REAL API'}
             </div>
             
             {currentUser ? (
                 <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                     <div className="hidden md:block text-right">
                         <div className="text-xs font-bold text-slate-900">{currentUser.firstName}</div>
                         <div className="text-[10px] text-slate-500">{currentUser.position}</div>
                     </div>
                     <button 
                        onClick={handleLogout}
                        className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition"
                        title="ออกจากระบบ"
                     >
                         <i className="fa-solid fa-power-off"></i>
                     </button>
                 </div>
             ) : (
                 <button 
                    onClick={() => setShowAuth(true)}
                    className="ml-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-md"
                 >
                    เข้าสู่ระบบ
                 </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 md:mt-8">
        
        {/* Navigation Tabs */}
        <nav className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-4">
          {tabs.map(tab => {
             // Hide specific tabs if not logged in (optional, but good UX)
             if ((tab.id === 'register' || tab.id === 'history') && !currentUser) {
                 // return null; // Or keep them and redirect to login
             }
             return (
                <button
                key={tab.id}
                onClick={() => {
                    if ((tab.id === 'register' || tab.id === 'history') && !currentUser) {
                        showToast({ type: 'info', title: 'ต้องเข้าสู่ระบบ', message: 'กรุณาเข้าสู่ระบบก่อนใช้งานเมนูนี้' });
                        setShowAuth(true);
                        return;
                    }
                    setActiveTab(tab.id);
                }}
                className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-300 transform scale-105' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                >
                <i className={`fa-solid ${tab.icon}`} />
                {tab.label}
                </button>
            )
          })}
        </nav>

        {/* Content Area */}
        <div className="min-h-[500px]">
           {activeTab === 'home' && (
              <Home 
                onNavigate={setActiveTab} 
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
                  setActiveTab('history');
                }} 
             />
           )}
           
           {activeTab === 'history' && (
             <History 
                submissions={submissions} // In real app, API filters by user. Here we might want to see ALL or just MINE? Let's show all for "Admin" feel or just MINE for user?
                // For now, let's filter to show only mine if logged in, or all if we treat this as a "Public Gallery" (which the prompt "History Tracking" implies personal)
                // Let's filter by User ID for "My History"
                // Actually, the previous code showed ALL. Let's keep it ALL but maybe highlight mine? Or stick to personal.
                // Given the requirement "User... track progress", it implies Personal History.
                // Let's filter in the component prop for now.
                // submissions={submissions.filter(s => s.userId === currentUser?.id)} 
                // Wait, if I filter here, the "Export CSV" feature for admins won't work.
                // Let's pass ALL submissions but maybe the History component handles the view?
                // To keep it simple and safe: Show ALL (Public) but maybe highlight mine.
                // OR: Since this is "Registration System", usually a user sees THEIR OWN data.
                // I will filter to show ONLY user's data for privacy in this context.
                // But wait, "Visual Analytics" needs all data. 
                // Let's filter here for History tab to be "My History".
                // *Self-Correction*: The prompt said "History Tracking" -> "Search/Filter by branch/org". This implies a public list or admin list.
                // I will NOT filter it, so it remains a public directory/admin view for this prototype.
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

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 pb-8">
           <div className="text-sm font-medium">
             พัฒนาโดย IT SSJ Satun 2569
           </div>
           <div className="flex items-center gap-2 text-sm opacity-50">
             <i className="fa-solid fa-code" />
             <span>Satun Vichakarn v1.2.0</span>
           </div>
        </footer>

      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}