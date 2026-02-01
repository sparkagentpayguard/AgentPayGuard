/**
 * Feature precomputation and caching
 * 
 * 特征预计算和缓存，提升性能
 */

import { FeatureVector } from './ml/data-collector.js';
import { SimpleCache } from './cache.js';

/**
 * 特征预计算和缓存服务
 */
export class FeatureCacheService {
  private recipientCache: SimpleCache<FeatureVector>;
  private userCache: SimpleCache<FeatureVector>;
  private commonRecipients: Set<string> = new Set();
  private maxCommonRecipients: number;

  constructor(
    options: {
      recipientCacheTTL?: number;  // 收款地址特征缓存 TTL（秒，默认：3600）
      userCacheTTL?: number;       // 用户特征缓存 TTL（秒，默认：1800）
      maxCommonRecipients?: number; // 最大常用收款地址数（默认：100）
    } = {}
  ) {
    this.recipientCache = new SimpleCache(options.recipientCacheTTL || 3600);
    this.userCache = new SimpleCache(options.userCacheTTL || 1800);
    this.maxCommonRecipients = options.maxCommonRecipients || 100;
  }

  /**
   * 获取收款地址特征（带缓存）
   */
  getRecipientFeatures(recipient: string): FeatureVector | null {
    return this.recipientCache.get(recipient) || null;
  }

  /**
   * 设置收款地址特征（缓存）
   */
  setRecipientFeatures(recipient: string, features: FeatureVector): void {
    this.recipientCache.set(recipient, features);
    
    // 更新常用收款地址列表
    this.updateCommonRecipients(recipient);
  }

  /**
   * 获取用户特征（带缓存）
   */
  getUserFeatures(userId: string): FeatureVector | null {
    return this.userCache.get(userId) || null;
  }

  /**
   * 设置用户特征（缓存）
   */
  setUserFeatures(userId: string, features: FeatureVector): void {
    this.userCache.set(userId, features);
  }

  /**
   * 更新常用收款地址列表
   */
  private updateCommonRecipients(recipient: string): void {
    this.commonRecipients.add(recipient);
    
    // 如果超过最大数量，移除最旧的
    if (this.commonRecipients.size > this.maxCommonRecipients) {
      const first = this.commonRecipients.values().next().value;
      this.commonRecipients.delete(first);
    }
  }

  /**
   * 获取常用收款地址列表
   */
  getCommonRecipients(): string[] {
    return Array.from(this.commonRecipients);
  }

  /**
   * 预计算常用收款地址的特征
   */
  async precomputeCommonRecipients(
    computeFeatures: (recipient: string) => Promise<FeatureVector>
  ): Promise<void> {
    const recipients = this.getCommonRecipients();
    
    if (recipients.length === 0) {
      return;
    }
    
    console.log(`[FeatureCache] Precomputing features for ${recipients.length} common recipients...`);
    
    // 并行预计算
    const promises = recipients.map(async (recipient) => {
      try {
        const features = await computeFeatures(recipient);
        this.setRecipientFeatures(recipient, features);
        return { recipient, success: true as const };
      } catch (error) {
        console.warn(`[FeatureCache] Failed to precompute features for ${recipient}:`, error);
        return { recipient, success: false as const };
      }
    });

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value && r.value.success).length;
    
    console.log(`[FeatureCache] Precomputed features for ${successCount}/${recipients.length} recipients`);
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.recipientCache.clear();
    this.userCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    recipientCacheSize: number;
    userCacheSize: number;
    commonRecipientsCount: number;
  } {
    return {
      recipientCacheSize: this.recipientCache.size(),
      userCacheSize: this.userCache.size(),
      commonRecipientsCount: this.commonRecipients.size
    };
  }
}
