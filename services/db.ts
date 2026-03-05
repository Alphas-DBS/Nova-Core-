import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AgentConfig, Lead, Session, Message, Tenant } from '../types';

// Storage Keys for Fallback Mode
const LOCAL_CONFIG_KEY = 'nova_agent_config';
const LOCAL_LEADS_KEY = 'nova_agent_leads';
const LOCAL_SESSIONS_KEY = 'nova_agent_sessions';

// Helper to safely get local storage data
const getLocal = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    console.warn(`Failed to parse local storage for ${key}`, e);
    return defaultVal;
  }
};

const setLocal = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save to local storage for ${key}`, e);
  }
};

// UUID Validator
const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const db = {
  // --- Tenant Management ---
  async getTenant(id: string): Promise<Tenant | null> {
    if (isSupabaseConfigured && isValidUUID(id)) {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single();
      if (error) return null;
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.owner_id,
        status: data.status,
        branding: data.branding,
        subscription: data.subscription,
        createdAt: data.created_at
      } as Tenant;
    }
    return null;
  },

  // --- Agent Configuration ---
  
  async getAgentConfig(tenantId?: string): Promise<AgentConfig | null> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('agent_configs').select('config, tenant_id, id');
        if (tenantId && isValidUUID(tenantId)) {
          query = query.eq('tenant_id', tenantId);
        }
        const { data, error } = await query.limit(1).maybeSingle();

        if (error) throw error;
        if (data?.config) {
          return { 
            ...(data.config as AgentConfig), 
            tenantId: data.tenant_id,
            id: data.id 
          };
        }
        return null; 
      } catch (e: any) {
        console.warn('Supabase config fetch failed:', e.message || e);
      }
    }
    return getLocal<AgentConfig | null>(LOCAL_CONFIG_KEY, null);
  },

  async saveAgentConfig(config: AgentConfig): Promise<boolean> {
    if (isSupabaseConfigured && config.tenantId) {
      try {
        const { data: existing } = await supabase
          .from('agent_configs')
          .select('id')
          .eq('tenant_id', config.tenantId)
          .limit(1);

        let result;
        if (existing && existing.length > 0) {
          result = await supabase
            .from('agent_configs')
            .update({ config, updated_at: new Date() })
            .eq('id', existing[0].id);
        } else {
          result = await supabase
            .from('agent_configs')
            .insert([{ config, tenant_id: config.tenantId }]);
        }
        if (result.error) throw result.error;
      } catch (e: any) {
        console.warn('Supabase save config failed:', e.message || e);
      }
    }
    setLocal(LOCAL_CONFIG_KEY, config);
    return true;
  },

  // --- Leads ---

  async getLeads(tenantId?: string): Promise<Lead[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('leads').select('*');
        if (tenantId && isValidUUID(tenantId)) {
          query = query.eq('tenant_id', tenantId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          company: row.company,
          status: row.status,
          lastInteraction: row.last_interaction,
          sentiment: row.sentiment,
          phone: row.phone,
          interestedIn: row.interested_in,
          notes: row.notes,
          intentScore: row.intent_score || 0,
          qualityScore: row.quality_score || 0,
          source: row.source
        })) as Lead[];
      } catch (e: any) {
        console.warn('Supabase leads fetch failed:', e.message || e);
      }
    }
    return getLocal<Lead[]>(LOCAL_LEADS_KEY, []);
  },

  async createLead(lead: Omit<Lead, 'id'>): Promise<Lead | null> {
    let createdLead: Lead | null = null;
    if (isSupabaseConfigured && lead.tenantId) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert([{
            tenant_id: lead.tenantId,
            name: lead.name,
            company: lead.company,
            status: lead.status,
            last_interaction: lead.lastInteraction,
            sentiment: lead.sentiment,
            phone: lead.phone,
            interested_in: lead.interestedIn,
            notes: lead.notes,
            intent_score: lead.intentScore,
            quality_score: lead.qualityScore,
            source: lead.source
          }])
          .select()
          .single();

        if (error) throw error;
        createdLead = {
          id: data.id,
          tenantId: data.tenant_id,
          name: data.name,
          company: data.company,
          status: data.status,
          lastInteraction: data.last_interaction,
          sentiment: data.sentiment,
          phone: data.phone,
          interestedIn: data.interested_in,
          notes: data.notes,
          intentScore: data.intent_score,
          qualityScore: data.quality_score,
          source: data.source
        };
      } catch (e: any) {
        console.warn('Supabase create lead failed:', e.message || e);
      }
    }
    if (!createdLead) {
      createdLead = { ...lead, id: Date.now().toString() } as Lead;
    }
    const currentLocal = getLocal<Lead[]>(LOCAL_LEADS_KEY, []);
    setLocal(LOCAL_LEADS_KEY, [createdLead, ...currentLocal]);
    return createdLead;
  },

  async updateLead(id: string, updates: Partial<Lead>) {
    if (isSupabaseConfigured && isValidUUID(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.company) dbUpdates.company = updates.company;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.lastInteraction) dbUpdates.last_interaction = updates.lastInteraction;
        if (updates.sentiment) dbUpdates.sentiment = updates.sentiment;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.interestedIn) dbUpdates.interested_in = updates.interestedIn;
        if (updates.notes) dbUpdates.notes = updates.notes;
        if (updates.intentScore !== undefined) dbUpdates.intent_score = updates.intentScore;
        if (updates.qualityScore !== undefined) dbUpdates.quality_score = updates.qualityScore;
        
        const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        console.warn('Supabase update lead failed:', e.message || e);
      }
    }
    const leads = getLocal<Lead[]>(LOCAL_LEADS_KEY, []);
    const updatedLeads = leads.map(l => l.id === id ? { ...l, ...updates } : l);
    setLocal(LOCAL_LEADS_KEY, updatedLeads);
  },

  async deleteLead(id: string) {
    if (isSupabaseConfigured && isValidUUID(id)) {
      try {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) throw error;
      } catch (e: any) {
        console.warn('Supabase delete lead failed:', e.message || e);
      }
    }
    const leads = getLocal<Lead[]>(LOCAL_LEADS_KEY, []);
    const filtered = leads.filter(l => l.id !== id);
    setLocal(LOCAL_LEADS_KEY, filtered);
  },

  // --- Sessions (Recording) ---
  
  async getSessions(leadId: string): Promise<Session[]> {
    if (isSupabaseConfigured && isValidUUID(leadId)) {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
          id: row.id,
          tenantId: row.tenant_id,
          leadId: row.lead_id,
          createdAt: row.created_at,
          transcript: row.transcript || [],
          audioUrl: row.audio_url,
          analytics: row.analytics
        })) as Session[];
      } catch (e: any) {
        console.warn('Supabase get sessions failed:', e);
      }
    }

    // Local Fallback
    const allSessions = getLocal<Session[]>(LOCAL_SESSIONS_KEY, []);
    return allSessions.filter(s => s.leadId === leadId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  
  async createSession(leadId: string, tenantId: string): Promise<Session | null> {
    let createdSession: Session | null = null;
    if (isSupabaseConfigured && isValidUUID(leadId) && isValidUUID(tenantId)) {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .insert([{ lead_id: leadId, tenant_id: tenantId, transcript: [] }])
          .select()
          .single();
        
        if (error) throw error;
        createdSession = {
          id: data.id,
          tenantId: data.tenant_id,
          leadId: data.lead_id,
          createdAt: data.created_at,
          transcript: data.transcript || [],
          analytics: data.analytics
        };
      } catch (e: any) {
        console.warn('Supabase create session failed:', e);
      }
    }
    
    // Local Fallback
    if (!createdSession) {
      createdSession = {
        id: Date.now().toString(),
        tenantId,
        leadId,
        createdAt: new Date().toISOString(),
        transcript: []
      };
    }
    const sessions = getLocal<Session[]>(LOCAL_SESSIONS_KEY, []);
    setLocal(LOCAL_SESSIONS_KEY, [createdSession, ...sessions]);
    return createdSession;
  },

  async updateSessionAnalytics(sessionId: string, analytics: Session['analytics']) {
    if (isSupabaseConfigured && isValidUUID(sessionId)) {
      await supabase.from('sessions').update({ analytics }).eq('id', sessionId);
    }
  },

  // --- Usage Tracking ---
  async logUsage(tenantId: string, type: 'conversation' | 'token' | 'voice_minute', amount: number, metadata?: any) {
    if (isSupabaseConfigured && isValidUUID(tenantId)) {
      await supabase.from('usage_logs').insert([{ tenant_id: tenantId, type, amount, metadata }]);
    }
  },

  async updateSessionTranscript(sessionId: string, transcript: Message[]) {
    // Map dates to strings for JSON storage
    const serializableTranscript = transcript.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp
    }));

    if (isSupabaseConfigured && isValidUUID(sessionId)) {
      try {
        const { error } = await supabase
          .from('sessions')
          .update({ transcript: serializableTranscript })
          .eq('id', sessionId);
        if (error) throw error;
      } catch (e: any) {
        console.warn('Supabase update session failed:', e);
      }
    }

    // Local Fallback
    const sessions = getLocal<Session[]>(LOCAL_SESSIONS_KEY, []);
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? { ...s, transcript } : s
    );
    setLocal(LOCAL_SESSIONS_KEY, updatedSessions);
  },

  async updateSessionAudio(sessionId: string, audioBlob: Blob) {
    if (isSupabaseConfigured && isValidUUID(sessionId)) {
      try {
        // Sanitize filename to avoid path issues
        const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
        
        // Determine extension safely
        let ext = 'webm';
        if (audioBlob.type.includes('mp4')) ext = 'mp4';
        else if (audioBlob.type.includes('wav')) ext = 'wav';
        else if (audioBlob.type.includes('ogg')) ext = 'ogg';
        
        // Add random suffix to ensure uniqueness (prevents overwrites and avoids need for upsert)
        const fileName = `${cleanSessionId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        
        console.log(`Uploading audio: ${fileName} (${audioBlob.type}, ${audioBlob.size} bytes)`);

        // 1. Upload to Supabase Storage 'recordings' bucket
        // We do NOT use upsert: true here to avoid strict RLS update policy requirements.
        // A simple INSERT policy is enough for new files.
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(fileName, audioBlob, {
            contentType: audioBlob.type || `audio/${ext}`,
          });

        if (uploadError) {
          // Log details (stringified to avoid [object Object])
          console.error("Supabase Storage Upload Error:", JSON.stringify(uploadError, null, 2));
          throw uploadError;
        }

        // 2. Get the Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('recordings')
          .getPublicUrl(fileName);

        // 3. Update the Session record with the URL
        const { error: dbError } = await supabase
          .from('sessions')
          .update({ audio_url: publicUrl })
          .eq('id', sessionId);

        if (dbError) {
          // Check if column error
          if (dbError.message.includes("Could not find the 'audio_url' column")) {
             console.error("CRITICAL: The 'sessions' table is missing the 'audio_url' column. Please run the SQL migration script.");
          } else {
             console.error("Database Update Error:", dbError);
          }
          throw dbError;
        }
        
        console.log("Audio saved to Supabase:", publicUrl);
        return publicUrl;
      } catch (e: any) {
        // Improved Error Logging
        console.error('Supabase audio upload sequence failed, falling back to local.', e.message || JSON.stringify(e));
      }
    }

    // Local Fallback (Base64)
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      
      const sessions = getLocal<Session[]>(LOCAL_SESSIONS_KEY, []);
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? { ...s, audioUrl: base64data } : s
      );
      setLocal(LOCAL_SESSIONS_KEY, updatedSessions);
    };
  }
};