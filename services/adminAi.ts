import { GoogleGenAI } from "@google/genai";
import { Session, Message } from "../types";

const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) return process.env.API_KEY;
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  return '';
};

export const adminAi = {
  async analyzeSession(session: Session): Promise<Session['analytics']> {
    const apiKey = getApiKey();
    if (!apiKey) return session.analytics;

    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const transcriptText = session.transcript.map(m => `${m.role}: ${m.text}`).join('\n');

    const prompt = `
      Analyze the following sales conversation transcript and provide strategic insights.
      
      TRANSCRIPT:
      ${transcriptText}
      
      OUTPUT FORMAT (JSON):
      {
        "dropOffDetected": boolean,
        "objectionPatterns": string[],
        "upsellOpportunities": string[],
        "buyingIntentScore": number (0-100),
        "hesitationDetected": boolean
      }
    `;

    try {
      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        dropOffDetected: !!result.dropOffDetected,
        objectionPatterns: result.objectionPatterns || [],
        upsellOpportunities: result.upsellOpportunities || [],
        buyingIntentScore: result.buyingIntentScore || 0,
        hesitationDetected: !!result.hesitationDetected
      };
    } catch (e) {
      console.error("Admin AI analysis failed:", e);
      return session.analytics;
    }
  },

  async suggestImprovements(sessions: Session[]): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey || sessions.length === 0) return "Not enough data for suggestions.";

    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const analyticsSummary = sessions.map(s => JSON.stringify(s.analytics)).join('\n');

    const prompt = `
      Based on the following session analytics summaries, suggest 3 specific improvements to the sales script or agent behavior to increase conversion rates.
      
      ANALYTICS:
      ${analyticsSummary}
      
      Provide a concise, professional report.
    `;

    try {
      const response = await genAI.models.generateContent({
        model,
        contents: prompt
      });
      return response.text || "No suggestions generated.";
    } catch (e) {
      console.error("Admin AI suggestions failed:", e);
      return "Error generating suggestions.";
    }
  }
};
