/**
 * Batch AI request processing
 * 
 * 批量 AI 请求处理，提升性能
 */

import OpenAI from 'openai';
import { withRetry, AI_API_RETRY_OPTIONS } from './retry.js';

export interface BatchAIRequest {
  id: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  model: string;
  temperature?: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}

export interface BatchAIResponse {
  id: string;
  content: string | null;
  error?: Error;
}

/**
 * 批量 AI 请求处理器
 */
export class BatchAIProcessor {
  private queue: Array<{ request: BatchAIRequest; resolve: (value: BatchAIResponse) => void; reject: (error: Error) => void }> = [];
  private processing = false;
  private batchSize: number;
  private flushIntervalMs: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private openai: OpenAI,
    options: {
      batchSize?: number;        // 批量大小（默认：10）
      flushIntervalMs?: number;  // 刷新间隔（默认：100ms）
    } = {}
  ) {
    this.batchSize = options.batchSize || 10;
    this.flushIntervalMs = options.flushIntervalMs || 100;
  }

  /**
   * 添加请求到队列
   */
  async addRequest(request: BatchAIRequest): Promise<BatchAIResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      // 如果队列达到批量大小，立即处理
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.processing && !this.flushTimer) {
        // 否则设置定时器，在间隔后处理
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          this.processBatch();
        }, this.flushIntervalMs);
      }
    });
  }

  /**
   * 处理批量请求
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    // 清除定时器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // 取出批量请求
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      // 并行处理批量请求
      const results = await Promise.allSettled(
        batch.map(async ({ request }) => {
          try {
            const completion = await withRetry(
              async () => {
                return await this.openai.chat.completions.create({
                  model: request.model,
                  messages: request.messages,
                  temperature: request.temperature ?? 0.1,
                  response_format: request.responseFormat,
                });
              },
              {
                ...AI_API_RETRY_OPTIONS,
                onRetry: (attempt: number, error: Error) => {
                  console.warn(`[BatchAI] Retry attempt ${attempt} for request ${request.id}: ${error.message}`);
                }
              }
            );

            const content = completion.choices[0]?.message?.content;
            return {
              id: request.id,
              content,
              error: undefined
            } as BatchAIResponse;
          } catch (error) {
            return {
              id: request.id,
              content: null,
              error: error instanceof Error ? error : new Error(String(error))
            } as BatchAIResponse;
          }
        })
      );

      // 处理结果
      results.forEach((result, index) => {
        const { resolve, reject } = batch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // 批量处理失败，拒绝所有请求
      batch.forEach(({ reject }) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    } finally {
      this.processing = false;

      // 如果队列中还有请求，继续处理
      if (this.queue.length > 0) {
        if (this.queue.length >= this.batchSize) {
          this.processBatch();
        } else {
          this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            this.processBatch();
          }, this.flushIntervalMs);
        }
      }
    }
  }

  /**
   * 强制刷新队列（处理所有待处理的请求）
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    while (this.queue.length > 0 || this.processing) {
      if (!this.processing) {
        await this.processBatch();
      }
      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
  }
}
