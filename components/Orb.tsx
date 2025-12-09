import React, { useEffect, useRef } from 'react';
import { AgentStatus } from '../types';

interface OrbProps {
  status: AgentStatus;
  volume: number; // 0 to 1
}

const Orb: React.FC<OrbProps> = ({ status, volume }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Determine dominant color based on status
  const getColor = () => {
    switch(status) {
      case 'speaking': return '#bc13fe'; // Neon Purple
      case 'listening': return '#00f3ff'; // Neon Blue
      case 'processing': return '#fbbf24'; // Amber/Gold
      case 'error': return '#ef4444'; // Red
      case 'connecting': return '#ffffff'; // White
      default: return '#00f3ff';
    }
  };

  const color = getColor();

  return (
    <div className="relative flex items-center justify-center w-80 h-80" ref={containerRef}>
      {/* Dynamic Ambient Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-500 ease-out"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity: status === 'speaking' ? 0.4 + (volume * 0.4) : 0.15,
          transform: status === 'speaking' ? `scale(${1 + volume})` : 'scale(1)'
        }}
      />

      {/* 3D Gyroscopic Rings */}
      <div className="absolute inset-0 flex items-center justify-center perspective-1000">
        {/* Ring 1 */}
        <div 
          className="absolute w-64 h-64 rounded-full border border-t-2 border-b-0 border-l-0 border-r-0 transition-all duration-500"
          style={{
            borderColor: color,
            opacity: 0.6,
            animation: status === 'processing' ? 'spin 1s linear infinite' : 'spin 8s linear infinite',
          }}
        />
        {/* Ring 2 (Rotated) */}
        <div 
          className="absolute w-56 h-56 rounded-full border border-r-2 border-l-0 border-t-0 border-b-0 transition-all duration-500"
          style={{
            borderColor: color,
            opacity: 0.5,
            animation: status === 'processing' ? 'reverse-spin 1s linear infinite' : 'reverse-spin 6s linear infinite',
            transform: 'rotateX(60deg)'
          }}
        />
        {/* Ring 3 (Inner) */}
        <div 
          className="absolute w-48 h-48 rounded-full border border-b-2 border-t-0 border-l-0 border-r-0 transition-all duration-500"
          style={{
            borderColor: color,
            opacity: 0.4,
            animation: 'spin 12s linear infinite',
            transform: 'rotateY(60deg)'
          }}
        />
      </div>

      {/* The Core Sphere - 3D Effect using Gradients */}
      <div 
        className="relative z-10 w-32 h-32 rounded-full transition-all duration-300 ease-out"
        style={{
          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, ${color} 40%, #000000 100%)`,
          boxShadow: `
            inset -10px -10px 20px rgba(0,0,0,0.8),
            0 0 20px ${color},
            0 0 40px ${color}40
          `,
          transform: status === 'speaking' ? `scale(${1 + (volume * 0.2)})` : 
                     status === 'processing' ? 'scale(0.95)' : 'scale(1)',
          animation: status === 'processing' ? 'pulse-fast 1s infinite' : 'none'
        }}
      >
        {/* Surface texture/reflection for glass look */}
        <div className="absolute top-2 left-4 w-12 h-6 bg-white opacity-20 blur-md rounded-[100%] rotate-[-45deg]"></div>
        
        {/* Inner Activity (only visible when processing/connecting) */}
        {(status === 'processing' || status === 'connecting') && (
          <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-pulse"></div>
        )}
      </div>

      {/* Status Label with tech styling - ARABIC */}
      <div className="absolute -bottom-12 flex flex-col items-center gap-1">
        <div 
          className="text-sm font-arabic font-bold transition-colors duration-300"
          style={{ color: color, textShadow: `0 0 10px ${color}` }}
        >
          {status === 'idle' && 'النظام جاهز'}
          {status === 'connecting' && 'جاري الاتصال...'}
          {status === 'listening' && 'بانتظار التحدث'}
          {status === 'processing' && 'جاري المعالجة...'}
          {status === 'speaking' && 'جاري التحدث'}
          {status === 'error' && 'خطأ في النظام'}
        </div>
        {/* Decorative line */}
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-50"></div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 1; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(0.92); }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};

export default Orb;