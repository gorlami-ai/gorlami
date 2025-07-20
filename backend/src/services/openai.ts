import OpenAI from 'openai';
import { env } from '../config/env.js';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.AZURE_OPENAI_API_KEY,
      baseURL: `${env.AZURE_OPENAI_ENDPOINT_URL}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': env.OPENAI_API_VERSION },
      defaultHeaders: { 'api-key': env.AZURE_OPENAI_API_KEY },
    });
  }

  async processText(
    text: string,
    instruction: string = 'Improve clarity and formatting',
    temperature: number = env.OPENAI_TEMPERATURE,
    maxTokens: number = env.OPENAI_MAX_TOKENS
  ): Promise<{ content: string; totalTokens: number | undefined }> {
    const response = await this.client.chat.completions.create({
      model: env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. ${instruction}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0].message.content || '',
      totalTokens: response.usage?.total_tokens,
    };
  }

  async enhanceTranscription(
    transcript: string
  ): Promise<{ content: string; totalTokens: number | undefined }> {
    const response = await this.client.chat.completions.create({
      model: env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        {
          role: 'system',
          content: 'Improve the following transcribed text for clarity and fix any grammar issues. Keep the meaning intact.',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      temperature: env.OPENAI_ENHANCEMENT_TEMPERATURE,
      max_tokens: env.OPENAI_ENHANCEMENT_MAX_TOKENS,
    });

    return {
      content: response.choices[0].message.content || '',
      totalTokens: response.usage?.total_tokens,
    };
  }
}

export const openaiService = new OpenAIService();