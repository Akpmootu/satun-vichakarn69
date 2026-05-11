import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Submission, UserProfile, ReviewerScore } from '../types';
import { apiGetAllScores, apiUpdateSubmission, apiGetAllUsers, apiSaveReviewerScore } from '../services/apiService';
import { WORK_TYPES, BRANCHES, BRANCH_GROUPS } from '../constants';

declare const Swal: any;

interface AdminScorePanelProps {
  submissions: Submission[];
  refreshData: () => void;
  showToast: (t: any) => void;
  currentUser: UserProfile;
}

const ORAL_CRITERIA = [
  { id: '1', label: '1. วัตถุประสงค์ความเป็นมา หลักการและเหตุผล', weight: 3 },
  { id: '2', label: '2. ระเบียบวิธีการศึกษา/วิจัย', weight: 5 },
  { id: '3', label: '3. การนำเสนอ การลำดับเรื่องและการตอบข้อซักถาม การรักษาเวลา', weight: 4 },
  { id: '4', label: '4. วิจารณ์ผลและสรุป', weight: 4 },
  { id: '5', label: '5. การนำไปใช้ประโยชน์', weight: 4 }
];

const INNOVATION_CRITERIA = [
  { id: '1_1', label: '1.1 ความสำคัญของเรื่องที่ศึกษา', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '1_2', label: '1.2 ประโยชน์ในการแก้ปัญหาสาธารณสุข', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '1_3', label: '1.3 Original idea', weight: 1, group: '1. ปัญหาและความจำเป็น' },
  { id: '2', label: '2. การออกแบบและการพัฒนา (design)', weight: 5 },
  { id: '3', label: '3. การประเมินผล', weight: 4 },
  { id: '4_1', label: '4.1 Reproducibility', weight: 4, group: '4. การนำไปใช้ประโยชน์' },
  { id: '4_2', label: '4.2 Applicability', weight: 4, group: '4. การนำไปใช้ประโยชน์' }
];

export default function AdminScorePanel({ submissions, refreshData, showToast, currentUser }: AdminScorePanelProps) {
    const [scores, setScores] = useState<ReviewerScore[]>([]);
    const [reviewers, setReviewers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'oral' | 'eposter' | 'innovation'>('oral');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);

    const [editingScore, setEditingScore] = useState<ReviewerScore | null>(null);
    const [editScoreData, setEditScoreData] = useState<Record<string, {score: number, comment: string}>>({});
    const [editReviewerId, setEditReviewerId] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [allScores, users] = await Promise.all([
                    apiGetAllScores(),
                    apiGetAllUsers()
                ]);
                setScores(allScores);
                setReviewers(users.filter(u => u.role === 'admin' || u.role === 'reviewer'));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSaveEdit = async () => {
        if (!editingScore || !activeSubmission || !editReviewerId) return;
        
        let total = 0;
        Object.values(editScoreData).forEach(st => {
            total += st.score;
        });

        try {
            Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            await apiSaveReviewerScore({
                submissionId: activeSubmission.id,
                reviewerId: editReviewerId,
                workType: activeSubmission.workType,
                scoreData: editScoreData,
                totalScore: total
            });
            Swal.fire('สำเร็จ', 'บันทึกคะแนนเรียบร้อยแล้ว', 'success');
            setEditingScore(null);
            
            // Refetch scores
            const newScores = await apiGetAllScores();
            setScores(newScores);
        } catch (e: any) {
            Swal.fire('ข้อผิดพลาด', e.message, 'error');
        }
    };

    const overallStats = useMemo(() => {
        const total = submissions.length;
        const scoredCount = submissions.filter(s => {
            const sumScores = scores.filter(sc => sc.submissionId === s.id);
            return sumScores.length > 0;
        }).length;
        const completeCount = submissions.filter(s => {
            const sumScores = scores.filter(sc => sc.submissionId === s.id);
            return s.reviewerIds && s.reviewerIds.length > 0 && sumScores.length >= s.reviewerIds.length;
        }).length;

        return { total, scoredCount, completeCount };
    }, [submissions, scores]);

    const filteredSubmissions = useMemo(() => {
        let f = submissions.filter(s => s.workType === activeTab);
        if (selectedBranch !== 'all') {
            const branchId = parseInt(selectedBranch);
            f = f.filter(s => s.branchId === branchId);
        }

        return f.map(sub => {
            const subScores = scores.filter(sc => sc.submissionId === sub.id);
            const totalAssigned = sub.reviewerIds?.length || 0;
            const isComplete = totalAssigned > 0 && subScores.length >= totalAssigned;
            const avgScore = subScores.length > 0 ? (subScores.reduce((a, b) => a + b.totalScore, 0) / subScores.length) : 0;
            
            let statusPrefix = subScores.length === 0 ? 'bg-slate-200' : isComplete ? 'bg-emerald-500' : 'bg-amber-400';

            return { ...sub, subScores, totalAssigned, isComplete, avgScore, statusPrefix };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [submissions, scores, activeTab, selectedBranch]);

    const handleExportExcel = () => {
        try {
            const wb = XLSX.utils.book_new();
            
            const branchesToExport = selectedBranch === 'all' 
                ? BRANCHES 
                : BRANCHES.filter(b => b.id === parseInt(selectedBranch));

            branchesToExport.forEach(branch => {
                const branchSubmissions = submissions.filter(s => s.workType === activeTab && s.branchId === branch.id);
                if (branchSubmissions.length === 0) return;

                const sheetData = branchSubmissions.map((sub, idx) => {
                    const subScores = scores.filter(sc => sc.submissionId === sub.id);
                    const avgScore = subScores.length > 0 ? (subScores.reduce((a, b) => a + b.totalScore, 0) / subScores.length).toFixed(2) : '0.00';
                    const workTypeLabel = WORK_TYPES.find(w => w.id === sub.workType)?.label || sub.workType;

                    const row: any = {
                        'ลำดับ': idx + 1,
                        'ชื่อผลงาน': sub.fileName,
                        'ประเภทผลงาน': workTypeLabel,
                        'ผู้ส่งผลงาน': `${sub.firstName} ${sub.lastName}`,
                        'หน่วยงาน': sub.organization,
                        'คะแนนเฉลี่ย': parseFloat(avgScore)
                    };

                    if (sub.reviewerIds && sub.reviewerIds.length > 0) {
                        sub.reviewerIds.forEach((revId, rIdx) => {
                            const reviewer = reviewers.find(r => r.id === revId);
                            const revName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'ไม่ระบุ';
                            const revScore = subScores.find(sc => sc.reviewerId === revId);
                            
                            row[`กรรมการคนที่ ${rIdx + 1}`] = revName;
                            row[`คะแนนกรรมการคนที่ ${rIdx + 1}`] = revScore ? revScore.totalScore : 'ยังไม่ประเมิน';
                        });
                    }

                    return row;
                });

                const ws = XLSX.utils.json_to_sheet(sheetData);
                
                let sheetName = branch.label.substring(0, 31);
                if (wb.SheetNames.includes(sheetName)) {
                    sheetName = sheetName.substring(0, 28) + '...';
                }
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            if (wb.SheetNames.length === 0) {
                 Swal.fire('ไม่พบข้อมูล', 'ไม่มีผลงานในเงื่อนไขที่เลือก', 'info');
                 return;
            }

            const workTypeLabel = WORK_TYPES.find(w => w.id === activeTab)?.label || activeTab;
            XLSX.writeFile(wb, `score_export_${workTypeLabel}_${new Date().getTime()}.xlsx`);
            
        } catch (error) {
            console.error('Export Excel Error:', error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถส่งออกไฟล์ Excel ได้', 'error');
        }
    };

    const renderScoreEdit = () => {
        if (!editingScore || !activeSubmission) return null;
        const criteria = activeSubmission.workType === 'innovation' ? INNOVATION_CRITERIA : ORAL_CRITERIA;

        let totalScore = 0;
        criteria.forEach(c => {
            totalScore += editScoreData[c.id]?.score || 0;
        });
        const maxScore = criteria.reduce((a, b) => a + (b.weight * 5), 0);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                    <button onClick={() => setEditingScore(null)} className="absolute top-4 right-4 h-10 w-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    
                    <div className="p-6 md:p-8">
                        <h3 className="text-xl font-bold mb-4">แก้ไขคะแนน</h3>
                        
                        <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="font-semibold mb-2">กรรมการที่ประเมิน:</p>
                            <select 
                                value={editReviewerId} 
                                onChange={(e) => setEditReviewerId(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2"
                                disabled
                            >
                                <option value="">เลือกกรรมการ</option>
                                {reviewers.map(r => (
                                    <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-6">
                            {criteria.map((c, i) => (
                                <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.label} <span className="text-sky-600 dark:text-sky-400 font-normal ml-2">(ค่าน้ำหนัก: {c.weight})</span></div>
                                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">
                                            คะแนน: {(editScoreData[c.id]?.score || 0)} / {c.weight * 5}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 mb-4">
                                        {[1,2,3,4,5].map(v => (
                                            <button 
                                                key={v}
                                                onClick={() => {
                                                    setEditScoreData(prev => ({
                                                        ...prev,
                                                        [c.id]: { ...prev[c.id], score: v * c.weight, comment: prev[c.id]?.comment || '' }
                                                    }));
                                                }}
                                                className={`py-2 rounded-lg border font-bold transition-all ${
                                                    (editScoreData[c.id]?.score || 0) === v * c.weight 
                                                    ? 'bg-sky-500 text-white border-sky-600 shadow-md transform scale-105' 
                                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition resize-none" 
                                        rows={2} 
                                        placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..."
                                        value={editScoreData[c.id]?.comment || ''}
                                        onChange={(e) => {
                                            setEditScoreData(prev => ({
                                                ...prev,
                                                [c.id]: { ...prev[c.id], score: prev[c.id]?.score || 0, comment: e.target.value }
                                            }));
                                        }}
                                    ></textarea>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-xl font-black">
                                คะแนนรวม: <span className="text-3xl text-sky-600 dark:text-sky-400 ml-2">{totalScore} <span className="text-lg text-slate-400">/ {maxScore}</span></span>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => setEditingScore(null)} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition">
                                    ยกเลิก
                                </button>
                                <button onClick={handleSaveEdit} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg transition transform hover:-translate-y-0.5">
                                    บันทึกคะแนน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-sky-500"></i></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
                <i className="fa-solid fa-star-half-stroke text-amber-500"></i> จัดการคะแนน (Admin)
            </h1>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
                        <i className="fa-solid fa-file-lines"></i>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-800 dark:text-white">{overallStats.total}</div>
                        <div className="text-sm font-semibold text-slate-500">ผลงานทั้งหมด</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl">
                        <i className="fa-solid fa-star-half-stroke"></i>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-800 dark:text-white">{overallStats.scoredCount}</div>
                        <div className="text-sm font-semibold text-slate-500">มีคะแนนบางส่วน</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
                        <i className="fa-solid fa-check-double"></i>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-800 dark:text-white">{overallStats.completeCount}</div>
                        <div className="text-sm font-semibold text-slate-500">ประเมินครบแล้ว</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveTab('oral')}
                    className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeTab === 'oral' ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                    <i className="fa-solid fa-microphone mr-2"></i> นำเสนอด้วยวาจา (Oral)
                </button>
                <button
                    onClick={() => setActiveTab('eposter')}
                    className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeTab === 'eposter' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                    <i className="fa-solid fa-image mr-2"></i> โปสเตอร์ (E-Poster)
                </button>
                <button
                    onClick={() => setActiveTab('innovation')}
                    className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeTab === 'innovation' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                    <i className="fa-solid fa-lightbulb mr-2"></i> นวัตกรรม/สิ่งประดิษฐ์
                </button>
                
                <div className="w-full sm:w-auto mt-2 sm:mt-0 flex-1 flex justify-end gap-2">
                    <select 
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full sm:w-64 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                        <option value="all">ทุกสาขาวิชา</option>
                        {BRANCH_GROUPS.map(g => (
                            <optgroup key={g.label} label={g.label}>
                                {BRANCHES.filter(b => g.ids.includes(b.id)).map(b => (
                                    <option key={b.id} value={b.id}>{b.label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <button 
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition whitespace-nowrap"
                    >
                         <i className="fa-solid fa-file-excel"></i> <span className="hidden xl:inline">Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Submissions List */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 font-black text-slate-600 dark:text-slate-400 w-12">#</th>
                                <th className="p-4 font-black text-slate-600 dark:text-slate-400">สถานะ</th>
                                <th className="p-4 font-black text-slate-600 dark:text-slate-400">ชื่อผลงาน (ผู้นำเสนอ)</th>
                                <th className="p-4 font-black text-slate-600 dark:text-slate-400">สาขาวิชา</th>
                                <th className="p-4 font-black text-slate-600 dark:text-slate-400 text-center">กรรมการ</th>
                                <th className="p-4 font-black text-slate-600 dark:text-slate-400 text-center">คะแนนเฉลี่ย</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">ไม่พบผลงาน</td>
                                </tr>
                            ) : filteredSubmissions.map((sub, idx) => {
                                const branch = BRANCHES.find(b => b.id === sub.branchId)?.label || 'ไม่ระบุ';
                                return (
                                    <React.Fragment key={sub.id}>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition relative group cursor-pointer" onClick={() => setActiveSubmission(sub.id === activeSubmission?.id ? null : sub)}>
                                            <td className="p-4 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-3 w-3 rounded-full ${sub.statusPrefix}`}></span>
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                        {sub.subScores.length === 0 ? 'รอการประเมิน' : sub.isComplete ? 'ประเมินครบ' : 'ประเมินบางส่วน'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900 dark:text-white line-clamp-2">{sub.fileName}</div>
                                                <div className="text-xs text-slate-500 mt-1">{sub.firstName} {sub.lastName}</div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{branch}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${sub.subScores.length >= sub.totalAssigned && sub.totalAssigned > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {sub.subScores.length} / {sub.totalAssigned || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-black text-lg text-sky-600 dark:text-sky-400">
                                                {sub.avgScore.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center transition">
                                                    <i className={`fa-solid fa-chevron-${activeSubmission?.id === sub.id ? 'up' : 'down'}`}></i>
                                                </button>
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Details */}
                                        {activeSubmission?.id === sub.id && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                                                <td colSpan={7} className="p-6">
                                                    <div className="max-w-4xl mx-auto space-y-4">
                                                        <h4 className="font-black text-sm text-slate-500 uppercase tracking-wide">รายละเอียดการให้คะแนน</h4>
                                                        
                                                        {sub.reviewerIds?.length ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {sub.reviewerIds.map(revId => {
                                                                    const reviewer = reviewers.find(r => r.id === revId);
                                                                    const revScore = sub.subScores.find(sc => sc.reviewerId === revId);
                                                                    
                                                                    return (
                                                                        <div key={revId} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                                                            <div className="flex justify-between items-start mb-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold">
                                                                                        {reviewer?.firstName?.charAt(0) || '?'}
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="text-sm font-bold">{reviewer?.firstName} {reviewer?.lastName}</div>
                                                                                        <div className="text-xs text-slate-500">กรรมการ</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    {revScore ? (
                                                                                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{revScore.totalScore} <span className="text-xs font-normal text-slate-400">/ 100</span></span>
                                                                                    ) : (
                                                                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md">ยังไม่ประเมิน</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
                                                                                <button 
                                                                                    onClick={() => {
                                                                                        setEditingScore(revScore || {
                                                                                            id: 'new',
                                                                                            submissionId: sub.id,
                                                                                            reviewerId: revId,
                                                                                            workType: sub.workType,
                                                                                            scoreData: {},
                                                                                            totalScore: 0,
                                                                                            createdAt: new Date().toISOString()
                                                                                        });
                                                                                        setEditReviewerId(revId);
                                                                                        setEditScoreData(revScore?.scoreData || {});
                                                                                    }}
                                                                                    className="text-xs font-bold px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition text-sky-600 dark:text-sky-400"
                                                                                >
                                                                                    <i className="fa-solid fa-pen-to-square mr-1"></i> {revScore ? 'แก้ไขคะแนน' : 'ใส่คะแนนแทน'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-slate-500 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                                                ผลงานนี้ยังไม่มีการมอบหมายกรรมการ
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {renderScoreEdit()}
        </div>
    );
}
