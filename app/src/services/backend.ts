import { apiClient } from './api';

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  enhance?: boolean;
}

export interface TranscriptionResponse {
  transcription: string;
  activityId: string;
  enhanced?: string;
}

export interface ProcessTextResponse {
  outputText: string;
  activityId: string;
  inputText: string;
  type: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface Activity {
  id: string;
  userId: string;
  type: 'TRANSCRIPTION' | 'AI_PROCESSING';
  inputText: string;
  outputText: string;
  fileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivitiesResponse {
  activities: Activity[];
  total: number;
  offset: number;
  limit: number;
}

export const backendService = {
  async transcribeAudio(
    pcmBuffer: ArrayBuffer,
    sampleRate: number = 16000,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResponse> {
    const formData = new FormData();
    
    // Create a blob from the PCM buffer with the correct MIME type
    const blob = new Blob([pcmBuffer], { type: 'audio/pcm' });
    formData.append('audio', blob, 'audio.pcm');
    
    if (options.language) formData.append('language', options.language);
    if (options.model) formData.append('model', options.model);
    if (options.enhance !== undefined) formData.append('enhance', options.enhance.toString());
    
    // Add sample rate as a custom header
    return apiClient<TranscriptionResponse>('/api/transcribe', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Sample-Rate': sampleRate.toString(),
      },
    });
  },

  async processText(text: string, instruction: string): Promise<ProcessTextResponse> {
    return apiClient<ProcessTextResponse>('/api/process', {
      method: 'POST',
      body: JSON.stringify({ text, instruction }),
    });
  },

  async getActivities(page: number = 1, limit: number = 20): Promise<ActivitiesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return apiClient<ActivitiesResponse>(`/api/activities?${params}`);
  },

  async getActivity(id: string): Promise<Activity> {
    return apiClient<Activity>(`/api/activities/${id}`);
  },

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await apiClient<Response>(`/api/files/${fileId}`, {
      method: 'GET',
    });
    
    return response.blob();
  },

  async deleteActivity(activityId: string): Promise<void> {
    await apiClient(`/api/activities/${activityId}`, {
      method: 'DELETE',
    });
  },
};