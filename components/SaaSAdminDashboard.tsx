
import React, { useState, useMemo } from 'react';
import { Tenant, UsageStats } from '../types';

interface SaaSAdminDashboardProps {
  onClose: () => void;
}

const SaaSAdminDashboard: React.FC<SaaSAdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'revenue' | 'settings'>('overview');

  // Mock data for SaaS Owner
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: '1',
      name: 'Acme Corp',
      slug: 'acme',
      ownerId: 'user_1',
      status: 'Active',
      branding: { primaryColor: '#00f3ff', whiteLabelName: 'Acme AI' },
      subscription: {
        tier: 'Enterprise',
        expiresAt: '2027-01-01',
        limits: { conversations: 10000, tokens: 5000000, voiceMinutes: 1000 }
      },
      createdAt: '2025-01-01'
    },
    {
      id: '2',
      name: 'Global Retail',
      slug: 'global-retail',
      ownerId: 'user_2',
      status: 'Active',
      branding: { primaryColor: '#bc13fe', whiteLabelName: 'RetailBot' },
      subscription: {
        tier: 'Pro',
        expiresAt: '2026-06-01',
        limits: { conversations: 2000, tokens: 1000000, voiceMinutes: 200 }
      },
      createdAt: '2025-02-15'
    },
    {
      id: '3',
      name: 'Local Shop',
      slug: 'local-shop',
      ownerId: 'user_3',
      status: 'Suspended',
      branding: { primaryColor: '#10b981', whiteLabelName: 'Shop Assistant' },
      subscription: {
        tier: 'Starter',
        expiresAt: '2025-12-01',
        limits: { conversations: 500, tokens: 200000, voiceMinutes: 50 }
      },
      createdAt: '2025-03-01'
    }
  ]);

  const globalStats = useMemo(() => {
    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === 'Active').length,
      totalRevenue: 12450,
      totalTokens: '8.4M',
      totalConversations: 42300
    };
  }, [tenants]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center font-black text-black shadow-[0_0_20px_rgba(0,243,255,0.3)]">
              S
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tighter uppercase">SaaS Engine</h1>
              <span className="text-[10px] text-neon-blue font-mono tracking-widest">SUPER ADMIN</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Global Overview', icon: '🌍' },
              { id: 'tenants', label: 'Tenant Directory', icon: '🏢' },
              { id: 'revenue', label: 'Revenue & Billing', icon: '💰' },
              { id: 'settings', label: 'System Settings', icon: '⚙️' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider
                  ${activeTab === item.id ? 'bg-white/10 text-neon-blue border border-white/10' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/10">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all border border-white/10 uppercase tracking-widest"
          >
            Exit SaaS Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">
                {activeTab === 'overview' && 'System Pulse'}
                {activeTab === 'tenants' && 'Tenant Management'}
                {activeTab === 'revenue' && 'Financial Ledger'}
                {activeTab === 'settings' && 'Core Configuration'}
              </h2>
              <p className="text-gray-500 text-sm font-medium">Real-time telemetry from the Nova SaaS Engine.</p>
            </div>
            <div className="flex gap-4">
               <div className="px-4 py-2 bg-neon-blue/10 border border-neon-blue/20 rounded-lg">
                  <span className="text-[10px] text-neon-blue font-bold uppercase block">System Status</span>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    ALL SYSTEMS OPERATIONAL
                  </span>
               </div>
            </div>
          </header>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Tenants', value: globalStats.totalTenants, color: 'text-white' },
                  { label: 'Active Sessions', value: '142', color: 'text-neon-blue' },
                  { label: 'Monthly Revenue', value: `$${globalStats.totalRevenue.toLocaleString()}`, color: 'text-emerald-400' },
                  { label: 'Avg Latency', value: '42ms', color: 'text-neon-purple' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-8 bg-neon-blue rounded-full"></span>
                    Resource Consumption
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold uppercase mb-2">
                        <span className="text-gray-400">Token Quota (Global)</span>
                        <span className="text-neon-blue">8.4M / 20M</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[42%] h-full bg-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.5)]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold uppercase mb-2">
                        <span className="text-gray-400">Voice Synthesis</span>
                        <span className="text-neon-purple">1,240 min / 5,000 min</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[24.8%] h-full bg-neon-purple shadow-[0_0_10px_rgba(188,19,254,0.5)]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold uppercase mb-2">
                        <span className="text-gray-400">Storage Used</span>
                        <span className="text-emerald-400">142 GB / 1 TB</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[14.2%] h-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-8 bg-neon-purple rounded-full"></span>
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {[
                      { msg: 'New Tenant "Solaris Energy" joined Pro Plan', time: '2m ago', type: 'new' },
                      { msg: 'Tenant "Acme Corp" reached 80% token limit', time: '14m ago', type: 'warn' },
                      { msg: 'Global API Key rotation completed', time: '1h ago', type: 'sys' },
                      { msg: 'Payment failed for "Local Shop"', time: '3h ago', type: 'err' },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.type === 'new' ? 'bg-green-500' : log.type === 'warn' ? 'bg-amber-500' : log.type === 'err' ? 'bg-red-500' : 'bg-neon-blue'}`}></div>
                          <span className="text-sm font-medium text-gray-300">{log.msg}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-600 uppercase">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tenants' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tenant</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plan</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Usage</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg shadow-inner" style={{ color: tenant.branding.primaryColor }}>
                            {tenant.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{tenant.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">ID: {tenant.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border ${
                          tenant.subscription.tier === 'Enterprise' ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' :
                          tenant.subscription.tier === 'Pro' ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {tenant.subscription.tier}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${tenant.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-xs font-bold uppercase tracking-tight">{tenant.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-32">
                          <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase mb-1">
                            <span>Tokens</span>
                            <span>42%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="w-[42%] h-full bg-neon-blue"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button className="p-2 bg-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="col-span-1 md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h3 className="text-lg font-bold mb-6">Revenue Growth</h3>
                  <div className="h-64 flex items-end gap-2">
                    {[40, 60, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-neon-blue/10 to-neon-blue/40 rounded-t-lg hover:to-neon-blue transition-all relative group" style={{ height: `${h}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${(h * 120).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
               </div>
               
               <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Projected MRR</p>
                    <p className="text-3xl font-black text-emerald-400">$24,500</p>
                    <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      +12% from last month
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Churn Rate</p>
                    <p className="text-3xl font-black text-white">1.2%</p>
                    <p className="text-xs text-gray-500 mt-2 italic">Extremely healthy</p>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
               <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                  <h3 className="text-lg font-bold text-neon-blue">Global Engine Config</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Default Model</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-blue focus:outline-none">
                        <option>gemini-3.1-pro-preview</option>
                        <option>gemini-3-flash-preview</option>
                        <option>gemini-2.5-flash</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global System Instruction Prefix</label>
                      <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-blue focus:outline-none"
                        rows={4}
                        defaultValue="You are part of the Nova SaaS network. Maintain high professional standards..."
                      />
                    </div>
                  </div>
               </div>

               <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                  <h3 className="text-lg font-bold text-neon-purple">API & Security</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-bold">Enforce Rate Limiting</p>
                        <p className="text-[10px] text-gray-500">Prevent API abuse across all tenants.</p>
                      </div>
                      <button className="w-12 h-6 bg-neon-blue rounded-full relative">
                        <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-bold">Debug Mode (Global)</p>
                        <p className="text-[10px] text-gray-500">Expose detailed logs in development.</p>
                      </div>
                      <button className="w-12 h-6 bg-gray-700 rounded-full relative">
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SaaSAdminDashboard;
