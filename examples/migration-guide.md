# console.logから構造化ログへの移行ガイド

このガイドでは、既存の`console.log`を構造化ログ（Pino）に置き換える方法を説明します。

## 目次
1. [基本的な置き換え](#基本的な置き換え)
2. [エラーログの置き換え](#エラーログの置き換え)
3. [デバッグログの置き換え](#デバッグログの置き換え)
4. [条件付きログの置き換え](#条件付きログの置き換え)
5. [実例：mongo_app.jsの移行例](#実例mongo_appjsの移行例)

---

## 基本的な置き換え

### ❌ Before（旧方式）

```javascript
console.log('データベース状態を確認します');
console.log('DB状態確認結果:', dbStatus);
```

### ✅ After（新方式）

```javascript
import { logger } from './utils/logger.js';

logger.info('データベース状態を確認します');
logger.info({ dbStatus }, 'DB状態確認結果');
```

**メリット**:
- 構造化されたデータで検索しやすい
- ログレベルで出力を制御できる
- 本番環境でJSON形式で出力される

---

## エラーログの置き換え

### ❌ Before

```javascript
console.error('db-status要素が見つかりません');
console.error('バックアップ作成エラー:', e);
```

### ✅ After

```javascript
logger.error('db-status要素が見つかりません');
logger.error({ err: e }, 'バックアップ作成エラー');
```

**メリット**:
- エラーオブジェクトが自動的にスタックトレース付きでシリアライズされる
- エラーだけを抽出して検索できる

---

## デバッグログの置き換え

### ❌ Before（開発中に追加したログ）

```javascript
console.log('🔥 User logged in:', userId);
console.log('[trace for devin] Authentication check started:', { userId, method });
```

### ✅ After

```javascript
import { createModuleLogger } from './utils/logger.js';

const authLogger = createModuleLogger('auth');

authLogger.debug({ userId }, 'User logged in');
authLogger.debug({ userId, method }, 'Authentication check started');
```

**メリット**:
- `LOG_LEVEL=info`にすればデバッグログは出力されない
- 特定のモジュールだけログを出力できる
- 絵文字やプレフィックスが不要になる

---

## 条件付きログの置き換え

### ❌ Before

```javascript
if (savedOrder) {
    try {
        const orderData = JSON.parse(savedOrder);
        const itemCount = orderData.items ? orderData.items.length : 0;
        console.log(`✓ カート情報取得成功: テーブル=${orderData.tableId}, 商品数=${itemCount}点`);
        if (itemCount > 0) {
            console.log('  カート内商品:');
            orderData.items.forEach((item, idx) => {
                console.log(`  ${idx+1}. ${item.name} - ¥${item.price}`);
            });
        }
    } catch (e) {
        console.error('✗ カート情報のパース失敗:', e);
        console.log('  生データ:', savedOrder);
    }
} else {
    console.log('✗ カート情報なし - localStorageにcurrentOrderが見つかりません');
}
```

### ✅ After

```javascript
const orderLogger = createModuleLogger('order-restore');

if (savedOrder) {
    try {
        const orderData = JSON.parse(savedOrder);
        const itemCount = orderData.items ? orderData.items.length : 0;

        orderLogger.info({
            tableId: orderData.tableId,
            itemCount
        }, 'カート情報取得成功');

        if (itemCount > 0) {
            orderData.items.forEach((item, idx) => {
                orderLogger.debug({
                    index: idx + 1,
                    name: item.name,
                    price: item.price
                }, 'カート内商品');
            });
        }
    } catch (err) {
        orderLogger.error({
            err,
            rawData: savedOrder.substring(0, 100)
        }, 'カート情報のパース失敗');
    }
} else {
    orderLogger.warn('カート情報なし');
}
```

**メリット**:
- データが構造化されているので、特定の条件で検索できる
- ログレベルで表示/非表示を制御できる
- 本番環境でログ分析ツールと連携しやすい

---

## 実例：mongo_app.jsの移行例

### シナリオ1：データベース接続確認（50-68行目）

#### ❌ Before

```javascript
console.log('データベース状態を確認します');
OrderDB.checkDatabaseStatus().then(dbStatus => {
    console.log('DB状態確認結果:', dbStatus);
    updateDbStatusElement(dbStatus);
}).catch(err => {
    console.error('DB状態確認エラー:', err);
    dbStatusElement.innerHTML = '<i class="fas fa-times-circle"></i> データベース接続確認エラー';
    dbStatusElement.className = 'db-status disconnected';
});
```

#### ✅ After

```javascript
import { createModuleLogger } from './utils/logger.js';

const dbLogger = createModuleLogger('database');

dbLogger.info('データベース状態を確認します');
OrderDB.checkDatabaseStatus().then(dbStatus => {
    dbLogger.info({
        dbType: dbStatus.dbType,
        available: dbStatus.dbAvailable,
        orderCount: dbStatus.orderStats?.totalOrders
    }, 'DB状態確認結果');
    updateDbStatusElement(dbStatus);
}).catch(err => {
    dbLogger.error({ err }, 'DB状態確認エラー');
    dbStatusElement.innerHTML = '<i class="fas fa-times-circle"></i> データベース接続確認エラー';
    dbStatusElement.className = 'db-status disconnected';
});
```

---

### シナリオ2：注文情報の復元（273-414行目）

#### ❌ Before（大量のconsole.log）

```javascript
console.log('==========================================');
console.log('【注文情報復元開始】ページ読み込み時のlocalStorage読み込み');
console.log('==========================================');

let savedOrder = localStorage.getItem('currentOrder');
console.log('1. カート情報（currentOrder）の確認');
if (savedOrder) {
    try {
        const orderData = JSON.parse(savedOrder);
        const itemCount = orderData.items ? orderData.items.length : 0;
        console.log(`✓ カート情報取得成功: テーブル=${orderData.tableId}, 商品数=${itemCount}点`);
        // ... 20行以上のconsole.log
    } catch (e) {
        console.error('✗ カート情報のパース失敗:', e);
    }
}
```

#### ✅ After（クリーンで構造化）

```javascript
import { createModuleLogger } from './utils/logger.js';

const restoreLogger = createModuleLogger('order-restore');

restoreLogger.info('注文情報復元開始');

const savedOrder = localStorage.getItem('currentOrder');
if (savedOrder) {
    try {
        const orderData = JSON.parse(savedOrder);
        const itemCount = orderData.items ? orderData.items.length : 0;

        restoreLogger.info({
            tableId: orderData.tableId,
            itemCount,
            items: orderData.items.map(i => ({ name: i.name, price: i.price }))
        }, 'カート情報取得成功');

        // 個別商品の詳細はデバッグレベル
        orderData.items.forEach((item, idx) => {
            restoreLogger.debug({
                index: idx + 1,
                productId: item.productId,
                name: item.name,
                price: item.price
            }, 'カート内商品');
        });
    } catch (err) {
        restoreLogger.error({ err, rawDataLength: savedOrder.length }, 'カート情報のパース失敗');
    }
} else {
    restoreLogger.info('カート情報なし');
}

restoreLogger.info('注文情報復元完了');
```

**削減効果**:
- 50行以上のログコード → 約20行に削減
- 視覚的なノイズ（🔥、✓、✗、=====）が不要
- ログレベルでデバッグ情報の表示/非表示を切り替え可能

---

### シナリオ3：MongoDB接続テスト（1042-1117行目）

#### ❌ Before

```javascript
console.log('MongoDB接続テストボタンがクリックされました');
console.log('テストボタン無効化、スピナー表示');

addLog('===== MongoDB接続テスト開始 =====', 'info');
addLog('MongoDB接続を確認中...', 'info');
console.log('ログにテスト開始メッセージを表示');

const dbAvailable = await testConnection();
console.log('MongoDB接続テスト結果:', dbAvailable ? '成功' : '失敗');

if (dbAvailable) {
    addLog('✅ MongoDB接続テスト成功!', 'success');
    addLog('データベースに正常に接続できました', 'success');
    console.log('成功メッセージをログに表示');
} else {
    addLog('❌ MongoDB接続テスト失敗', 'error');
    console.log('失敗メッセージとトラブルシューティング情報をログに表示');
}
```

#### ✅ After

```javascript
const testLogger = createModuleLogger('db-test');

testLogger.info('MongoDB接続テスト開始');

addLog('MongoDB接続を確認中...', 'info');

const dbAvailable = await testConnection();
testLogger.info({ success: dbAvailable }, 'MongoDB接続テスト結果');

if (dbAvailable) {
    addLog('MongoDB接続テスト成功!', 'success');
    testLogger.info('データベースに正常に接続');
} else {
    addLog('MongoDB接続テスト失敗', 'error');
    testLogger.error('データベース接続失敗 - トラブルシューティングが必要');
}
```

---

## モジュール別ロガーの使い分け

異なる機能には異なるロガーを使用：

```javascript
// データベース関連
const dbLogger = createModuleLogger('database');

// 注文復元関連
const restoreLogger = createModuleLogger('order-restore');

// 注文送信関連
const orderLogger = createModuleLogger('order-api');

// QRコード読み取り関連
const qrLogger = createModuleLogger('qr-reader');

// シリアル接続関連
const serialLogger = createModuleLogger('serial');
```

**メリット**:
- 特定のモジュールだけログをフィルタリングできる
- 問題のあるモジュールだけデバッグレベルにできる

---

## ログレベルの使い分け

| レベル | 使用場面 | 例 |
|--------|----------|-----|
| `trace` | 非常に詳細なデバッグ情報 | 変数の値、ループ内の処理 |
| `debug` | 開発時のデバッグ情報 | 関数の開始/終了、中間結果 |
| `info` | 通常の動作情報 | 注文作成、DB接続成功 |
| `warn` | 警告（処理は継続） | データ不足、推奨設定なし |
| `error` | エラー | DB接続失敗、パースエラー |
| `fatal` | 致命的エラー | アプリ停止が必要 |

---

## 移行のベストプラクティス

### 1. 段階的に移行する

一度にすべて変更せず、ファイル単位で移行：

1. 最も問題のあるファイル（ログが多い）から始める
2. モジュールロガーを作成
3. console.logを段階的に置き換え
4. テストして動作確認

### 2. ユーザー向けログは残す

`addLog()`のようなUIに表示するログは残してOK：

```javascript
// ✅ これは残す（ユーザーが見るログ）
addLog('注文送信成功', 'success');

// ✅ これを追加（開発者が見るログ）
orderLogger.info({ orderId, tableId }, '注文送信成功');
```

### 3. デバッグ用のログは debug/trace レベルに

```javascript
// ❌ 開発中に追加した一時的なログ
console.log('🔥 ここを通った');
console.log('[trace for devin] 変数の値:', someVar);

// ✅ debug/traceレベルに変更
logger.debug({ someVar }, 'ここを通った');
logger.trace({ detailedInfo }, '詳細なトレース情報');
```

---

## まとめ

構造化ログに移行することで：

- ✅ **開発速度向上**: ログが検索・フィルタリングしやすくなる
- ✅ **本番環境での運用性向上**: ログ分析ツールと連携可能
- ✅ **コードの可読性向上**: ログコードが減り、ビジネスロジックが見やすくなる
- ✅ **デバッグ効率向上**: 必要なログだけ表示できる

次のステップ：
1. `mongo_app.js`から移行を開始
2. `mongo_order.js`, `db.js`などの主要ファイルを移行
3. 本番環境でログ分析ツール（Datadog, CloudWatch Logs等）と連携
