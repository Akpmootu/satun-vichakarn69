import React, { useState, useMemo, useEffect } from 'react';
import { Submission, NewsItem, AppSettings, SubmissionStatus } from '../types';
import { apiUpdateSubmission, apiDeleteSubmission, apiGetNews, apiAddNews, apiDeleteNews } from '../services/apiService';
import { BRANCHES, WORK_TYPES } from '../constants';
import Badge from './ui/Badge';

declare const Swal: any;

interface AdminPanelProps {
  submissions: Submission[];
  settings: AppSettings;
  refreshData: () => void;
  showToast: (t: any) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ submissions, settings, refreshData, showToast }) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'news'>('submissions');
  const [newsList, setNewsList] = useState<NewsItem[]>([]);

  // Submissions State
  const [filter, setFilter] = useState({ q: '', branch: 'all', status: 'all' });
  const [newsForm, setNewsForm] = useState({ title: '', desc: '', type: 'news', imageUrl: '', fileType: '' });
  const [showNewsForm, setShowNewsForm] = useState(false);

  useEffect(() => {
      setNewsList(apiGetNews());
  }, []);

  const filteredSubmissions = useMemo(() => {
      return submissions.filter(s => {
          const matchQ = (s.firstName + s.lastName + s.organization).toLowerCase().includes(filter.q.toLowerCase());
          const matchBranch = filter.branch === 'all' || s.branchId.toString() === filter.branch;
          const matchStatus = filter.status === 'all' || s.status === filter.status;
          return matchQ && matchBranch && matchStatus;
      });
  }, [submissions, filter]);

  const handleUpdateStatus = async (id: string, status: SubmissionStatus) => {
      const result = await Swal.fire({
          title: `เปลี่ยนสถานะเป็น "${status}"?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
      });

      if (result.isConfirmed) {
          try {
              const audit = submissions.find(s => s.id === id)?.audit || [];
              await apiUpdateSubmission(settings, id, { 
                  status,
                  audit: [...audit, { at: new Date().toISOString(), action: `ADMIN_${status.toUpperCase()}`, note: 'อัปเดตโดยผู้ดูแลระบบ' }] 
              });
              showToast({ type: 'success', title: 'สำเร็จ', message: 'อัปเดตสถานะเรียบร้อย' });
              refreshData();
          } catch (e: any) {
              showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
          }
      }
  };

  const handleDeleteSubmission = async (id: string) => {
      const result = await Swal.fire({
          title: 'ยืนยันการลบข้อมูล?',
          text: "การกระทำนี้ไม่สามารถย้อนกลับได้",
          icon: 'error',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'ลบข้อมูล',
          cancelButtonText: 'ยกเลิก'
      });

      if (result.isConfirmed) {
          try {
              await apiDeleteSubmission(settings, id);
              showToast({ type: 'success', title: 'ลบสำเร็จ', message: 'ลบข้อมูลออกจากระบบแล้ว' });
              refreshData();
          } catch (e: any) {
              showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
          }
      }
  };

  const handleAddNews = async () => {
      if (!newsForm.title || !newsForm.desc) {
          showToast({ type: 'error', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกหัวข้อและรายละเอียด' });
          return;
      }
      try {
          await apiAddNews({
              title: newsForm.title,
              desc: newsForm.desc,
              date: new Date().toLocaleDateString('th-TH'),
              type: newsForm.type as any,
              imageUrl: newsForm.imageUrl,
              fileType: newsForm.fileType || 'PDF'
          });
          setNewsList(apiGetNews());
          setShowNewsForm(false);
          setNewsForm({ title: '', desc: '', type: 'news', imageUrl: '', fileType: '' });
          showToast({ type: 'success', title: 'สำเร็จ', message: 'เพิ่มข่าวประชาสัมพันธ์แล้ว' });
      } catch (e: any) {
          showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
      }
  };

  const handleDeleteNews = async (id: number) => {
      const result = await Swal.fire({
          title: 'ลบข่าวนี้?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'ลบ',
          cancelButtonText: 'ยกเลิก'
      });

      if (result.isConfirmed) {
          await apiDeleteNews(id);
          setNewsList(apiGetNews());
          showToast({ type: 'success', title: 'ลบสำเร็จ', message: 'ลบข่าวเรียบร้อยแล้ว' });
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <div>
                <h1 className="text-2xl font-black flex items-center gap-3">
                    <i className="fa-solid fa-user-shield text-amber-400"></i>
                    ผู้ดูแลระบบ (Admin Panel)
                </h1>
                <p className="text-slate-400 text-sm mt-1">จัดการข้อมูลข่าวสาร ติดตามและตรวจสอบสถานะผลงาน</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveTab('submissions')}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                    <i className="fa-solid fa-folder-tree"></i> จัดการผลงาน
                </button>
                <button 
                    onClick={() => setActiveTab('news')}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'news' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                    <i className="fa-solid fa-bullhorn"></i> จัดการข่าว
                </button>
            </div>
        </div>

        {activeTab === 'submissions' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-3 text-slate-400"></i>
                        <input 
                            placeholder="ค้นหาชื่อ, หน่วยงาน..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-slate-900 dark:text-white"
                            value={filter.q}
                            onChange={e => setFilter({...filter, q: e.target.value})}
                        />
                    </div>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white"
                        value={filter.branch}
                        onChange={e => setFilter({...filter, branch: e.target.value})}
                    >
                        <option value="all">ทุกสาขา</option>
                        {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white"
                        value={filter.status}
                        onChange={e => setFilter({...filter, status: e.target.value})}
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="submitted">รอพิจารณา</option>
                        <option value="reviewed">กำลังตรวจสอบ</option>
                        <option value="accepted">ผ่าน</option>
                        <option value="rejected">ไม่ผ่าน</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase">
                            <tr>
                                <th className="p-4 rounded-l-xl">ผู้ส่ง</th>
                                <th className="p-4">เรื่อง/สาขา</th>
                                <th className="p-4">สถานะ</th>
                                <th className="p-4 rounded-r-xl text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredSubmissions.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{s.firstName} {s.lastName}</div>
                                        <div className="text-xs text-slate-500">{s.organization}</div>
                                        <div className="text-xs text-slate-400 mt-1">{new Date(s.updatedAt).toLocaleDateString('th-TH')}</div>
                                    </td>
                                    <td className="p-4 max-w-xs">
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            <Badge tone="slate">{WORK_TYPES.find(w => w.id === s.workType)?.label}</Badge>
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-300">{BRANCHES.find(b => b.id === s.branchId)?.label}</div>
                                        {s.fileUrl && (
                                            <a href={s.fileUrl} target="_blank" className="text-sky-600 text-xs font-bold hover:underline mt-1 inline-block">
                                                <i className="fa-solid fa-paperclip mr-1"></i> ดูไฟล์แนบ
                                            </a>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <Badge tone={s.status === 'accepted' ? 'green' : s.status === 'rejected' ? 'red' : 'navy'}>
                                            {s.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleUpdateStatus(s.id, 'reviewed')} title="รับเรื่อง/ตรวจสอบ" className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition"><i className="fa-solid fa-magnifying-glass"></i></button>
                                            <button onClick={() => handleUpdateStatus(s.id, 'accepted')} title="ผ่านการคัดเลือก" className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"><i className="fa-solid fa-check"></i></button>
                                            <button onClick={() => handleUpdateStatus(s.id, 'rejected')} title="ไม่ผ่าน" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition"><i className="fa-solid fa-xmark"></i></button>
                                            <div className="w-px bg-slate-200 h-8 mx-1"></div>
                                            <button onClick={() => handleDeleteSubmission(s.id)} title="ลบ" className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition"><i className="fa-solid fa-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredSubmissions.length === 0 && <div className="text-center p-8 text-slate-400">ไม่พบข้อมูล</div>}
                </div>
            </div>
        )}

        {activeTab === 'news' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg dark:text-white"><i className="fa-regular fa-newspaper mr-2"></i>รายการข่าวประกาศ</h3>
                    <button onClick={() => setShowNewsForm(!showNewsForm)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition shadow-lg shadow-emerald-200">
                        <i className="fa-solid fa-plus mr-2"></i> เพิ่มข่าวใหม่
                    </button>
                </div>

                {showNewsForm && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl mb-6 border border-slate-200 dark:border-slate-700 animate-fade-in">
                        <h4 className="font-bold mb-4 dark:text-white">ฟอร์มเพิ่มข่าวสาร</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} placeholder="หัวข้อข่าว" className="p-3 rounded-xl border outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                            <select value={newsForm.type} onChange={e => setNewsForm({...newsForm, type: e.target.value})} className="p-3 rounded-xl border outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                                <option value="news">ข่าวประชาสัมพันธ์ (News)</option>
                                <option value="download">เอกสารดาวน์โหลด (Download)</option>
                            </select>
                            <input value={newsForm.desc} onChange={e => setNewsForm({...newsForm, desc: e.target.value})} placeholder="รายละเอียดฉบับย่อ" className="md:col-span-2 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                            {newsForm.type === 'news' && <input value={newsForm.imageUrl} onChange={e => setNewsForm({...newsForm, imageUrl: e.target.value})} placeholder="URL รูปภาพ (Optional)" className="md:col-span-2 p-3 rounded-xl border outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white" />}
                            {newsForm.type === 'download' && <input value={newsForm.fileType} onChange={e => setNewsForm({...newsForm, fileType: e.target.value})} placeholder="ชนิดไฟล์ (PDF, DOCX)" className="p-3 rounded-xl border outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white" />}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowNewsForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg transition">ยกเลิก</button>
                            <button onClick={handleAddNews} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition">บันทึก</button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {newsList.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-sky-200 transition">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl ${item.type === 'news' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <i className={`fa-solid ${item.type === 'news' ? 'fa-bullhorn' : 'fa-file-arrow-down'}`}></i>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{item.title}</div>
                                    <div className="text-xs text-slate-500">{item.date} • {item.type}</div>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteNews(item.id)} className="h-10 w-10 rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition flex items-center justify-center">
                                <i className="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminPanel;