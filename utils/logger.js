/**
 * 構造化ログユーティリティ
 * Pinoを使用した高速で検索可能なログシステム
 *
 * 使い方:
 *   import { logger } from './utils/logger.js';
 *   logger.info({ userId: 'U123' }, 'User logged in');
 *   logger.error({ error: err.message }, 'Authentication failed');
 */

import pino from 'pino';

// ログレベルの優先度
// trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60

const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Pinoの設定
export const logger = pino({
  level: logLevel,

  // 本番環境では高速なJSON形式
  // 開発環境では人間が読みやすい形式
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{levelLabel} - {msg}',
      customPrettifiers: {
        // カスタムフォーマット
        time: (timestamp) => `🕐 ${timestamp}`
      }
    }
  } : undefined,

  // ベースフィールド（すべてのログに含まれる）
  base: {
    env: process.env.NODE_ENV || 'development',
    app: 'genbapower'
  },

  // タイムスタンプのフォーマット
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // シリアライザー（エラーオブジェクトを適切に処理）
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

/**
 * 特定のモジュール用のロガーを作成
 * @param {string} module - モジュール名
 * @returns {pino.Logger} モジュール固有のロガー
 *
 * 例: const moduleLogger = createModuleLogger('auth-middleware');
 */
export function createModuleLogger(module) {
  return logger.child({ module });
}

/**
 * リクエストIDを含むロガーを作成（トレーシング用）
 * @param {string} requestId - リクエストID
 * @returns {pino.Logger} リクエスト固有のロガー
 */
export function createRequestLogger(requestId) {
  return logger.child({ requestId });
}

/**
 * ユーザー情報を含むロガーを作成
 * @param {string} userId - ユーザーID
 * @returns {pino.Logger} ユーザー固有のロガー
 */
export function createUserLogger(userId) {
  return logger.child({ userId });
}

// 便利なヘルパー関数
export const log = {
  /**
   * トレースレベル（最も詳細）
   */
  trace: (data, message) => logger.trace(data, message),

  /**
   * デバッグレベル
   */
  debug: (data, message) => logger.debug(data, message),

  /**
   * 情報レベル（通常の動作）
   */
  info: (data, message) => logger.info(data, message),

  /**
   * 警告レベル（問題の可能性）
   */
  warn: (data, message) => logger.warn(data, message),

  /**
   * エラーレベル
   */
  error: (data, message) => logger.error(data, message),

  /**
   * 致命的エラー
   */
  fatal: (data, message) => logger.fatal(data, message)
};

// 開発環境でログレベルを表示
if (isDevelopment) {
  logger.info({ logLevel }, 'Logger initialized');
}

export default logger;
