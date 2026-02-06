import React from 'react';
import { ToastMessage } from '../../types';

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const tone = toast.type === "success" ? "green" : toast.type === "error" ? "red" : "navy";
  
  const colors = {
    green: { ring: "ring-emerald-200", bgIcon: "bg-emerald-50", textIcon: "text-emerald-700" },
    red: { ring: "ring-rose-200", bgIcon: "bg-rose-50", textIcon: "text-rose-700" },
    navy: { ring: "ring-sky-200", bgIcon: "bg-sky-50", textIcon: "text-sky-700" }
  };
  
  const icons = {
      success: "fa-circle-check",
      error: "fa-triangle-exclamation",
      info: "fa-circle-info"
  }

  const c = colors[tone];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[92vw] max-w-md animate-bounce-in">
      <div className={`rounded-2xl bg-white shadow-xl ring-1 p-4 ${c.ring}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center ${c.bgIcon} ${c.textIcon}`}>
            <i className={`fa-solid ${icons[toast.type]}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">{toast.title}</div>
            <div className="mt-1 text-sm text-slate-600 break-words">{toast.message}</div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
            aria-label="ปิดการแจ้งเตือน"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;