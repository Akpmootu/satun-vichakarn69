
import React, { useState, useMemo, useEffect } from 'react';
import { Submission, NewsItem, AppSettings, SubmissionStatus, UserProfile, UserRole } from '../types';
import { apiUpdateSubmission, apiDeleteSubmission, apiGetNews, apiAddNews, apiDeleteNews, apiUpdateNews, apiGetAllUsers, apiUpdateUserProfileAdmin, apiDeleteUserProfile, apiGetUsersByRole } from '../services/apiService';
import { BRANCHES, WORK_TYPES } from '../constants';
import Badge from './ui/Badge';

declare const Swal: any;

interface AdminPanelProps {
  submissions: Submission[];
  settings: AppSettings;
  refreshData: () => void;
  showToast: (t: any) => void;
  newsList: NewsItem[];
  onNewsUpdate: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ submissions, settings, refreshData, showToast, newsList, onNewsUpdate }) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'news'>('submissions');
  // const [newsList, setNewsList] = useState<NewsItem[]>([]); // Removed local state
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [reviewerList, setReviewerList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null); // Track specific user update

  // Submissions Filter State
  const [filter, setFilter] = useState({ q: '', branch: 'all', status: 'all' });
  
  // User Filter State
  const [userFilter, setUserFilter] = useState({ q: '', role: 'all' });

  // News Form State
  const [newsForm, setNewsForm] = useState({ id: 0, title: '', desc: '', type: 'news', imageUrl: '', fileType: '' });
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [isEditingNews, setIsEditingNews] = useState(false);

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<UserProfile>>({});

  // --- Manage Submission Modal State ---
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [docsVerified, setDocsVerified] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');

  // Initial Data Load
  useEffect(() => {
      // setNewsList(apiGetNews()); // Removed
      fetchUsers();
      fetchReviewers();
  }, []);

  const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
          const users = await apiGetAllUsers();
          setUserList(users);
      } catch (e: any) {
          showToast({ type: 'error', title: 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ', message: e.message });
      } finally {
          setLoadingUsers(false);
      }
  };

  const fetchReviewers = async () => {
      try {
          const reviewers = await apiGetUsersByRole('reviewer');
          setReviewerList(reviewers);
      } catch (e: any) {
          console.error(e);
      }
  };

  // --- Filter Logic ---
  const filteredSubmissions = useMemo(() => {
      return submissions.filter(s => {
          const matchQ = (s.firstName + s.lastName + s.organization).toLowerCase().includes(filter.q.toLowerCase());
          const matchBranch = filter.branch === 'all' || s.branchId.toString() === filter.branch;
          const matchStatus = filter.status === 'all' || s.status === filter.status;
          return matchQ && matchBranch && matchStatus;
      });
  }, [submissions, filter]);

  const filteredUsers = useMemo(() => {
      return userList.filter(u => {
          const matchQ = (u.firstName + u.lastName + u.email + (u.organization || '')).toLowerCase().includes(userFilter.q.toLowerCase());
          const matchRole = userFilter.role === 'all' || u.role === userFilter.role;
          return matchQ && matchRole;
      });
  }, [userList, userFilter]);

  // --- Action Handlers ---

  const handleOpenManageModal = (s: Submission) => {
      // Refresh reviewers list when opening modal to ensure it's up to date
      fetchReviewers();
      
      setSelectedSubmission(s);
      // Logic: If status is 'reviewed' or beyond, docs are assumed verified
      const isVerified = ['reviewed', 'accepted', 'rejected'].includes(s.status);
      setDocsVerified(isVerified); 
      setSelectedReviewer(s.reviewerId || '');
  };

  const handleAssignAndSave = async () => {
      if (!selectedSubmission) return;

      if (!docsVerified) {
          showToast({ type: 'error', title: 'ยังไม่ยืนยัน', message: 'กรุณาตรวจสอบและยืนยันความถูกต้องของเอกสาร' });
          return;
      }
      
      if (!selectedReviewer) {
          showToast({ type: 'error', title: 'ยังไม่เลือกกรรมการ', message: 'กรุณาเลือกคณะกรรมการเพื่อมอบหมายงาน' });
          return;
      }

      // Logic: If documents verified + reviewer assigned -> Status = 'reviewed' (meaning "Under Review")
      const newStatus: SubmissionStatus = 'reviewed';
      
      try {
          const audit = selectedSubmission.audit || [];
          const reviewerName = reviewerList.find(r => r.id === selectedReviewer)?.firstName || 'Unknown';
          
          await apiUpdateSubmission(settings, selectedSubmission.id, {
              reviewerId: selectedReviewer,
              status: newStatus,
              audit: [...audit, { 
                  at: new Date().toISOString(), 
                  action: 'ADMIN_ASSIGN', 
                  note: `เอกสารครบถ้วน มอบหมายให้: ${reviewerName}` 
              }]
          });

          showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'มอบหมายคณะกรรมการเรียบร้อยแล้ว' });
          refreshData();
          setSelectedSubmission(null);
      } catch (e: any) {
          showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
      }
  };

  // --- User Management Handlers ---
  const handleEditUser = (user: UserProfile) => {
      setEditingUser(user);
      setUserForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          organization: user.organization || '',
          position: user.position || '',
          role: user.role,
          isVerified: user.isVerified || false
      });
      setShowUserModal(true);
  };

  const handleSaveUser = async () => {
      if (!editingUser) return;
      try {
          await apiUpdateUserProfileAdmin(editingUser.id, userForm);
          showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว' });
          setShowUserModal(false);
          setEditingUser(null);
          fetchUsers(); // Refresh list
      } catch (e: any) {
          showToast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: e.message });
      }
  };

  const handleDeleteUser = async (user: UserProfile) => {
      const result = await Swal.fire({
          title: 'ลบผู้ใช้งาน?',
          html: `ต้องการลบผู้ใช้งาน <b>${user.firstName} ${user.lastName}</b><br/><span class="text-rose-500 text-sm">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'ลบผู้ใช้งาน',
          cancelButtonText: 'ยกเลิก',
          customClass: { popup: 'rounded-3xl' }
      });

      if (result.isConfirmed) {
          try {
              await apiDeleteUserProfile(user.id);
              showToast({ type: 'success', title: 'ลบสำเร็จ', message: 'ลบผู้ใช้งานออกจากระบบแล้ว' });
              fetchUsers();
          } catch (e: any) {
              showToast({ type: 'error', title: 'ลบไม่สำเร็จ', message: e.message });
          }
      }
  };

  const handleUpdateUserRole = async (user: UserProfile, newRole: UserRole) => {
      // If same role, do nothing
      if (user.role === newRole) return;

      const result = await Swal.fire({
          title: 'ยืนยันการเปลี่ยนสิทธิ์?',
          html: `ต้องการเปลี่ยนสิทธิ์ของ <b>${user.firstName} ${user.lastName}</b><br/>จาก <span class="badge badge-outline">${user.role}</span> เป็น <span class="font-bold text-sky-600">${newRole}</span>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#0ea5e9',
          confirmButtonText: 'บันทึกการเปลี่ยนแปลง',
          cancelButtonText: 'ยกเลิก',
          customClass: { popup: 'rounded-3xl' }
      });

      if (result.isConfirmed) {
          setUpdatingUser(user.id);
          try {
              await apiUpdateUserProfileAdmin(user.id, { role: newRole });
              
              // Success
              showToast({ type: 'success', title: 'สำเร็จ', message: `ปรับสิทธิ์เป็น ${newRole} เรียบร้อยแล้ว` });
              
              // Update local state to reflect change immediately
              setUserList(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
              
              // Trigger background refresh to sync everything
              fetchReviewers();
          } catch (e: any) {
              console.error(e);
              
              if (e.message === 'RLS_BLOCK') {
                  // Show Help Dialog for Developers/Admins
                  await Swal.fire({
                      title: 'ไม่สามารถบันทึกได้',
                      html: `
                        <div class="text-left text-sm text-slate-600 space-y-2">
                            <p class="font-bold text-rose-600"><i class="fa-solid fa-triangle-exclamation"></i> ติดสิทธิ์ของระบบฐานข้อมูล (RLS Policy)</p>
                            <p>เนื่องจาก Supabase เปิดใช้งาน Row Level Security โดยค่าเริ่มต้น ทำให้ Admin ไม่สามารถแก้ไขข้อมูลคนอื่นได้หากไม่มี Policy รองรับ</p>
                            <div class="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs overflow-x-auto mt-2 select-all">
                                <span class="text-slate-400">-- รันคำสั่งนี้ใน Supabase SQL Editor</span><br/>
                                CREATE POLICY "Admins can update user roles"<br/>
                                ON profiles<br/>
                                FOR UPDATE<br/>
                                USING (<br/>
                                &nbsp;&nbsp;(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'<br/>
                                );
                            </div>
                        </div>
                      `,
                      icon: 'error',
                      confirmButtonText: 'เข้าใจแล้ว',
                      customClass: { popup: 'rounded-3xl' }
                  });
              } else {
                  showToast({ type: 'error', title: 'เปลี่ยนสิทธิ์ไม่สำเร็จ', message: e.message });
              }
              
              // Revert by fetching list again
              fetchUsers();
          } finally {
              setUpdatingUser(null);
          }
      } else {
          // If cancelled, the select box might visually show the new value.
          // Force a re-render of the list to snap it back to original value.
          setUserList(prev => [...prev]); 
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
          cancelButtonText: 'ยกเลิก',
          customClass: { popup: 'rounded-3xl' }
      });

      if (result.isConfirmed) {
          try {
              await apiDeleteSubmission(settings, id);
              showToast({ type: 'success', title: 'ลบสำเร็จ', message: 'ลบข้อมูลออกจากระบบแล้ว' });
              refreshData();
              if (selectedSubmission?.id === id) setSelectedSubmission(null);
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
          if (isEditingNews && newsForm.id) {
              await apiUpdateNews(newsForm.id, {
                  title: newsForm.title,
                  desc: newsForm.desc,
                  type: newsForm.type as any,
                  imageUrl: newsForm.imageUrl,
                  fileType: newsForm.fileType || 'PDF'
              });
              showToast({ type: 'success', title: 'สำเร็จ', message: 'แก้ไขข่าวประชาสัมพันธ์แล้ว' });
          } else {
              await apiAddNews({
                  title: newsForm.title,
                  desc: newsForm.desc,
                  date: new Date().toLocaleDateString('th-TH'),
                  type: newsForm.type as any,
                  imageUrl: newsForm.imageUrl,
                  fileType: newsForm.fileType || 'PDF'
              });
              showToast({ type: 'success', title: 'สำเร็จ', message: 'เพิ่มข่าวประชาสัมพันธ์แล้ว' });
          }
          onNewsUpdate();
          setShowNewsForm(false);
          setIsEditingNews(false);
          setNewsForm({ id: 0, title: '', desc: '', type: 'news', imageUrl: '', fileType: '' });
      } catch (e: any) {
          showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
      }
  };

  const handleEditNews = (item: NewsItem) => {
      setNewsForm({
          id: item.id,
          title: item.title,
          desc: item.desc,
          type: item.type,
          imageUrl: item.imageUrl || '',
          fileType: item.fileType || ''
      });
      setIsEditingNews(true);
      setShowNewsForm(true);
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
          onNewsUpdate();
          showToast({ type: 'success', title: 'ลบสำเร็จ', message: 'ลบข่าวเรียบร้อยแล้ว' });
      }
  };
  
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
            <div className="flex gap-2 bg-slate-800 p-1 rounded-2xl">
                <button 
                    onClick={() => setActiveTab('submissions')}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    <i className="fa-solid fa-folder-tree"></i> <span className="hidden md:inline">จัดการผลงาน</span>
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    <i className="fa-solid fa-users-gear"></i> <span className="hidden md:inline">จัดการผู้ใช้งาน</span>
                </button>
                <button 
                    onClick={() => setActiveTab('news')}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'news' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    <i className="fa-solid fa-bullhorn"></i> <span className="hidden md:inline">จัดการข่าว</span>
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
                        <option value="submitted">รอตรวจสอบ (Submitted)</option>
                        <option value="reviewed">กำลังพิจารณา (Under Review)</option>
                        <option value="accepted">ผ่านการคัดเลือก (Accepted)</option>
                        <option value="rejected">ไม่ผ่าน (Rejected)</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase">
                            <tr>
                                <th className="p-4 rounded-l-xl">ผู้ส่ง</th>
                                <th className="p-4">เรื่อง/สาขา</th>
                                <th className="p-4">สถานะปัจจุบัน</th>
                                <th className="p-4">ผู้รับผิดชอบ (Reviewer)</th>
                                <th className="p-4 rounded-r-xl text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredSubmissions.map(s => {
                                const attachments = parseAttachments(s.fileUrl);
                                const assignedReviewer = reviewerList.find(r => r.id === s.reviewerId);
                                return (
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
                                        
                                        {attachments.length > 0 && (
                                            <div className="mt-1 flex flex-col gap-1">
                                                {attachments.map((f: any, i: number) => (
                                                    <a key={i} href={f.value} target="_blank" className="text-sky-600 text-xs font-bold hover:underline truncate block">
                                                        <i className={`fa-solid ${f.type === 'link' ? 'fa-link' : 'fa-paperclip'} mr-1`}></i> 
                                                        {f.name || 'Attachment'}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <Badge tone={s.status === 'accepted' ? 'green' : s.status === 'rejected' ? 'red' : s.status === 'reviewed' ? 'indigo' : 'navy'}>
                                            {s.status === 'reviewed' ? 'Under Review' : s.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                         {assignedReviewer ? (
                                             <div className="flex items-center gap-2">
                                                 <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                     {assignedReviewer.firstName.charAt(0)}
                                                 </div>
                                                 <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">{assignedReviewer.firstName} {assignedReviewer.lastName}</span>
                                             </div>
                                         ) : (
                                             <span className="text-xs text-slate-400 italic">ยังไม่มอบหมาย</span>
                                         )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => handleOpenManageModal(s)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition text-xs font-bold flex items-center gap-2 shadow-md dark:bg-sky-600 dark:hover:bg-sky-500"
                                            >
                                                <i className="fa-solid fa-list-check"></i> ตรวจสอบ/จัดการ
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {filteredSubmissions.length === 0 && <div className="text-center p-8 text-slate-400">ไม่พบข้อมูล</div>}
                </div>
            </div>
        )}

        {/* --- USER MANAGEMENT TAB --- */}
        {activeTab === 'users' && (
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 animate-fade-in">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                     <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                         <i className="fa-solid fa-users-gear text-sky-500"></i>
                         จัดการข้อมูลผู้ใช้งานและสิทธิ์ (User Roles)
                     </h3>
                     <button onClick={fetchUsers} disabled={loadingUsers} className="text-sm font-bold text-slate-500 hover:text-sky-600 transition flex items-center gap-2">
                        <i className={`fa-solid fa-rotate ${loadingUsers ? 'animate-spin' : ''}`}></i> รีโหลดข้อมูล
                     </button>
                 </div>

                 {/* User Filter Controls (Same as before) */}
                 <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-user absolute left-4 top-3 text-slate-400"></i>
                        <input 
                            placeholder="ค้นหาชื่อ, อีเมล, หน่วยงาน..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:text-white"
                            value={userFilter.q}
                            onChange={e => setUserFilter({...userFilter, q: e.target.value})}
                        />
                    </div>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white"
                        value={userFilter.role}
                        onChange={e => setUserFilter({...userFilter, role: e.target.value})}
                    >
                        <option value="all">ทุกระดับสิทธิ์</option>
                        <option value="user">User (ผู้ใช้งานทั่วไป)</option>
                        <option value="reviewer">Reviewer (กรรมการ)</option>
                        <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase">
                            <tr>
                                <th className="p-4 rounded-l-xl">ชื่อ-สกุล</th>
                                <th className="p-4">หน่วยงาน/ติดต่อ</th>
                                <th className="p-4">สิทธิ์การใช้งาน (Role)</th>
                                <th className="p-4 rounded-r-xl text-right">วันที่สมัคร</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold
                                                ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : u.role === 'reviewer' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {u.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {u.firstName} {u.lastName}
                                                    {u.isVerified && (
                                                        <span className="text-sky-500" title="ยืนยันตัวตนแล้ว">
                                                            <i className="fa-solid fa-check-circle"></i>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">{u.position || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-700 dark:text-slate-300 font-medium">{u.organization || '-'}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex flex-col gap-0.5">
                                            <span><i className="fa-regular fa-envelope w-4"></i> {u.email}</span>
                                            {u.phone && <span><i className="fa-solid fa-phone w-4"></i> {u.phone}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="relative inline-block w-40">
                                            {updatingUser === u.id ? (
                                                <div className="flex items-center gap-2 text-sky-600 text-xs font-bold px-3 py-2 bg-sky-50 rounded-lg animate-pulse">
                                                    <i className="fa-solid fa-circle-notch animate-spin"></i> กำลังบันทึก...
                                                </div>
                                            ) : (
                                                <>
                                                    <select 
                                                        value={u.role} 
                                                        onChange={(e) => handleUpdateUserRole(u, e.target.value as UserRole)}
                                                        className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition
                                                            ${u.role === 'admin' ? 'bg-rose-50 border-rose-200 text-rose-700 focus:ring-rose-200' : 
                                                            u.role === 'reviewer' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 focus:ring-indigo-200' : 
                                                            'bg-slate-50 border-slate-200 text-slate-600 focus:ring-slate-200'}
                                                        `}
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="reviewer">Reviewer</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                                        <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-xs text-slate-400">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEditUser(u)} className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-600 transition flex items-center justify-center" title="แก้ไขข้อมูล">
                                                <i className="fa-solid fa-pen-to-square"></i>
                                            </button>
                                            <button onClick={() => handleDeleteUser(u)} className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition flex items-center justify-center" title="ลบผู้ใช้งาน">
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredUsers.length === 0 && <div className="text-center p-12 text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</div>}
                </div>
             </div>
        )}

        {/* --- NEWS TAB (Keep as is) --- */}
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
                        <h4 className="font-bold mb-4 dark:text-white">{isEditingNews ? 'แก้ไขข่าวสาร' : 'ฟอร์มเพิ่มข่าวสาร'}</h4>
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
                            <button onClick={() => { setShowNewsForm(false); setIsEditingNews(false); setNewsForm({ id: 0, title: '', desc: '', type: 'news', imageUrl: '', fileType: '' }); }} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg transition">ยกเลิก</button>
                            <button onClick={handleAddNews} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition">{isEditingNews ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
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
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEditNews(item)} className="h-10 w-10 rounded-full hover:bg-sky-100 hover:text-sky-600 text-slate-400 transition flex items-center justify-center">
                                    <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onClick={() => handleDeleteNews(item.id)} className="h-10 w-10 rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition flex items-center justify-center">
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- MANAGE / VERIFY MODAL --- */}
        {selectedSubmission && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-fade-in">
                 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedSubmission(null)}></div>
                 
                 <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col ring-1 ring-slate-200 dark:ring-slate-700 animate-bounce-in">
                      <div className="p-6 md:p-8 flex-1">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                      <i className="fa-solid fa-list-check text-sky-500"></i> ตรวจสอบผลงาน
                                  </h3>
                                  <div className="text-sm text-slate-500">ID: {selectedSubmission.id.substring(0,8)}...</div>
                              </div>
                              <button onClick={() => setSelectedSubmission(null)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition">
                                  <i className="fa-solid fa-xmark"></i>
                              </button>
                          </div>

                          {/* 1. Submission Info */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl mb-6 border border-slate-100 dark:border-slate-700">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                      <div className="text-xs font-bold text-slate-400 uppercase">ผู้ส่งผลงาน</div>
                                      <div className="font-bold text-slate-800 dark:text-white text-lg">{selectedSubmission.firstName} {selectedSubmission.lastName}</div>
                                      <div className="text-slate-500">{selectedSubmission.position}</div>
                                  </div>
                                  <div>
                                      <div className="text-xs font-bold text-slate-400 uppercase">หน่วยงาน</div>
                                      <div className="font-bold text-slate-800 dark:text-white">{selectedSubmission.organization}</div>
                                  </div>
                                  <div>
                                      <div className="text-xs font-bold text-slate-400 uppercase">ประเภท</div>
                                      <div className="font-bold text-slate-800 dark:text-white">{WORK_TYPES.find(w => w.id === selectedSubmission.workType)?.label}</div>
                                  </div>
                                  <div>
                                      <div className="text-xs font-bold text-slate-400 uppercase">สาขา</div>
                                      <div className="font-bold text-slate-800 dark:text-white">{BRANCHES.find(b => b.id === selectedSubmission.branchId)?.label}</div>
                                  </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">ไฟล์แนบ / เอกสาร</div>
                                  <div className="flex flex-wrap gap-2">
                                      {parseAttachments(selectedSubmission.fileUrl).length > 0 ? (
                                          parseAttachments(selectedSubmission.fileUrl).map((f: any, i: number) => (
                                              <a key={i} href={f.value} target="_blank" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sky-600 dark:text-sky-400 font-bold hover:bg-sky-50 dark:hover:bg-slate-600 transition text-xs">
                                                  <i className={`fa-solid ${f.type === 'link' ? 'fa-link' : 'fa-file-pdf'}`}></i>
                                                  {f.name}
                                              </a>
                                          ))
                                      ) : (
                                          <div className="text-slate-400 text-xs italic">ไม่มีไฟล์แนบ</div>
                                      )}
                                  </div>
                              </div>
                          </div>

                          {/* 2. Verification */}
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-800 dark:text-white mb-3">1. ตรวจสอบเอกสาร</h4>
                              <label className={`flex items-center gap-3 p-4 rounded-xl border transition cursor-pointer select-none
                                  ${docsVerified ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-sky-300'}
                              `}>
                                  <div className={`h-6 w-6 rounded flex items-center justify-center transition ${docsVerified ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                                      <i className="fa-solid fa-check text-sm"></i>
                                  </div>
                                  <input type="checkbox" checked={docsVerified} onChange={e => setDocsVerified(e.target.checked)} className="hidden" />
                                  <div>
                                      <div className={`font-bold text-sm ${docsVerified ? 'text-emerald-700' : 'text-slate-700'}`}>ยืนยันเอกสารครบถ้วน</div>
                                      <div className="text-xs text-slate-500">ตรวจสอบไฟล์แนบและรายละเอียดว่าถูกต้องตามเกณฑ์</div>
                                  </div>
                              </label>
                          </div>

                          {/* 3. Assign Reviewer */}
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-800 dark:text-white mb-3">2. มอบหมายคณะกรรมการ (Assign Reviewer)</h4>
                              <div className="relative">
                                  <i className="fa-solid fa-user-tie absolute left-4 top-3.5 text-slate-400"></i>
                                  <select
                                      value={selectedReviewer}
                                      onChange={e => setSelectedReviewer(e.target.value)}
                                      disabled={reviewerList.length === 0}
                                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200 appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                      <option value="">
                                          {reviewerList.length === 0 ? '-- ไม่พบรายชื่อ Reviewer (กรุณาเพิ่มสิทธิ์ก่อน) --' : '-- เลือกคณะกรรมการ --'}
                                      </option>
                                      {reviewerList.map(r => (
                                          <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.position || 'Reviewer'})</option>
                                      ))}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                      <i className="fa-solid fa-chevron-down text-xs"></i>
                                  </div>
                              </div>
                              {reviewerList.length === 0 && (
                                  <div className="text-xs text-rose-500 mt-2 flex items-center gap-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                                      <i className="fa-solid fa-triangle-exclamation"></i> 
                                      <b>ไม่พบรายชื่อคณะกรรมการ</b> กรุณาไปที่เมนู "จัดการผู้ใช้งาน" และเปลี่ยนสิทธิ์ User ให้เป็น Reviewer ก่อน
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 rounded-b-3xl">
                           {/* Add Delete Button here as requested by generic "manage" concept */}
                          <button 
                              onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                              className="px-4 py-2 rounded-xl text-rose-600 font-bold text-sm hover:bg-rose-50 transition mr-auto"
                          >
                              <i className="fa-solid fa-trash-can mr-1"></i> ลบข้อมูล
                          </button>

                          <button 
                              onClick={() => setSelectedSubmission(null)}
                              className="px-4 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition"
                          >
                              ยกเลิก
                          </button>
                          <button 
                              onClick={handleAssignAndSave}
                              className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg shadow-slate-200 dark:shadow-none flex items-center gap-2"
                          >
                              <i className="fa-solid fa-floppy-disk"></i> บันทึกและส่งตรวจสอบ
                          </button>
                      </div>
                 </div>
             </div>
        )}
        {/* --- USER EDIT MODAL --- */}
        {showUserModal && editingUser && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-fade-in">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowUserModal(false)}></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 ring-1 ring-slate-200 dark:ring-slate-700 animate-bounce-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <i className="fa-solid fa-user-pen text-sky-500"></i> แก้ไขข้อมูลผู้ใช้งาน
                        </h3>
                        <button onClick={() => setShowUserModal(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อ</label>
                                <input 
                                    value={userForm.firstName || ''} 
                                    onChange={e => setUserForm({...userForm, firstName: e.target.value})} 
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">นามสกุล</label>
                                <input 
                                    value={userForm.lastName || ''} 
                                    onChange={e => setUserForm({...userForm, lastName: e.target.value})} 
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">หน่วยงาน</label>
                            <input 
                                value={userForm.organization || ''} 
                                onChange={e => setUserForm({...userForm, organization: e.target.value})} 
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">ตำแหน่ง</label>
                            <input 
                                value={userForm.position || ''} 
                                onChange={e => setUserForm({...userForm, position: e.target.value})} 
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">เบอร์โทรศัพท์</label>
                                <input 
                                    value={userForm.phone || ''} 
                                    onChange={e => setUserForm({...userForm, phone: e.target.value})} 
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">สิทธิ์การใช้งาน</label>
                                <select 
                                    value={userForm.role} 
                                    onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} 
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                >
                                    <option value="user">User</option>
                                    <option value="reviewer">Reviewer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800">
                            <input 
                                type="checkbox" 
                                id="isVerified"
                                checked={userForm.isVerified || false}
                                onChange={e => setUserForm({...userForm, isVerified: e.target.checked})}
                                className="w-5 h-5 rounded text-sky-500 focus:ring-sky-500"
                            />
                            <label htmlFor="isVerified" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                                ยืนยันตัวตน (Verified User)
                                <i className="fa-solid fa-check-circle text-sky-500"></i>
                            </label>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                             <button 
                                onClick={() => Swal.fire('แจ้งเตือน', 'ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลผู้ใช้งาน', 'info')}
                                className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
                             >
                                <i className="fa-solid fa-key"></i> รีเซ็ตรหัสผ่าน (Send Reset Email)
                             </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-8">
                        <button onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition">ยกเลิก</button>
                        <button onClick={handleSaveUser} className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg shadow-slate-200 dark:shadow-none">
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminPanel;
