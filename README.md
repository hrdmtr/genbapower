# QRコードリーダー注文システム

## 概要
このアプリケーションは、USB接続されたQRコードリーダー（仮想COMポート型）からの入力を常時監視し、読み取ったQRコード内容をWeb APIにPOSTリクエストとして送信するブラウザベースのアプリケーションです。

## 機能
- Web Serial APIを使用してQRコードリーダーに接続
- QRコードから読み取った「注文ID|テーブル番号|メニュー名」形式のデータを解析
- データをJSON形式で指定されたAPIエンドポイントにPOST
- 接続状態やログの表示

## 必要環境
- Google Chrome 89以降（Web Serial APIをサポートしたブラウザ）
- USB接続QRコードリーダー（仮想COMポート型）

## 実行方法
1. リポジトリをダウンロードまたはクローンします
2. ローカルサーバーを起動します：
   - Python: `python -m http.server`
   - Node.js: `npx serve`
   - VSCode: Live Server拡張機能を使用
3. ブラウザで`http://localhost:8000`（または表示されたURL）にアクセスします
4. 「QRコードリーダーに接続」ボタンをクリックします
5. 表示されるダイアログでQRコードリーダーのCOMポートを選択します
6. 接続されると「接続成功」と表示されます
7. QRコードを読み取ると自動的にデータが処理されます

## 注意点
- Web Serial APIはHTTPSまたはlocalhostでのみ動作します
- APIエンドポイントは`app.js`内の`API_ENDPOINT`定数で設定できます

## MongoDB統合

このアプリケーションはMongoDB統合をサポートしており、スキャンされたQRコードデータをデータベースに保存します。

### 設定手順

1. `config/certs`ディレクトリにX.509証明書ファイルを`mongodb.pem`として配置します
2. 必要に応じて`config/mongodb.config.js`で接続設定を変更します
3. 依存関係をインストールします：
   ```
   npm install
   ```
4. サーバーを起動します：
   ```
   npm start
   ```

### 接続テスト

MongoDB接続をテストするには以下のコマンドを実行します：
```
npm run test-db
```

## QRコードフォーマット
QRコードには以下の形式のデータが含まれている必要があります：
```
注文ID|テーブル番号|メニュー名
```
例：`ORDER123|TABLE05|RAMEN_SHOYU`
