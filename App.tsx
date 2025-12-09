import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { AgentConfig, Lead, AppMode, AgentStatus, Message, Session } from './types';
import Orb from './components/Orb';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import { LiveClient } from './services/liveApi';
import { db } from './services/db';

// Helper to retrieve API Key compatibly
const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) return process.env.API_KEY;
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  return '';
};

// --- Prompt Compilation Engine ---
const compileSystemPrompt = (c: AgentConfig): string => {
  const productsList = c.products.map(p => 
    `- Product: ${p.name} (${p.category})
      Desc: ${p.description}
      Features: ${p.features}
      Specs: ${p.specs}
      Price: ${p.priceRange}
      Stock: ${p.stockStatus}`
  ).join('\n');

  const personasList = c.personas.map(p => 
    `- Target: ${p.name} (${p.jobTitle})
      Pain: ${p.painPoints}
      Motivation: ${p.motivations}`
  ).join('\n');

  const objectionsList = c.objections.map(o => 
    `- If user says: "${o.objection}" -> You say: "${o.answer}"`
  ).join('\n');

  const faqsList = c.faqs.map(f => 
    `- Q: ${f.question} -> A: ${f.answer} (${f.category})`
  ).join('\n');

  const docsList = c.documents.map(d => `- ${d.title}: ${d.url}`).join('\n');

  let languageInstruction = 'Adapt naturally.';
  if (c.tone.languageMix === 'Arabic') {
    languageInstruction = 'Speak ONLY Arabic (Egyptian dialect/Masri).';
  } else if (c.tone.languageMix === 'English') {
    languageInstruction = 'Speak ONLY English.';
  } else if (c.tone.languageMix === 'Khaliji') {
    languageInstruction = 'Speak ONLY Arabic (Gulf/Khaliji dialect). Use formal but warm Gulf terms (e.g., "Ya Hala", "Tadal", "Abshir").';
  } else {
    languageInstruction = 'Adapt naturally. If user speaks Arabic, reply in Egyptian Arabic (Masri). If English, reply in English. You can use Franco-Arab terms if appropriate for a tech context.';
  }

  return `
    IDENTITY & ROLE:
    You are "${c.name}", an elite AI Sales & Operations Agent for "${c.companyInfo.name}".
    Your Voice Persona is ${c.voiceName}.
    
    COMPANY PROFILE:
    Description: ${c.companyInfo.description}
    USP: ${c.companyInfo.usp}
    Years in Business: ${c.companyInfo.yearsInBusiness}
    Locations: ${c.companyInfo.serviceLocations}
    Partners: ${c.companyInfo.authorizedBrands}

    TONE & BEHAVIOR:
    - Style: ${c.tone.style}
    - Persuasion Level: ${c.tone.persuasionLevel}
    - Technical Depth: ${c.tone.technicalLevel}
    - Sentence Length: ${c.tone.sentenceLength}
    - Language Handling: ${languageInstruction}
    - Emoji Use: ${c.tone.allowEmoji ? 'Allowed in text chat' : 'Forbidden'}

    KNOWLEDGE BASE (PRODUCTS):
    ${productsList}

    SALES STRATEGY (TARGET AUDIENCE):
    ${personasList}

    SCRIPTS & PHRASES:
    - Opening Hook: "${c.scripts.hooks.short}" OR "${c.scripts.hooks.medium}"
    - Cold Pitch: "${c.scripts.pitches.cold}"
    - Closing/Price Justification: "${c.scripts.closing.priceJustification}"
    - Urgency Driver: "${c.scripts.closing.urgency}"

    OBJECTION HANDLING (STRICT):
    ${objectionsList}

    FAQ LIBRARY:
    ${faqsList}

    OPERATIONAL PROCESS:
    1. Qualification: ${c.process.leadQualificationRules}
    2. Discovery: Ask "${c.process.discoveryQuestions}"
    3. Pricing Strategy: ${c.pricing.standardPricing} (Offers: ${c.pricing.seasonalOffers})
    4. Escalation: ${c.process.humanEscalationTrigger}

    REFERENCE DOCUMENTS:
    ${docsList}

    CRITICAL INSTRUCTIONS FOR CRM UPDATES:
    - You have access to a tool called "update_lead".
    - You MUST call this tool immediately whenever the user provides:
      1. Their Name
      2. Their Phone Number
      3. A specific Product Interest
      4. Any important Note or Requirement
    - Do NOT ask for permission to save these details. Just call the tool in the background.
    - After calling the tool, you MUST verbally confirm to the user (e.g., "I've updated your record with that information," or "Got it, I've noted that down").
    - If the user changes the topic or expresses a clear sentiment, update the "sentiment" and "status" fields using the tool.
    - Failure to update the lead details is a critical failure of your role.

    CORE INSTRUCTIONS:
    - You are helpful, efficient, and profit-driven but customer-centric.
    - Do not hallucinate products not listed above.
    - Keep responses concise for voice interaction.
    - If you don't know an answer, refer to the FAQ or suggest scheduling a call.
    - Always aim to move the conversation forward (Close -> Schedule -> Sale).
  `;
};

// Default config fallback
const DEFAULT_CONFIG: AgentConfig = {
    // Identity
    name: 'Nova',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/3616/3616450.png',
    language: 'ar-EG',
    voiceName: 'Kore',
    systemInstruction: '', // Will be compiled
    companyName: 'Nova Systems',
    
    // Default Data
    companyInfo: {
      name: 'Nova Systems',
      description: 'We provide AI-driven automation for sales and operations.',
      usp: 'Zero-latency AI agents that understand Egyptian market nuances.',
      tone: 'Futuristic yet approachable.',
      authorizedBrands: 'Google, Microsoft, AWS Partners',
      yearsInBusiness: '5',
      serviceLocations: 'Cairo, Alexandria, Dubai'
    },
    products: [
      { id: '1', name: 'Nova Core Agent', category: 'Software', description: 'The base AI model for handling inbound calls.', features: 'Real-time voice, CRM sync', specs: 'Latency < 500ms', priceRange: '$200/mo', stockStatus: 'Always Available' },
      { id: '2', name: 'Growth Module', category: 'Add-on', description: 'Advanced outbound sales capabilities.', features: 'Auto-dialing, Sentiment Analysis', specs: 'Up to 1000 calls/day', priceRange: '$150/mo', stockStatus: 'In Stock' }
    ],
    personas: [
      { id: '1', name: 'Tech Startups', jobTitle: 'CTO / Founder', painPoints: 'High support costs, missed leads.', motivations: 'Automation, Scaling fast.' },
      { id: '2', name: 'Real Estate Broker', jobTitle: 'Sales Manager', painPoints: 'Agents not following up.', motivations: 'Closing more deals.' }
    ],
    scripts: {
      hooks: { short: 'Hello, calling from Nova.', medium: 'Hi, I noticed you were interested in AI.', long: 'Good morning, this is Nova from Nova Systems, helping companies scale.', formal: 'Greetings, this is an automated assistant.', casual: 'Hey! Nova here.' },
      pitches: { cold: 'We help you sell more.', warm: 'Since you downloaded our guide...', b2b: 'Optimize your opex...', b2c: 'Save time today...', showroom: 'Welcome to our digital space.' },
      closing: { priceJustification: 'It pays for itself in a week.', urgency: 'Limited spots.', discount: '10% off today.', objectionHandling: 'I understand, but consider the ROI.' }
    },
    objections: [
      { id: '1', objection: 'Too expensive', answer: 'Compared to a human employee, it is 1/10th the cost.' },
      { id: '2', objection: 'Does it speak Arabic?', answer: 'Yes, fluent Masri and Fusha.' }
    ],
    faqs: [
      { id: '1', question: 'How do I install?', answer: 'Just embed the script code.', category: 'Technical' }
    ],
    process: {
      leadQualificationRules: 'Budget > $1000, Need immediate.',
      discoveryQuestions: 'How many leads do you get per day?',
      followUpStrategy: 'Email after 24h if no answer.',
      humanEscalationTrigger: 'If user asks for "human" twice.'
    },
    pricing: {
      standardPricing: 'Basic: $99, Pro: $199',
      volumeDiscounts: '10% for annual billing.',
      seasonalOffers: 'Ramadan Special: Free setup.'
    },
    documents: [
      { id: '1', title: 'Product Brochure PDF', url: 'https://nova.app/brochure.pdf' }
    ],
    tone: {
      style: 'Professional',
      sentenceLength: 'Medium',
      allowEmoji: true,
      languageMix: 'Mix',
      technicalLevel: 'Medium',
      persuasionLevel: 'High'
    },
    // Landing Page Defaults
    landingPage: {
      heroHeadline: 'Next Gen Sales AI',
      heroSubheadline: 'Automate your growth with an Arabic-native AI agent. Zero latency. Infinite scale.',
      heroCtaText: 'Initiate Demo',
      primaryColor: '#00f3ff',
      fontFamily: 'Inter',
      features: [
        { id: '1', title: 'Zero Latency', description: 'Real-time voice processing under 500ms.', icon: '⚡' },
        { id: '2', title: 'Native Arabic', description: 'Fluent in Egyptian, Khaliji, and MSA.', icon: '🗣️' },
        { id: '3', title: 'CRM Sync', description: 'Auto-updates your leads instantly.', icon: '🔄' }
      ],
      testimonials: [
        { id: '1', name: 'Omar F.', role: 'CEO, TechEgypt', quote: 'Doubled our sales in a week.', avatarUrl: '' },
        { id: '2', name: 'Sarah M.', role: 'Ops Director', quote: 'The admin dashboard is a lifesaver.', avatarUrl: '' }
      ],
      partnerLogos: [
        { id: '1', name: 'Google', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
        { id: '2', name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
        { id: '3', name: 'AWS', url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg' }
      ]
    }
  };

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // --- Data Persistence ---
  
  // Fetch initial data (Config + Leads)
  useEffect(() => {
    const initData = async () => {
      try {
        const [fetchedConfig, fetchedLeads] = await Promise.all([
          db.getAgentConfig(),
          db.getLeads()
        ]);

        if (fetchedConfig) {
          setConfig(fetchedConfig);
        }

        if (fetchedLeads) {
          setLeads(fetchedLeads);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setIsLoadingData(false);
      }
    };

    initData();
  }, []);

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    await db.updateLead(id, updates);
  };

  const handleDeleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    await db.deleteLead(id);
  };

  const handleSaveConfig = async (newConfig: AgentConfig) => {
    await db.saveAgentConfig(newConfig);
    setConfig(newConfig);
  };

  // Triggered when user enters "Agent View" from landing page
  const createNewLead = async () => {
    const tempName = `Guest User ${Math.floor(Math.random() * 9000) + 1000}`;
    // Create in DB
    const created = await db.createLead({
      name: tempName,
      company: 'Unknown',
      status: 'New',
      lastInteraction: 'Just now',
      sentiment: 'Neutral',
      phone: '',
      interestedIn: 'General Interest',
      notes: ''
    });

    if (created) {
       setLeads(prev => [created, ...prev]);
       // Create Session for recording transcript
       const session = await db.createSession(created.id);
       if (session) {
         setCurrentSessionId(session.id);
       }
    }
    setMode(AppMode.AGENT_VIEW);
  };

  const [notification, setNotification] = useState<string | null>(null);
  
  // Live Client State
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [orbVolume, setOrbVolume] = useState(0);
  const liveClientRef = useRef<LiveClient | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-save session transcript whenever messages update
  useEffect(() => {
    if (currentSessionId && chatMessages.length > 0) {
      db.updateSessionTranscript(currentSessionId, chatMessages);
    }
  }, [chatMessages, currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const systemPrompt = useMemo(() => compileSystemPrompt(config), [config]);

  // Initialize Chat Session
  useEffect(() => {
    if (mode === AppMode.AGENT_VIEW) {
      const apiKey = getApiKey();
      if (!apiKey) {
        console.error("API Key missing");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemPrompt,
        }
      });
      setChatMessages([{
        id: 'init',
        role: 'model',
        text: 'النظام متصل. كيف يمكنني مساعدتك في عملياتك اليوم؟',
        timestamp: new Date()
      }]);
    } else {
      // Clear session when leaving view
      setCurrentSessionId(null);
      setChatMessages([]);
    }
  }, [mode, systemPrompt]); 

  // Handle Text Chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !chatSessionRef.current || isChatLoading) return;

    const userText = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    
    // Update lead timestamp
    if (leads.length > 0) {
      handleUpdateLead(leads[0].id, { lastInteraction: 'Just now', status: 'Contacted' });
    }

    try {
      const result = await chatSessionRef.current.sendMessage({ message: userText });
      const responseText = result.text;
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error("Chat Error", err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Initialize Live Client
  useEffect(() => {
    if (mode === AppMode.AGENT_VIEW && !liveClientRef.current) {
      const effectiveConfig = { ...config, systemInstruction: systemPrompt };
      
      liveClientRef.current = new LiveClient(effectiveConfig);
      
      liveClientRef.current.onVolumeUpdate = (vol) => {
        setOrbVolume(vol);
      };

      liveClientRef.current.onStatusChange = (status) => {
        setAgentStatus(status);
        if (status === 'listening' || status === 'speaking') {
            if (leads.length > 0) {
              handleUpdateLead(leads[0].id, { lastInteraction: 'Just now', status: 'Contacted' });
            }
        }
      };

      // Handle automatic updates from the AI agent tool calls
      liveClientRef.current.onLeadUpdate = (updates) => {
        if (leads.length > 0) {
           console.log("Applying AI updates to lead:", updates);
           handleUpdateLead(leads[0].id, updates);
           setNotification("Lead updated by Agent");
           setTimeout(() => setNotification(null), 3000);
        }
      };

      // Save recorded audio blob
      liveClientRef.current.onAudioRecord = (blob) => {
         if (currentSessionId) {
            console.log("Saving audio recording...", blob.size);
            db.updateSessionAudio(currentSessionId, blob);
            setNotification("Call Recording Saved");
            setTimeout(() => setNotification(null), 3000);
         }
      };

      // Capture voice transcripts and add to chat history
      liveClientRef.current.onTranscript = (text, role) => {
        setChatMessages(prev => [
          ...prev, 
          {
            id: Date.now().toString(),
            role,
            text,
            timestamp: new Date()
          }
        ]);
      };
    }

    return () => {
      if (liveClientRef.current && mode !== AppMode.AGENT_VIEW) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
        setAgentStatus('idle');
      }
    };
  }, [mode, config, systemPrompt, leads, currentSessionId]); 

  const toggleLiveSession = async () => {
    if (!liveClientRef.current) return;
    if (agentStatus !== 'idle' && agentStatus !== 'error') {
      await liveClientRef.current.disconnect();
    } else {
      await liveClientRef.current.connect();
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-neon-blue border-t-transparent animate-spin"></div>
          <span className="text-neon-blue font-mono text-sm tracking-widest animate-pulse">INITIALIZING SYSTEM...</span>
        </div>
      </div>
    );
  }

  // Rendering (Admin/Agent Views)...
  if (mode === AppMode.ADMIN) {
    return (
      <AdminDashboard 
        config={config} 
        setConfig={setConfig} 
        leads={leads}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        onSave={handleSaveConfig}
        onClose={() => {
          setMode(AppMode.LANDING);
          setNotification("تم تحديث قاعدة المعرفة بنجاح");
          setTimeout(() => setNotification(null), 3000);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(18,18,26,0),rgba(5,5,5,1))]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue opacity-10 blur-[100px] animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple opacity-10 blur-[100px] animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-4 md:px-8 py-6 flex justify-between items-center glass-panel border-b-0 rounded-b-2xl mx-auto max-w-7xl left-0 right-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode(AppMode.LANDING)}>
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-full bg-white/10 p-1" />
          ) : (
            <div className="w-8 h-8 bg-neon-blue rounded-full shadow-[0_0_10px_#00f3ff]"></div>
          )}
          <span className="font-bold tracking-widest text-base md:text-lg uppercase truncate max-w-[150px] md:max-w-none">{config.name}<span className="font-light text-gray-400">CORE</span></span>
        </div>
        <div className="flex gap-6">
          <button 
            onClick={() => setMode(AppMode.ADMIN)}
            className="text-xs uppercase tracking-widest hover:text-neon-blue transition-colors text-gray-400 border border-white/10 px-3 py-1 rounded"
          >
            Admin Access
          </button>
        </div>
      </nav>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 right-4 z-50 animate-fade-in-down">
          <div className="bg-green-500/20 border border-green-500 text-green-300 px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            <span className="font-semibold">{notification}</span>
          </div>
        </div>
      )}

      {/* Landing / Agent View */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-24">
        {mode === AppMode.LANDING ? (
          <LandingPage 
            config={config.landingPage} 
            onStartDemo={createNewLead} 
            logoUrl={config.logoUrl}
            companyName={config.companyName}
          />
        ) : (
          <div dir="rtl" className="flex flex-col lg:flex-row items-center lg:items-start gap-8 w-full max-w-6xl min-h-[80vh] h-auto md:h-[80vh] pb-8 md:pb-0 px-4 font-arabic">
            
            {/* Orb (Left in LTR, Right in RTL) */}
            <div className="flex-1 flex flex-col items-center justify-center h-full gap-8 min-h-[400px]">
               <div className="flex flex-col items-center gap-2 animate-fade-in">
                  {config.logoUrl && (
                    <img src={config.logoUrl} alt="Agent" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                  ) }
                  <h2 className="text-2xl font-bold tracking-wider">{config.name}</h2>
                  <p className="text-neon-blue text-xs font-bold">{agentStatus === 'idle' ? 'في وضع الاستعداد' : 'نشط'}</p>
               </div>

               <div className="relative transform scale-100 md:scale-110 lg:scale-125">
                  <Orb 
                    status={agentStatus} 
                    volume={orbVolume}
                  />
               </div>

               <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={toggleLiveSession}
                    className={`
                      px-8 py-3 rounded-full font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 backdrop-blur-md z-20
                      ${(agentStatus !== 'idle' && agentStatus !== 'error')
                        ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                        : 'bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/20 shadow-[0_0_20px_rgba(6,182,212,0.3)]'}
                    `}
                  >
                    <span className={`w-2 h-2 rounded-full ${(agentStatus !== 'idle' && agentStatus !== 'error') ? 'bg-red-500 animate-pulse' : 'bg-neon-blue'}`}></span>
                    {(agentStatus !== 'idle' && agentStatus !== 'error') ? 'إنهاء المحادثة' : 'اتصل بالوكيل الصوتي'}
                  </button>
               </div>
            </div>

            {/* Chat (Right in LTR, Left in RTL) */}
            <div className="w-full lg:w-[450px] flex flex-col h-[500px] lg:h-full bg-black/40 border border-white/10 rounded-2xl glass-panel overflow-hidden">
               <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                 <span className="text-sm font-bold text-gray-400">المحادثة الحية / النص</span>
                 <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                 {chatMessages.map((msg) => (
                   <div 
                     key={msg.id} 
                     className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                   >
                     <div 
                       className={`
                         max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                         ${msg.role === 'user' 
                           ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-tr-sm' 
                           : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'}
                       `}
                     >
                       {msg.text}
                     </div>
                     <span className="text-[10px] text-gray-600 mt-1 px-1">
                       {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                   </div>
                 ))}
                 {isChatLoading && (
                   <div className="flex items-start">
                      <div className="bg-white/10 text-gray-200 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                   </div>
                 )}
                 <div ref={messagesEndRef} />
               </div>

               <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/20">
                 <div className="relative">
                   <input 
                     type="text" 
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     placeholder={`أرسل رسالة إلى ${config.name}...`}
                     className="w-full bg-black/40 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-sm focus:border-neon-blue focus:outline-none transition-colors text-white text-right placeholder-gray-500"
                   />
                   <button 
                     type="submit"
                     disabled={!chatInput.trim() || isChatLoading}
                     className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-neon-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     <svg className="w-5 h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                   </button>
                 </div>
               </form>
            </div>

          </div>
        )}
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export default App;