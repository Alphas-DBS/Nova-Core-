-- Enterprise AI Sales Agent Platform Schema

-- 1. Tenants (Multi-tenancy Core)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
    branding JSONB DEFAULT '{
        "logoUrl": null,
        "primaryColor": "#00f3ff",
        "whiteLabelName": "NovaAgent"
    }',
    subscription JSONB DEFAULT '{
        "tier": "Starter",
        "expiresAt": null,
        "limits": {
            "conversations": 100,
            "tokens": 50000,
            "voiceMinutes": 30
        }
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Agent Configs (Linked to Tenant)
CREATE TABLE agent_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    is_white_label BOOLEAN DEFAULT FALSE,
    custom_domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Leads (Linked to Tenant)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT,
    company TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Closed')),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sentiment TEXT DEFAULT 'Neutral' CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
    phone TEXT,
    interested_in TEXT,
    notes TEXT,
    intent_score INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 0,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sessions (Linked to Tenant)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    transcript JSONB DEFAULT '[]',
    audio_url TEXT,
    analytics JSONB DEFAULT '{
        "dropOffDetected": false,
        "objectionPatterns": [],
        "upsellOpportunities": [],
        "buyingIntentScore": 0,
        "hesitationDetected": false
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Usage Logs (For Billing & Analytics)
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('conversation', 'token', 'voice_minute')),
    amount INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AI Training Data (Knowledge Base)
CREATE TABLE training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT, -- Extracted text from PDF/CSV
    file_url TEXT,
    type TEXT CHECK (type IN ('pdf', 'csv', 'doc', 'url')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Simplified for demo, usually would check auth.uid())
CREATE POLICY "Tenants are viewable by owners" ON tenants FOR SELECT USING (true);
CREATE POLICY "Configs are viewable by tenant" ON agent_configs FOR SELECT USING (true);
CREATE POLICY "Leads are viewable by tenant" ON leads FOR SELECT USING (true);
CREATE POLICY "Sessions are viewable by tenant" ON sessions FOR SELECT USING (true);
