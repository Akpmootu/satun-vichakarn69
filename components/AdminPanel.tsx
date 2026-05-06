
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Submission, NewsItem, AppSettings, SubmissionStatus, UserProfile, UserRole } from '../types';
import { apiUpdateSubmission, apiDeleteSubmission, apiGetNews, apiAddNews, apiDeleteNews, apiUpdateNews, apiGetAllUsers, apiUpdateUserProfileAdmin, apiDeleteUserProfile, apiGetUsersByRole } from '../services/apiService';
import { BRANCHES, WORK_TYPES, HEALTH_POSITIONS, JOB_LEVELS, EDUCATION_LEVELS, BRANCH_GROUPS } from '../constants';
import Badge from './ui/Badge';
import OrgAutocomplete from './ui/OrgAutocomplete';
import UniversityAutocomplete from './ui/UniversityAutocomplete';
import Pagination from './ui/Pagination';

declare const Swal: any;

interface AdminPanelProps {
  submissions: Submission[];
  settings: AppSettings;
  refreshData: () => void;
  showToast: (t: any) => void;
  newsList: NewsItem[];
  onNewsUpdate: () => void;
  currentUser: UserProfile;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ submissions, settings, refreshData, showToast, newsList, onNewsUpdate, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'news' | 'dashboard'>('dashboard');
  // const [newsList, setNewsList] = useState<NewsItem[]>([]); // Removed local state
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [reviewerList, setReviewerList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null); // Track specific user update

  // Submissions Filter State
  const [filter, setFilter] = useState({ q: '', type: 'all', date: '', org: '', branch: 'all', status: 'all' });
  const [submissionPage, setSubmissionPage] = useState(1);
  
  // User Filter State
  const [userFilter, setUserFilter] = useState({ q: '', role: 'all' });
  const [userPage, setUserPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
  const [docsStatus, setDocsStatus] = useState<'pending' | 'verified' | 'incomplete'>('pending');
  const [reworkComment, setReworkComment] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

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

  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const uniqueOrgs = useMemo(() => {
      const orgs = new Set(submissions.map(s => s.organization).filter(Boolean) as string[]);
      return Array.from(orgs);
  }, [submissions]);

  // --- Filter Logic ---
  const filteredSubmissions = useMemo(() => {
      return submissions.filter(s => {
          const searchString = (s.fileName || '') + s.firstName + s.lastName + (s.organization || '');
          const matchQ = searchString.toLowerCase().includes(filter.q.toLowerCase());
          const matchBranch = filter.branch === 'all' || s.branchId.toString() === filter.branch;
          const matchStatus = filter.status === 'all' || s.status === filter.status;
          const matchType = filter.type === 'all' || s.workType === filter.type;
          const matchOrg = filter.org === '' || (s.organization && s.organization.toLowerCase().includes(filter.org.toLowerCase()));
          
          let matchDate = true;
          if (filter.date) {
               const sDate = s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '';
               matchDate = sDate === filter.date;
          }
          
          return matchQ && matchBranch && matchStatus && matchType && matchOrg && matchDate;
      });
  }, [submissions, filter]);

  const filteredUsers = useMemo(() => {
      return userList.filter(u => {
          const matchQ = (u.firstName + u.lastName + u.email + (u.organization || '')).toLowerCase().includes(userFilter.q.toLowerCase());
          const matchRole = userFilter.role === 'all' || u.role === userFilter.role;
          return matchQ && matchRole;
      });
  }, [userList, userFilter]);

  const getBranchLabel = (id?: number) => {
      const b = BRANCHES.find(x => x.id === Number(id));
      if (!b) return id ? String(id) : "-";
      const groupRow = BRANCH_GROUPS.find(g => g.ids.includes(b.id));
      const groupName = groupRow ? `(กลุ่ม: ${groupRow.label})` : '';
      return `สาขาที่ ${b.id}: ${b.label} ${groupName}`;
  };

  const paginatedSubmissions = useMemo(() => {
      const start = (submissionPage - 1) * ITEMS_PER_PAGE;
      return filteredSubmissions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubmissions, submissionPage]);

  const submissionTotalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);

  const paginatedUsers = useMemo(() => {
      const start = (userPage - 1) * ITEMS_PER_PAGE;
      return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const userTotalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  // --- Action Handlers ---

  const handleOpenManageModal = (s: Submission) => {
      // Refresh reviewers list when opening modal to ensure it's up to date
      fetchReviewers();
      
      setSelectedSubmission(s);
      // Logic: If status is 'reviewed' or beyond, docs are assumed verified
      const isVerified = ['reviewed', 'scored', 'accepted', 'rejected'].includes(s.status);
      setDocsStatus(isVerified ? 'verified' : 'pending');
      setReworkComment('');
      setSelectedReviewers(s.reviewerIds || (s.reviewerId ? [s.reviewerId] : []));
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
      try {
          const submission = submissions.find(s => s.id === id);
          if (!submission) return;
          const audit = submission.audit || [];
          await apiUpdateSubmission(settings, id, {
              status: newStatus as SubmissionStatus,
              audit: [...audit, {
                  at: new Date().toISOString(),
                  action: 'MANUAL_STATUS_UPDATE',
                  note: `เปลี่ยนสถานะเป็น: ${newStatus}\nดำเนินการโดย: ${currentUser.firstName} ${currentUser.lastName}`
              }]
          });
          showToast({ type: 'success', title: 'สำเร็จ', message: `เปลี่ยนสถานะเป็น ${newStatus} เรียบร้อยแล้ว` });
          refreshData();
      } catch (e: any) {
          showToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: e.message });
      }
  };

  const handleAssignAndSave = async () => {
      if (!selectedSubmission) return;

      if (docsStatus === 'incomplete') {
          if (!reworkComment.trim()) {
              showToast({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณาระบุความคิดเห็นเพื่อแจ้งให้ผู้ส่งผลงานแก้ไข' });
              return;
          }
          
          try {
              const audit = selectedSubmission.audit || [];
              await apiUpdateSubmission(settings, selectedSubmission.id, {
                  status: 'revision_requested',
                  audit: [...audit, {
                      at: new Date().toISOString(),
                      action: 'ADMIN_REJECT',
                      note: `เอกสารไม่ครบถ้วนส่งกลับแก้ไข\nเหตุผล: ${reworkComment}\nดำเนินการโดย: ${currentUser.firstName} ${currentUser.lastName}`
                  }]
              });
              showToast({ type: 'success', title: 'สำเร็จ', message: 'ส่งกลับให้แก้ไขเรียบร้อยแล้ว' });
              refreshData();
              setSelectedSubmission(null);
          } catch (e: any) {
              showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
          }
          return;
      }

      if (docsStatus !== 'verified') {
          showToast({ type: 'error', title: 'ยังไม่ยืนยัน', message: 'กรุณาตรวจสอบและยืนยันความถูกต้องของเอกสาร หรือ ระบุว่าเอกสารไม่ครบถ้วน' });
          return;
      }
      
      if (selectedReviewers.length === 0) {
          showToast({ type: 'error', title: 'ยังไม่เลือกกรรมการ', message: 'กรุณาเลือกคณะกรรมการเพื่อมอบหมายงานอย่างน้อย 1 ท่าน' });
          return;
      }

      // Logic: If documents verified + reviewer assigned -> Status = 'reviewed' (meaning "Under Review")
      const newStatus: SubmissionStatus = 'reviewed';
      
      try {
          const audit = selectedSubmission.audit || [];
          const reviewerNames = selectedReviewers.map(id => reviewerList.find(r => r.id === id)?.firstName || 'Unknown').join(', ');
          
          await apiUpdateSubmission(settings, selectedSubmission.id, {
              reviewerIds: selectedReviewers,
              status: newStatus,
              audit: [...audit, { 
                  at: new Date().toISOString(), 
                  action: 'ADMIN_ASSIGN', 
                  note: `เอกสารครบถ้วน มอบหมายให้: ${reviewerNames}\nดำเนินการโดย: ${currentUser.firstName} ${currentUser.lastName}` 
              }]
          });

          showToast({ type: 'success', title: 'บันทึกสำเร็จ', message: 'มอบหมายคณะกรรมการเรียบร้อยแล้ว' });
          refreshData();
          setSelectedSubmission(null);
      } catch (e: any) {
          showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
      }
  };

  const handleRequestRevision = async () => {
      if (!selectedSubmission) return;

      const result = await Swal.fire({
          title: 'ปลดล็อคให้แก้ไข?',
          text: 'คุณต้องการส่งผลงานนี้กลับไปให้ผู้ใช้งานแก้ไขใช่หรือไม่? (เช่น ลิงก์ไม่ถูกต้อง, ไฟล์แนบมีปัญหา)',
          icon: 'warning',
          input: 'text',
          inputPlaceholder: 'ระบุเหตุผลที่ให้แก้ไข...',
          showCancelButton: true,
          confirmButtonColor: '#f43f5e',
          confirmButtonText: 'ยืนยันปลดล็อค',
          cancelButtonText: 'ยกเลิก',
          customClass: { popup: 'rounded-3xl' }
      });

      if (result.isConfirmed) {
          try {
              const audit = selectedSubmission.audit || [];
              await apiUpdateSubmission(settings, selectedSubmission.id, {
                  status: 'revision_requested',
                  audit: [...audit, { 
                      at: new Date().toISOString(), 
                      action: 'REVISION_REQUESTED', 
                      note: `ปลดล็อคให้แก้ไข\nเหตุผล: ${result.value || 'ไม่ระบุเหตุผล'}\nดำเนินการโดย: ${currentUser.firstName} ${currentUser.lastName}` 
                  }]
              });

              showToast({ type: 'success', title: 'สำเร็จ', message: 'ปลดล็อคให้แก้ไขเรียบร้อยแล้ว' });
              refreshData();
              setSelectedSubmission(null);
          } catch (e: any) {
              showToast({ type: 'error', title: 'ผิดพลาด', message: e.message });
          }
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
          level: user.level || '',
          role: user.role,
          isVerified: user.isVerified || false,
          educationHistory: user.educationHistory || []
      });
      setShowUserModal(true);
  };

  const handleSaveUser = async () => {
      if (!editingUser) return;
      try {
          const updates = { ...userForm };
          if (updates.isVerified && currentUser?.id) {
              updates.verifiedBy = currentUser.id;
          }
          await apiUpdateUserProfileAdmin(editingUser.id, updates);
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

  const handleSendTelegramSummary = async () => {
    try {
        const today = new Date();
        const todayString = today.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Since the requirement didn't specify only "today" but "ใช้คำสรุปเดียวกับที่ตั้ง cronjob เลย แต่ สร้างปุ่มนี้ไว้กรณี ต้องการยอดสรุปเลย"
        // Let's summarize the current data. The cron job sends "Today's new users".
        // Wait, if I just send today's summary.
        const todayISO = today.toISOString().split('T')[0];
        const todaySubmissions = submissions.filter(s => s.createdAt && s.createdAt.startsWith(todayISO));
        const newUsersCount = todaySubmissions.length;
        
        if (newUsersCount === 0) {
            const msg = `📊 <b>สรุปรายงานผู้ส่งผลงานประจำวันที่ ${todayString}</b>\n\nยังไม่มีผู้ส่งผลงานใหม่ในวันนี้`;
            await fetch('/api/notify-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: msg }) });
        } else {
            const typeCount: Record<string, number> = {};
            const branchCount: Record<string, number> = {};

            todaySubmissions.forEach(sub => {
                const w = WORK_TYPES.find(w => w.id === sub.workType)?.label || sub.workType;
                typeCount[w] = (typeCount[w] || 0) + 1;
                branchCount[sub.branchId] = (branchCount[sub.branchId] || 0) + 1;
            });

            let typeMsg = '';
            for (const [k, v] of Object.entries(typeCount)) {
                typeMsg += `- ${k}: ${v} ผลงาน\n`;
            }

            let branchMsg = '';
            for (const [k, v] of Object.entries(branchCount)) {
                const label = BRANCHES.find(b => b.id.toString() === k.toString())?.label || k;
                branchMsg += `- สาขาที่ ${k}: ${label} (${v} ผลงาน)\n`;
            }

            const msg = `📊 <b>สรุปรายงานผู้ส่งผลงานประจำวันที่ ${todayString}</b>\n\n` +
                        `👥 <b>ผู้ส่งผลงานใหม่วันนี้:</b> ${newUsersCount} ราย\n\n` +
                        `🏷️ <b>แยกตามประเภทผลงาน:</b>\n${typeMsg}\n` +
                        `📂 <b>แยกตามสาขาการประกวด:</b>\n${branchMsg}`;
            
            await fetch('/api/notify-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: msg }) });
        }
        showToast({ type: 'success', title: 'ส่งสำเร็จ', message: 'ส่งรายงานสรุปไปที่ Telegram แบบ Real-time แล้ว' });
    } catch (e: any) {
        showToast({ type: 'error', title: 'ผิดพลาด', message: 'ไม่สามารถส่งรายงานไปยัง Telegram ได้' });
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['ลำดับ', 'สาขา', 'ชื่อผลงาน', 'รายชื่อผู้แต่ง', 'ตำแหน่ง', 'หน่วยงาน', 'ลิงก์ผลงาน', 'สถานะ'];
      const rows = filteredSubmissions.map((s, index) => {
        const branchName = getBranchLabel(s.branchId);
        const mainAuthor = `${s.firstName} ${s.lastName}`;
        const coAuthorsList = (s.coAuthors || []).map((c: any) => `${c.firstName} ${c.lastName}`).join(', ');
        const allAuthors = coAuthorsList ? `${mainAuthor}, ${coAuthorsList}` : mainAuthor;
        
        const attachs = parseAttachments(s.fileUrl);
        const link = attachs.length > 0 ? attachs.map((a: any) => a.value).join(', ') : '-';
        
        // Escape quotes
        return [
          index + 1,
          `"${branchName}"`,
          `"${s.fileName || '-'}"`,
          `"${allAuthors}"`,
          `"${s.position || '-'}"`,
          `"${s.organization || '-'}"`,
          `"${link}"`,
          `"${s.status}"`
        ].join(',');
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `submissions_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      showToast({ type: 'error', title: 'Export Failed', message: e.message });
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
            <div className="flex flex-wrap gap-2 bg-slate-800 p-1 rounded-2xl max-w-full overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    <i className="fa-solid fa-chart-pie"></i> <span className="hidden md:inline">ภาพรวม</span>
                </button>
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

        {activeTab === 'dashboard' && (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white"><i className="fa-solid fa-chart-line text-indigo-500 mr-2"></i> ภาพรวมระบบ (Overview)</h2>
                        <p className="text-sm text-slate-500 mt-1">ข้อมูลเชิงสถิติและการจัดการระบบ</p>
                    </div>
                    <button 
                        onClick={handleSendTelegramSummary}
                        className="bg-[#0088cc] hover:bg-[#0077b3] text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                    >
                        <i className="fa-brands fa-telegram text-xl"></i> ส่งสรุปเข้า Telegram
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-3 text-slate-400"></i>
                        <input 
                            placeholder="ค้นหาชื่อ, หน่วยงาน..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-slate-900 dark:text-white"
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
                        {BRANCH_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label}>
                                {BRANCHES.filter(b => group.ids.includes(b.id)).map(b => (
                                    <option key={b.id} value={b.id}>
                                        สาขาที่ {b.id}: {b.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <select 
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white"
                        value={filter.status}
                        onChange={e => setFilter({...filter, status: e.target.value})}
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="draft">ฉบับร่าง (Draft)</option>
                        <option value="submitted">รอตรวจสอบ (Submitted)</option>
                        <option value="reviewed">กำลังพิจารณา (Under Review)</option>
                        <option value="scored">ให้คะแนนแล้ว (Scored)</option>
                        <option value="accepted">ผ่านการคัดเลือก (Accepted)</option>
                        <option value="revision_requested">ตีกลับแก้ไข (Rework)</option>
                        <option value="rejected">ไม่ผ่าน (Rejected)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col items-center justify-center">
                        <i className="fa-solid fa-file-contract text-4xl text-sky-500 mb-2"></i>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">{filteredSubmissions.length}</div>
                        <div className="text-sm font-bold text-slate-500">ที่กรองพบ</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col items-center justify-center">
                        <i className="fa-solid fa-paper-plane text-4xl text-amber-500 mb-2"></i>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">{filteredSubmissions.filter(s => s.status === 'submitted').length}</div>
                        <div className="text-sm font-bold text-slate-500 text-center">รอตรวจสอบ<br/><span className="text-[10px]">(Submitted)</span></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col items-center justify-center">
                        <i className="fa-solid fa-star text-4xl text-purple-500 mb-2"></i>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">{filteredSubmissions.filter(s => s.status === 'scored').length}</div>
                        <div className="text-sm font-bold text-slate-500 text-center">ให้คะแนนแล้ว<br/><span className="text-[10px]">(Scored)</span></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col items-center justify-center">
                        <i className="fa-solid fa-check-circle text-4xl text-emerald-500 mb-2"></i>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">{filteredSubmissions.filter(s => s.status === 'accepted').length}</div>
                        <div className="text-sm font-bold text-slate-500 text-center">อนุมัติผ่าน<br/><span className="text-[10px]">(Accepted)</span></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col items-center justify-center col-span-2 lg:col-span-1">
                        <i className="fa-solid fa-user-clock text-4xl text-rose-500 mb-2"></i>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">{filteredSubmissions.filter(s => s.status === 'revision_requested').length}</div>
                        <div className="text-sm font-bold text-slate-500 text-center">ตีกลับแก้ไข<br/><span className="text-[10px]">(Rework)</span></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col">
                        <h3 className="font-black text-slate-800 dark:text-white mb-6 text-lg"><i className="fa-solid fa-chart-column text-sky-500 mr-2"></i> จำนวนผลงานแยกตามสาขา (Bar Chart)</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <BarChart data={BRANCHES.map(b => ({ name: `สาขา ${b.id}`, fullLabel: b.label, value: filteredSubmissions.filter(s => s.branchId === b.id).length }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label}
                                    />
                                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="ผลงาน (เรื่อง)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col">
                        <h3 className="font-black text-slate-800 dark:text-white mb-6 text-lg"><i className="fa-solid fa-spider text-amber-500 mr-2"></i> ความสนใจรายสาขา (Radar Chart)</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={BRANCHES.map(b => ({ name: `สาขา ${b.id}`, fullLabel: b.label, value: filteredSubmissions.filter(s => s.branchId === b.id).length }))}>
                                    <PolarGrid strokeOpacity={0.2} />
                                    <PolarAngleAxis dataKey="name" tick={{fontSize: 10}} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} />
                                    <Radar name="จำนวนผลงาน" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                    <h3 className="font-black text-slate-800 dark:text-white mb-6 text-lg"><i className="fa-solid fa-chart-pie text-purple-500 mr-2"></i> สัดส่วนผลงานจำแนกตามสาขา (Pie Chart)</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <PieChart>
                                <Pie 
                                  data={BRANCHES.map(b => ({ name: b.label, value: filteredSubmissions.filter(s => s.branchId === b.id).length })).filter(d => d.value > 0)} 
                                  dataKey="value" 
                                  nameKey="name" 
                                  cx="50%" 
                                  cy="50%" 
                                  outerRadius={100} 
                                  fill="#8884d8"
                                  label={({name, percent}) => `${(percent || 0 * 100).toFixed(0)}%`}
                                >
                                    {
                                        BRANCHES.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`hsl(${(index * 360 / BRANCHES.length)}, 70%, 50%)`} />
                                        ))
                                    }
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'submissions' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-sky-200">
                            <i className="fa-solid fa-magnifying-glass pl-4 text-slate-400"></i>
                            <input 
                                placeholder="ค้นหาชื่อ, ชื่อไฟล์..." 
                                className="w-full px-3 py-2.5 bg-transparent outline-none dark:text-white"
                                value={filter.q}
                                onChange={e => setFilter({...filter, q: e.target.value})}
                            />
                        </div>
                        <div className="relative border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center overflow-visible focus-within:ring-2 focus-within:ring-sky-200">
                            <i className="fa-solid fa-building pl-4 text-slate-400"></i>
                            <input 
                                placeholder="ค้นหาหน่วยงาน/สังกัด..." 
                                className="w-full px-3 py-2.5 bg-transparent outline-none dark:text-white"
                                value={filter.org}
                                onChange={e => {
                                    setFilter({...filter, org: e.target.value});
                                    setShowOrgDropdown(true);
                                }}
                                onFocus={() => setShowOrgDropdown(true)}
                                onBlur={() => setTimeout(() => setShowOrgDropdown(false), 200)}
                            />
                            {showOrgDropdown && (
                                <div className="absolute top-[110%] left-0 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/40 max-h-48 overflow-y-auto overflow-x-hidden flex flex-col py-1">
                                    {uniqueOrgs.filter(org => org.toLowerCase().includes(filter.org.toLowerCase())).length > 0 ? 
                                        uniqueOrgs.filter(org => org.toLowerCase().includes(filter.org.toLowerCase())).map((org, i) => (
                                            <div 
                                                key={`org-${i}`} 
                                                className="px-4 py-2 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200"
                                                onClick={() => {
                                                    setFilter({...filter, org});
                                                    setShowOrgDropdown(false);
                                                }}
                                            >
                                                <i className="fa-solid fa-hotel text-sky-400 mr-2 opacity-50"></i> {org}
                                            </div>
                                        ))
                                    : (
                                        <div className="px-4 py-3 text-sm text-slate-400 italic text-center">ไม่พบหน่วยงานที่ตรงกัน</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center overflow-hidden pr-2 focus-within:ring-2 focus-within:ring-sky-200">
                            <i className="fa-regular fa-calendar pl-4 text-slate-400"></i>
                            <input 
                                type="date"
                                className="w-full px-3 py-2.5 bg-transparent outline-none dark:text-white"
                                value={filter.date}
                                onChange={e => setFilter({...filter, date: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <select 
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
                            value={filter.type}
                            onChange={e => setFilter({...filter, type: e.target.value})}
                        >
                            <option value="all">ทุกประเภทผลงาน</option>
                            {WORK_TYPES.map(w => (
                                <option key={w.id} value={w.id}>{w.label}</option>
                            ))}
                        </select>
                        <select 
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
                            value={filter.branch}
                            onChange={e => setFilter({...filter, branch: e.target.value})}
                        >
                            <option value="all">ทุกสาขา</option>
                            {BRANCH_GROUPS.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                    {BRANCHES.filter(b => group.ids.includes(b.id)).map(b => {
                                        const count = submissions.filter(s => s.branchId === b.id).length;
                                        return (
                                            <option key={b.id} value={b.id}>
                                                สาขาที่ {b.id}: {b.label}   👉  มี {count} ผลงาน
                                            </option>
                                        );
                                    })}
                                </optgroup>
                            ))}
                        </select>
                        <select 
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none dark:text-white overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
                            value={filter.status}
                            onChange={e => setFilter({...filter, status: e.target.value})}
                        >
                            <option value="all">ทุกสถานะ</option>
                            <option value="draft">⚪ ฉบับร่าง (Draft)</option>
                            <option value="submitted">🟡 รอตรวจสอบ (Submitted)</option>
                            <option value="reviewed">🔵 กำลังพิจารณา (Under Review)</option>
                            <option value="scored">🟣 ให้คะแนนแล้ว (Scored)</option>
                            <option value="accepted">🟢 อนุมัติผ่าน (Accepted)</option>
                            <option value="revision_requested">🔴 ตีกลับแก้ไข (Rework)</option>
                            <option value="rejected">⚫ ไม่ผ่าน (Rejected)</option>
                        </select>
                        <button 
                             onClick={handleExportCSV}
                             className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition whitespace-nowrap"
                        >
                             <i className="fa-solid fa-file-csv"></i> <span className="hidden xl:inline">Export CSV</span>
                        </button>
                    </div>
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
                            {paginatedSubmissions.map(s => {
                                const attachments = parseAttachments(s.fileUrl);
                                const assignedReviewers = (s.reviewerIds || (s.reviewerId ? [s.reviewerId] : [])).map(id => reviewerList.find(r => r.id === id));
                                return (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{s.firstName} {s.lastName}</div>
                                        <div className="text-xs text-slate-500">{s.organization}</div>
                                        <div className="text-xs text-slate-400 mt-1">{new Date(s.updatedAt).toLocaleDateString('th-TH')}</div>
                                    </td>
                                    <td className="p-4 max-w-xs">
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            <Badge tone={s.workType === 'oral' ? 'sky' : s.workType === 'eposter' ? 'purple' : 'green'}>
                                                {WORK_TYPES.find(w => w.id === s.workType)?.label}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-300">{getBranchLabel(s.branchId)}</div>
                                        
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
                                        <select 
                                            value={s.status} 
                                            onChange={(e) => handleUpdateStatus(s.id, e.target.value)}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-sans outline-none focus:ring-2 focus:ring-sky-200 cursor-pointer text-center
                                                ${s.status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800' :
                                                  s.status === 'submitted' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
                                                  s.status === 'reviewed' ? 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400' :
                                                  s.status === 'scored' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400' :
                                                  s.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                  s.status === 'revision_requested' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400' :
                                                  s.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' :
                                                  'bg-white dark:bg-slate-800 text-slate-800 border-slate-200'
                                                }
                                            `}
                                        >
                                            <option value="draft">⚪ ฉบับร่าง (Draft)</option>
                                            <option value="submitted">🟡 รอตรวจสอบ (Submitted)</option>
                                            <option value="reviewed">🔵 กำลังพิจารณา (Under Review)</option>
                                            <option value="scored">🟣 ให้คะแนนแล้ว (Scored)</option>
                                            <option value="accepted">🟢 ผ่านการคัดเลือก (Accepted)</option>
                                            <option value="revision_requested">🔴 ตีกลับแก้ไข (Rework)</option>
                                            <option value="rejected">⚫ ไม่ผ่าน (Rejected)</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                         {assignedReviewers.length > 0 ? (
                                             <div className="flex flex-col gap-1">
                                                 {assignedReviewers.filter(Boolean).map((r, i) => (
                                                     <div key={i} className="flex items-center gap-2">
                                                         <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                             {r?.firstName?.charAt(0)}
                                                         </div>
                                                         <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">{r?.firstName} {r?.lastName}</span>
                                                     </div>
                                                 ))}
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
                    
                    {submissionTotalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                            <Pagination 
                                currentPage={submissionPage} 
                                totalPages={submissionTotalPages} 
                                onPageChange={setSubmissionPage} 
                            />
                        </div>
                    )}
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
                                <th className="p-4 rounded-r-xl text-right">วันที่สมัคร / จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.firstName} className="h-10 w-10 shrink-0 border border-slate-200 dark:border-slate-700 bg-white object-cover rounded-full object-center" />
                                            ) : (
                                                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg font-bold
                                                    ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : u.role === 'reviewer' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}
                                                `}>
                                                    {u.firstName.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {u.firstName} {u.lastName}
                                                    {u.isVerified && (
                                                        <span className="text-blue-500" title={`ยืนยันตัวตนแล้ว${u.verifiedBy ? ` โดย ${userList.find(a => a.id === u.verifiedBy)?.firstName || 'Admin'}` : ''}`}>
                                                            <i className="fa-solid fa-circle-check"></i>
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
                                    <td className="p-4 text-right">
                                        <div className="text-xs text-slate-400 mb-2">
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('th-TH') : '-'}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEditUser(u)} className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition flex items-center justify-center" title="แก้ไขข้อมูล">
                                                <i className="fa-solid fa-pen-to-square"></i>
                                            </button>
                                            <button onClick={() => handleDeleteUser(u)} className="h-8 w-8 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition flex items-center justify-center" title="ลบผู้ใช้งาน">
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredUsers.length === 0 && <div className="text-center p-12 text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</div>}
                     
                     {userTotalPages > 1 && (
                         <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                             <Pagination 
                                 currentPage={userPage} 
                                 totalPages={userTotalPages} 
                                 onPageChange={setUserPage} 
                             />
                         </div>
                     )}
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
                                <option value="welcome_banner">แบนเนอร์หน้าต้อนรับ (Welcome Banner)</option>
                            </select>
                            <input value={newsForm.desc} onChange={e => setNewsForm({...newsForm, desc: e.target.value})} placeholder="รายละเอียดฉบับย่อ" className="md:col-span-2 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-sky-200 dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                            {newsForm.type !== 'download' && <input value={newsForm.imageUrl} onChange={e => setNewsForm({...newsForm, imageUrl: e.target.value})} placeholder="URL รูปภาพ (Optional)" className="md:col-span-2 p-3 rounded-xl border outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white" />}
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
                          {(() => {
                              const senderProfile = userList.find(u => u.id === selectedSubmission.userId);
                              return (
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl mb-6 border border-slate-100 dark:border-slate-700">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div className="flex gap-4">
                                          {senderProfile?.avatarUrl ? (
                                              <img src={senderProfile.avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full object-cover shadow-sm bg-white" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                          ) : (
                                              <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-600 dark:bg-slate-700 dark:text-sky-400 flex items-center justify-center font-bold text-xl shadow-inner">
                                                  {selectedSubmission.firstName.charAt(0)}{selectedSubmission.lastName.charAt(0)}
                                              </div>
                                          )}
                                          <div>
                                              <div className="text-xs font-bold text-slate-400 uppercase">ผู้ส่งผลงาน</div>
                                              <div className="font-bold text-slate-800 dark:text-white text-lg">{selectedSubmission.firstName} {selectedSubmission.lastName}</div>
                                              <div className="text-slate-500">{selectedSubmission.position}</div>
                                              <div className="text-slate-400 text-xs">{senderProfile?.email}</div>
                                          </div>
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
                                      <div className="font-bold text-slate-800 dark:text-white">{getBranchLabel(selectedSubmission.branchId)}</div>
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
                          );
                          })()}

                          {/* 2. Verification */}
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-800 dark:text-white mb-3">1. ตรวจสอบเอกสาร</h4>
                              <div className="space-y-3">
                                  <label className={`flex items-center gap-3 p-4 rounded-xl border transition cursor-pointer select-none
                                      ${docsStatus === 'verified' ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-sky-300'}
                                  `}>
                                      <div className={`h-6 w-6 rounded flex items-center justify-center transition ${docsStatus === 'verified' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                                          <i className="fa-solid fa-check text-sm"></i>
                                      </div>
                                      <input type="radio" checked={docsStatus === 'verified'} onChange={() => setDocsStatus('verified')} className="hidden" name="docVerifyStatus" />
                                      <div>
                                          <div className={`font-bold text-sm ${docsStatus === 'verified' ? 'text-emerald-700' : 'text-slate-700'}`}>ยืนยันเอกสารครบถ้วน</div>
                                          <div className="text-xs text-slate-500">ตรวจสอบไฟล์แนบและรายละเอียดว่าถูกต้องตามเกณฑ์</div>
                                      </div>
                                  </label>

                                  <label className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer select-none
                                      ${docsStatus === 'incomplete' ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-200' : 'bg-white border-slate-200 hover:border-rose-300'}
                                  `}>
                                      <div className={`mt-0.5 h-6 w-6 rounded flex items-center justify-center transition shrink-0 ${docsStatus === 'incomplete' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                                          <i className="fa-solid fa-xmark text-sm"></i>
                                      </div>
                                      <input type="radio" checked={docsStatus === 'incomplete'} onChange={() => setDocsStatus('incomplete')} className="hidden" name="docVerifyStatus" />
                                      <div className="flex-1 w-full">
                                          <div className={`font-bold text-sm ${docsStatus === 'incomplete' ? 'text-rose-700' : 'text-slate-700'}`}>เอกสารไม่ครบถ้วน / ส่งกลับแก้ไข</div>
                                          <div className="text-xs text-slate-500 mb-2">ระบุสิ่งที่ต้องแก้ไข เพื่อให้ผู้ส่งผลงานเข้าไปดำเนินการแก้ไขเพิ่มเติม</div>
                                          
                                          {docsStatus === 'incomplete' && (
                                              <div className="mt-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                                                  <textarea 
                                                      value={reworkComment}
                                                      onChange={e => setReworkComment(e.target.value)}
                                                      placeholder="ระบุความคิดเห็น เช่น ลิงก์ Drive เข้าไม่ได้, ขาดเอกสารรับรอง..."
                                                      className="w-full p-3 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-200 outline-none text-sm resize-none bg-white h-24 text-slate-700"
                                                  ></textarea>
                                              </div>
                                          )}
                                      </div>
                                  </label>
                              </div>
                          </div>

                          {/* 3. Assign Reviewer */}
                          {docsStatus !== 'incomplete' && (
                          <div className="mb-6">
                              <h4 className="font-bold text-slate-800 dark:text-white mb-3">2. มอบหมายคณะกรรมการ (Assign Reviewer)</h4>
                              {reviewerList.length === 0 ? (
                                  <div className="text-xs text-rose-500 mt-2 flex items-center gap-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                                      <i className="fa-solid fa-triangle-exclamation"></i> 
                                      <b>ไม่พบรายชื่อคณะกรรมการ</b> กรุณาไปที่เมนู "จัดการผู้ใช้งาน" และเปลี่ยนสิทธิ์ User ให้เป็น Reviewer ก่อน
                                  </div>
                              ) : (
                                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                      {BRANCHES.map(branch => {
                                          const branchReviewers = reviewerList.filter(r => r.branchId && r.branchId.toString().split(',').includes(branch.id.toString()));
                                          
                                          // check if all branchReviewers are selected and there is at least one
                                          const isChecked = branchReviewers.length > 0 && branchReviewers.every(r => selectedReviewers.includes(r.id));
                                          
                                          // If this branch has no reviewers in the system, we can still show it but disabled, or hide it. Let's show it disabled.
                                          if (branchReviewers.length === 0) return null;
                                          
                                          return (
                                              <label key={`branch-${branch.id}`} className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none
                                                  ${isChecked ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-sky-300 dark:bg-slate-800 dark:border-slate-700'}
                                              `}>
                                                  <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center transition shrink-0 ${isChecked ? 'bg-indigo-500 text-white shadow ring-2 ring-indigo-200 ring-offset-2 dark:ring-offset-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-transparent'}`}>
                                                      <div className={`h-2 w-2 rounded-full bg-white transition-transform ${isChecked ? 'scale-100' : 'scale-0'}`}></div>
                                                  </div>
                                                  <input 
                                                      type="radio" 
                                                      name="assignBranch"
                                                      checked={isChecked} 
                                                      onChange={(e) => {
                                                          if (e.target.checked) {
                                                              const newSelection = branchReviewers.map(r => r.id);
                                                              setSelectedReviewers(newSelection);
                                                          }
                                                      }} 
                                                      className="hidden" 
                                                  />
                                                  <div className="flex-1">
                                                      <div className={`font-bold text-sm leading-tight mb-1 ${isChecked ? 'text-indigo-800' : 'text-slate-700 dark:text-white'}`}>สาขาที่ {branch.id}: {branch.label}</div>
                                                      <div className="text-xs text-slate-500">
                                                          <i className="fa-solid fa-users text-indigo-400 mr-1"></i> 
                                                          <b>กรรมการ ({branchReviewers.length}):</b> {branchReviewers.map(r => `${r.firstName} ${r.lastName}`).join(', ')}
                                                      </div>
                                                  </div>
                                              </label>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                          )}

                          {/* 4. Audit Logs (ประวัติการดำเนินการ) */}
                          {selectedSubmission.audit && selectedSubmission.audit.length > 0 && (
                          <div className="mb-2 mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                              <h4 className="font-bold text-slate-800 dark:text-white mb-4"><i className="fa-solid fa-clock-rotate-left mr-2 text-indigo-500"></i> ประวัติการดำเนินการ (Audit Logs)</h4>
                              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                  {[...selectedSubmission.audit].reverse().map((log: any, idx: number) => {
                                      const dObj = new Date(log.at);
                                      return (
                                          <div key={idx} className="relative flex items-start gap-4">
                                              <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 shadow-sm shrink-0 z-10 text-[10px]">
                                                  {log.action === 'ADMIN_ASSIGN' ? <i className="fa-solid fa-user-check text-sky-500"></i> : 
                                                   log.action.includes('REWORK') ? <i className="fa-solid fa-arrow-rotate-left text-rose-500"></i> :
                                                   log.action.includes('SUBMIT') ? <i className="fa-solid fa-file-arrow-up text-emerald-500"></i> :
                                                   <i className="fa-solid fa-pen-to-square text-slate-500"></i>}
                                              </div>
                                              <div className="flex-1 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1">
                                                      <span className="font-bold text-slate-800 dark:text-white text-xs">{log.action || 'UPDATE'}</span>
                                                      <span className="text-[10px] text-slate-400 font-mono">{dObj.toLocaleString('th-TH')}</span>
                                                  </div>
                                                  <div className="text-xs text-slate-500 whitespace-pre-wrap">{log.note}</div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                          )}
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex flex-wrap justify-end gap-3 rounded-b-3xl">
                           {/* Add Delete Button here as requested by generic "manage" concept */}
                          <button 
                              onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                              className="px-4 py-2 rounded-xl text-rose-600 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-900/30 transition auto md:mr-auto"
                          >
                              <i className="fa-solid fa-trash-can mr-1"></i> ลบข้อมูล
                          </button>

                          {docsStatus !== 'incomplete' && (
                              <button 
                                  onClick={handleRequestRevision}
                                  className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 bg-white font-bold text-sm hover:bg-rose-50 transition"
                              >
                                  <i className="fa-solid fa-unlock-keyhole mr-1"></i> ปลดล็อคให้แก้ไข (Rework)
                              </button>
                          )}

                          <button 
                              onClick={() => setSelectedSubmission(null)}
                              className="px-4 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition"
                          >
                              ยกเลิก
                          </button>
                          <button 
                              onClick={handleAssignAndSave}
                              className={`px-6 py-2 rounded-xl text-white font-bold text-sm transition shadow-lg flex items-center gap-2 ${
                                  docsStatus === 'incomplete' 
                                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200 dark:shadow-none' 
                                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 shadow-slate-200 dark:shadow-none'
                              }`}
                          >
                              {docsStatus === 'incomplete' ? (
                                  <><i className="fa-solid fa-paper-plane"></i> ส่งกลับให้แก้ไข</>
                              ) : (
                                  <><i className="fa-solid fa-floppy-disk"></i> บันทึกและส่งตรวจสอบ</>
                              )}
                          </button>
                      </div>
                 </div>
             </div>
        )}
        {/* --- USER EDIT MODAL --- */}
        {showUserModal && editingUser && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8 animate-fade-in">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowUserModal(false)}></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] ring-1 ring-slate-200 dark:ring-slate-700 animate-bounce-in">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-4">
                            {editingUser?.avatarUrl ? (
                                <img src={editingUser.avatarUrl} alt={editingUser.firstName} className="h-10 w-10 shrink-0 border border-slate-200 dark:border-slate-700 bg-white object-cover rounded-full object-center" />
                            ) : (
                                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg font-bold bg-sky-100 text-sky-600`}>
                                    {editingUser.firstName?.charAt(0)}
                                </div>
                            )}
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <i className="fa-solid fa-user-pen text-sky-500"></i> แก้ไขข้อมูลผู้ใช้งาน
                            </h3>
                        </div>
                        <button onClick={() => setShowUserModal(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">หน่วยงาน</label>
                                <OrgAutocomplete 
                                    value={userForm.organization || ''} 
                                    onChange={val => setUserForm({...userForm, organization: val})} 
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ระดับ</label>
                                <select 
                                    value={userForm.level || ''}
                                    onChange={e => setUserForm({...userForm, level: e.target.value})}
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                >
                                    <option value="">-- เลือกระดับ --</option>
                                    {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">ตำแหน่ง</label>
                            <input 
                                list="admin-positions"
                                value={userForm.position || ''} 
                                onChange={e => setUserForm({...userForm, position: e.target.value})} 
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                            />
                            <datalist id="admin-positions">
                                {HEALTH_POSITIONS.map(p => <option key={p} value={p} />)}
                            </datalist>
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

                        {/* Education Section */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm flex items-center gap-2">
                                <i className="fa-solid fa-graduation-cap"></i> ประวัติการศึกษา
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ระดับการศึกษา</label>
                                    <select
                                        value={userForm.educationHistory?.[0]?.degree || ''}
                                        onChange={(e) => {
                                            const edu = [...(userForm.educationHistory || [{ id: 'primary', degree: '', major: '', institution: '', year: '' }])];
                                            edu[0] = { ...edu[0], degree: e.target.value };
                                            setUserForm({ ...userForm, educationHistory: edu });
                                        }}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                    >
                                        <option value="">-- เลือกระดับ --</option>
                                        {EDUCATION_LEVELS.map((l) => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">สาขาวิชา</label>
                                    <input
                                        value={userForm.educationHistory?.[0]?.major || ''}
                                        onChange={(e) => {
                                            const edu = [...(userForm.educationHistory || [{ id: 'primary', degree: '', major: '', institution: '', year: '' }])];
                                            edu[0] = { ...edu[0], major: e.target.value };
                                            setUserForm({ ...userForm, educationHistory: edu });
                                        }}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                        placeholder="เช่น สาธารณสุขศาสตร์"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">สถาบันการศึกษา</label>
                                    <UniversityAutocomplete
                                        value={userForm.educationHistory?.[0]?.institution || ''}
                                        onChange={(val) => {
                                            const edu = [...(userForm.educationHistory || [{ id: 'primary', degree: '', major: '', institution: '', year: '' }])];
                                            edu[0] = { ...edu[0], institution: val };
                                            setUserForm({ ...userForm, educationHistory: edu });
                                        }}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ปีที่จบ (พ.ศ.)</label>
                                    <select
                                        value={userForm.educationHistory?.[0]?.year || ''}
                                        onChange={(e) => {
                                            const edu = [...(userForm.educationHistory || [{ id: 'primary', degree: '', major: '', institution: '', year: '' }])];
                                            edu[0] = { ...edu[0], year: e.target.value };
                                            setUserForm({ ...userForm, educationHistory: edu });
                                        }}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                                    >
                                        <option value="">-- ปีที่จบ --</option>
                                        {Array.from({length: 50}, (_, i) => (new Date().getFullYear() + 543) - i).map(y => (
                                            <option key={y} value={y.toString()}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800 mt-4">
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="isVerified"
                                    checked={userForm.isVerified || false}
                                    onChange={e => setUserForm({...userForm, isVerified: e.target.checked})}
                                    className="w-5 h-5 rounded text-sky-500 focus:ring-sky-500"
                                />
                                <label htmlFor="isVerified" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                                    ยืนยันตัวตน (Verified User)
                                    <i className="fa-solid fa-circle-check text-blue-500"></i>
                                </label>
                            </div>
                            {editingUser?.isVerified && editingUser?.verifiedBy && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 ml-8 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 inline-block">
                                    ยืนยันโดยแอดมิน: <span className="font-bold text-sky-600">{userList.find(u => u.id === editingUser.verifiedBy)?.firstName || 'Admin'}</span> 
                                    {editingUser.verifiedAt && ` (เมื่อ ${new Date(editingUser.verifiedAt).toLocaleDateString('th-TH')})`}
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                             <button 
                                onClick={async () => {
                                    const result = await Swal.fire({
                                        title: 'ยืนยันการตั้งรหัสผ่านใหม่',
                                        html: `ต้องการตั้งรหัสผ่านของ <b>${editingUser.firstName}</b> เป็น <b>Satun@2569</b> หรือไม่?`,
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonText: 'ยืนยัน',
                                        cancelButtonText: 'ยกเลิก'
                                    });
                                    if (result.isConfirmed) {
                                        try {
                                            Swal.fire({title: 'กำลังดำเนินการ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
                                            await import('../services/apiService').then(m => m.apiUpdateUserPasswordAdmin(editingUser.id, 'Satun@2569'));
                                            Swal.fire('สำเร็จ', 'รหัสผ่านถูกตั้งเป็น Satun@2569 แล้ว', 'success');
                                        } catch(e: any) {
                                            Swal.fire('ข้อผิดพลาด', e.message, 'error');
                                        }
                                    }
                                }}
                                className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
                             >
                                <i className="fa-solid fa-key"></i> รีเซ็ตรหัสผ่าน (เป็นค่าเริ่มต้น Satun@2569)
                             </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-3xl shrink-0">
                        <button onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition">ยกเลิก</button>
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
