/**
 * Calculate RMS (Root Mean Square) from audio data
 * This provides a more accurate representation of perceived loudness
 */
export function calculateRMS(audioData: number[]): number {
  if (!audioData || audioData.length === 0) return 0;
  
  // Calculate sum of squares
  let sumOfSquares = 0;
  for (let i = 0; i < audioData.length; i++) {
    sumOfSquares += audioData[i] * audioData[i];
  }
  
  // Calculate RMS
  const rms = Math.sqrt(sumOfSquares / audioData.length);
  
  // Normalize to 0-1 range (assuming 16-bit audio, max value is 32767)
  const normalized = rms / 32767;
  
  // Apply logarithmic scaling for better visual representation
  // This makes quiet sounds more visible while preventing loud sounds from maxing out
  const scaled = Math.log10(1 + normalized * 9) / Math.log10(10);
  
  return Math.min(1, Math.max(0, scaled));
}

/**
 * Smooth audio levels to prevent jittery animations
 */
export class AudioLevelSmoother {
  private history: number[] = [];
  private readonly historySize: number;
  private readonly attackTime: number;
  private readonly releaseTime: number;
  private lastLevel: number = 0;

  constructor(historySize = 5, attackTime = 0.1, releaseTime = 0.3) {
    this.historySize = historySize;
    this.attackTime = attackTime;
    this.releaseTime = releaseTime;
  }

  /**
   * Add a new audio level and get the smoothed result
   */
  addLevel(level: number): number {
    // Apply attack/release envelope
    const targetLevel = level;
    const difference = targetLevel - this.lastLevel;
    
    // Faster response when level is increasing (attack)
    // Slower response when level is decreasing (release)
    const smoothingFactor = difference > 0 ? this.attackTime : this.releaseTime;
    
    this.lastLevel += difference * smoothingFactor;
    
    // Add to history for additional smoothing
    this.history.push(this.lastLevel);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }
    
    // Calculate average of recent values
    const average = this.history.reduce((sum, val) => sum + val, 0) / this.history.length;
    
    return Math.min(1, Math.max(0, average));
  }

  /**
   * Reset the smoother
   */
  reset() {
    this.history = [];
    this.lastLevel = 0;
  }
}