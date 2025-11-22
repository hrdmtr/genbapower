/**
 * 環境変数のバリデーション
 * サーバー起動時に必要な環境変数が設定されているかチェック
 */

import { logger } from '../utils/logger.js';

// 必須の環境変数
const REQUIRED_ENV_VARS = [
  'NODE_ENV'
];

// 推奨される環境変数（警告のみ）
const RECOMMENDED_ENV_VARS = [
  'PORT',
  'LOG_LEVEL'
];

// 環境別の必須変数
const ENV_SPECIFIC_REQUIRED = {
  production: [
    'MONGODB_URI'
  ],
  development: []
};

/**
 * 環境変数をバリデーション
 * @returns {boolean} バリデーション成功したかどうか
 */
export function validateEnv() {
  logger.info('環境変数のバリデーションを開始します');

  const errors = [];
  const warnings = [];
  const env = process.env.NODE_ENV || 'development';

  // 必須変数のチェック
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      errors.push(`${varName} が設定されていません`);
    }
  }

  // 環境別の必須変数チェック
  const envSpecific = ENV_SPECIFIC_REQUIRED[env] || [];
  for (const varName of envSpecific) {
    if (!process.env[varName]) {
      errors.push(`${varName} が設定されていません（${env}環境で必須）`);
    }
  }

  // 推奨変数のチェック
  for (const varName of RECOMMENDED_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(`${varName} が設定されていません（推奨）`);
    }
  }

  // エラーがあれば表示して終了
  if (errors.length > 0) {
    logger.error({ errors }, '❌ 環境変数のバリデーションに失敗しました');
    console.error('\n必須の環境変数が不足しています:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\n.envファイルまたは環境変数を設定してください\n');
    return false;
  }

  // 警告があれば表示
  if (warnings.length > 0) {
    logger.warn({ warnings }, '⚠️ 推奨される環境変数が設定されていません');
    warnings.forEach(warn => logger.warn(warn));
  }

  // 設定内容を表示
  logger.info('✅ 環境変数のバリデーションに成功しました');
  displayEnvConfig();

  return true;
}

/**
 * 現在の環境設定を表示
 */
export function displayEnvConfig() {
  const env = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || '8080';
  const logLevel = process.env.LOG_LEVEL || 'info';

  console.log('\n' + '='.repeat(60));
  console.log('📝 環境設定');
  console.log('='.repeat(60));
  console.log(`  環境:             ${env}`);
  console.log(`  ポート:           ${port}`);
  console.log(`  ログレベル:       ${logLevel}`);

  if (process.env.MONGODB_URI) {
    // URIの一部だけ表示（セキュリティのため）
    const uri = process.env.MONGODB_URI;
    const maskedUri = uri.substring(0, 20) + '...' + uri.substring(uri.length - 10);
    console.log(`  MongoDB URI:      ${maskedUri}`);
  } else {
    console.log(`  MongoDB URI:      未設定（ローカルストレージを使用）`);
  }

  if (process.env.LIFF_ID) {
    console.log(`  LIFF ID:          ${process.env.LIFF_ID.substring(0, 15)}...`);
  }

  console.log('='.repeat(60) + '\n');

  logger.info({
    env,
    port,
    logLevel,
    hasMongoDb: !!process.env.MONGODB_URI,
    hasLiffId: !!process.env.LIFF_ID
  }, '環境設定の読み込み完了');
}

/**
 * .env.exampleファイルのテンプレートを取得
 */
export function getEnvTemplate() {
  return `# 環境設定
NODE_ENV=development

# サーバー設定
PORT=8080

# ログ設定
# trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# MongoDB設定（オプション）
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/genbapower

# LINE LIFF設定（オプション）
# LIFF_ID=your-liff-id-here
`;
}

export default validateEnv;
