import React, { useState, useMemo } from 'react';
import { DataRow } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  data: DataRow[];
}

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Handle numeric sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Handle string/mixed sorting
        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        
        if (aStr < bStr) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const currentData = useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="text-slate-400 ml-1">
        {sortConfig?.key === col ? (
            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
    </span>
  );

  if (!data || data.length === 0) return <div className="text-slate-400 p-4 text-center">No data available</div>;

  return (
    <div className="rounded-lg border border-slate-200 shadow-sm bg-white flex flex-col h-[70vh]">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-slate-700 text-sm">Raw Data</h3>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
                Total Rows: {sortedData.length.toLocaleString()}
            </span>
             {totalPages > 1 && (
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                     >
                         <ChevronLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xs font-medium text-slate-600">
                         Page {currentPage} of {totalPages}
                     </span>
                     <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                     >
                         <ChevronRight className="w-4 h-4" />
                     </button>
                 </div>
             )}
          </div>
       </div>

      <div className="overflow-auto flex-1 relative">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="text-xs font-semibold text-slate-700 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {columns.map((col) => (
                  <th 
                    key={col} 
                    scope="col" 
                    className="px-3 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                    onClick={() => requestSort(col)}
                  >
                    <div className="flex items-center gap-1">
                        {col}
                        <SortIcon col={col} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.map((row, idx) => (
                <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                  {columns.map((col) => (
                    <td key={`${idx}-${col}`} className="px-3 py-2 whitespace-nowrap max-w-[300px] truncate">
                      {row[col]?.toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};