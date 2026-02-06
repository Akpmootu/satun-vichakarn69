import React, { useEffect, useState } from "react";
import { APP_NAME, BUDGET_YEAR } from "./constants";
import { AppSettings, Submission, ToastMessage } from "./types";
import { apiListSubmissions, loadSettings } from "./services/apiService";

import Registration from "./components/Registration";
import History from "./components/History";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import Home from "./components/Home";
import NewsModal from "./components/NewsModal";
import Toast from "./components/ui/Toast";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNews, setShowNews] = useState(false);
  
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

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiListSubmissions(settings);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast({ type: "error", title: "Error loading data", message: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Reload data when settings change or tab switches to history/analytics
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'analytics') {
       loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, activeTab]);

  const tabs = [
    { id: "home", label: "หน้าหลัก", icon: "fa-house" },
    { id: "register", label: "ลงทะเบียน", icon: "fa-pen-to-square" },
    { id: "history", label: "ประวัติ", icon: "fa-clock-rotate-left" },
    { id: "analytics", label: "วิเคราะห์", icon: "fa-chart-pie" },
    { id: "settings", label: "ตั้งค่าระบบ", icon: "fa-gear" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      
      {/* News Popup Modal */}
      <NewsModal isOpen={showNews} onClose={handleCloseNews} />

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
          
          <div className="hidden md:flex items-center gap-3">
             <div className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
                {settings.mode === 'mock' ? 'MOCK DATA' : 'REAL API'}
             </div>
             <a href="#" className="text-slate-400 hover:text-slate-900 transition"><i className="fa-brands fa-github text-xl"></i></a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 md:mt-8">
        
        {/* Navigation Tabs */}
        <nav className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-300 transform scale-105' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <i className={`fa-solid ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="min-h-[500px]">
           {activeTab === 'home' && (
              <Home onNavigate={setActiveTab} />
           )}

           {activeTab === 'register' && (
             <Registration 
                settings={settings} 
                showToast={showToast} 
                onSuccess={() => {
                  loadData(); 
                  setActiveTab('history');
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

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 pb-8">
           <div className="text-sm font-medium">
             พัฒนาโดย IT SSJ Satun 2569
           </div>
           <div className="flex items-center gap-2 text-sm opacity-50">
             <i className="fa-solid fa-code" />
             <span>Satun Vichakarn v1.1.0</span>
           </div>
        </footer>

      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}