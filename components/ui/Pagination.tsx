import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            pages.push(
                <button key="1" onClick={() => onPageChange(1)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === 1 ? 'bg-sky-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>1</button>
            );
            if (startPage > 2) {
                pages.push(<span key="ellipsis-start" className="w-8 h-8 flex items-center justify-center text-slate-400">...</span>);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button 
                    key={i} 
                    onClick={() => onPageChange(i)} 
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === i ? 'bg-sky-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="ellipsis-end" className="w-8 h-8 flex items-center justify-center text-slate-400">...</span>);
            }
            pages.push(
                <button key={totalPages} onClick={() => onPageChange(totalPages)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === totalPages ? 'bg-sky-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{totalPages}</button>
            );
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-1 mt-6">
            <button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:bg-transparent"
            >
                <i className="fa-solid fa-angle-left"></i>
            </button>
            {renderPageNumbers()}
            <button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:bg-transparent"
            >
                <i className="fa-solid fa-angle-right"></i>
            </button>
        </div>
    );
};

export default Pagination;
