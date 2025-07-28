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
  providerResponse?: any;
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
    audioBuffer: ArrayBuffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResponse> {
    const formData = new FormData();

    // Send as Ogg Opus
    const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('audio', blob, 'audio.ogg');

    if (options.language) formData.append('language', options.language);
    if (options.model) formData.append('model', options.model);
    if (options.enhance !== undefined) formData.append('enhance', options.enhance.toString());

    return apiClient<TranscriptionResponse>('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
  },

  async uploadActivityAudio(activityId: string, opusBuffer: ArrayBuffer): Promise<void> {
    const formData = new FormData();
    const blob = new Blob([opusBuffer], { type: 'audio/ogg' });
    formData.append('audio', blob, 'audio.ogg');

    await apiClient(`/api/activities/${activityId}/audio`, {
      method: 'POST',
      body: formData,
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

  async getFileSignedUrl(fileId: string): Promise<{
    url: string;
    expiresIn: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }> {
    return apiClient(`/api/files/${fileId}/signed-url`, {
      method: 'GET',
    });
  },

  async deleteActivity(activityId: string): Promise<void> {
    await apiClient(`/api/activities/${activityId}`, {
      method: 'DELETE',
    });
  },
};
