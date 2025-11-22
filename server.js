const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

// MIMEタイプのマッピング
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  console.log(`リクエスト: ${req.url}`);
  
  // URLから/を除去し、空の場合はindex.htmlをデフォルトとする
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';  // デフォルトはindex.html
  }
  
  // ファイルの拡張子を取得
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // ファイルを読み込む
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // ファイルが見つからない場合は404エラー
      if (err.code === 'ENOENT') {
        console.error(`ファイルが見つかりません: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1><p>ファイルが見つかりません</p>');
      } else {
        // その他のエラーは500エラー
        console.error(`サーバーエラー: ${err.code}`);
        res.writeHead(500);
        res.end(`サーバーエラー: ${err.code}`);
      }
    } else {
      // 成功した場合はコンテンツを返す
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
  console.log(`トップページ: http://localhost:${PORT}/`);
  console.log(`QRコード注文画面: http://localhost:${PORT}/qr_order.html`);
  console.log(`QRコードテスト: http://localhost:${PORT}/qr_test.html`);
  console.log(`商品管理画面: http://localhost:${PORT}/admin.html`);
});