import React from 'react';
import { Submission, UserProfile } from '../types';

interface TimelineProps {
  user: UserProfile;
  submissions: Submission[];
}

const Timeline: React.FC<TimelineProps> = ({ user, submissions }) => {
  // Determine current step based on user and submission status
  // Steps: 
  // 1. Registered (User exists) -> Done
  // 2. Draft Submission -> If submission exists and status is draft (Current), if submitted (Done)
  // 3. Submit Completed -> If submission exists and status is submitted (Done)
  // 4. Review/Announce -> Pending

  const latestSubmission = submissions.length > 0 ? submissions[0] : null;

  const steps = [
    {
      id: 1,
      label: "ลงทะเบียนสมาชิก",
      desc: `คุณ ${user.firstName}`,
      status: "done", // Always done if seeing this
      icon: "fa-user-check"
    },
    {
      id: 2,
      label: "ร่างผลงาน",
      desc: latestSubmission ? "บันทึกข้อมูลแล้ว" : "รอสร้างผลงาน",
      status: latestSubmission ? "done" : "current",
      icon: "fa-pen-ruler"
    },
    {
      id: 3,
      label: "ส่งผลงาน",
      desc: latestSubmission?.status === 'submitted' ? "ส่งเรียบร้อยแล้ว" : "รอยืนยันการส่ง",
      status: latestSubmission?.status === 'submitted' ? "done" : (latestSubmission ? "current" : "pending"),
      icon: "fa-paper-plane"
    },
    {
      id: 4,
      label: "ตรวจสอบ/ประกาศผล",
      desc: "รอคณะกรรมการ",
      status: "pending",
      icon: "fa-trophy"
    }
  ];

  return (
    <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-slate-200">
       <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <i className="fa-solid fa-timeline text-sky-600"></i>
          เส้นทางความสำเร็จ (Timeline)
       </h3>

       <div className="relative">
          {/* Mobile Vertical View */}
          <div className="md:hidden space-y-8 pl-4 border-l-2 border-slate-100 ml-4">
             {steps.map((step, idx) => (
                <div key={step.id} className="relative pl-6">
                   <div className={`absolute -left-[33px] top-0 h-10 w-10 rounded-full border-4 border-white flex items-center justify-center text-sm shadow-md transition-all
                      ${step.status === 'done' ? 'bg-emerald-500 text-white' : 
                        step.status === 'current' ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}
                   `}>
                      <i className={`fa-solid ${step.icon}`}></i>
                   </div>
                   <h4 className={`text-lg font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                      {step.label}
                   </h4>
                   <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
             ))}
          </div>

          {/* Desktop Horizontal View */}
          <div className="hidden md:flex items-start justify-between relative">
              {/* Connector Line */}
              <div className="absolute top-7 left-0 w-full h-1 bg-slate-100 -z-10"></div>
              <div className="absolute top-7 left-0 h-1 bg-emerald-500 -z-10 transition-all duration-1000"
                   style={{ 
                       width: `${steps.filter(s => s.status === 'done').length * 33}%`
                   }}
              ></div>

              {steps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center text-center w-1/4 group">
                      <div className={`h-14 w-14 rounded-full border-4 border-white flex items-center justify-center text-xl shadow-lg mb-4 transition-transform hover:scale-110
                          ${step.status === 'done' ? 'bg-emerald-500 text-white' : 
                            step.status === 'current' ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-slate-200 text-slate-400'}
                      `}>
                          {step.status === 'done' ? <i className="fa-solid fa-check"></i> : <i className={`fa-solid ${step.icon}`}></i>}
                      </div>
                      <h4 className={`text-base font-bold mb-1 ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                          {step.label}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-[120px]">{step.desc}</p>
                  </div>
              ))}
          </div>
       </div>
    </div>
  );
};

export default Timeline;