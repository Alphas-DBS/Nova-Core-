import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { AgentConfig, AgentStatus, Lead } from "../types";

// Helper to retrieve API Key compatibly across environments (Node/Vite/Vercel)
const getApiKey = (): string => {
  // 1. Check process.env (Standard)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Check import.meta.env (Vite/Vercel)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  return '';
};

// Audio Helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Tool Definition for updating lead info
const updateLeadTool: FunctionDeclaration = {
  name: 'update_lead',
  description: 'Update the current lead information (phone, interest, notes, etc) based on the conversation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      phone: { type: Type.STRING, description: 'The phone number of the lead if provided.' },
      interestedIn: { type: Type.STRING, description: 'The product or service the lead is interested in.' },
      notes: { type: Type.STRING, description: 'Important notes, requirements, or summary of the lead.' },
      sentiment: { type: Type.STRING, description: 'The sentiment of the conversation: Positive, Neutral, or Negative.' },
      status: { type: Type.STRING, description: 'The status of the lead: Contacted, Qualified, Closed.' }
    },
    required: [] // Explicitly optional to avoid schema validation errors
  }
};

export class LiveClient {
  private ai: GoogleGenAI;
  private config: AgentConfig;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private stream: MediaStream | null = null;
  private sessionPromise: Promise<any> | null = null;
  private outputVolumeInterval: number | null = null;
  private currentStatus: AgentStatus = 'idle';
  private lastUserInteraction: number = 0;
  private hasSpokenOnce: boolean = false;
  
  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Accumulate partial transcripts
  private currentInputTranscription: string = '';
  private currentOutputTranscription: string = '';

  public onVolumeUpdate: ((vol: number) => void) | null = null;
  public onStatusChange: ((status: AgentStatus) => void) | null = null;
  public onTranscript: ((text: string, role: 'user' | 'model') => void) | null = null;
  public onLeadUpdate: ((updates: Partial<Lead>) => void) | null = null;
  public onAudioRecord: ((blob: Blob) => void) | null = null;

  constructor(config: AgentConfig) {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("API_KEY not found in environment variables");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
  }

  private setStatus(status: AgentStatus) {
    if (this.currentStatus === 'error' && status !== 'idle' && status !== 'connecting') return;
    this.currentStatus = status;
    if (this.onStatusChange) this.onStatusChange(status);
  }

  async connect() {
    // Ensure clean state before connecting
    await this.disconnect();

    this.setStatus('connecting');
    this.audioChunks = [];

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      this.outputNode = this.outputAudioContext.createGain();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioContext.destination);

      // --- Setup Recording ---
      const recDest = this.outputAudioContext.createMediaStreamDestination();
      // Connect Model Audio to Recorder
      this.outputNode.connect(recDest);
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect User Mic to Recorder (Using output context to match sample rate/clock)
      const micSourceForRec = this.outputAudioContext.createMediaStreamSource(this.stream);
      micSourceForRec.connect(recDest);

      try {
        // Explicitly check for supported MIME types for recording
        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined') {
             if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                 mimeType = 'audio/webm;codecs=opus';
             } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                 mimeType = 'audio/mp4';
             } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                 mimeType = 'audio/webm';
             }
        }

        console.log("Initializing MediaRecorder with mimeType:", mimeType);
        this.mediaRecorder = new MediaRecorder(recDest.stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
        };
        this.mediaRecorder.start();
      } catch (e) {
        console.warn("MediaRecorder failed to start", e);
      }
      // -----------------------

      // Setup Connection Loop with Retry
      const connectWithRetry = async (retries = 3): Promise<any> => {
        try {
          return await this.ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
              onopen: () => {
                console.log("Live API Connected");
                this.setStatus('listening');
                this.startAudioInput();
                this.startOutputVolumeMonitoring();
              },
              onmessage: async (message: LiveServerMessage) => {
                this.handleMessage(message);
              },
              onerror: (e) => {
                console.error("Live API Error:", e);
                this.setStatus('error');
                this.disconnect();
              },
              onclose: () => {
                console.log("Live API Closed");
                this.setStatus('idle');
              }
            },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: this.config.voiceName } },
              },
              systemInstruction: this.config.systemInstruction,
              inputAudioTranscription: { },
              outputAudioTranscription: { },
              tools: [{ functionDeclarations: [updateLeadTool] }]
            }
          });
        } catch (e: any) {
          if (retries > 0 && (e.message?.includes('unavailable') || e.status === 503)) {
            console.warn(`Connection failed (Unavailable), retrying... (${retries} attempts left)`);
            await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s before retry
            return connectWithRetry(retries - 1);
          }
          throw e;
        }
      };

      this.sessionPromise = connectWithRetry();
      
      // Await connection to catch immediate errors
      await this.sessionPromise;

    } catch (e) {
      console.error("Connection failed fully", e);
      this.setStatus('error');
      // Ensure we clean up if initial connection failed
      this.disconnect();
    }
  }

  private startOutputVolumeMonitoring() {
    if (this.outputVolumeInterval) clearInterval(this.outputVolumeInterval);
    const dataArray = new Uint8Array(this.outputAnalyser!.frequencyBinCount);
    this.outputVolumeInterval = window.setInterval(() => {
      if (this.currentStatus === 'speaking' && this.outputAnalyser && this.onVolumeUpdate) {
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        this.onVolumeUpdate(average / 128.0);
      }
    }, 50);
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.inputNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.inputNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      
      if (this.currentStatus !== 'speaking' && this.onVolumeUpdate) {
        this.onVolumeUpdate(rms * 5);
      }

      if (rms > 0.02) {
        this.lastUserInteraction = Date.now();
        this.hasSpokenOnce = true;
        if (this.currentStatus !== 'listening' && this.currentStatus !== 'speaking') {
           this.setStatus('listening');
        }
      } else if (this.currentStatus === 'listening' && this.hasSpokenOnce) {
        const timeSinceSpeech = Date.now() - this.lastUserInteraction;
        if (timeSinceSpeech > 800 && timeSinceSpeech < 3000) {
           this.setStatus('processing');
        }
      }

      const pcmBlob = createBlob(inputData);
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.inputNode);
    this.inputNode.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'update_lead' && this.onLeadUpdate) {
           console.log("Agent updating lead:", fc.args);
           this.onLeadUpdate(fc.args as Partial<Lead>);
           
           this.sessionPromise?.then(session => {
              session.sendToolResponse({
                functionResponses: [{
                  id: fc.id,
                  name: fc.name,
                  response: { result: "Lead updated successfully." }
                }]
              });
           });
        }
      }
    }

    if (message.serverContent?.outputTranscription?.text) {
      this.currentOutputTranscription += message.serverContent.outputTranscription.text;
    }
    if (message.serverContent?.inputTranscription?.text) {
      this.currentInputTranscription += message.serverContent.inputTranscription.text;
    }

    if (message.serverContent?.turnComplete) {
      if (this.currentInputTranscription.trim() && this.onTranscript) {
        this.onTranscript(this.currentInputTranscription, 'user');
        this.currentInputTranscription = '';
      }
      if (this.currentOutputTranscription.trim() && this.onTranscript) {
        this.onTranscript(this.currentOutputTranscription, 'model');
        this.currentOutputTranscription = '';
      }
    }

    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      if (this.currentStatus !== 'speaking') {
        this.setStatus('speaking');
      }
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.addEventListener('ended', () => {
        this.sources.delete(source);
        if (this.sources.size === 0) {
          this.setStatus('listening');
          this.lastUserInteraction = 0;
          this.hasSpokenOnce = false;
        }
      });
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
      this.sources.forEach(s => s.stop());
      this.sources.clear();
      this.nextStartTime = 0;
      this.setStatus('listening');
      this.lastUserInteraction = 0;
      this.hasSpokenOnce = false;
      this.currentOutputTranscription = '';
    }
  }

  async disconnect() {
    // 1. Close Session (Close WebSockets)
    if (this.sessionPromise) {
      try {
        const session = await this.sessionPromise.catch(() => null);
        if (session) {
          session.close();
        }
      } catch (e) {
        console.warn("Error closing session", e);
      }
      this.sessionPromise = null;
    }

    // 2. Stop Recorder and Save
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        // Wait briefly for onstop
        await new Promise<void>(resolve => {
            if (!this.mediaRecorder) return resolve();
            this.mediaRecorder.onstop = () => {
                // Ensure we use the correct mime type from the recorder
                const type = this.mediaRecorder?.mimeType || 'audio/webm';
                const blob = new Blob(this.audioChunks, { type });
                if (this.onAudioRecord && blob.size > 0) {
                    this.onAudioRecord(blob);
                }
                resolve();
            }
        });
    }

    if (this.outputVolumeInterval) {
      clearInterval(this.outputVolumeInterval);
      this.outputVolumeInterval = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    
    if (this.inputAudioContext) {
      if (this.inputAudioContext.state !== 'closed') {
        try {
          await this.inputAudioContext.close();
        } catch (e) {
          console.error("Error closing inputAudioContext", e);
        }
      }
      this.inputAudioContext = null;
    }
    
    if (this.outputAudioContext) {
      if (this.outputAudioContext.state !== 'closed') {
        try {
          await this.outputAudioContext.close();
        } catch (e) {
           console.error("Error closing outputAudioContext", e);
        }
      }
      this.outputAudioContext = null;
    }

    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.setStatus('idle');
  }
}