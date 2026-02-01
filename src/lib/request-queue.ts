/**
 * Request Queue & Batch Processing
 * 
 * 请求队列和批处理模块
 * - 管理并发请求队列
 * - 批处理相似请求
 * - 请求去重
 * - 优先级调度
 */

export interface QueuedRequest<T> {
  id: string;
  priority: number; // 0 = highest, higher = lower priority
  timestamp: number;
  data: T;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class RequestQueue<T = any> {
  private queue: QueuedRequest<T>[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number;
  private batchSize: number;
  private batchDelay: number; // ms
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(options: {
    maxConcurrent?: number;
    batchSize?: number;
    batchDelay?: number;
  } = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 5;
    this.batchSize = options.batchSize ?? 10;
    this.batchDelay = options.batchDelay ?? 100;
  }

  /**
   * 添加请求到队列
   */
  async enqueue(
    id: string,
    data: T,
    priority: number = 5,
    processor: (items: T[]) => Promise<any[]>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        priority,
        timestamp: Date.now(),
        data,
        resolve,
        reject,
      });

      // 按优先级排序（优先级数字越小越优先）
      this.queue.sort((a, b) => a.priority - b.priority);

      // 触发处理
      this.process(processor);
    });
  }

  /**
   * 处理队列
   */
  private async process(processor: (items: T[]) => Promise<any[]>): Promise<void> {
    // 如果正在处理的数量达到上限，等待
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // 如果没有待处理的请求，清除定时器
    if (this.queue.length === 0) {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      return;
    }

    // 批处理：收集一批请求
    if (this.batchSize > 1 && this.queue.length < this.batchSize) {
      // 如果队列中的请求数量少于批处理大小，等待更多请求
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.batchTimer = null;
          this.process(processor);
        }, this.batchDelay);
      }
      return;
    }

    // 取出一批请求
    const batch: QueuedRequest<T>[] = [];
    const batchIds = new Set<string>();
    
    while (batch.length < this.batchSize && this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const item = this.queue.shift()!;
      batch.push(item);
      batchIds.add(item.id);
      this.processing.add(item.id);
    }

    if (batch.length === 0) {
      return;
    }

    // 异步处理批次
    processor(batch.map(item => item.data))
      .then((results) => {
        // 假设结果顺序与输入顺序一致
        batch.forEach((item, index) => {
          this.processing.delete(item.id);
          item.resolve(results[index]);
        });
      })
      .catch((error) => {
        batch.forEach((item) => {
          this.processing.delete(item.id);
          item.reject(error);
        });
      })
      .finally(() => {
        // 继续处理队列
        this.process(processor);
      });
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    queued: number;
    processing: number;
    total: number;
  } {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size,
    };
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue.forEach((item) => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

/**
 * 请求去重缓存
 */
export class RequestDeduplicator {
  private cache: Map<string, Promise<any>> = new Map();
  private ttl: number; // ms

  constructor(ttl: number = 5000) {
    this.ttl = ttl;
  }

  /**
   * 执行请求（带去重）
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // 检查是否有正在进行的相同请求
    const existing = this.cache.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // 创建新请求
    const promise = fn()
      .finally(() => {
        // TTL 后清除缓存
        setTimeout(() => {
          this.cache.delete(key);
        }, this.ttl);
      });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
  }
}
