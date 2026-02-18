
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { saveSettings } from '../services/apiService';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  showToast: (t: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate, showToast }) => {
  const [url, setUrl] = useState(settings.apiBaseUrl);

  const handleSave = (mode: 'mock' | 'real') => {
    const newSettings = { mode, apiBaseUrl: url };
    saveSettings(newSettings);
    onUpdate(newSettings);
    showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: `เปลี่ยนโหมดเป็น ${mode === 'mock' ? 'Mock Data' : 'Real API'}` });
  };

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 md:p-6 fade-in">
       <div className="text-lg md:text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <i className="fa-solid fa-sliders text-sky-600"></i>
          ตั้งค่าการเชื่อมต่อ (System Configuration)
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mode Selection */}
          <div className="space-y-4">
             <div 
                onClick={() => handleSave('mock')}
                className={`cursor-pointer rounded-2xl p-4 ring-1 transition flex gap-4 ${settings.mode === 'mock' ? 'ring-slate-900 bg-slate-50' : 'ring-slate-200 hover:bg-slate-50'}`}
             >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${settings.mode === 'mock' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                   <i className="fa-solid fa-database" />
                </div>
                <div>
                   <div className="font-bold text-slate-900">Mock Mode (LocalStorage)</div>
                   <div className="text-xs text-slate-500 mt-1">ใช้ข้อมูลจำลองในเครื่อง เหมาะสำหรับทดสอบระบบ</div>
                </div>
                {settings.mode === 'mock' && <i className="fa-solid fa-check ml-auto text-slate-900 self-center"/>}
             </div>

             <div 
                onClick={() => handleSave('real')}
                className={`cursor-pointer rounded-2xl p-4 ring-1 transition flex gap-4 ${settings.mode === 'real' ? 'ring-slate-900 bg-slate-50' : 'ring-slate-200 hover:bg-slate-50'}`}
             >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${settings.mode === 'real' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                   <i className="fa-solid fa-server" />
                </div>
                <div>
                   <div className="font-bold text-slate-900">Real API Mode</div>
                   <div className="text-xs text-slate-500 mt-1">เชื่อมต่อกับฐานข้อมูลจริงผ่าน API Endpoint</div>
                </div>
                {settings.mode === 'real' && <i className="fa-solid fa-check ml-auto text-slate-900 self-center"/>}
             </div>
          </div>

          {/* API Config */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
             <label className="block text-sm font-bold text-slate-900 mb-2">Base API URL</label>
             <input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.satun-system.go.th/v1"
                disabled={settings.mode === 'mock'}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:bg-slate-100"
             />
             <div className="mt-4 text-xs text-slate-500">
                <p className="font-bold mb-1">Developer Note:</p>
                <ul className="list-disc pl-4 space-y-1">
                   <li>GET /submissions - List all items</li>
                   <li>POST /submissions - Create new item</li>
                   <li>PATCH /submissions/:id - Update status</li>
                </ul>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Settings;
