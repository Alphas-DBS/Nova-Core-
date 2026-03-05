
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: 'Active' | 'Suspended' | 'Pending';
  branding: {
    logoUrl?: string;
    primaryColor: string;
    whiteLabelName: string;
  };
  subscription: {
    tier: 'Starter' | 'Pro' | 'Enterprise';
    expiresAt: string;
    limits: {
      conversations: number;
      tokens: number;
      voiceMinutes: number;
    };
  };
  createdAt: string;
}

export interface UsageStats {
  conversationsCount: number;
  tokensUsed: number;
  voiceMinutesUsed: number;
  revenueGenerated: number;
}

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  company: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
  lastInteraction: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  phone?: string;
  interestedIn?: string;
  notes?: string;
  intentScore: number; // 0-100
  qualityScore: number; // 0-100
  source?: string; // Traffic source
}

export interface Session {
  id: string;
  tenantId: string;
  leadId: string;
  createdAt: string;
  transcript: Message[];
  audioUrl?: string;
  analytics?: {
    dropOffDetected: boolean;
    objectionPatterns: string[];
    upsellOpportunities: string[];
    buyingIntentScore: number;
    hesitationDetected: boolean;
  };
}

export interface CompanyInfo {
  name: string;
  description: string;
  usp: string; // Unique Selling Proposition
  tone: string;
  authorizedBrands: string;
  yearsInBusiness: string;
  serviceLocations: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string;
  specs: string;
  priceRange: string;
  stockStatus: string;
}

export interface Persona {
  id: string;
  name: string;
  jobTitle: string;
  painPoints: string;
  motivations: string;
}

export interface SalesScripts {
  hooks: { short: string; medium: string; long: string; formal: string; casual: string };
  pitches: { cold: string; warm: string; b2b: string; b2c: string; showroom: string };
  closing: { priceJustification: string; urgency: string; discount: string; objectionHandling: string };
}

export interface ObjectionHandler {
  id: string;
  objection: string;
  answer: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SalesProcess {
  leadQualificationRules: string;
  discoveryQuestions: string;
  followUpStrategy: string;
  humanEscalationTrigger: string;
  bookingLink?: string;
}

export interface PricingOffer {
  standardPricing: string;
  volumeDiscounts: string;
  seasonalOffers: string;
}

export interface AgentDoc {
  id: string;
  title: string;
  url: string;
}

export interface ToneConfig {
  style: string;
  sentenceLength: 'Short' | 'Medium' | 'Long';
  allowEmoji: boolean;
  languageMix: 'Arabic' | 'English' | 'Mix' | 'Khaliji';
  technicalLevel: 'Low' | 'Medium' | 'High';
  persuasionLevel: 'Low' | 'Medium' | 'High';
}

// Landing Page Types
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
}

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or short text
}

export interface PartnerLogo {
  id: string;
  name: string;
  url: string;
}

export interface LandingPageConfig {
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaText: string;
  features: LandingFeature[];
  testimonials: Testimonial[];
  partnerLogos: PartnerLogo[];
  primaryColor: string;
  fontFamily: 'Inter' | 'Cairo' | 'Mono';
}

export interface AgentConfig {
  id?: string;
  tenantId: string;
  // Core Identifiers
  name: string;
  logoUrl?: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  systemInstruction: string; // The compiled prompt
  language: 'en-US' | 'ar-EG';
  companyName: string; // Kept for backward compat/simple access
  
  // Enterprise Modules
  isWhiteLabel: boolean;
  customDomain?: string;

  // New Management Modules
  companyInfo: CompanyInfo;
  products: Product[];
  personas: Persona[];
  scripts: SalesScripts;
  objections: ObjectionHandler[];
  faqs: FAQ[];
  process: SalesProcess;
  pricing: PricingOffer;
  documents: AgentDoc[];
  tone: ToneConfig;
  
  // Landing Page Module
  landingPage: LandingPageConfig;
}

export enum AppMode {
  LANDING = 'LANDING',
  ADMIN = 'ADMIN',
  AGENT_VIEW = 'AGENT_VIEW',
  SAAS_ADMIN = 'SAAS_ADMIN'
}

export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
