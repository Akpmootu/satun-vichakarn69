import React, { useState, useEffect, useMemo } from 'react';
import { Submission, AppSettings, UserProfile, ReviewerScore } from '../types';
import { apiGetAllScores, apiSaveReviewerScore } from '../services/apiService';
import { WORK_TYPES, BRANCHES } from '../constants';

declare const Swal: any;

interface ReviewerPanelProps {
  submissions: Submission[];
  settings: AppSettings;
  refreshData: () => void;
  showToast: (t: any) => void;
  currentUser: UserProfile;
}

interface CriteriaItem {
  id: string;
  label: string;
  weight: number;
  group?: string;
}

const ORAL_CRITERIA: CriteriaItem[] = [
  { id: '1', label: '1. วัตถุประสงค์ความเป็นมา หลักการและเหตุผล', weight: 3 },
  { id: '2', label: '2. ระเบียบวิธีการศึกษา/วิจัย', weight: 5 },
  { id: '3', label: '3. การนำเสนอ การลำดับเรื่องและการตอบข้อซักถาม การรักษาเวลา', weight: 4 },
  { id: '4', label: '4. วิจารณ์ผลและสรุป', weight: 4 },
  { id: '5', label: '5. การนำไปใช้ประโยชน์', weight: 4 }
];

const INNOVATION_CRITERIA: CriteriaItem[] = [
  { id: '1_1', label: '1.1 ความสำคัญของเรื่องที่ศึกษา', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '1_2', label: '1.2 ประโยชน์ในการแก้ปัญหาสาธารณสุข', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '1_3', label: '1.3 Original idea', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '2', label: '2. การออกแบบและการพัฒนา (design)', weight: 5 },
  { id: '3', label: '3. การประเมินผล', weight: 4 },
  { id: '4_1', label: '4.1 Reproducibility', weight: 4, group: '4. การนำไปใช้ประโยชน์' },
  { id: '4_2', label: '4.2 Applicability', weight: 4, group: '4. การนำไปใช้ประโยชน์' }
];

const parseAttachments = (fileUrl?: string) => {
    if (!fileUrl) return [];
    try {
        if (fileUrl.startsWith('[')) {
            return JSON.parse(fileUrl);
        }
        return [{ type: 'file', value: fileUrl, name: 'ไฟล์แนบ' }];
    } catch (e) {
        return [];
    }
};

const ScoreSelector = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
    return (
        <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 3, 4, 5].map(v => (
                <button
                    key={v}
                    onClick={() => onChange(v)}
                    className={`h-10 w-10 shrink-0 rounded-xl font-bold flex items-center justify-center transition-all ${
                        value === v 
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-200 dark:shadow-none' 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 hover:text-sky-600'
                    }`}
                >
                    {v}
                </button>
            ))}
            {value > 0 && <span className="ml-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-bold animate-fade-in"><i className="fa-solid fa-check"></i> เลือกลงคะแนนแล้ว</span>}
        </div>
    );
};

const ReviewerPanel: React.FC<ReviewerPanelProps> = ({ submissions, settings, refreshData, showToast, currentUser }) => {
  const [allScores, setAllScores] = useState<ReviewerScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [currentScoreData, setCurrentScoreData] = useState<Record<string, {score: number, comment: string}>>({});
  
  const loadScores = async () => {
      setLoading(true);
      try {
          const scores = await apiGetAllScores();
          setAllScores(scores);
      } catch (err: any) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadScores();
  }, [submissions]);

  // Only show submissions that belong to reviewer's branch
  const branchSubmissions = useMemo(() => {
      if (!currentUser.branchId) return [];
      return submissions.filter(s => Array.isArray(currentUser.branchId) || s.branchId?.toString() === currentUser.branchId?.toString());
  }, [submissions, currentUser]);

  const handleOpenAssessment = (sub: Submission) => {
      setActiveSubmission(sub);
      const existing = allScores.find(s => s.submissionId === sub.id && s.reviewerId === currentUser.id);
      if (existing) {
          setCurrentScoreData(existing.scoreData);
      } else {
          setCurrentScoreData({});
      }
  };

  const calculateTotal = (workType: string, scoreData: Record<string, {score: number}>) => {
      const criteria = workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
      let total = 0;
      criteria.forEach(c => {
          if (scoreData[c.id] && scoreData[c.id].score) {
              total += scoreData[c.id].score * c.weight;
          }
      });
      return total;
  };

  const handleSaveScore = async () => {
      if (!activeSubmission) return;
      const criteria = activeSubmission.workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
      
      let missing = false;
      criteria.forEach(c => {
          if (!currentScoreData[c.id] || !currentScoreData[c.id].score) {
              missing = true;
          }
      });

      if (missing) {
          const { isConfirmed } = await Swal.fire({
              title: 'ข้อมูลไม่ครบถ้วน',
              text: 'คุณยังให้คะแนนไม่ครบทุกหัวข้อ ยืนยันที่จะบันทึกไว้ก่อนหรือไม่?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'บันทึกชั่วคราว',
              cancelButtonText: 'ยกเลิก',
              confirmButtonColor: '#0ea5e9'
          });
          if (!isConfirmed) return;
      } else {
          // Show summary
          const summaryHtml = criteria.map(c => {
             const sc = currentScoreData[c.id]?.score || 0;
             return `<div class="flex justify-between text-sm py-1.5 border-b border-slate-100"><span class="truncate pr-4 text-slate-600">${c.label}</span><b class="text-slate-800">${sc} × ${c.weight} = ${sc * c.weight}</b></div>`;
          }).join('');
          
          const total = calculateTotal(activeSubmission.workType, currentScoreData);
          
          const { isConfirmed } = await Swal.fire({
              title: 'สรุปคะแนน',
              html: `<div class="text-left mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">${summaryHtml}</div><div class="text-2xl font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 p-4 rounded-xl">คะแนนรวม ${total} / 100</div>`,
              showCancelButton: true,
              confirmButtonText: 'ยืนยันการส่งคะแนน',
              cancelButtonText: 'แก้ไข',
              confirmButtonColor: '#0ea5e9'
          });
          if (!isConfirmed) return;
      }

      Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
          const totalScore = calculateTotal(activeSubmission.workType, currentScoreData);
          await apiSaveReviewerScore({
              submissionId: activeSubmission.id,
              reviewerId: currentUser.id,
              workType: activeSubmission.workType,
              scoreData: currentScoreData,
              totalScore: totalScore
          });
          await loadScores();
          showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'บันทึกคะแนนเรียบร้อยแล้วคะค่ะ' });
          setActiveSubmission(null);
          Swal.close();
      } catch (err: any) {
          Swal.close();
          showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message });
      }
  };

  const renderTable = () => (
      <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-10">
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <i className="fa-solid fa-chart-bar absolute -bottom-5 -right-5 text-8xl opacity-20 transform -rotate-12"></i>
                <div className="relative z-10">
                    <h2 className="font-black text-2xl mb-1"><i className="fa-solid fa-list-check opacity-70 mr-2"></i>รายชื่อผลงานที่รับผิดชอบ</h2>
                    <p className="text-sky-100 font-medium">หมวด: {BRANCHES.find((b: any) => b.id.toString() === currentUser.branchId?.toString())?.label || currentUser.branchId}</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <tr>
                                <th className="px-5 py-4 border-b font-bold tracking-tight">ลำดับการ<br/>นำเสนอ</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight">ประเภท</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight">รหัส</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight">ชื่อผลงาน</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight">ชื่อผู้ส่ง</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center bg-sky-50 dark:bg-sky-900/30">คะแนน<br/>ของฉัน</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">รวม<br/>คะแนน</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">จำนวน<br/>กรรมการ</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center">เฉลี่ย</th>
                                <th className="px-5 py-4 border-b font-bold tracking-tight text-center rounded-tr-xl">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {branchSubmissions.map((s, idx) => {
                                const subScores = allScores.filter(sc => sc.submissionId === s.id);
                                const myScore = subScores.find(sc => sc.reviewerId === currentUser.id);
                                const totalSc = subScores.reduce((acc, cr) => acc + cr.totalScore, 0);
                                const avgSc = subScores.length > 0 ? (totalSc / subScores.length).toFixed(2) : '-';
                                const workTypeName = WORK_TYPES.find(w => w.id === s.workType)?.label || s.workType;
                                
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group">
                                        <td className="px-5 py-4">{(idx + 1).toString().padStart(2, '0')}</td>
                                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-200">{workTypeName}</td>
                                        <td className="px-5 py-4 font-mono text-xs">{s.id.substring(0,8)}</td>
                                        <td className="px-5 py-4 max-w-[200px] truncate" title={s.fileName}>{s.fileName}</td>
                                        <td className="px-5 py-4">{s.firstName} {s.lastName}</td>
                                        <td className="px-5 py-4 text-center font-black text-sky-600 bg-sky-50/50 dark:bg-sky-900/10 group-hover:bg-sky-100/50 transition">
                                            {myScore ? myScore.totalScore : <span className="text-slate-300 font-normal">-</span>}
                                        </td>
                                        <td className="px-5 py-4 text-center font-bold text-slate-800 dark:text-white">{totalSc > 0 ? totalSc : <span className="text-slate-300 font-normal">-</span>}</td>
                                        <td className="px-5 py-4 text-center">{subScores.length > 0 ? subScores.length : <span className="text-slate-300">-</span>}</td>
                                        <td className="px-5 py-4 text-center font-black text-emerald-600">{avgSc}</td>
                                        <td className="px-5 py-4 text-center">
                                            <button 
                                                onClick={() => handleOpenAssessment(s)}
                                                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-200 dark:bg-slate-800/80 dark:hover:bg-emerald-500 dark:hover:shadow-none rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto w-full md:w-auto"
                                            >
                                                <i className="fa-regular fa-pen-to-square"></i> ให้คะแนน
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {branchSubmissions.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-5 py-16 text-center text-slate-400">
                                        <i className="fa-solid fa-inbox text-4xl mb-3 opacity-30 block"></i>
                                        ไม่พบรายการผลงานในสาขาที่คุณรับผิดชอบ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
      </div>
  );

  const renderAssessment = () => {
      if (!activeSubmission) return null;
      const criteria = activeSubmission.workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;
      const attachments = parseAttachments(activeSubmission.fileUrl);
      const mainPdf = attachments.find((a: any) => a.name === 'ไฟล์นำเสนอ' || (a.value && a.value.toLowerCase().includes('.pdf'))) || attachments[0];

      return (
          <div className="animate-fade-in flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto pb-10">
              
              {/* Left Side: Detail & Content */}
              <div className="w-full lg:w-[45%] flex flex-col gap-5">
                  <button 
                      onClick={() => setActiveSubmission(null)}
                      className="self-start px-4 py-2 bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold hover:text-sky-600 hover:shadow-md hover:bg-slate-50 transition rounded-xl flex items-center gap-2 shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                      <i className="fa-solid fa-arrow-left"></i> ย้อนกลับ
                  </button>
                  
                  <div className="bg-sky-50 dark:bg-sky-900/10 border-t-4 border-sky-500 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-5 md:p-6 space-y-4 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                              <span className="text-slate-500 font-medium">รหัสผลงาน</span> 
                              <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 col-span-2 place-self-start">{activeSubmission.id.substring(0,8)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">ชื่อผลงาน</span> 
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-base leading-tight col-span-2">{activeSubmission.fileName}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">ผู้จัดทำ</span> 
                              <span className="col-span-2 flex items-center gap-2 text-slate-700 dark:text-slate-300"><i className="fa-solid fa-user text-sky-400"></i> {activeSubmission.firstName} {activeSubmission.lastName}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-sky-100 dark:border-sky-800/50 pt-4">
                              <span className="text-slate-500 font-medium">หมวดหมู่</span> 
                              <span className="col-span-2 text-slate-700 dark:text-slate-300">{WORK_TYPES.find(w => w.id === activeSubmission.workType)?.label}</span>
                          </div>
                      </div>
                  </div>

                  {mainPdf ? (
                      <div className="flex-1 min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col bg-slate-900 shadow-md relative group">
                          <div className="absolute top-2 right-2 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <a href={mainPdf.value} target="_blank" rel="noreferrer" className="w-10 h-10 bg-black/60 hover:bg-sky-500 text-white rounded-xl backdrop-blur-md flex items-center justify-center transition border border-white/10" title="เปิดเต็มจอ (แท็บใหม่)">
                                  <i className="fa-solid fa-external-link-alt text-sm"></i>
                              </a>
                          </div>
                          {mainPdf.value.includes('.pdf') ? (
                              <iframe src={mainPdf.value} className="w-full h-full flex-1 border-0 bg-white" title="PDF Viewer" />
                          ) : (
                              <div className="p-8 text-center m-auto text-slate-400">
                                  <i className="fa-solid fa-file-image text-7xl mb-6 opacity-30"></i>
                                  <div className="font-semibold text-lg text-white mb-2">ไม่สามารถแสดงตัวอย่างได้บนหน้านี้</div>
                                  <p className="text-sm mb-6 max-w-xs mx-auto">ระบบรองรับการพรีวิวไฟล์ PDF เท่านั้น โปรดเปิดไฟล์แนบผ่านลิงก์ด้านล่างเพื่อตรวจสอบ</p>
                                  <a href={mainPdf.value} target="_blank" className="px-6 py-2.5 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-400 transition inline-block">เปิดไฟล์ในแท็บใหม่</a>
                              </div>
                          )}
                      </div>
                  ) : (
                       <div className="flex-1 min-h-[300px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 text-slate-400 p-8 text-center">
                            <i className="fa-solid fa-folder-open text-6xl mb-4 opacity-50"></i>
                            <div className="font-bold text-lg text-slate-600 dark:text-slate-300">ไม่มีไฟล์แนบที่เปิดได้</div>
                            <p className="text-sm mt-2">ผลงานนี้อาจไม่มีไฟล์นำเสนอ หรือถูกบันทึกด้วยรูปแบบที่ไม่รองรับ</p>
                       </div>
                  )}
              </div>

              {/* Right Side: Scoring Form */}
              <div className="w-full lg:w-[55%]">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col h-full">
                      {/* Decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 dark:bg-sky-900/10 rounded-bl-full pointer-events-none -z-0 opacity-50"></div>
                      
                      <div className="flex items-center justify-between mb-8 relative z-10">
                          <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                              <i className="fa-solid fa-clipboard-check text-emerald-500"></i> ให้คะแนน 
                              <span className="text-sm font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full uppercase tracking-widest">{activeSubmission.workType}</span>
                          </h3>
                      </div>
                      
                      <div className="space-y-8 relative z-10 flex-1 overflow-y-auto pb-10 pr-2 custom-scrollbar">
                          {criteria.map((c, i) => {
                              const v = currentScoreData[c.id]?.score || 0;
                              const note = currentScoreData[c.id]?.comment || '';
                              const showGroup = c.group && (i === 0 || criteria[i-1].group !== c.group);
                              
                              return (
                                  <div key={c.id}>
                                      {showGroup && (
                                          <div className="text-base font-black text-sky-700 dark:text-sky-400 mb-4 pb-2 border-b-2 border-sky-100 dark:border-sky-900/50 flex items-center gap-2">
                                              <i className="fa-solid fa-layer-group text-sky-300"></i> {c.group}
                                          </div>
                                      )}
                                      <div className={`p-5 rounded-2xl transition border ${v > 0 ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800'} ${c.group ? 'ml-2 md:ml-4' : ''}`}>
                                          <div className="flex justify-between items-start gap-4 mb-4">
                                              <div className="font-bold text-slate-700 dark:text-slate-200 text-base leading-snug">{c.label} 
                                                  <span className="text-[11px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-md inline-block ml-2 align-middle">x{c.weight}</span>
                                              </div>
                                              <div className="text-right shrink-0 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center min-w-[70px]">
                                                  <div className="text-xs text-slate-400 uppercase font-black tracking-wider mb-0.5">รวม</div>
                                                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 leading-none">{v > 0 ? v * c.weight : '-'}</div>
                                              </div>
                                          </div>
                                          
                                          <ScoreSelector 
                                              value={v} 
                                              onChange={(val) => setCurrentScoreData(prev => ({...prev, [c.id]: { ...prev[c.id], score: val }}))} 
                                          />
                                          
                                          <div className="mt-4 relative group">
                                              <div className="absolute left-3 top-2.5 text-slate-400 transition group-focus-within:text-sky-500">
                                                  <i className="fa-regular fa-comment-dots"></i>
                                              </div>
                                              <input 
                                                  type="text"
                                                  placeholder="เพิ่มข้อเสนอแนะในหัวข้อนี้ (ไม่บังคับ)..."
                                                  value={note}
                                                  onChange={(e) => setCurrentScoreData(prev => ({...prev, [c.id]: { ...prev[c.id], comment: e.target.value }}))}
                                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 transition placeholder:text-slate-300"
                                              />
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 flex gap-3">
                          <button 
                              onClick={handleSaveScore}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition flex items-center justify-center gap-3 shadow-xl dark:bg-sky-600 dark:hover:bg-sky-500 focus:ring-4 focus:ring-sky-100"
                          >
                              <i className="fa-solid fa-check-double text-emerald-400"></i> ตรวจทานและส่งคะแนน
                          </button>
                      </div>
                  </div>
              </div>

          </div>
      );
  };

  return (
    <div className="min-h-[500px] mb-20 relative z-10 w-full animate-fade-in">
        {!activeSubmission ? renderTable() : renderAssessment()}
    </div>
  );
};

export default ReviewerPanel;
