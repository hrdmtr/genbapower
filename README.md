# QRコードリーダー注文システム

## 概要
このアプリケーションは、USB接続されたQRコードリーダー（仮想COMポート型）からの入力を常時監視し、読み取ったQRコード内容をWeb APIにPOSTリクエストとして送信するブラウザベースのアプリケーションです。LINE会員証機能も統合されており、ポイントチャージや会員管理が可能です。

## 機能
- Web Serial APIを使用してQRコードリーダーに接続
- QRコードから読み取った「注文ID|テーブル番号|メニュー名」形式のデータを解析
- データをJSON形式で指定されたAPIエンドポイントにPOST
- 接続状態やログの表示
- LINE会員証表示（会員ID、ポイント残高、会員ランク）
- ポイントチャージ機能（QRコードスキャン、ワンタイムパスコード）
- ポイント利用履歴表示

## 必要環境
- Google Chrome 89以降（Web Serial APIをサポートしたブラウザ）
- USB接続QRコードリーダー（仮想COMポート型）
- Node.js 14以降
- MongoDB

## 実行方法
1. リポジトリをダウンロードまたはクローンします
2. 依存関係をインストールします：
   ```
   npm install
   ```
3. `.env`ファイルを作成し、必要な環境変数を設定します（`.env.example`を参照）
4. サーバーを起動します：
   ```
   npm start
   ```
5. ブラウザで表示されたURLにアクセスします
6. QRコードリーダー機能を使用する場合は「QRコードリーダーに接続」ボタンをクリックします
7. LINE会員証機能を使用する場合は「LINE会員証」メニューをクリックします

## 注意点
- Web Serial APIはHTTPSまたはlocalhostでのみ動作します
- APIエンドポイントは`app.js`内の`API_ENDPOINT`定数で設定できます

## MongoDB統合

このアプリケーションはMongoDB統合をサポートしており、スキャンされたQRコードデータとLINE会員情報をデータベースに保存します。

### 設定手順

1. `config/certs`ディレクトリにX.509証明書ファイルを`mongodb.pem`として配置します
2. 必要に応じて`config/mongodb.config.js`で接続設定を変更します
3. ローカル開発環境では`config/mongodb.local.js`の設定が使用されます
4. 依存関係をインストールします：
   ```
   npm install
   ```
5. サーバーを起動します：
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

## LINE会員証機能

### 動作モード設定

`.env`ファイルの`APP_MODE`設定により、以下の動作モードを切り替えることができます：

- `local`: LIFF認証をバイパスして簡単に動作確認ができるモード
- `development`: LIFF認証を有効にするモード

```
# .envファイル内の設定例
APP_MODE=local  # または development
```

### ローカルモードからデベロップモードへの切り替え手順

1. LINE Developersコンソールでチャネルを作成する（下記「LINE開発者設定」セクション参照）
2. `.env`ファイルの設定を変更する：
   ```
   # LINE設定
   LINE_CHANNEL_ID=あなたのチャネルID
   LINE_CHANNEL_SECRET=あなたのチャネルシークレット
   LIFF_ID=あなたのLIFF ID
   
   # アプリケーションモード
   APP_MODE=development
   ```
3. サーバーを再起動する：
   ```
   npm restart
   ```

### LINE開発者設定

LINE会員証機能を使用するには、以下の手順でLINE Developersコンソールでの設定が必要です：

1. [LINE Developers Console](https://developers.line.biz/console/)にアクセスし、ログインする
2. 新しいプロバイダーを作成する（または既存のプロバイダーを選択）
3. 新しいチャネルを作成する（LINEログイン）
4. チャネル基本設定から以下の情報を取得する：
   - チャネルID
   - チャネルシークレット
5. LIFFアプリを追加する：
   - サイズ：Full
   - エンドポイントURL：あなたのアプリケーションのURL（例：https://example.com/line-member-card.html）
   - スコープ：profile, openid
   - ボットリンク機能：On（任意）
6. 作成されたLIFF IDを取得する

取得した情報を`.env`ファイルに設定します：
```
LINE_CHANNEL_ID=あなたのチャネルID
LINE_CHANNEL_SECRET=あなたのチャネルシークレット
LIFF_ID=あなたのLIFF ID
```

### テスト用チャージ券生成

テスト用のチャージ券を生成するには以下のコマンドを実行します：
```
node utils/generate-ticket.js [金額]
```

テスト用の固定チケットを更新するには：
```
node utils/generate-ticket.js --test
```

これにより、チケットID「TICKET123456789」、パスコード「123456」のテストチケットが作成されます。
