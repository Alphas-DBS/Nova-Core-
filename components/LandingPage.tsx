
import React from 'react';
import { LandingPageConfig } from '../types';

interface LandingPageProps {
  config: LandingPageConfig;
  onStartDemo: () => void;
  logoUrl?: string;
  companyName: string;
}

// Helper to add opacity to hex color
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const LandingPage: React.FC<LandingPageProps> = ({ config, onStartDemo, logoUrl, companyName }) => {
  const primaryColor = config.primaryColor || '#00f3ff';
  const fontFamily = config.fontFamily === 'Mono' ? 'monospace' : 
                     config.fontFamily === 'Cairo' ? '"Cairo", sans-serif' : 
                     '"Inter", sans-serif';

  return (
    <div 
      className="w-full relative"
      style={{ fontFamily: fontFamily }}
    >
      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="max-w-4xl space-y-8 relative z-10 animate-float">
          {logoUrl && (
             <img 
               src={logoUrl} 
               alt={companyName} 
               className="w-20 h-20 mx-auto object-contain mb-4" 
               style={{ filter: `drop-shadow(0 0 20px ${hexToRgba(primaryColor, 0.3)})` }}
             />
          )}
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-600 pb-2">
            {config.heroHeadline}
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            {config.heroSubheadline}
          </p>
          <div className="pt-8">
            <button 
              onClick={onStartDemo}
              className="group relative px-10 py-5 text-black font-bold text-lg rounded-full overflow-hidden transition-all hover:scale-105"
              style={{ 
                backgroundColor: primaryColor,
                boxShadow: `0 0 20px ${hexToRgba(primaryColor, 0.2)}`
              }}
            >
              <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center gap-3">
                {config.heroCtaText}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
            </button>
            <p className="mt-4 text-xs text-gray-500 uppercase tracking-widest">Voice Interaction • Real-time AI</p>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="py-12 border-y border-white/5 bg-black/40 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10"></div>
        
        <div className="flex overflow-hidden group">
          <div className="flex space-x-16 animate-marquee whitespace-nowrap py-4">
             {[...config.partnerLogos, ...config.partnerLogos, ...config.partnerLogos].map((logo, idx) => (
               <div key={`${logo.id}-${idx}`} className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  {logo.url.startsWith('http') ? (
                    <img src={logo.url} alt={logo.name} className="h-8 md:h-10 object-contain" />
                  ) : (
                    <span className="text-xl font-bold font-mono">{logo.name}</span>
                  )}
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
         <h2 className="text-3xl font-bold text-center mb-16 text-white">
           <span style={{ color: primaryColor }}>Capabilities</span> & Features
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {config.features.map((feature) => (
              <div 
                key={feature.id} 
                className="group p-8 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = hexToRgba(primaryColor, 0.5); }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                 <div className="text-4xl mb-6 bg-black/40 w-16 h-16 flex items-center justify-center rounded-xl border border-white/10 group-hover:scale-110 transition-transform">{feature.icon}</div>
                 <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                 <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4" style={{ background: `linear-gradient(to bottom, transparent, ${hexToRgba(primaryColor, 0.05)})` }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-white">
            Client <span style={{ color: primaryColor }}>Success</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.testimonials.map((t) => (
              <div key={t.id} className="p-6 rounded-xl bg-black/40 border border-white/10 backdrop-blur relative">
                <div 
                  className="absolute -top-3 -left-3 text-4xl opacity-50"
                  style={{ color: primaryColor }}
                >"</div>
                <p className="text-lg text-gray-300 mb-6 relative z-10 italic">{t.quote}</p>
                <div className="flex items-center gap-4">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ 
                        backgroundColor: hexToRgba(primaryColor, 0.2),
                        color: primaryColor
                      }}
                    >
                      {t.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white">{t.name}</h4>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center">
         <button 
           onClick={onStartDemo}
           className="text-white border-b pb-1 transition-colors text-lg tracking-widest uppercase"
           style={{ 
             borderColor: primaryColor,
           }}
           onMouseEnter={(e) => { e.currentTarget.style.color = primaryColor; }}
           onMouseLeave={(e) => { e.currentTarget.style.color = 'white'; }}
         >
           Book Your Consultation Now
         </button>
      </section>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
