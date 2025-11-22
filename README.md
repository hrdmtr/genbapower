# Genba Power - 飲食店注文管理システム

## 概要
GenbaLab QRコードリーダー注文システムは、カメラでQRコードをスキャンして簡単に注文を行うことができる飲食店向けの注文管理システムです。MongoDB連携機能により、複数端末間でのデータ同期と永続化を実現しています。

## 主な機能
- QRコードリーダー（カメラ）を使った商品スキャン
- テーブル別注文管理
- MongoDB / ローカルストレージ 自動切り替え
- 注文ステータス追跡
- ホール・キッチンスタッフ向け専用画面
- 注文時間分析・統計

## 必要環境
- Google Chrome 89以降（Web Serial APIとカメラAPIをサポートしたブラウザ）
- MongoDB接続（オプション - ローカルストレージへの自動フォールバックあり）

## 使用方法

### 開発環境の起動（Hot Reload対応）🔥
開発時はファイルを変更すると自動的にサーバーが再起動します：
```bash
# 開発サーバーを起動（自動リロード有効）
npm run dev

# より詳細な監視（HTML/CSSも対象）
npm run dev:watch
```

サーバーが起動したら以下のURLにアクセス：
- メイン画面: http://localhost:8080/
- MongoDB版: http://localhost:8080/mongo_index.html
- ホールスタッフ画面: http://localhost:8080/hall_staff.html

**開発のコツ**:
- ファイルを保存すると自動でサーバー再起動
- ターミナルで `rs` と入力すると手動再起動
- `Ctrl+C` で停止

### 本番環境の起動
```bash
npm start
```

### MongoDB連携版の起動
MongoDB連携版を起動するには以下のURLにアクセスしてください:
```
http://localhost:8088/mongo_index.html
```

### 標準版の起動
ローカルストレージのみを使用する標準版は以下のURLにアクセスしてください:
```
http://localhost:8088/index.html
```

### QRコード注文ページ
QRコードでの注文専用ページは以下のURLにアクセスしてください:
```
http://localhost:8088/qr_order.html
```

### ホールスタッフ用ページ
ホールスタッフ向けの注文管理ページは以下のURLにアクセスしてください:
```
http://localhost:8088/hall_staff.html
```

## MongoDB設定
MongoDB連携を利用するには、`db.js`ファイル内の接続設定を環境に合わせて変更してください。

### X509証明書認証の設定
```javascript
export const mongoConfig = {
  uri: "mongodb+srv://<クラスターURL>.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority",
  dbName: "genbapower",
  options: {
    tlsCertificateKeyFile: "/path/to/your/certificate.pem",
    serverApi: { version: '1' }
  }
};
```

### ユーザー名/パスワード認証の設定
```javascript
export const mongoConfig = {
  uri: "mongodb+srv://username:password@<クラスターURL>.mongodb.net/",
  dbName: "genbapower",
  options: {
    serverApi: { version: '1' }
  }
};
```

## テストデータの作成
初期データを登録するには、以下のコマンドを実行してください:
```
npm run seed-db
```

## 接続テスト
MongoDBへの接続テストを行うには、以下のコマンドを実行してください:
```
npm run test-db
```

## QRコードフォーマット
本システムでは以下の2つのQRコードフォーマットに対応しています：

### 新フォーマット
```
PRODUCT|P001    # 商品QRコード
TABLE|TABLE01   # テーブルQRコード
```

### 従来フォーマット
```
注文ID|テーブル番号|商品ID
```
例：`ORDER123|TABLE05|P001`

## 商品ID一覧
現在登録されている商品IDは以下の通りです：

| 商品ID | 商品名 | 価格 |
|--------|--------|------|
| P001 | 醤油ラーメン | ¥800 |
| P002 | 味噌ラーメン | ¥850 |
| P003 | 塩ラーメン | ¥800 |
| P004 | とんこつラーメン | ¥900 |
| P005 | つけ麺 | ¥950 |
| P006 | チャーシュー丼 | ¥400 |
| P007 | 餃子（6個） | ¥350 |
| P008 | ビール | ¥500 |

## ファイル構成
- `mongo_index.html` - MongoDB連携版メインページ
- `index.html` - 標準版メインページ
- `qr_order.html` - QRコード注文専用ページ
- `mongo_app.js` - MongoDB連携版アプリケーションロジック
- `app.js` - 標準版アプリケーションロジック
- `mongo_orders_db.js` - MongoDB操作モジュール
- `db.js` - MongoDB接続設定
- `products.js` - 商品マスターデータ
- `hall_staff.html` - ホールスタッフ向け画面
- `orders.html` - 注文一覧画面
- `analytics.html` - 注文分析画面
