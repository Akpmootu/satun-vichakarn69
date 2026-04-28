import React, { useState } from 'react';
import { UserProfile } from '../types';
import { apiSearchUsers } from '../services/apiService';

declare const Swal: any;

interface Props {
    onClose: () => void;
    onSelect: (user: UserProfile) => void;
    onAddManual: () => void;
}

export const CoAuthorSearchModal: React.FC<Props> = ({ onClose, onSelect, onAddManual }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const res = await apiSearchUsers(query);
            setResults(res.filter(u => u.id !== JSON.parse(localStorage.getItem("svk_supabase_user") || "{}").id));
        } catch(err) {
            Swal.fire('ผิดพลาด', 'ค้นหาบุคลากรไม่สำเร็จ', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <i className="fa-solid fa-user-plus text-sky-500"></i> ค้นหาบุคลากร (Co-Author)
                    </h2>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-4 top-3.5 text-slate-400"></i>
                            <input 
                                value={query} onChange={e => setQuery(e.target.value)} 
                                placeholder="พิมพ์ชื่อ หรือ นามสกุล เพื่อค้นหา..." 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-200 dark:text-white"
                            />
                        </div>
                        <button type="submit" disabled={isSearching} className="px-6 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50">
                            {isSearching ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-search"></i>} ค้นหา
                        </button>
                    </form>

                    <div className="space-y-3">
                        {!isSearching && results.length === 0 && query && (
                            <div className="text-center py-6">
                                <i className="fa-solid fa-user-slash text-4xl text-slate-300 dark:text-slate-600 mb-3 block"></i>
                                <div className="text-slate-500 dark:text-slate-400 font-bold mb-4">ไม่พบรายชื่อบุคลากรนี้ในระบบ</div>
                            </div>
                        )}

                        {results.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName+'+'+user.lastName)}&background=e0f2fe&color=0284c7`} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-sm">{user.firstName} {user.lastName}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{user.position} | {user.organization}</div>
                                    </div>
                                </div>
                                <button onClick={() => { onSelect(user); onClose(); }} className="px-4 py-2 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-800/50 text-sky-700 dark:text-sky-400 font-bold text-xs rounded-lg transition">
                                    เลือก
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">หากไม่พบรายชื่อที่ต้องการค้นหา หรือบุคคลนั้นยังไม่ได้สมัครสมาชิก สามารถเพิ่มรายชื่อแบบกําหนดเองได้</div>
                    <button onClick={() => { onAddManual(); onClose(); }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-xs shrink-0 flex items-center justify-center gap-2 transition">
                        <i className="fa-solid fa-pen-to-square"></i> เพิ่มรายชื่อใหม่
                    </button>
                </div>
            </div>
        </div>
    );
};
