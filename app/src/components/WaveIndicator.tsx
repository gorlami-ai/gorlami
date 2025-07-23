import { useMemo } from 'react';

interface WaveIndicatorProps {
  audioLevel: number; // 0-1 normalized
  isActive: boolean;
}

export function WaveIndicator({ audioLevel, isActive }: WaveIndicatorProps) {
  const bars = useMemo(() => {
    const barCount = 7;
    const centerIndex = Math.floor(barCount / 2);
    
    return Array.from({ length: barCount }, (_, i) => {
      // Calculate distance from center for wave effect
      const distanceFromCenter = Math.abs(i - centerIndex);
      const falloff = 1 - (distanceFromCenter / centerIndex) * 0.3;
      
      // Base height and amplitude
      const minHeight = 12;
      const maxAmplitude = 28;
      
      // Calculate height based on audio level and position
      const amplitude = audioLevel * maxAmplitude * falloff;
      const height = minHeight + amplitude;
      
      // Stagger animation delays for wave effect
      const delay = distanceFromCenter * 40;
      
      return {
        id: i,
        height,
        delay,
        falloff,
      };
    });
  }, [audioLevel]);

  if (!isActive) return null;

  return (
    <div className="relative flex items-center justify-center gap-[3px] h-10">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-blue-500/30 blur-xl animate-pulse" />
      
      {/* Wave bars */}
      {bars.map(({ id, height, delay, falloff }) => (
        <div
          key={id}
          className="relative w-[3px] rounded-full bg-gradient-to-t from-pink-400 via-purple-400 to-blue-400 transition-all duration-150 ease-out"
          style={{
            height: `${height}px`,
            transform: `scaleY(${isActive ? 1 : 0.3})`,
            transitionDelay: `${delay}ms`,
            opacity: 0.7 + falloff * 0.3,
          }}
        >
          {/* Inner glow for each bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-pink-300 via-purple-300 to-blue-300 rounded-full blur-[2px] opacity-60" />
        </div>
      ))}
      
      {/* Ripple effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
        <div className="absolute inset-0 rounded-full border border-white/10 animate-ping animation-delay-200" />
      </div>
    </div>
  );
}