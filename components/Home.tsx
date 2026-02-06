import React from 'react';
import { PR_NEWS } from '../constants';

interface HomeProps {
  onNavigate: (tabId: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Hero / Welcome Section */}
      <div className="text-center py-8 md:py-12">
         <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            ระบบประกวดผลงานวิชาการ
         </h1>
         <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Satun Academic System: แพลตฟอร์มกลางสำหรับส่งผลงาน ติดตามสถานะ และแลกเปลี่ยนเรียนรู้งานวิชาการสาธารณสุข
         </p>
      </div>

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Menu 1: Send Work */}
          <button 
             onClick={() => onNavigate('register')}
             className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg shadow-slate-200 ring-1 ring-slate-100 hover:shadow-xl hover:-translate-y-1 transition duration-300 text-left"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110 duration-500">
                <i className="fa-solid fa-paper-plane text-9xl text-sky-600"></i>
             </div>
             <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl mb-4 group-hover:bg-sky-600 group-hover:text-white transition">
                    <i className="fa-solid fa-file-pen"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">ส่งผลงานวิชาการ</h3>
                <p className="text-sm text-slate-500">สำหรับผู้ลงทะเบียน ลงทะเบียนและส่งผลงานใหม่</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-sky-600">
                    เริ่มเลย <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition"></i>
                </div>
             </div>
          </button>

          {/* Menu 2: View Works (Gallery/History) */}
          <button 
             onClick={() => onNavigate('history')}
             className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg shadow-slate-200 ring-1 ring-slate-100 hover:shadow-xl hover:-translate-y-1 transition duration-300 text-left"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110 duration-500">
                <i className="fa-solid fa-layer-group text-9xl text-indigo-600"></i>
             </div>
             <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <i className="fa-solid fa-book-open"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">รวมผลงานวิชาการ</h3>
                <p className="text-sm text-slate-500">ทำเนียบผลงาน ตรวจสอบรายชื่อและสถานะ</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-indigo-600">
                    ดูรายการ <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition"></i>
                </div>
             </div>
          </button>

          {/* Menu 3: Inspect (Disabled) */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200 text-left opacity-80 grayscale">
             <div className="absolute top-4 right-4">
                 <span className="px-3 py-1 bg-slate-200 rounded-full text-xs font-bold text-slate-500">เร็วๆ นี้</span>
             </div>
             <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center text-2xl mb-4">
                    <i className="fa-solid fa-magnifying-glass-chart"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">ระบบตรวจผลงาน</h3>
                <p className="text-sm text-slate-500">สำหรับคณะกรรมการ ให้คะแนนและประเมินผล</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-slate-400 cursor-not-allowed">
                    ปิดใช้งาน <i className="fa-solid fa-lock ml-2"></i>
                </div>
             </div>
          </div>
      </div>

      {/* News & Downloads Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PR News List */}
          <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <i className="fa-solid fa-bullhorn"></i>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">ข่าวประชาสัมพันธ์</h2>
              </div>
              <div className="space-y-4">
                  {PR_NEWS.filter(n => n.type === 'news').map(item => (
                      <div key={item.id} className="group flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                          <div className="shrink-0 pt-1">
                              <i className="fa-solid fa-newspaper text-slate-400 group-hover:text-slate-600 text-xl"></i>
                          </div>
                          <div>
                              <div className="text-xs font-bold text-rose-600 mb-1">{item.date}</div>
                              <h4 className="font-bold text-slate-800 mb-1 group-hover:text-sky-700 transition">{item.title}</h4>
                              <p className="text-sm text-slate-500 line-clamp-2">{item.desc}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Downloads List */}
          <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <i className="fa-solid fa-download"></i>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">เอกสารดาวน์โหลด</h2>
              </div>
              <div className="space-y-3">
                  {PR_NEWS.filter(n => n.type === 'download').map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition cursor-pointer group">
                          <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs group-hover:bg-white group-hover:text-emerald-600 transition">
                                  {item.fileType}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-800">{item.title}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                              </div>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition">
                              <i className="fa-solid fa-file-arrow-down"></i>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Home;