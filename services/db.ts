import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AgentConfig, Lead, Session, Message } from '../types';

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

export const db = {
  // --- Agent Configuration ---
  
  async getAgentConfig(): Promise<AgentConfig | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('agent_configs')
          .select('config')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data?.config) return data.config as AgentConfig;
        return null; 
      } catch (e: any) {
        console.warn('Supabase config fetch failed (using local fallback):', e.message || e);
      }
    }
    return getLocal<AgentConfig | null>(LOCAL_CONFIG_KEY, null);
  },

  async saveAgentConfig(config: AgentConfig): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase.from('agent_configs').select('id').limit(1);
        let result;
        if (existing && existing.length > 0) {
          result = await supabase
            .from('agent_configs')
            .update({ config, updated_at: new Date() })
            .eq('id', existing[0].id);
        } else {
          result = await supabase
            .from('agent_configs')
            .insert([{ config }]);
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

  async getLeads(): Promise<Lead[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((row: any) => ({
          id: row.id,
          name: row.name,
          company: row.company,
          status: row.status,
          lastInteraction: row.last_interaction,
          sentiment: row.sentiment,
          phone: row.phone,
          interestedIn: row.interested_in,
          notes: row.notes
        })) as Lead[];
      } catch (e: any) {
        console.warn('Supabase leads fetch failed (using local fallback):', e.message || e);
      }
    }
    return getLocal<Lead[]>(LOCAL_LEADS_KEY, []);
  },

  async createLead(lead: Omit<Lead, 'id'>): Promise<Lead | null> {
    let createdLead: Lead | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert([{
            name: lead.name,
            company: lead.company,
            status: lead.status,
            last_interaction: lead.lastInteraction,
            sentiment: lead.sentiment,
            phone: lead.phone,
            interested_in: lead.interestedIn,
            notes: lead.notes
          }])
          .select()
          .single();

        if (error) throw error;
        createdLead = {
          id: data.id,
          name: data.name,
          company: data.company,
          status: data.status,
          lastInteraction: data.last_interaction,
          sentiment: data.sentiment,
          phone: data.phone,
          interestedIn: data.interested_in,
          notes: data.notes
        };
      } catch (e: any) {
        console.warn('Supabase create lead failed:', e.message || e);
      }
    }
    if (!createdLead) {
      createdLead = { ...lead, id: Date.now().toString() };
    }
    const currentLocal = getLocal<Lead[]>(LOCAL_LEADS_KEY, []);
    setLocal(LOCAL_LEADS_KEY, [createdLead, ...currentLocal]);
    return createdLead;
  },

  async updateLead(id: string, updates: Partial<Lead>) {
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
          id: row.id,
          leadId: row.lead_id,
          createdAt: row.created_at,
          transcript: row.transcript || [],
          audioUrl: row.audio_url // Correctly mapped from DB
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
  
  async createSession(leadId: string): Promise<Session | null> {
    let createdSession: Session | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .insert([{ lead_id: leadId, transcript: [] }])
          .select()
          .single();
        
        if (error) throw error;
        createdSession = {
          id: data.id,
          leadId: data.lead_id,
          createdAt: data.created_at,
          transcript: data.transcript || []
        };
      } catch (e: any) {
        console.warn('Supabase create session failed:', e);
      }
    }
    
    // Local Fallback
    if (!createdSession) {
      createdSession = {
        id: Date.now().toString(),
        leadId,
        createdAt: new Date().toISOString(),
        transcript: []
      };
    }
    const sessions = getLocal<Session[]>(LOCAL_SESSIONS_KEY, []);
    setLocal(LOCAL_SESSIONS_KEY, [createdSession, ...sessions]);
    return createdSession;
  },

  async updateSessionTranscript(sessionId: string, transcript: Message[]) {
    // Map dates to strings for JSON storage
    const serializableTranscript = transcript.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp
    }));

    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) {
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