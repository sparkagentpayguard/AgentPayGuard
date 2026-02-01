#!/usr/bin/env tsx
/**
 * 定期训练脚本 - 重新训练异常检测模型
 * 
 * 使用方法：
 *   pnpm retrain-models
 *   或
 *   tsx src/scripts/retrain-models.ts
 * 
 * 建议通过cron定期运行（例如每天凌晨）：
 *   0 2 * * * cd /path/to/AgentPayGuard && pnpm retrain-models
 */
import { getMLService } from '../lib/ml/ml-service.js';

async function main() {
  console.log('🔄 开始重新训练异常检测模型...\n');

  const mlService = getMLService();

  if (!mlService.isEnabled()) {
    console.log('❌ ML功能未启用');
    console.log('   请在.env中设置 ENABLE_ML_FEATURES=1');
    process.exit(1);
  }

  // 获取数据统计
  const stats = await mlService.getDataStats();
  if (stats) {
    console.log('📊 数据统计:');
    console.log(`   总交易数: ${stats.total}`);
    console.log(`   正常交易: ${stats.normal}`);
    console.log(`   风险交易: ${stats.risk}`);
    console.log(`   未标注: ${stats.unknown}\n`);
  }

  // 训练异常检测模型
  console.log('🏋️ 训练异常检测模型...');
  const success = await mlService.trainAnomalyDetector();

  if (success) {
    const status = mlService.getAnomalyDetectorStatus();
    console.log('✅ 训练完成！');
    console.log(`   训练状态: ${status.isTrained ? '已训练' : '未训练'}\n`);
  } else {
    console.log('⚠️ 训练失败或数据不足');
    console.log('   需要至少10个正常交易样本\n');
  }

  // 清理资源
  await mlService.cleanup();
  
  console.log('✨ 完成');
}

main().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
