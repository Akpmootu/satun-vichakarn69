import React from 'react';
import { PR_NEWS } from '../constants';
import { Submission, UserProfile } from '../types';
import Timeline from './Timeline';

interface HomeProps {
  onNavigate: (tabId: string) => void;
  currentUser: UserProfile | null;
  onLoginRequest: () => void;
  userSubmissions: Submission[];
  showToast: (t: any) => void;
  onOpenNews: (index?: number) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate, currentUser, onLoginRequest, userSubmissions, showToast, onOpenNews }) => {
  
  const handleActionClick = (action: string) => {
    if (!currentUser) {
        onLoginRequest();
    } else {
        if (action === 'register') onNavigate('register');
        if (action === 'history') onNavigate('history');
    }
  };

  const handleDownload = (id: number) => {
      const item = PR_NEWS.find(n => n.id === id);
      if (item) {
          // Simulate download
          showToast({
              type: 'success',
              title: 'กำลังดาวน์โหลด',
              message: `เริ่มการดาวน์โหลดไฟล์: ${item.title}`
          });
          
          // In real app: window.open(item.url, '_blank');
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Hero / Welcome Section */}
      <div className="text-center py-8 md:py-16 relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl">
         {/* Background Patterns (Data Flow) */}
         <div className="absolute top-0 left-0 w-full h-full opacity-10">
             <div className="absolute top-10 left-10 h-32 w-32 rounded-full border-4 border-dashed border-sky-500 animate-spin-slow"></div>
             <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full border-2 border-emerald-500 animate-pulse"></div>
             <i className="fa-solid fa-network-wired absolute top-1/2 left-1/4 text-8xl text-slate-700 transform -translate-y-1/2"></i>
         </div>

         <div className="relative z-10 px-4">
             {currentUser ? (
                 <>
                    <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold mb-4">
                        <i className="fa-solid fa-circle-check mr-2"></i>
                        ยืนยันตัวตนแล้ว
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                        ยินดีต้อนรับสู่ <span className="text-sky-400">SKMS</span>
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-6">
                        ติดตามสถานะผลงานวิชาการและการจัดการความรู้ของคุณได้ที่นี่
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                         <button 
                            onClick={() => handleDownload(3)}
                            className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition backdrop-blur-sm border border-white/10 flex items-center gap-2"
                        >
                            <i className="fa-solid fa-book-open"></i>
                            คู่มือการใช้งานระบบ
                        </button>
                         <button 
                            onClick={() => handleDownload(2)}
                            className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition backdrop-blur-sm border border-white/10 flex items-center gap-2"
                        >
                            <i className="fa-solid fa-file-pen"></i>
                            แนวทางการเขียน KM
                        </button>
                    </div>
                 </>
             ) : (
                 <>
                    <div className="inline-block px-4 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold mb-4 animate-bounce">
                        <i className="fa-solid fa-star mr-2"></i>
                        Satun Knowledge Management Systems
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                        ระบบจัดการความรู้<br/>สาธารณสุขจังหวัดสตูล
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 font-light">
                        "รวบรวม จัดระเบียบ และเผยแพร่ความรู้ สู่ความเป็นเลิศ"
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <button 
                            onClick={onLoginRequest}
                            className="px-8 py-3 rounded-2xl bg-white text-slate-900 font-black text-lg hover:scale-105 transition shadow-lg shadow-white/20 ring-4 ring-white/10"
                        >
                            <i className="fa-solid fa-right-to-bracket mr-2"></i>
                            ลงทะเบียน / เข้าสู่ระบบ
                        </button>
                    </div>
                    
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                         <button 
                            onClick={() => handleDownload(3)}
                            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 hover:text-white transition border border-slate-700 flex items-center gap-2"
                        >
                            <i className="fa-solid fa-download text-sky-400"></i>
                            คู่มือการใช้งานระบบ SKMS
                        </button>
                         <button 
                            onClick={() => handleDownload(2)}
                            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 hover:text-white transition border border-slate-700 flex items-center gap-2"
                        >
                            <i className="fa-solid fa-download text-emerald-400"></i>
                            คู่มือการเขียนผลงานวิชาการ
                        </button>
                    </div>

                    <div className="mt-4 text-sm text-slate-500">
                        * ระบบสำหรับบุคลากรสาธารณสุขจังหวัดสตูล
                    </div>
                 </>
             )}
         </div>
      </div>

      {/* KM Concept: Upstream, Midstream, Downstream */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border-t-4 border-sky-300 hover:shadow-md transition group">
              <div className="h-12 w-12 rounded-xl bg-sky-50 dark:bg-sky-900/50 text-sky-500 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">1. ต้นน้ำ (Upstream)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-sky-600 dark:text-sky-400">รวบรวม:</span> การแสวงหาความรู้จากหน้างาน (Tacit Knowledge) และข้อมูลวิชาการ (Explicit Knowledge) เพื่อนำเข้าสู่ระบบ
              </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border-t-4 border-blue-500 hover:shadow-md transition group">
              <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                  <i className="fa-solid fa-boxes-stacked"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">2. กลางน้ำ (Midstream)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-blue-600 dark:text-blue-400">จัดระเบียบ:</span> การคัดกรอง สังเคราะห์ และจัดหมวดหมู่องค์ความรู้ ให้เป็นระบบ เข้าถึงง่าย และมีมาตรฐาน
              </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border-t-4 border-emerald-500 hover:shadow-md transition group">
               <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                  <i className="fa-solid fa-share-nodes"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">3. ปลายน้ำ (Downstream)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">เผยแพร่:</span> การถ่ายทอด แลกเปลี่ยนเรียนรู้ และนำองค์ความรู้ไปประยุกต์ใช้ในการปฏิบัติงานจริง
              </p>
          </div>
      </div>

      {/* Timeline Section (Only if logged in) */}
      {currentUser && (
          <div className="animate-bounce-in">
              <Timeline user={currentUser} submissions={userSubmissions} />
          </div>
      )}

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Menu 1: Send Work */}
          <button 
             onClick={() => handleActionClick('register')}
             className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 hover:shadow-xl hover:-translate-y-1 transition duration-300 text-left"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110 duration-500">
                <i className="fa-solid fa-paper-plane text-9xl text-sky-600"></i>
             </div>
             <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl mb-4 group-hover:bg-sky-600 group-hover:text-white transition">
                    <i className="fa-solid fa-file-import"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">นำเข้าองค์ความรู้</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">ส่งผลงานวิชาการ ถอดบทเรียน นวัตกรรม</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-sky-600 dark:text-sky-400">
                    {currentUser ? 'เริ่มส่งผลงาน' : 'ต้องล็อกอินก่อน'} 
                    <i className={`fa-solid ${currentUser ? 'fa-arrow-right' : 'fa-lock'} ml-2 group-hover:translate-x-1 transition`}></i>
                </div>
             </div>
          </button>

          {/* Menu 2: View Works (Gallery/History) */}
          <button 
             onClick={() => handleActionClick('history')}
             className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 hover:shadow-xl hover:-translate-y-1 transition duration-300 text-left"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110 duration-500">
                <i className="fa-solid fa-layer-group text-9xl text-indigo-600"></i>
             </div>
             <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <i className="fa-solid fa-book-open-reader"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">คลังความรู้ (KM Bank)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">สืบค้นผลงานวิชาการและบทเรียน</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {currentUser ? 'เข้าสู่คลังความรู้' : 'ต้องล็อกอินก่อน'}
                    <i className={`fa-solid ${currentUser ? 'fa-arrow-right' : 'fa-lock'} ml-2 group-hover:translate-x-1 transition`}></i>
                </div>
             </div>
          </button>

          {/* Menu 3: Inspect (Disabled) */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-50 dark:bg-slate-800 p-6 ring-1 ring-slate-200 dark:ring-slate-700 text-left opacity-80 grayscale">
             <div className="absolute top-4 right-4">
                 <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-500 dark:text-slate-300">เร็วๆ นี้</span>
             </div>
             <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-2xl mb-4">
                    <i className="fa-solid fa-chart-network"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">วิเคราะห์เครือข่ายความรู้</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Knowledge Mapping & Analysis</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-slate-400 cursor-not-allowed">
                    ปิดใช้งาน <i className="fa-solid fa-lock ml-2"></i>
                </div>
             </div>
          </div>
      </div>

      {/* About SKMS Section */}
      <div className="mt-12 rounded-3xl bg-slate-900 relative overflow-hidden shadow-xl ring-1 ring-slate-800">
          {/* Background Gradient & Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 z-0 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 z-0 pointer-events-none"></div>
          
          <div className="relative z-10 p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  
                  {/* Left: Mission Statement */}
                  <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sky-300 text-xs font-bold mb-6 backdrop-blur-sm">
                          <i className="fa-solid fa-rocket"></i>
                          <span>พันธกิจของเรา (Our Mission)</span>
                      </div>
                      
                      <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-6">
                          ขับเคลื่อนระบบสุขภาพ<br/>
                          ด้วยพลังแห่ง <span className="text-sky-400 inline-block relative">
                              การจัดการความรู้
                              <svg className="absolute w-full h-2 bottom-0 left-0 text-sky-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
                              </svg>
                          </span>
                      </h2>
                      
                      <p className="text-slate-300 text-lg leading-relaxed mb-8">
                          <strong className="text-white">SKMS</strong> (Satun Knowledge Management Systems) มุ่งมั่นที่จะเป็นศูนย์กลางดิจิทัลในการรวบรวมและแลกเปลี่ยนเรียนรู้ เพื่อยกระดับศักยภาพบุคลากรสาธารณสุขจังหวัดสตูล สู่ความเป็นเลิศทางวิชาการและการบริการ
                      </p>

                      {/* Stats / Core Values Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition group">
                              <div className="h-10 w-10 mx-auto rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                                  <i className="fa-solid fa-search"></i>
                              </div>
                              <div className="text-sm font-bold text-white">ต้นน้ำ</div>
                              <div className="text-xs text-slate-400">ค้นหา & สร้างสรรค์</div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition group">
                              <div className="h-10 w-10 mx-auto rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                                  <i className="fa-solid fa-boxes-stacked"></i>
                              </div>
                              <div className="text-sm font-bold text-white">กลางน้ำ</div>
                              <div className="text-xs text-slate-400">จัดระบบ & ตรวจสอบ</div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition group">
                              <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                                  <i className="fa-solid fa-share-nodes"></i>
                              </div>
                              <div className="text-sm font-bold text-white">ปลายน้ำ</div>
                              <div className="text-xs text-slate-400">เผยแพร่ & ต่อยอด</div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Graphic / Journey */}
                  <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-emerald-500 opacity-20 blur-2xl rounded-full transform rotate-12"></div>
                      <div className="relative bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
                          <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
                              <i className="fa-solid fa-sitemap mr-2 text-amber-400"></i>
                              กระบวนการ SKMS Model
                          </h3>
                          
                          <div className="space-y-6">
                              <div className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-sky-500/30">1</div>
                                      <div className="w-0.5 flex-1 bg-white/10 my-1"></div>
                                  </div>
                                  <div>
                                      <h4 className="text-sky-300 font-bold text-base">Knowledge Capture (ต้นน้ำ)</h4>
                                      <p className="text-slate-400 text-sm mt-1">
                                          รวบรวมความรู้ฝังลึก (Tacit) จากประสบการณ์หน้างาน และความรู้ชัดแจ้ง (Explicit) จากงานวิชาการ
                                      </p>
                                  </div>
                              </div>

                              <div className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-500/30">2</div>
                                      <div className="w-0.5 flex-1 bg-white/10 my-1"></div>
                                  </div>
                                  <div>
                                      <h4 className="text-blue-300 font-bold text-base">Knowledge Organization (กลางน้ำ)</h4>
                                      <p className="text-slate-400 text-sm mt-1">
                                          ตรวจสอบความถูกต้อง (Validation) จัดหมวดหมู่ และจัดเก็บในคลังความรู้ (KM Bank)
                                      </p>
                                  </div>
                              </div>

                              <div className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-emerald-500/30">3</div>
                                  </div>
                                  <div>
                                      <h4 className="text-emerald-300 font-bold text-base">Knowledge Sharing (ปลายน้ำ)</h4>
                                      <p className="text-slate-400 text-sm mt-1">
                                          แลกเปลี่ยนเรียนรู้ผ่านเวทีวิชาการ และนำไปประยุกต์ใช้เพื่อพัฒนาระบบบริการสุขภาพ
                                      </p>
                                  </div>
                              </div>
                          </div>

                      </div>
                  </div>

              </div>
          </div>
      </div>

      {/* News & Downloads Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PR News List */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <i className="fa-solid fa-bullhorn"></i>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">ข่าวประชาสัมพันธ์</h2>
                  </div>
                  <button 
                    onClick={() => onOpenNews(0)}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-rose-100 group"
                    title="เปิดหน้าต่างประกาศ"
                  >
                    <i className="fa-solid fa-expand group-hover:scale-110 transition"></i>
                    <span>เปิดดูทั้งหมด</span>
                  </button>
              </div>
              <div className="space-y-4">
                  {PR_NEWS.filter(n => n.type === 'news').map(item => {
                      const fullIndex = PR_NEWS.findIndex(x => x.id === item.id);
                      return (
                          <div key={item.id} className="group flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition border border-transparent hover:border-slate-100 dark:hover:border-slate-600 ring-1 ring-slate-100 dark:ring-slate-700 cursor-pointer" onClick={() => onOpenNews(fullIndex)}>
                              {item.imageUrl ? (
                                  <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-200 ring-1 ring-slate-100">
                                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                                  </div>
                              ) : (
                                  <div className="shrink-0 w-24 h-24 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-400 ring-1 ring-rose-100 dark:ring-rose-900/50">
                                      <i className="fa-regular fa-newspaper text-3xl group-hover:scale-110 transition"></i>
                                  </div>
                              )}
                              <div className="flex-1 min-w-0 py-1 flex flex-col">
                                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1.5 flex items-center gap-2">
                                      <i className="fa-regular fa-calendar"></i> {item.date}
                                  </div>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition leading-snug line-clamp-2">{item.title}</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed flex-1">{item.desc}</p>
                                  
                                  {/* Read More Button */}
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onOpenNews(fullIndex); }}
                                      className="mt-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 w-fit"
                                  >
                                      อ่านเพิ่มเติม <i className="fa-solid fa-arrow-right"></i>
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Downloads List */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <i className="fa-solid fa-download"></i>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">เอกสารดาวน์โหลด</h2>
              </div>
              <div className="space-y-3">
                  {PR_NEWS.filter(n => n.type === 'download').map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleDownload(item.id)}
                        className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition cursor-pointer group"
                      >
                          <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-xl group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition ring-1 ring-slate-200 dark:ring-slate-700 group-hover:ring-emerald-200">
                                  <i className="fa-solid fa-file-pdf"></i>
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-emerald-800 dark:group-hover:text-emerald-300 flex items-center gap-2">
                                      {item.title}
                                      {/* File Type Badge */}
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800">
                                          {item.fileType}
                                      </span>
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                     <i className="fa-regular fa-clock"></i> {item.date}
                                  </p>
                              </div>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-200 transition">
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