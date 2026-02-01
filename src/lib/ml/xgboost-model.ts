/**
 * XGBoost Model - 风险评估模型
 * 
 * 注意：由于 Node.js 环境限制，这里实现一个简化的梯度提升决策树（GBDT）模型
 * 实际生产环境建议使用 Python 训练模型，然后导出为 ONNX 或 JSON 格式在 Node.js 中推理
 * 
 * 当前实现：简化的决策树集成模型（模拟 XGBoost 行为）
 */

import { FeatureVector } from './data-collector.js';
import { FeatureService } from './features.js';

export interface XGBoostModelConfig {
  nEstimators?: number; // 树的数量（默认：100）
  maxDepth?: number; // 最大深度（默认：6）
  learningRate?: number; // 学习率（默认：0.1）
  minSamplesSplit?: number; // 最小分裂样本数（默认：2）
}

export interface XGBoostPrediction {
  riskScore: number; // 0-100 风险分数
  probability: number; // 0-1 风险概率
  featureImportance?: Map<string, number>; // 特征重要性
}

/**
 * 简化的决策树节点
 */
interface TreeNode {
  featureIndex: number;
  threshold: number;
  left?: TreeNode;
  right?: TreeNode;
  value: number; // 叶子节点值
  isLeaf: boolean;
}

/**
 * 简化的 XGBoost 模型（用于演示）
 * 
 * 注意：这是简化实现，实际应使用真正的 XGBoost 库（Python）训练后导出
 */
export class XGBoostModel {
  private featureService: FeatureService;
  private trees: TreeNode[] = [];
  private config: Required<XGBoostModelConfig>;
  private isTrained: boolean = false;
  private featureNames: string[] = [];

  constructor(featureService: FeatureService, config: XGBoostModelConfig = {}) {
    this.featureService = featureService;
    this.config = {
      nEstimators: config.nEstimators || 100,
      maxDepth: config.maxDepth || 6,
      learningRate: config.learningRate || 0.1,
      minSamplesSplit: config.minSamplesSplit || 2,
    };
    
    // 初始化特征名称（用于特征重要性）
    this.featureNames = this.getFeatureNames();
  }

  /**
   * 训练模型（简化实现）
   * 
   * 注意：实际应使用 Python XGBoost 训练，然后导出模型
   * 这里提供一个占位实现，展示接口
   */
  async train(
    features: FeatureVector[],
    labels: number[] // 0=正常, 1=风险
  ): Promise<void> {
    if (features.length !== labels.length) {
      throw new Error('Features and labels must have the same length');
    }

    if (features.length < this.config.minSamplesSplit) {
      console.warn(`[XGBoost] Not enough samples for training (need at least ${this.config.minSamplesSplit})`);
      this.isTrained = false;
      return;
    }

    // 转换为特征数组
    const featureMatrix = features.map(f => this.featureService.featureVectorToArray(f));
    
    // 简化训练：构建多个决策树
    this.trees = [];
    for (let i = 0; i < this.config.nEstimators; i++) {
      // 随机采样（bootstrap）
      const sampleIndices = this.bootstrapSample(featureMatrix.length);
      const sampledFeatures = sampleIndices.map(idx => featureMatrix[idx]);
      const sampledLabels = sampleIndices.map(idx => labels[idx]);
      
      // 构建决策树
      const tree = this.buildTree(sampledFeatures, sampledLabels, 0);
      this.trees.push(tree);
    }

    this.isTrained = true;
    console.log(`[XGBoost] Model trained with ${features.length} samples, ${this.config.nEstimators} trees`);
  }

  /**
   * 预测风险分数
   */
  predict(features: FeatureVector): XGBoostPrediction {
    if (!this.isTrained || this.trees.length === 0) {
      // 未训练时返回默认值
      return {
        riskScore: 50,
        probability: 0.5,
        featureImportance: new Map()
      };
    }

    const featureArray = this.featureService.featureVectorToArray(features);
    
    // 集成所有树的预测结果
    let sumPrediction = 0;
    for (const tree of this.trees) {
      sumPrediction += this.predictTree(tree, featureArray);
    }

    // 平均预测值
    const avgPrediction = sumPrediction / this.trees.length;
    
    // 转换为风险分数（0-100）
    const riskScore = Math.min(100, Math.max(0, avgPrediction * 100));
    
    // 转换为概率（sigmoid）
    const probability = 1 / (1 + Math.exp(-avgPrediction));

    // 计算特征重要性（简化实现）
    const featureImportance = this.calculateFeatureImportance(featureArray);

    return {
      riskScore,
      probability,
      featureImportance
    };
  }

  /**
   * 构建决策树（简化实现）
   */
  private buildTree(
    features: number[][],
    labels: number[],
    depth: number
  ): TreeNode {
    // 终止条件
    if (depth >= this.config.maxDepth || features.length < this.config.minSamplesSplit) {
      // 叶子节点：返回平均标签值
      const avgLabel = labels.reduce((a, b) => a + b, 0) / labels.length;
      return {
        featureIndex: -1,
        threshold: 0,
        value: avgLabel,
        isLeaf: true
      };
    }

    // 选择最佳特征和阈值（简化：随机选择）
    const featureIndex = Math.floor(Math.random() * features[0].length);
    const values = features.map(f => f[featureIndex]);
    const threshold = (Math.min(...values) + Math.max(...values)) / 2;

    // 分割数据
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];
    
    for (let i = 0; i < features.length; i++) {
      if (features[i][featureIndex] <= threshold) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    }

    // 如果分割后某一边为空，返回叶子节点
    if (leftIndices.length === 0 || rightIndices.length === 0) {
      const avgLabel = labels.reduce((a, b) => a + b, 0) / labels.length;
      return {
        featureIndex: -1,
        threshold: 0,
        value: avgLabel,
        isLeaf: true
      };
    }

    // 递归构建左右子树
    const leftFeatures = leftIndices.map(idx => features[idx]);
    const leftLabels = leftIndices.map(idx => labels[idx]);
    const rightFeatures = rightIndices.map(idx => features[idx]);
    const rightLabels = rightIndices.map(idx => labels[idx]);

    return {
      featureIndex,
      threshold,
      left: this.buildTree(leftFeatures, leftLabels, depth + 1),
      right: this.buildTree(rightFeatures, rightLabels, depth + 1),
      value: 0,
      isLeaf: false
    };
  }

  /**
   * 使用树进行预测
   */
  private predictTree(tree: TreeNode, features: number[]): number {
    if (tree.isLeaf) {
      return tree.value;
    }

    if (features[tree.featureIndex] <= tree.threshold) {
      return tree.left ? this.predictTree(tree.left, features) : tree.value;
    } else {
      return tree.right ? this.predictTree(tree.right, features) : tree.value;
    }
  }

  /**
   * Bootstrap 采样
   */
  private bootstrapSample(size: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < size; i++) {
      indices.push(Math.floor(Math.random() * size));
    }
    return indices;
  }

  /**
   * 计算特征重要性（简化实现）
   */
  private calculateFeatureImportance(features: number[]): Map<string, number> {
    const importance = new Map<string, number>();
    
    // 简化：基于特征值的方差作为重要性
    for (let i = 0; i < features.length && i < this.featureNames.length; i++) {
      const featureName = this.featureNames[i];
      const value = features[i];
      // 使用绝对值作为重要性（简化）
      importance.set(featureName, Math.abs(value));
    }

    return importance;
  }

  /**
   * 获取特征名称列表
   */
  private getFeatureNames(): string[] {
    return [
      'txCount1h', 'txAmount1h', 'avgAmount1h',
      'txCount24h', 'txAmount24h', 'avgAmount24h',
      'txCount7d', 'txAmount7d', 'avgAmount7d',
      'txCount30d', 'txAmount30d', 'avgAmount30d',
      'avgTxIntervalHours', 'minTxIntervalHours', 'maxTxIntervalHours',
      'isWeekend', 'hourOfDay', 'dayOfWeek', 'isNightTime', 'isBusinessHours', 'hourOfDayNormalized',
      'amountNumber', 'recipientChangeRate', 'purposeDiversity', 'amountTrend',
      'recentAmountMean', 'recentAmountStd', 'recentAmountMax', 'recentAmountMin', 'amountRatioToAvg',
      'recentRecipientCount', 'recipientRepeatRate',
      'addressTxCount', 'addressTotalAmount', 'addressAvgAmount', 'addressFirstSeenDays',
      'addressRiskScore', 'addressAssociationCount',
      'userTotalTxCount', 'userTotalAmount', 'userAvgAmount', 'userRejectCount',
      'amountCoefficientOfVariation', 'txFrequencyPerDay', 'balanceRatio',
      'recipientOnchainTxCount', 'recipientOnchainVolume', 'recipientContractInteractionCount',
      'sameRecipientIn24h', 'sameRecipientIn7d', 'amountDeviationFromMean', 'amountDeviationFromMedian',
      'consecutiveSameRecipient', 'amountChangeRate', 'timeSinceLastTx',
      'walletBalance', 'spentToday'
    ];
  }

  /**
   * 获取训练状态
   */
  getTrainingStatus(): { isTrained: boolean; treeCount: number } {
    return {
      isTrained: this.isTrained,
      treeCount: this.trees.length
    };
  }

  /**
   * 保存模型（导出为 JSON）
   */
  exportModel(): string {
    return JSON.stringify({
      config: this.config,
      trees: this.trees,
      featureNames: this.featureNames
    });
  }

  /**
   * 加载模型（从 JSON 导入）
   */
  importModel(json: string): void {
    const data = JSON.parse(json);
    this.config = data.config;
    this.trees = data.trees;
    this.featureNames = data.featureNames;
    this.isTrained = this.trees.length > 0;
  }
}
