
import React from 'react';
import { PRIVACY_POLICY_CONTENT } from './PrivacyData';

interface PrivacyPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col ring-1 ring-slate-200 dark:ring-slate-700 animate-bounce-in">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-3xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                        นโยบายความเป็นส่วนตัว
                    </h3>
                    <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_CONTENT }} />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 dark:bg-sky-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-lg"
                    >
                        รับทราบ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyModal;
