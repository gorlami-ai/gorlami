import OpenAI from 'openai';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export class OpenAIService {
  private client: OpenAI;
  private readonly deploymentName = 'gpt-4o-mini';
  private readonly apiVersion = '2025-01-01-preview';
  private readonly defaultTemperature = 0.3;
  private readonly defaultMaxTokens = 2000;
  private readonly enhancementTemperature = 0.3;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.AZURE_OPENAI_API_KEY,
      baseURL: `${env.AZURE_OPENAI_ENDPOINT_URL}/openai/deployments/${this.deploymentName}`,
      defaultQuery: { 'api-version': this.apiVersion },
      defaultHeaders: { 'api-key': env.AZURE_OPENAI_API_KEY },
    });
  }

  async processText(
    text: string,
    instruction: string = 'Improve clarity and formatting',
    temperature: number = this.defaultTemperature,
    maxTokens: number = this.defaultMaxTokens
  ): Promise<{ content: string; totalTokens: number | undefined }> {
    const response = await this.client.chat.completions.create({
      model: this.deploymentName,
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
    const startTime = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.deploymentName,
      messages: [
        {
          role: 'system',
          content:
            'Improve the following transcribed text for clarity and fix any grammar issues. Keep the meaning intact. Ensure good formatting and readability.',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      temperature: this.enhancementTemperature,
    });

    const apiTime = Date.now() - startTime;
    logger.info(
      {
        apiResponseTime: apiTime,
        inputLength: transcript.length,
        outputLength: response.choices[0].message.content?.length || 0,
        tokens: response.usage?.total_tokens,
      },
      'OpenAI enhancement API response time'
    );

    return {
      content: response.choices[0].message.content || '',
      totalTokens: response.usage?.total_tokens,
    };
  }
}

export const openaiService = new OpenAIService();
