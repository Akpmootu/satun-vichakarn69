import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    const items: (number | string)[] = [];

    if (startPage > 1) {
        items.push(1);
        if (startPage > 2) items.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
        items.push(i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) items.push('...');
        items.push(totalPages);
    }

    const activeIndex = items.indexOf(currentPage);

    return (
        <div className="inline-flex flex-wrap items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl px-4 py-2 shadow-sm gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mr-2 border-r border-slate-100 dark:border-slate-800 pr-4">หน้า</span>
            
            <button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Previous Page"
            >
                <i className="fa-solid fa-angle-left text-xs"></i>
            </button>
            
            <div className="flex flex-col items-center justify-center min-w-[200px]">
                <div className="flex items-center w-full relative">
                    {items.map((item, idx) => (
                        <button 
                            key={`${item}-${idx}`} 
                            onClick={() => typeof item === 'number' ? onPageChange(item) : undefined} 
                            disabled={typeof item === 'string'}
                            className={`flex-1 h-8 flex items-center justify-center text-sm font-bold transition-colors z-10 font-mono
                                ${item === currentPage 
                                    ? 'text-indigo-600 dark:text-indigo-400' 
                                    : typeof item === 'string' 
                                        ? 'text-slate-300' 
                                        : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400'
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
                
                {/* Track Line */}
                <div className="relative w-[90%] h-1 mb-1 mt-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                     <div 
                        className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        style={{ 
                            width: `${100 / items.length}%`,
                            left: `${activeIndex >= 0 ? activeIndex * (100 / items.length) : 0}%`,
                            transform: 'scaleX(0.8)' // Make the indicator slightly smaller than the full width segment
                        }}
                     />
                </div>
            </div>

            <button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Next Page"
            >
                <i className="fa-solid fa-angle-right text-xs"></i>
            </button>
        </div>
    );
};

export default Pagination;
