
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AgentConfig, Lead, Product, Persona, ObjectionHandler, FAQ, AgentDoc, LandingFeature, Testimonial, PartnerLogo, Session } from '../types';
import CRMTable from './CRMTable';
import { db } from '../services/db';

interface AdminDashboardProps {
  config: AgentConfig;
  setConfig: (config: AgentConfig) => void;
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onDeleteLead: (id: string) => void;
  onClose: () => void;
  onSave: (config: AgentConfig) => Promise<void>;
}

type TabID = 'overview' | 'landing' | 'crm' | 'company' | 'products' | 'personas' | 'scripts' | 'objections' | 'faqs' | 'process' | 'pricing' | 'docs' | 'tone' | 'deploy';

// CSV Helper Functions
const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }
  const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  const csvContent = [
    allKeys.join(','),
    ...data.map(row => 
      allKeys.map(key => {
        const val = (row as any)[key];
        const stringVal = val === null || val === undefined ? '' : String(val);
        return `"${stringVal.replace(/"/g, '""')}"`; 
      }).join(',')
    )
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const importFromCSV = (file: File, callback: (data: any[]) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    if (!text) return;
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim());
    const parsedData = lines.slice(1).map((line, idx) => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const obj: any = {};
      headers.forEach((header, i) => {
        let val = values[i] || '';
        val = val.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
          val = val.replace(/""/g, '"');
        }
        obj[header] = val;
      });
      if (!obj.id) obj.id = `imported_${Date.now()}_${idx}`;
      return obj;
    });
    callback(parsedData);
  };
  reader.readAsText(file);
};

// --- Extracted Components (Fixes focus loss issue) ---

const RenderField = ({ label, value, onChange, type = "text", multiline = false, rows = 3 }: any) => (
  <div className="space-y-2 mb-4">
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    {multiline ? (
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-neon-blue focus:outline-none text-sm transition-all focus:bg-white/5"
        rows={rows}
      />
    ) : (
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-neon-blue focus:outline-none text-sm transition-all focus:bg-white/5"
      />
    )}
  </div>
);

const ListManager = <T extends { id: string }>({ 
  items, 
  onUpdate, 
  renderItem, 
  newItemTemplate,
  name
}: { 
  items: T[], 
  onUpdate: (items: T[]) => void, 
  renderItem: (item: T, index: number, updateItem: (u: T) => void) => React.ReactNode,
  newItemTemplate: T,
  name: string
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3 mb-2">
         <button 
           onClick={() => exportToCSV(items, name)}
           className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-neon-blue transition-colors flex items-center gap-2"
         >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
           Export CSV
         </button>
         <button 
           onClick={() => fileInputRef.current?.click()}
           className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-neon-purple transition-colors flex items-center gap-2"
         >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
           Import CSV
         </button>
         <input 
           type="file" 
           accept=".csv"
           ref={fileInputRef}
           className="hidden"
           onChange={(e) => {
             if (e.target.files?.[0]) {
               importFromCSV(e.target.files[0], (data) => {
                  onUpdate(data as T[]);
               });
               e.target.value = '';
             }
           }}
         />
      </div>

      {items.map((item, idx) => (
        <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-xl relative group">
          <button 
            onClick={() => {
              const newItems = [...items];
              newItems.splice(idx, 1);
              onUpdate(newItems);
            }}
            className="absolute top-2 right-2 text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity text-xs border border-red-500/50 px-2 py-1 rounded hover:bg-red-500/10"
          >
            Remove
          </button>
          {renderItem(item, idx, (updated) => {
            const newItems = [...items];
            newItems[idx] = updated;
            onUpdate(newItems);
          })}
        </div>
      ))}
      <button 
        onClick={() => onUpdate([...items, { ...newItemTemplate, id: Date.now().toString() }])}
        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-neon-blue transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span> Add Entry
      </button>
    </div>
  );
};

// --- Main Component ---

const AdminDashboard: React.FC<AdminDashboardProps> = ({ config, setConfig, leads, onUpdateLead, onDeleteLead, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<TabID>('overview');
  const [isSaving, setIsSaving] = useState(false);
  
  // --- Session History State ---
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadSessions, setLeadSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const handleViewHistory = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsLoadingSessions(true);
    try {
      const sessions = await db.getSessions(lead.id);
      setLeadSessions(sessions);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const closeHistoryPanel = () => {
    setSelectedLead(null);
    setLeadSessions([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
      setTimeout(() => {
          setIsSaving(false);
          onClose(); 
      }, 500);
    } catch (error) {
      console.error("Save failed", error);
      setIsSaving(false);
      alert("Failed to save configuration. Please try again.");
    }
  };

  const updateConfig = (section: keyof AgentConfig, data: any) => {
    setConfig({ ...config, [section]: data });
  };

  const updateNestedConfig = (section: keyof AgentConfig, subKey: string, value: any) => {
    setConfig({
      ...config,
      [section]: {
        ...(config[section] as object),
        [subKey]: value
      }
    });
  };
  
  const updateLandingConfig = (subKey: keyof AgentConfig['landingPage'], value: any) => {
    setConfig({
      ...config,
      landingPage: {
        ...config.landingPage,
        [subKey]: value
      }
    });
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const closed = leads.filter(l => l.status === 'Closed').length;
    const positive = leads.filter(l => l.sentiment === 'Positive').length;
    const conversionRate = total > 0 ? ((closed / total) * 100).toFixed(1) : '0.0';
    const sentimentScore = total > 0 ? ((positive / total) * 100).toFixed(0) : '0';
    return { total, conversionRate, sentimentScore };
  }, [leads]);

  const menuItems: { id: TabID; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'landing', label: 'Landing Page', icon: '🌐' },
    { id: 'crm', label: 'CRM & Leads', icon: '👥' },
    { id: 'company', label: 'Company Info', icon: '🏢' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'personas', label: 'Personas', icon: '🎭' },
    { id: 'scripts', label: 'Sales Scripts', icon: '📜' },
    { id: 'objections', label: 'Objections', icon: '🛡️' },
    { id: 'faqs', label: 'FAQ Library', icon: '❓' },
    { id: 'process', label: 'Process', icon: '⚙️' },
    { id: 'pricing', label: 'Pricing', icon: '💲' },
    { id: 'docs', label: 'Documents', icon: '📁' },
    { id: 'tone', label: 'Tone & Behavior', icon: '🎨' },
    { id: 'deploy', label: 'Deploy / WL', icon: '🚀' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-neon-dark text-white font-sans overflow-hidden relative">
      
      {/* Session History Modal / Slide-over */}
      {selectedLead && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
           <div className="w-full md:w-[600px] h-full bg-neon-surface border-l border-white/10 flex flex-col shadow-2xl animate-fade-in-right">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <div>
                   <h3 className="text-xl font-bold text-white">{selectedLead.name}</h3>
                   <p className="text-sm text-gray-400">Session Recordings & Logs</p>
                 </div>
                 <button onClick={closeHistoryPanel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {isLoadingSessions ? (
                   <div className="flex justify-center items-center h-40">
                      <div className="w-8 h-8 rounded-full border-2 border-neon-blue border-t-transparent animate-spin"></div>
                   </div>
                ) : leadSessions.length === 0 ? (
                   <div className="text-center text-gray-500 py-12">
                     No recorded sessions found for this lead.
                   </div>
                ) : (
                  leadSessions.map((session, index) => (
                    <div key={session.id} className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                       <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                          <span className="text-xs font-mono text-neon-blue">SESSION #{index + 1}</span>
                          <span className="text-xs text-gray-400">{new Date(session.createdAt).toLocaleString()}</span>
                       </div>
                       
                       {/* Audio Player */}
                       <div className="p-4 border-b border-white/5 bg-black/20">
                          {session.audioUrl ? (
                             <div className="flex flex-col gap-2">
                                <audio controls src={session.audioUrl} className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity" />
                                <a href={session.audioUrl} download={`session_${session.id}.webm`} className="text-[10px] text-neon-blue hover:underline self-end">Download Recording</a>
                             </div>
                          ) : (
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                               </div>
                               <div className="flex-1">
                                  <div className="h-1 bg-gray-700 rounded-full w-full"></div>
                               </div>
                               <span className="text-[10px] uppercase font-bold text-gray-500">No Audio</span>
                             </div>
                          )}
                          {!session.audioUrl && (
                             <p className="text-[10px] text-gray-500 mt-2 italic text-center">
                               Recording unavailable or expired (local demo storage).
                             </p>
                          )}
                       </div>

                       <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                          {session.transcript && session.transcript.length > 0 ? (
                            session.transcript.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20' : 'bg-white/10 text-gray-300'}`}>
                                    <p>{msg.text}</p>
                                    <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                 </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic text-center">Empty transcript.</p>
                          )}
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-64 glass-panel border-b md:border-b-0 md:border-r border-white/10 flex flex-col z-20 shrink-0">
        <div className="p-4 md:p-6 pb-2 flex justify-between items-center">
           <div className="flex items-center gap-3 mb-2 md:mb-6">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" />
            ) : (
               <div className="w-8 h-8 rounded bg-neon-blue flex items-center justify-center font-bold text-black text-xs">
                 {config.name.substring(0, 2).toUpperCase()}
               </div>
            )}
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-tight truncate w-32">{config.name}</h1>
              <span className="text-[10px] text-neon-blue uppercase tracking-widest block">Control Center</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="flex md:flex-col overflow-x-auto md:overflow-y-auto md:flex-1 px-4 pb-4 space-x-2 md:space-x-0 md:space-y-1 custom-scrollbar hide-scrollbar-mobile">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all uppercase tracking-wide whitespace-nowrap
                ${activeTab === item.id ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/30' : 'text-gray-400 hover:bg-white/5 border border-transparent'}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <header className="flex justify-between items-start md:items-end border-b border-white/10 pb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{menuItems.find(m => m.id === activeTab)?.label}</h2>
              <p className="text-gray-500 text-xs md:text-sm">Manage your AI agent's knowledge base and behavior.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-neon-blue text-black font-bold text-sm rounded hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save & Apply'
                )}
              </button>
              <button 
                onClick={onClose}
                className="hidden md:flex p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-all border border-white/10"
                title="Exit Admin"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </header>

          {activeTab === 'overview' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-3 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                   <div>
                     <h3 className="text-2xl font-bold mb-2">Agent Status: Active</h3>
                     <p className="text-gray-300">Your agent is currently deployed and handling traffic.</p>
                   </div>
                   <div className="w-16 h-16 rounded-full bg-neon-blue/20 flex items-center justify-center animate-pulse shrink-0">
                      <div className="w-8 h-8 rounded-full bg-neon-blue"></div>
                   </div>
                </div>
                <div className="p-6 rounded-xl glass-panel border border-white/5">
                  <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Total Leads</h3>
                  <p className="text-4xl font-bold text-white">{stats.total}</p>
                </div>
                 <div className="p-6 rounded-xl glass-panel border border-white/5">
                  <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Conversion Rate</h3>
                  <p className="text-4xl font-bold text-neon-blue">{stats.conversionRate}%</p>
                </div>
                 <div className="p-6 rounded-xl glass-panel border border-white/5">
                  <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Positive Sentiment</h3>
                  <p className="text-4xl font-bold text-green-400">{stats.sentimentScore}%</p>
                </div>
             </div>
          )}
          
          {/* Landing Page Manager */}
          {activeTab === 'landing' && (
             <div className="space-y-10">
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                   <h3 className="text-lg font-bold text-neon-blue mb-4">Design & Branding</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Primary Color</label>
                        <div className="flex gap-3">
                           {[
                             { name: 'Cyan', val: '#00f3ff' },
                             { name: 'Purple', val: '#bc13fe' },
                             { name: 'Emerald', val: '#10b981' },
                             { name: 'Amber', val: '#f59e0b' },
                             { name: 'Rose', val: '#f43f5e' },
                           ].map(color => (
                             <button
                               key={color.val}
                               onClick={() => updateLandingConfig('primaryColor', color.val)}
                               className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${config.landingPage.primaryColor === color.val ? 'border-white scale-110' : 'border-transparent'}`}
                               style={{ backgroundColor: color.val }}
                               title={color.name}
                             />
                           ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Font Family</label>
                        <select 
                          value={config.landingPage.fontFamily || 'Inter'}
                          onChange={(e) => updateLandingConfig('fontFamily', e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-neon-blue focus:outline-none"
                        >
                           <option value="Inter">Inter (Modern Sans)</option>
                           <option value="Cairo">Cairo (Arabic Optimized)</option>
                           <option value="Mono">Monospace (Technical)</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                   <h3 className="text-lg font-bold text-neon-blue mb-4">Hero Section</h3>
                   <div className="space-y-4">
                     <RenderField label="Headline" value={config.landingPage.heroHeadline} onChange={(v: string) => updateLandingConfig('heroHeadline', v)} />
                     <RenderField label="Sub-headline" value={config.landingPage.heroSubheadline} onChange={(v: string) => updateLandingConfig('heroSubheadline', v)} multiline rows={2} />
                     <RenderField label="CTA Text" value={config.landingPage.heroCtaText} onChange={(v: string) => updateLandingConfig('heroCtaText', v)} />
                   </div>
                </div>
                
                <div>
                   <h3 className="text-lg font-bold text-neon-blue mb-4">Partner Logos (Marquee)</h3>
                   <ListManager<PartnerLogo>
                      items={config.landingPage.partnerLogos}
                      name="logos"
                      onUpdate={(items) => updateLandingConfig('partnerLogos', items)}
                      newItemTemplate={{ id: '', name: 'New Partner', url: 'https://placehold.co/100x40' }}
                      renderItem={(item, idx, update) => (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <RenderField label="Partner Name" value={item.name} onChange={(v: string) => update({...item, name: v})} />
                           <RenderField label="Logo URL" value={item.url} onChange={(v: string) => update({...item, url: v})} />
                        </div>
                      )}
                   />
                </div>

                <div>
                   <h3 className="text-lg font-bold text-neon-blue mb-4">Features</h3>
                   <ListManager<LandingFeature>
                      items={config.landingPage.features}
                      name="features"
                      onUpdate={(items) => updateLandingConfig('features', items)}
                      newItemTemplate={{ id: '', title: 'Feature Name', description: '', icon: '⚡' }}
                      renderItem={(item, idx, update) => (
                        <div className="space-y-2">
                           <div className="grid grid-cols-6 gap-4">
                              <div className="col-span-1">
                                <RenderField label="Icon" value={item.icon} onChange={(v: string) => update({...item, icon: v})} />
                              </div>
                              <div className="col-span-5">
                                <RenderField label="Title" value={item.title} onChange={(v: string) => update({...item, title: v})} />
                              </div>
                           </div>
                           <RenderField label="Description" value={item.description} onChange={(v: string) => update({...item, description: v})} multiline rows={2} />
                        </div>
                      )}
                   />
                </div>
                
                <div>
                   <h3 className="text-lg font-bold text-neon-blue mb-4">Testimonials</h3>
                   <ListManager<Testimonial>
                      items={config.landingPage.testimonials}
                      name="testimonials"
                      onUpdate={(items) => updateLandingConfig('testimonials', items)}
                      newItemTemplate={{ id: '', name: 'Client Name', role: 'CEO', quote: 'Great service!', avatarUrl: '' }}
                      renderItem={(item, idx, update) => (
                        <div className="space-y-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <RenderField label="Client Name" value={item.name} onChange={(v: string) => update({...item, name: v})} />
                              <RenderField label="Role / Company" value={item.role} onChange={(v: string) => update({...item, role: v})} />
                           </div>
                           <RenderField label="Quote" value={item.quote} onChange={(v: string) => update({...item, quote: v})} multiline rows={2} />
                           <RenderField label="Avatar URL (Optional)" value={item.avatarUrl} onChange={(v: string) => update({...item, avatarUrl: v})} />
                        </div>
                      )}
                   />
                </div>
             </div>
          )}

          {/* CRM */}
          {activeTab === 'crm' && (
            <CRMTable 
              leads={leads} 
              onUpdateLead={onUpdateLead}
              onDeleteLead={onDeleteLead}
              onViewHistory={handleViewHistory}
            />
          )}

          {/* Company Info */}
          {activeTab === 'company' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RenderField label="Company Name" value={config.companyInfo.name} onChange={(v: string) => updateNestedConfig('companyInfo', 'name', v)} />
              <RenderField label="Years in Business" value={config.companyInfo.yearsInBusiness} onChange={(v: string) => updateNestedConfig('companyInfo', 'yearsInBusiness', v)} />
              <div className="col-span-1 md:col-span-2">
                <RenderField label="What the company does" value={config.companyInfo.description} onChange={(v: string) => updateNestedConfig('companyInfo', 'description', v)} multiline />
              </div>
              <div className="col-span-1 md:col-span-2">
                <RenderField label="Unique Selling Proposition (USP)" value={config.companyInfo.usp} onChange={(v: string) => updateNestedConfig('companyInfo', 'usp', v)} multiline />
              </div>
              <RenderField label="Service Locations" value={config.companyInfo.serviceLocations} onChange={(v: string) => updateNestedConfig('companyInfo', 'serviceLocations', v)} />
              <RenderField label="Authorized Brands / Partnerships" value={config.companyInfo.authorizedBrands} onChange={(v: string) => updateNestedConfig('companyInfo', 'authorizedBrands', v)} />
            </div>
          )}

          {/* Products */}
          {activeTab === 'products' && (
            <ListManager<Product>
              items={config.products}
              name="products"
              onUpdate={(items) => updateConfig('products', items)}
              newItemTemplate={{ id: '', name: 'New Product', category: 'General', description: '', features: '', specs: '', priceRange: '', stockStatus: 'In Stock' }}
              renderItem={(item, idx, update) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RenderField label="Product Name" value={item.name} onChange={(v: string) => update({...item, name: v})} />
                  <RenderField label="Category" value={item.category} onChange={(v: string) => update({...item, category: v})} />
                  <div className="col-span-1 md:col-span-2">
                     <RenderField label="Description" value={item.description} onChange={(v: string) => update({...item, description: v})} multiline />
                  </div>
                  <RenderField label="Price Range" value={item.priceRange} onChange={(v: string) => update({...item, priceRange: v})} />
                  <RenderField label="Stock Status" value={item.stockStatus} onChange={(v: string) => update({...item, stockStatus: v})} />
                </div>
              )}
            />
          )}

          {/* Personas */}
          {activeTab === 'personas' && (
            <ListManager<Persona>
              items={config.personas}
              name="personas"
              onUpdate={(items) => updateConfig('personas', items)}
              newItemTemplate={{ id: '', name: 'New Persona', jobTitle: '', painPoints: '', motivations: '' }}
              renderItem={(item, idx, update) => (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RenderField label="Persona Name" value={item.name} onChange={(v: string) => update({...item, name: v})} />
                    <RenderField label="Job Title" value={item.jobTitle} onChange={(v: string) => update({...item, jobTitle: v})} />
                  </div>
                  <RenderField label="Pain Points" value={item.painPoints} onChange={(v: string) => update({...item, painPoints: v})} multiline />
                  <RenderField label="Buying Motivations" value={item.motivations} onChange={(v: string) => update({...item, motivations: v})} multiline />
                </div>
              )}
            />
          )}

          {/* Scripts */}
          {activeTab === 'scripts' && (
            <div className="space-y-8">
               <div>
                 <h3 className="text-lg font-bold text-neon-blue mb-4">Hooks & Openers</h3>
                 <div className="grid grid-cols-1 gap-4">
                    <RenderField label="Short Hook" value={config.scripts.hooks.short} onChange={(v: string) => {
                      const newHooks = {...config.scripts.hooks, short: v};
                      updateNestedConfig('scripts', 'hooks', newHooks);
                    }} multiline />
                    <RenderField label="Formal Opener" value={config.scripts.hooks.formal} onChange={(v: string) => {
                      const newHooks = {...config.scripts.hooks, formal: v};
                      updateNestedConfig('scripts', 'hooks', newHooks);
                    }} multiline />
                 </div>
               </div>
               <div>
                 <h3 className="text-lg font-bold text-neon-blue mb-4">Pitches</h3>
                 <div className="grid grid-cols-1 gap-4">
                    <RenderField label="Cold Lead Pitch" value={config.scripts.pitches.cold} onChange={(v: string) => {
                      const newPitches = {...config.scripts.pitches, cold: v};
                      updateNestedConfig('scripts', 'pitches', newPitches);
                    }} multiline />
                    <RenderField label="Showroom / Walk-in" value={config.scripts.pitches.showroom} onChange={(v: string) => {
                      const newPitches = {...config.scripts.pitches, showroom: v};
                      updateNestedConfig('scripts', 'pitches', newPitches);
                    }} multiline />
                 </div>
               </div>
               <div>
                 <h3 className="text-lg font-bold text-neon-blue mb-4">Closing & Price</h3>
                 <div className="grid grid-cols-1 gap-4">
                    <RenderField label="Price Justification" value={config.scripts.closing.priceJustification} onChange={(v: string) => {
                      const newClosing = {...config.scripts.closing, priceJustification: v};
                      updateNestedConfig('scripts', 'closing', newClosing);
                    }} multiline />
                 </div>
               </div>
            </div>
          )}

          {/* Objections */}
          {activeTab === 'objections' && (
            <ListManager<ObjectionHandler>
              items={config.objections}
              name="objections"
              onUpdate={(items) => updateConfig('objections', items)}
              newItemTemplate={{ id: '', objection: 'Price is too high', answer: '' }}
              renderItem={(item, idx, update) => (
                <div className="space-y-2">
                  <RenderField label="Objection" value={item.objection} onChange={(v: string) => update({...item, objection: v})} />
                  <RenderField label="The Perfect Answer" value={item.answer} onChange={(v: string) => update({...item, answer: v})} multiline />
                </div>
              )}
            />
          )}

          {/* FAQs */}
          {activeTab === 'faqs' && (
            <ListManager<FAQ>
              items={config.faqs}
              name="faqs"
              onUpdate={(items) => updateConfig('faqs', items)}
              newItemTemplate={{ id: '', question: '', answer: '', category: 'General' }}
              renderItem={(item, idx, update) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="col-span-1 md:col-span-2">
                        <RenderField label="Question" value={item.question} onChange={(v: string) => update({...item, question: v})} />
                     </div>
                     <RenderField label="Category" value={item.category} onChange={(v: string) => update({...item, category: v})} />
                  </div>
                  <RenderField label="Answer" value={item.answer} onChange={(v: string) => update({...item, answer: v})} multiline />
                </div>
              )}
            />
          )}

          {/* Process */}
          {activeTab === 'process' && (
            <div className="space-y-6">
              <RenderField label="Lead Qualification Rules" value={config.process.leadQualificationRules} onChange={(v: string) => updateNestedConfig('process', 'leadQualificationRules', v)} multiline rows={4} />
              <RenderField label="Discovery Questions" value={config.process.discoveryQuestions} onChange={(v: string) => updateNestedConfig('process', 'discoveryQuestions', v)} multiline rows={4} />
              <RenderField label="Follow Up Strategy" value={config.process.followUpStrategy} onChange={(v: string) => updateNestedConfig('process', 'followUpStrategy', v)} multiline rows={4} />
              <RenderField label="When to escalate to human?" value={config.process.humanEscalationTrigger} onChange={(v: string) => updateNestedConfig('process', 'humanEscalationTrigger', v)} multiline />
            </div>
          )}

          {/* Pricing */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <RenderField label="Standard Pricing Structure" value={config.pricing.standardPricing} onChange={(v: string) => updateNestedConfig('pricing', 'standardPricing', v)} multiline rows={4} />
              <RenderField label="Volume Discounts" value={config.pricing.volumeDiscounts} onChange={(v: string) => updateNestedConfig('pricing', 'volumeDiscounts', v)} multiline rows={3} />
              <RenderField label="Seasonal Offers" value={config.pricing.seasonalOffers} onChange={(v: string) => updateNestedConfig('pricing', 'seasonalOffers', v)} multiline rows={3} />
            </div>
          )}

           {/* Docs */}
           {activeTab === 'docs' && (
            <ListManager<AgentDoc>
              items={config.documents}
              name="documents"
              onUpdate={(items) => updateConfig('documents', items)}
              newItemTemplate={{ id: '', title: 'New Doc', url: '' }}
              renderItem={(item, idx, update) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RenderField label="Document Title" value={item.title} onChange={(v: string) => update({...item, title: v})} />
                  <RenderField label="URL / Link" value={item.url} onChange={(v: string) => update({...item, url: v})} />
                </div>
              )}
            />
          )}

          {/* Tone */}
          {activeTab === 'tone' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <RenderField label="Writing Style" value={config.tone.style} onChange={(v: string) => updateNestedConfig('tone', 'style', v)} />
                 <div className="space-y-2 mb-4">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Language Mix</label>
                    <select 
                      value={config.tone.languageMix}
                      onChange={(e) => updateNestedConfig('tone', 'languageMix', e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-neon-blue focus:outline-none"
                    >
                      <option value="Arabic">Arabic Only (Egyptian)</option>
                      <option value="English">English Only</option>
                      <option value="Mix">Mix (Franco-Arab / Business)</option>
                      <option value="Khaliji">Khaliji (Gulf Arabic)</option>
                    </select>
                 </div>
                 <div className="space-y-2 mb-4">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Technical Detail</label>
                    <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                      {['Low', 'Medium', 'High'].map(level => (
                         <button 
                           key={level}
                           onClick={() => updateNestedConfig('tone', 'technicalLevel', level)}
                           className={`flex-1 py-2 text-xs font-bold rounded ${config.tone.technicalLevel === level ? 'bg-neon-blue text-black' : 'text-gray-400 hover:text-white'}`}
                         >
                           {level}
                         </button>
                      ))}
                    </div>
                 </div>
                 <div className="space-y-2 mb-4">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Sentence Length</label>
                    <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                      {['Short', 'Medium', 'Long'].map(len => (
                         <button 
                           key={len}
                           onClick={() => updateNestedConfig('tone', 'sentenceLength', len)}
                           className={`flex-1 py-2 text-xs font-bold rounded ${config.tone.sentenceLength === len ? 'bg-neon-blue text-black' : 'text-gray-400 hover:text-white'}`}
                         >
                           {len}
                         </button>
                      ))}
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* Deploy */}
          {activeTab === 'deploy' && (
             <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                   <h3 className="text-lg font-bold mb-4 text-neon-blue">Brand Identity</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <RenderField label="Agent Name" value={config.name} onChange={(v: string) => updateConfig('name', v)} />
                     <RenderField label="Logo URL" value={config.logoUrl || ''} onChange={(v: string) => updateConfig('logoUrl', v)} />
                   </div>
                   <div className="mt-4">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Voice Persona</label>
                      <div className="grid grid-cols-3 gap-4">
                        {['Kore', 'Fenrir', 'Puck'].map((v) => (
                          <button 
                            key={v}
                            onClick={() => updateConfig('voiceName', v)}
                            className={`p-3 rounded-lg border text-sm ${config.voiceName === v ? 'border-neon-blue bg-neon-blue/10 text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'} transition-all`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                   <h3 className="text-lg font-bold mb-2">Embed Code</h3>
                   <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto whitespace-pre">
                     {`<script src="https://nova-agent.app/sdk.js"></script>\n<nova-agent\n  id="${config.companyName.toLowerCase().replace(/\s/g, '-')}"\n  theme="dark"\n></nova-agent>`}
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        .hide-scrollbar-mobile {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar-mobile::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 768px) {
          .hide-scrollbar-mobile::-webkit-scrollbar {
            display: block;
          }
        }
        .animate-fade-in-right {
           animation: fadeInRight 0.3s ease-out;
        }
        @keyframes fadeInRight {
           from { opacity: 0; transform: translateX(100%); }
           to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
