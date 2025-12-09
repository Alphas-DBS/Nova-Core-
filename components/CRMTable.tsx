import React, { useState, useMemo, useEffect } from 'react';
import { Lead } from '../types';

interface CRMTableProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onDeleteLead: (id: string) => void;
  onViewHistory: (lead: Lead) => void;
}

// Editable Cell Component for seamless inline editing
const EditableCell = ({ 
  value, 
  onSave, 
  placeholder = '-', 
  type = 'text', 
  multiline = false 
}: { 
  value?: string, 
  onSave: (val: string) => void, 
  placeholder?: string, 
  type?: string,
  multiline?: boolean 
}) => {
  const [localValue, setLocalValue] = useState(value || '');

  // Sync with prop changes from parent
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleBlur = () => {
    if (localValue !== (value || '')) {
      onSave(localValue);
    }
  };

  const baseClasses = "bg-transparent border-b border-transparent hover:border-white/10 focus:border-neon-blue focus:bg-black/20 focus:outline-none w-full text-gray-300 py-1 px-1 transition-all rounded-sm text-sm";

  if (multiline) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className={`${baseClasses} min-h-[40px] resize-none overflow-hidden`}
        placeholder={placeholder}
        rows={1}
        style={{ height: 'auto' }}
        onInput={(e) => {
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
        }}
      />
    );
  }

  return (
    <input 
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className={baseClasses}
      placeholder={placeholder}
    />
  );
};

const CRMTable: React.FC<CRMTableProps> = ({ leads, onUpdateLead, onDeleteLead, onViewHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Contacted': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Qualified': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Closed': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-700/50 text-gray-300 border-gray-600';
    }
  };

  // Filter and Sort
  const processedLeads = useMemo(() => {
    let data = [...leads];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(l => 
        l.name.toLowerCase().includes(lower) || 
        l.company.toLowerCase().includes(lower) ||
        (l.phone && l.phone.includes(lower)) ||
        l.id.toLowerCase().includes(lower)
      );
    }

    if (sortConfig) {
      data.sort((a, b) => {
        // @ts-ignore
        const valA = a[sortConfig.key] || '';
        // @ts-ignore
        const valB = b[sortConfig.key] || '';
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [leads, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedLeads.length / itemsPerPage);
  const currentData = processedLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Lead) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search leads by name, phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-neon-blue focus:outline-none focus:bg-white/5 transition-all"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          Showing {currentData.length} of {processedLeads.length} leads
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border border-white/10 glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-gray-200 font-arabic uppercase text-xs tracking-wider">
              <tr>
                <th onClick={() => handleSort('name')} className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors group select-none min-w-[200px]">
                  <div className="flex items-center gap-2">
                    Name / ID
                    {sortConfig?.key === 'name' && (
                       <span className="text-neon-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('phone')} className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors select-none min-w-[150px]">
                  <div className="flex items-center gap-2">
                    Phone
                    {sortConfig?.key === 'phone' && (
                       <span className="text-neon-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('interestedIn')} className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors select-none min-w-[150px]">
                  <div className="flex items-center gap-2">
                    Interested In
                    {sortConfig?.key === 'interestedIn' && (
                       <span className="text-neon-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors select-none min-w-[140px]">
                   <div className="flex items-center gap-2">
                    Status
                    {sortConfig?.key === 'status' && (
                       <span className="text-neon-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold select-none min-w-[200px]">
                   Notes
                </th>
                <th className="px-6 py-4 font-semibold select-none text-center">
                   Call Record
                </th>
                <th onClick={() => handleSort('sentiment')} className="px-6 py-4 font-semibold cursor-pointer hover:text-white transition-colors select-none min-w-[140px]">
                   <div className="flex items-center gap-2">
                    Sentiment
                    {sortConfig?.key === 'sentiment' && (
                       <span className="text-neon-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                       <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                       <p>No leads found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                    {/* Name & ID */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{lead.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono tracking-wider">ID: {lead.id.slice(-4)}</span>
                        <span className="text-[10px] text-gray-500">{lead.company}</span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 align-top">
                      <EditableCell 
                        value={lead.phone} 
                        onSave={(val) => onUpdateLead(lead.id, { phone: val })} 
                        placeholder="+20..."
                      />
                    </td>

                    {/* Interested In */}
                    <td className="px-6 py-4 align-top">
                       <EditableCell 
                        value={lead.interestedIn} 
                        onSave={(val) => onUpdateLead(lead.id, { interestedIn: val })} 
                        placeholder="Product..."
                      />
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 align-top">
                      <div className="relative inline-block w-full">
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateLead(lead.id, { status: e.target.value as any })}
                          className={`appearance-none pl-3 pr-8 py-1.5 w-full rounded-full text-xs font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/20 transition-all ${getStatusColor(lead.status)}`}
                        >
                          <option value="New" className="bg-gray-900 text-blue-400">New</option>
                          <option value="Contacted" className="bg-gray-900 text-yellow-400">Contacted</option>
                          <option value="Qualified" className="bg-gray-900 text-emerald-400">Qualified</option>
                          <option value="Closed" className="bg-gray-900 text-purple-400">Closed</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                         </div>
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1 pl-1">
                        {lead.lastInteraction}
                      </div>
                    </td>

                     {/* Notes */}
                    <td className="px-6 py-4 align-top">
                       <EditableCell 
                        value={lead.notes} 
                        onSave={(val) => onUpdateLead(lead.id, { notes: val })} 
                        placeholder="Add notes..."
                        multiline
                      />
                    </td>

                    {/* Call Record */}
                    <td className="px-6 py-4 align-top text-center">
                       <button 
                          onClick={() => onViewHistory(lead)}
                          className="group/btn relative p-2 rounded-full bg-white/5 hover:bg-neon-blue/20 text-gray-400 hover:text-neon-blue transition-all border border-white/10 hover:border-neon-blue/50"
                          title="View History & Voice Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                          </span>
                        </button>
                    </td>

                    {/* Sentiment */}
                    <td className="px-6 py-4 align-top">
                       <div className="relative inline-block w-full">
                          <select
                            value={lead.sentiment}
                            onChange={(e) => onUpdateLead(lead.id, { sentiment: e.target.value as any })}
                            className="w-full appearance-none bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
                          >
                             <option value="Positive" className="bg-gray-900">Positive</option>
                             <option value="Neutral" className="bg-gray-900">Neutral</option>
                             <option value="Negative" className="bg-gray-900">Negative</option>
                          </select>
                           {/* Sentiment Indicator Dot */}
                           <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                              <div className={`w-2 h-2 rounded-full ${lead.sentiment === 'Positive' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : lead.sentiment === 'Negative' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}></div>
                           </div>
                       </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onDeleteLead(lead.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete Lead"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
           <button 
             onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
             disabled={currentPage === 1}
             className="px-4 py-2 text-xs font-semibold rounded-lg bg-black/20 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-black/20 transition-colors border border-white/5"
           >
             Previous
           </button>
           <div className="flex gap-2">
             {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
               <button
                 key={page}
                 onClick={() => setCurrentPage(page)}
                 className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors border ${currentPage === page ? 'bg-neon-blue text-black border-neon-blue' : 'bg-black/20 hover:bg-white/10 text-gray-400 border-white/5'}`}
               >
                 {page}
               </button>
             ))}
           </div>
           <button 
             onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
             disabled={currentPage === totalPages}
             className="px-4 py-2 text-xs font-semibold rounded-lg bg-black/20 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-black/20 transition-colors border border-white/5"
           >
             Next
           </button>
        </div>
      )}
    </div>
  );
};

export default CRMTable;