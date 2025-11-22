/**
 * 構造化ロガーの使用例
 *
 * 実行方法:
 *   node examples/logger-usage.js
 *
 * ログレベルを変更:
 *   LOG_LEVEL=debug node examples/logger-usage.js
 *   LOG_LEVEL=trace node examples/logger-usage.js
 */

import { logger, createModuleLogger, createRequestLogger, log } from '../utils/logger.js';

console.log('='.repeat(60));
console.log('構造化ロガーの使用例');
console.log('='.repeat(60));
console.log('');

// ========================================
// 1. 基本的な使い方
// ========================================
console.log('【1】基本的な使い方');
console.log('');

// ❌ 古い方法（console.log）
console.log('🔥 User logged in:', 'U123456');
console.log('🔥 Email:', 'user@example.com');

// ✅ 新しい方法（構造化ログ）
logger.info({ userId: 'U123456', email: 'user@example.com' }, 'User logged in');

console.log('');

// ========================================
// 2. 各ログレベル
// ========================================
console.log('【2】各ログレベルの使い方');
console.log('');

// TRACEレベル（最も詳細）
logger.trace({ variable: 'value' }, 'Variable state');

// DEBUGレベル
logger.debug({ queryTime: 123, query: 'SELECT * FROM users' }, 'Database query executed');

// INFOレベル（通常の動作）
logger.info({ orderCount: 5 }, 'Orders fetched successfully');

// WARNレベル（警告）
logger.warn({ retryCount: 3 }, 'Retrying connection');

// ERRORレベル
logger.error({ errorCode: 'AUTH_FAILED' }, 'Authentication failed');

// FATALレベル（致命的）
logger.fatal({ reason: 'DB connection lost' }, 'Application shutting down');

console.log('');

// ========================================
// 3. モジュール別ロガー
// ========================================
console.log('【3】モジュール別ロガー');
console.log('');

const authLogger = createModuleLogger('auth-middleware');
authLogger.info({ userId: 'U123', method: 'POST' }, 'Authentication check started');
authLogger.info({ success: true }, 'Authentication successful');

const dbLogger = createModuleLogger('database');
dbLogger.info({ collection: 'orders', count: 42 }, 'Query result');

console.log('');

// ========================================
// 4. リクエストトレーシング
// ========================================
console.log('【4】リクエストトレーシング');
console.log('');

const requestId = 'req-' + Math.random().toString(36).substring(7);
const reqLogger = createRequestLogger(requestId);

reqLogger.info({ method: 'GET', path: '/api/orders' }, 'Request received');
reqLogger.debug({ dbQuery: 'findMany' }, 'Fetching orders from database');
reqLogger.info({ orderCount: 10, duration: 45 }, 'Request completed');

console.log('');

// ========================================
// 5. エラーロギング
// ========================================
console.log('【5】エラーロギング');
console.log('');

try {
  throw new Error('Something went wrong!');
} catch (err) {
  // エラーオブジェクトを適切にシリアライズ
  logger.error({
    err,  // Pinoが自動的にスタックトレースを含めてくれる
    context: 'order-processing',
    orderId: 'ORD123'
  }, 'Order processing failed');
}

console.log('');

// ========================================
// 6. 便利なヘルパー関数
// ========================================
console.log('【6】便利なヘルパー関数');
console.log('');

log.info({ status: 'ok' }, 'Using helper function');
log.debug({ data: [1, 2, 3] }, 'Debug information');
log.warn({ threshold: 90, current: 95 }, 'Memory usage high');

console.log('');

// ========================================
// 7. パフォーマンス計測
// ========================================
console.log('【7】パフォーマンス計測');
console.log('');

const start = Date.now();

// 何か処理を実行
await new Promise(resolve => setTimeout(resolve, 100));

const duration = Date.now() - start;
logger.info({ duration, operation: 'data-fetch' }, 'Operation completed');

console.log('');

// ========================================
// 8. 複雑なデータ構造
// ========================================
console.log('【8】複雑なデータ構造');
console.log('');

logger.info({
  order: {
    id: 'ORD123',
    tableId: 'TABLE01',
    items: [
      { name: '醤油ラーメン', price: 800 },
      { name: 'ビール', price: 500 }
    ],
    totalAmount: 1300
  },
  user: {
    id: 'U123',
    displayName: 'テストユーザー'
  }
}, 'Order created');

console.log('');
console.log('='.repeat(60));
console.log('サンプル実行完了');
console.log('');
console.log('ログレベルを変更して再実行してみてください:');
console.log('  LOG_LEVEL=debug node examples/logger-usage.js');
console.log('  LOG_LEVEL=trace node examples/logger-usage.js');
console.log('='.repeat(60));
