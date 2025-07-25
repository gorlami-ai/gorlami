/**
 * Convert raw PCM audio data to WAV format
 * @param pcmData Raw PCM audio data
 * @param sampleRate Sample rate (default: 48000)
 * @returns WAV audio blob
 */
export function pcmToWav(pcmData: ArrayBuffer, sampleRate: number = 48000): Blob {
  const pcmLength = pcmData.byteLength;
  const wavBuffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(wavBuffer);
  
  // WAV header constants
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  
  // RIFF chunk descriptor
  const encoder = new TextEncoder();
  view.setUint8(0, encoder.encode('R')[0]);
  view.setUint8(1, encoder.encode('I')[0]);
  view.setUint8(2, encoder.encode('F')[0]);
  view.setUint8(3, encoder.encode('F')[0]);
  view.setUint32(4, 36 + pcmLength, true); // File size - 8
  view.setUint8(8, encoder.encode('W')[0]);
  view.setUint8(9, encoder.encode('A')[0]);
  view.setUint8(10, encoder.encode('V')[0]);
  view.setUint8(11, encoder.encode('E')[0]);
  
  // fmt sub-chunk
  view.setUint8(12, encoder.encode('f')[0]);
  view.setUint8(13, encoder.encode('m')[0]);
  view.setUint8(14, encoder.encode('t')[0]);
  view.setUint8(15, encoder.encode(' ')[0]);
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data sub-chunk
  view.setUint8(36, encoder.encode('d')[0]);
  view.setUint8(37, encoder.encode('a')[0]);
  view.setUint8(38, encoder.encode('t')[0]);
  view.setUint8(39, encoder.encode('a')[0]);
  view.setUint32(40, pcmLength, true);
  
  // Copy PCM data
  const pcmView = new Uint8Array(pcmData);
  const wavView = new Uint8Array(wavBuffer);
  wavView.set(pcmView, 44);
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Extract sample rate from activity's provider response
 * @param providerResponse The provider response from the activity
 * @returns Sample rate or default 48000
 */
export function extractSampleRate(providerResponse: any): number {
  try {
    if (providerResponse?.deepgram?.channels?.[0]?.alternatives?.[0]?.sampleRate) {
      return providerResponse.deepgram.channels[0].alternatives[0].sampleRate;
    }
  } catch (error) {
    console.warn('Failed to extract sample rate, using default', error);
  }
  return 48000; // Default sample rate
}