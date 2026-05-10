
import React, { useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Submission, UserProfile, NewsItem } from '../types';
import Timeline from './Timeline';
import ScheduleSection from './ScheduleSection';

// Declare Swal globally
declare const Swal: any;

interface HomeProps {
  onNavigate: (tabId: string) => void;
  currentUser: UserProfile | null;
  onLoginRequest: () => void;
  userSubmissions: Submission[];
  showToast: (t: any) => void;
  onOpenNews: (index?: number) => void;
  newsList: NewsItem[];
}

const Home: React.FC<HomeProps> = ({ onNavigate, currentUser, onLoginRequest, userSubmissions, showToast, onOpenNews, newsList }) => {
  
  // Display popups for rework or new co-author tagging
  useEffect(() => {
     if (currentUser && userSubmissions && userSubmissions.length > 0) {
         // Rework alert
         const reworked = userSubmissions.filter(s => s.status === 'revision_requested' && s.userId === currentUser.id);
         if (reworked.length > 0) {
             const hasAlerted = sessionStorage.getItem(`rework_alerted_${currentUser.id}`);
             if (!hasAlerted) {
                 const names = reworked.map(s => s.fileName).join(', ');
                 const latestAudit = reworked[0].audit && reworked[0].audit.length > 0 
                     ? reworked[0].audit[reworked[0].audit.length - 1].note 
                     : 'กรุณาตรวจสอบรายละเอียดในระบบ';
                 
                 Swal.fire({
                     title: 'มีผลงานส่งกลับให้แก้ไข!',
                     html: `คุณมีผลงานที่ต้องแก้ไขจำนวน <b>${reworked.length}</b> รายการ<br/><br/><div className="text-sm p-3 bg-slate-100 rounded-lg text-left"><b>เรื่อง:</b> ${names}<br/><b>หมายเหตุ:</b> <span className="text-rose-600">${latestAudit}</span></div>`,
                     icon: 'warning',
                     confirmButtonText: 'ไปที่ประวัติของฉัน',
                     confirmButtonColor: '#0ea5e9',
                     showCancelButton: true,
                     cancelButtonText: 'ไว้ทีหลัง'
                 }).then((result: any) => {
                     if (result.isConfirmed) {
                         onNavigate('history');
                     }
                 });
                 sessionStorage.setItem(`rework_alerted_${currentUser.id}`, 'true');
             }
         }

         // Tag alert for Co-authors
         const coAuthorSubmissions = userSubmissions.filter(s => s.userId !== currentUser.id && s.coAuthors?.some(ca => ca.id === currentUser.id || (currentUser.email && ca.email === currentUser.email)));
         if (coAuthorSubmissions.length > 0) {
             const viewed = JSON.parse(localStorage.getItem(`viewed_coauthor_${currentUser.id}`) || '[]');
             const unviewed = coAuthorSubmissions.filter(s => !viewed.includes(s.id));
             
             if (unviewed.length > 0) {
                 const listHtml = unviewed.map(s => `<li>• <b>${s.fileName}</b></li>`).join('');
                 Swal.fire({
                     title: '🎉 คุณถูกแท็กชื่อ!',
                     html: `คุณได้รับเชิญเป็นผู้ร่วมส่งผลงานประกวด:<br/><ul class="text-left mt-4 text-sm space-y-2 bg-sky-50 p-4 rounded-xl text-sky-900 shadow-inner">${listHtml}</ul>`,
                     icon: 'info',
                     showCancelButton: true,
                     confirmButtonText: 'ดูผลงาน',
                     cancelButtonText: 'รับทราบ',
                     confirmButtonColor: '#0ea5e9',
                     customClass: { popup: 'rounded-3xl' }
                 }).then((result: any) => {
                     const updatedViewed = [...viewed, ...unviewed.map(s => s.id)];
                     localStorage.setItem(`viewed_coauthor_${currentUser.id}`, JSON.stringify(updatedViewed));
                     if (result.isConfirmed) {
                         onNavigate('history');
                     }
                 });
             }
         }
     }
  }, [currentUser, userSubmissions, onNavigate]);

  // Get latest submission photo if available (fallback to currentUser avatar)
  const displayPhoto = useMemo(() => {
      return currentUser?.avatarUrl || null;
  }, [currentUser]);

  const handleActionClick = (action: string) => {
    if (!currentUser) {
        onLoginRequest();
    } else {
        if (action === 'register') onNavigate('register');
        if (action === 'history') onNavigate('history');
    }
  };

  const handleDownload = (id: number) => {
      const item = newsList.find(n => n.id === id);
      if (item) {
          if (item.imageUrl) {
              showToast({
                  type: 'success',
                  title: 'กำลังดาวน์โหลด',
                  message: `เริ่มการดาวน์โหลดไฟล์: ${item.title}`
              });
              window.open(item.imageUrl, '_blank');
          } else if (item.fileType && item.fileType.startsWith('http')) {
              // Fallback for existing data where URL was put in fileType
              showToast({
                  type: 'success',
                  title: 'กำลังดาวน์โหลด',
                  message: `เริ่มการดาวน์โหลดไฟล์: ${item.title}`
              });
              window.open(item.fileType, '_blank');
          } else {
              showToast({
                  type: 'error',
                  title: 'ไม่พบไฟล์',
                  message: 'ไม่มีลิงก์สำหรับดาวน์โหลดไฟล์นี้'
              });
          }
      }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      
      {/* Hero / Welcome Section */}
      <div className="text-center py-12 md:py-20 relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-slate-800 text-white shadow-2xl ring-1 ring-white/10">
         {/* Background Patterns (Data Flow) */}
         <div className="absolute top-0 left-0 w-full h-full opacity-10">
             <div className="absolute top-10 left-10 h-32 w-32 rounded-full border-4 border-dashed border-sky-500 animate-spin-slow"></div>
             <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full border-2 border-emerald-500 animate-pulse"></div>
             <i className="fa-solid fa-network-wired absolute top-1/2 left-1/4 text-8xl text-slate-700 transform -translate-y-1/2 opacity-20"></i>
         </div>
         
         {/* Gradient Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-600/20 blur-[120px] rounded-full pointer-events-none"></div>

         <div className="relative z-10 px-6 max-w-4xl mx-auto">
             {currentUser ? (
                 <div className="flex flex-col items-center">
                    {/* Official Photo Display or Default Avatar */}
                    <div className="mb-6 h-32 w-32 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-slate-800 relative group cursor-default">
                        {displayPhoto ? (
                            <img 
                                src={displayPhoto} 
                                alt="Author" 
                                className="w-full h-full object-cover transition transform group-hover:scale-110" 
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        ) : currentUser.avatarUrl ? (
                            <img 
                                src={currentUser.avatarUrl} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-500 bg-slate-200">
                                {currentUser.firstName.charAt(0)}
                            </div>
                        )}
                        {displayPhoto && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] py-1 font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                                Official Photo
                            </div>
                        )}
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold mb-6 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        ระบบพร้อมใช้งาน
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                        สวัสดีคุณ <span className="text-sky-400">{currentUser.firstName} {currentUser.lastName}</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-4 leading-relaxed font-bold">
                        ประกวดผลงานวิชาการ และนวัตกรรม ด้านสุขภาพ จังหวัดสตูล 2569
                    </p>
                    <p className="text-sm md:text-md text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                        เปิดเวทีให้บุคลากรสาธารณสุข ร่วมแลกเปลี่ยนเรียนรู้ นำเสนอผลงานวิชาการ<br className="hidden md:block"/> พร้อมคัดเลือกผลงานสู่ระดับจังหวัด ระดับเขต และระดับประเทศ
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                         <button 
                            onClick={() => handleActionClick('register')}
                            className="px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-sky-50 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 min-w-[180px]"
                        >
                            <i className="fa-solid fa-plus text-sky-600"></i>
                            ส่งผลงานใหม่ (15 สาขา)
                        </button>
                         <button 
                            onClick={() => handleActionClick('history')}
                            className="px-8 py-3.5 rounded-2xl bg-slate-800/80 text-white font-bold text-sm hover:bg-slate-700 transition border border-slate-700 hover:border-slate-600 active:bg-slate-800 flex items-center justify-center gap-2 backdrop-blur-sm min-w-[180px]"
                        >
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            ประวัติของฉัน
                        </button>
                    </div>
                    
                    <div className="mt-12 text-left w-full shadow-2xl rounded-[2.5rem]">
                        <ScheduleSection />
                    </div>
                 </div>
             ) : (
                 <>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-bold mb-6 backdrop-blur-sm">
                        <i className="fa-solid fa-star"></i>
                        มหกรรมแลกเปลี่ยนเรียนรู้ฯ 2569
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-tight">
                        ประกวดผลงานวิชาการ<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">และนวัตกรรม ด้านสุขภาพ</span><br/>
                        <span className="text-2xl md:text-4xl">จังหวัดสตูล 2569</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                        เปิดเวทีให้บุคลากรสาธารณสุข ร่วมแลกเปลี่ยนเรียนรู้ นำเสนอผลงานวิชาการ<br/>
                        พร้อมคัดเลือกผลงานสู่ระดับจังหวัด ระดับเขต และระดับประเทศ
                    </p>
                    
                    {/* Primary Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <button 
                            onClick={onLoginRequest}
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-black text-lg hover:from-sky-500 hover:to-indigo-500 hover:scale-105 active:scale-100 transition shadow-lg shadow-sky-900/40 ring-4 ring-white/5"
                        >
                            <i className="fa-solid fa-right-to-bracket mr-2"></i>
                            ลงทะเบียน / เข้าสู่ระบบ
                        </button>
                        <button 
                            onClick={() => handleActionClick('history')}
                             className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800/50 text-slate-200 font-bold text-lg hover:bg-slate-800 hover:text-white transition border border-slate-700 backdrop-blur-sm active:bg-slate-800"
                        >
                            <i className="fa-solid fa-book-open mr-2"></i>
                            เข้าสู่คลังผลงาน
                        </button>
                    </div>

                    <div className="mt-12 text-left w-full shadow-2xl rounded-[2.5rem]">
                        <ScheduleSection />
                    </div>

                    {/* Submission Links / QR Alternatives */}
                    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-[2rem] p-6 max-w-4xl mx-auto mb-10">
                         <h4 className="text-white font-bold mb-4 text-sm text-center">ช่องทางการส่งผลงาน (หรือสแกน QR Code ในโปสเตอร์)</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <button onClick={() => onNavigate('register')} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 transition text-sm text-slate-300 hover:text-white group">
                                  <i className="fa-solid fa-microphone-lines text-sky-400 group-hover:scale-110 transition-transform"></i>
                                  Oral Presentation
                              </button>
                              <button onClick={() => onNavigate('register')} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 transition text-sm text-slate-300 hover:text-white group">
                                  <i className="fa-solid fa-image text-emerald-400 group-hover:scale-110 transition-transform"></i>
                                  E-Poster
                              </button>
                              <button onClick={() => onNavigate('register')} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 transition text-sm text-slate-300 hover:text-white group">
                                  <i className="fa-solid fa-lightbulb text-amber-400 group-hover:scale-110 transition-transform"></i>
                                  Innovation & Invention
                              </button>
                         </div>
                    </div>
                    
                    {/* Secondary Links (Manuals) */}
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-60">เอกสารแนะนำ:</span>
                        <button 
                            onClick={() => handleDownload(3)}
                            className="group flex items-center gap-2 hover:text-sky-300 transition"
                        >
                            <div className="h-6 w-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-sky-500/20 group-hover:border-sky-500/50 transition">
                                <i className="fa-solid fa-file-pdf text-xs"></i>
                            </div>
                            <span className="border-b border-transparent group-hover:border-sky-300 transition-colors">คู่มือการใช้งานระบบ</span>
                        </button>
                        <button 
                            onClick={() => handleDownload(2)}
                             className="group flex items-center gap-2 hover:text-emerald-300 transition"
                        >
                            <div className="h-6 w-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 transition">
                                <i className="fa-solid fa-file-pen text-xs"></i>
                            </div>
                            <span className="border-b border-transparent group-hover:border-emerald-300 transition-colors">แนวทางการเขียนผลงาน</span>
                        </button>
                    </div>
                 </>
             )}
         </div>
      </div>

      {/* Timeline Section (Only if logged in) */}
      {currentUser && (
          <div className="animate-bounce-in">
              <div className="mb-4 px-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-bars-progress text-sky-500"></i>
                      ความคืบหน้าการส่งผลงาน (Timeline)
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">ข้อมูลล่าสุด</span>
              </div>
              <Timeline user={currentUser} submissions={userSubmissions} />
          </div>
      )}

      {/* KM Concept: Upstream, Midstream, Downstream (Improved Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Upstream */}
          <div className="relative group bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                  <i className="fa-solid fa-cloud-arrow-up text-9xl text-sky-500"></i>
              </div>
              
              <div className="h-16 w-16 rounded-2xl bg-sky-50 dark:bg-sky-900/30 text-sky-500 flex items-center justify-center text-3xl mb-6 shadow-sm group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                  <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">1. ต้นน้ำ (Upstream)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">การค้นหาและรวบรวม (Capture)</span>
                  แสวงหาความรู้จากหน้างาน (Tacit Knowledge) และข้อมูลวิชาการ (Explicit Knowledge) เพื่อนำเข้าสู่ระบบ
              </p>
          </div>

          {/* Card 2: Midstream */}
          <div className="relative group bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                  <i className="fa-solid fa-boxes-stacked text-9xl text-indigo-500"></i>
              </div>
              
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center text-3xl mb-6 shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                   <i className="fa-solid fa-layer-group"></i>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">2. กลางน้ำ (Midstream)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">การจัดระเบียบ (Organize)</span>
                  คัดกรอง สังเคราะห์ และจัดหมวดหมู่องค์ความรู้ ให้เป็นระบบ เข้าถึงง่าย และมีมาตรฐาน
              </p>
          </div>

          {/* Card 3: Downstream */}
          <div className="relative group bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                  <i className="fa-solid fa-share-nodes text-9xl text-emerald-500"></i>
              </div>
              
              <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center text-3xl mb-6 shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  <i className="fa-solid fa-paper-plane"></i>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">3. ปลายน้ำ (Downstream)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">การเผยแพร่ (Share & Use)</span>
                  ถ่ายทอด แลกเปลี่ยนเรียนรู้ และนำองค์ความรู้ไปประยุกต์ใช้ในการปฏิบัติงานจริงเพื่อประชาชน
              </p>
          </div>
      </div>

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Menu 1: Send Work */}
          <div 
             onClick={() => handleActionClick('register')}
             className="cursor-pointer group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 hover:shadow-xl hover:-translate-y-1 transition duration-300 text-left flex flex-col h-full"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110 duration-500">
                <i className="fa-solid fa-paper-plane text-9xl text-sky-600"></i>
             </div>
             <div className="relative z-10 flex-1">
                <div className="h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl mb-4 group-hover:bg-sky-600 group-hover:text-white transition">
                    <i className="fa-solid fa-file-import"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">นำเข้าองค์ความรู้</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">ส่งผลงานวิชาการ ถอดบทเรียน นวัตกรรม</p>
             </div>
             
             {/* Action / State Area */}
             <div className="relative z-10 mt-auto">
                 {currentUser ? (
                    <div className="inline-flex items-center text-sm font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition">
                        เริ่มส่งผลงาน <i className="fa-solid fa-arrow-right ml-2"></i>
                    </div>
                 ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-center justify-between group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20 group-hover:border-rose-100 dark:group-hover:border-rose-900/50 transition">
                         <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                             <i className="fa-solid fa-lock"></i> สงวนสิทธิ์สมาชิก
                         </div>
                         <span className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm text-slate-600 dark:text-slate-300">
                             เข้าสู่ระบบ
                         </span>
                    </div>
                 )}
             </div>
          </div>

          {/* Menu 2: View Works (Gallery/History) */}
          <div 
             onClick={() => handleActionClick('history')}
             className="cursor-pointer group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-700 hover:shadow-xl hover:-translate-y-1 transition duration-300 text-left flex flex-col h-full"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110 duration-500">
                <i className="fa-solid fa-layer-group text-9xl text-indigo-600"></i>
             </div>
             <div className="relative z-10 flex-1">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <i className="fa-solid fa-book-open-reader"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">คลังความรู้ (KM Bank)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">สืบค้นผลงานวิชาการและบทเรียน</p>
             </div>

             {/* Action / State Area */}
             <div className="relative z-10 mt-auto">
                 {currentUser ? (
                    <div className="inline-flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition">
                        เข้าสู่คลังความรู้ <i className="fa-solid fa-arrow-right ml-2"></i>
                    </div>
                 ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-center justify-between group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20 group-hover:border-rose-100 dark:group-hover:border-rose-900/50 transition">
                         <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                             <i className="fa-solid fa-lock"></i> สงวนสิทธิ์สมาชิก
                         </div>
                         <span className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm text-slate-600 dark:text-slate-300">
                             เข้าสู่ระบบ
                         </span>
                    </div>
                 )}
             </div>
          </div>

          {/* Menu 3: Inspect (Disabled) */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-50 dark:bg-slate-800 p-6 ring-1 ring-slate-200 dark:ring-slate-700 text-left opacity-80 grayscale flex flex-col h-full">
             <div className="absolute top-4 right-4">
                 <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-500 dark:text-slate-300">เร็วๆ นี้</span>
             </div>
             <div className="relative z-10 flex-1">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-2xl mb-4">
                    <i className="fa-solid fa-chart-network"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">วิเคราะห์เครือข่ายความรู้</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Knowledge Mapping & Analysis</p>
             </div>
             <div className="relative z-10 mt-auto pt-6">
                <div className="inline-flex items-center text-sm font-bold text-slate-400 cursor-not-allowed">
                    ปิดใช้งานชั่วคราว <i className="fa-solid fa-lock ml-2"></i>
                </div>
             </div>
          </div>
      </div>

      {/* About SKMS Section */}
      <div className="mt-12 rounded-[2.5rem] bg-slate-900 relative overflow-hidden shadow-xl ring-1 ring-slate-800">
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
                              <div className="h-10 w-10 mx-auto rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
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

                  {/* Right: Graphic / Journey (Improved Timeline) */}
                  <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-emerald-500 opacity-20 blur-2xl rounded-full transform rotate-12"></div>
                      <div className="relative bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8">
                          <h3 className="text-lg font-bold text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-2">
                              <i className="fa-solid fa-sitemap text-amber-400"></i>
                              กระบวนการ SKMS Model
                          </h3>
                          
                          <div className="relative pl-4 space-y-8">
                              {/* Vertical Connector Line */}
                              <div className="absolute left-[34px] top-4 bottom-10 w-0.5 bg-gradient-to-b from-sky-500 via-indigo-500 to-emerald-500 opacity-50 rounded-full"></div>

                              {/* Step 1 */}
                              <div className="relative flex gap-6 group">
                                  <div className="z-10 flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 border-[3px] border-sky-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-sky-500/20 group-hover:scale-110 group-hover:bg-sky-500 transition duration-300">
                                      1
                                  </div>
                                  <div className="pt-0.5 transition group-hover:translate-x-1 duration-300">
                                      <h4 className="text-sky-400 font-bold text-base mb-1">Knowledge Capture (ต้นน้ำ)</h4>
                                      <p className="text-slate-400 text-sm leading-relaxed">
                                          รวบรวมความรู้ฝังลึก (Tacit) จากประสบการณ์หน้างาน และความรู้ชัดแจ้ง (Explicit)
                                      </p>
                                  </div>
                              </div>

                              {/* Step 2 */}
                              <div className="relative flex gap-6 group">
                                  <div className="z-10 flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 border-[3px] border-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-500 transition duration-300">
                                      2
                                  </div>
                                  <div className="pt-0.5 transition group-hover:translate-x-1 duration-300">
                                      <h4 className="text-indigo-400 font-bold text-base mb-1">Knowledge Organization (กลางน้ำ)</h4>
                                      <p className="text-slate-400 text-sm leading-relaxed">
                                          ตรวจสอบความถูกต้อง (Validation) จัดหมวดหมู่ และจัดเก็บในคลังความรู้ (KM Bank)
                                      </p>
                                  </div>
                              </div>

                              {/* Step 3 */}
                              <div className="relative flex gap-6 group">
                                  <div className="z-10 flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 border-[3px] border-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500 transition duration-300">
                                      3
                                  </div>
                                  <div className="pt-0.5 transition group-hover:translate-x-1 duration-300">
                                      <h4 className="text-emerald-400 font-bold text-base mb-1">Knowledge Sharing (ปลายน้ำ)</h4>
                                      <p className="text-slate-400 text-sm leading-relaxed">
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
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* PR News List */}
          <div className="rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 shadow-inner ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 flex items-center justify-center shadow-sm">
                          <i className="fa-solid fa-bullhorn text-xl"></i>
                      </div>
                      <div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white">ข่าวประชาสัมพันธ์</h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ประกาศและกิจกรรมล่าสุด</p>
                      </div>
                  </div>
                  <button 
                    onClick={() => onOpenNews(0)}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:border-rose-200 transition font-bold text-xs flex items-center gap-2 shadow-sm"
                  >
                    ดูทั้งหมด <i className="fa-solid fa-arrow-right"></i>
                  </button>
              </div>
              
              <div className="space-y-4">
                  {newsList.filter(n => n.type === 'news').map((item, filteredIndex) => {
                      return (
                          <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: "-50px" }}
                              transition={{ duration: 0.5, delay: filteredIndex * 0.1 }}
                              key={item.id} 
                              className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 ring-1 ring-slate-100 dark:ring-slate-700 border-l-4 border-l-rose-500 cursor-pointer overflow-hidden hover:-translate-y-1" 
                              onClick={() => onOpenNews(filteredIndex)}
                          >
                              
                              <div className="flex flex-col sm:flex-row gap-5">
                                  {/* Image/Icon */}
                                  <div className="shrink-0 w-full sm:w-32 h-32 sm:h-auto rounded-2xl overflow-hidden relative">
                                      {item.imageUrl ? (
                                          <img 
                                            src={item.imageUrl} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                          />
                                      ) : (
                                          <div className="w-full h-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-300">
                                              <i className="fa-regular fa-image text-4xl"></i>
                                          </div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 sm:hidden"></div>
                                  </div>

                                  <div className="flex-1 flex flex-col justify-between py-1">
                                      <div>
                                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                                              <i className="fa-regular fa-calendar-check text-rose-500"></i>
                                              {item.date}
                                          </div>
                                          <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-2 group-hover:text-rose-600 transition line-clamp-2">
                                              {item.title}
                                          </h3>
                                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                                              {item.desc}
                                          </p>
                                      </div>
                                      
                                      <button 
                                          className="self-start px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-rose-500 hover:text-white hover:shadow-md transition-all duration-300 flex items-center gap-2"
                                      >
                                          อ่านเพิ่มเติม
                                          <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
                                      </button>
                                  </div>
                              </div>
                          </motion.div>
                      );
                  })}
              </div>
          </div>

          {/* Downloads List (Grid Layout) */}
          <div className="rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 shadow-inner ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-700 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                      <i className="fa-solid fa-cloud-arrow-down text-xl"></i>
                  </div>
                  <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">เอกสารดาวน์โหลด</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">คู่มือและแบบฟอร์มต่างๆ</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newsList.filter(n => n.type === 'download').map((item, filteredIndex) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: filteredIndex * 0.1 }}
                        key={item.id} 
                        onClick={() => handleDownload(item.id)}
                        className="group flex flex-col bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ring-1 ring-slate-200 dark:ring-slate-700 cursor-pointer relative overflow-hidden"
                      >
                          {/* Decorative BG */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>

                          <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center text-2xl shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                  <i className="fa-solid fa-file-pdf"></i>
                              </div>
                              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-200 dark:border-slate-700">
                                  {item.fileType || 'PDF'}
                              </span>
                          </div>

                          <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1 line-clamp-2 min-h-[2.5em] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.title}
                          </h3>
                          
                          <div className="text-xs text-slate-400 mb-4 flex items-center gap-2">
                             <i className="fa-regular fa-clock"></i> {item.date}
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-500 transition-colors">ดาวน์โหลด</span>
                              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                  <i className="fa-solid fa-download text-xs"></i>
                              </div>
                          </div>
                      </motion.div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Home;
