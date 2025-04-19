// アプリケーションのメインスクリプト
import { getProductById, getProductMaster } from './products.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const connectButton = document.getElementById('connect-button');
    const connectionStatus = document.getElementById('connection-status');
    const logContainer = document.getElementById('log-container');
    const productContainer = document.getElementById('product-container');

    // シリアル接続オブジェクト
    let port = null;
    let reader = null;
    let readableStreamClosed = null;
    let isConnected = false;

    // APIエンドポイント
    const API_ENDPOINT = 'https://example.com/api/orders';

    // ログ追加関数
    function addLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry', `log-${type}`);
        logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // QRコードデータの解析
    function parseQRData(data) {
        const parts = data.trim().split('|');
        if (parts.length !== 3) {
            throw new Error('不正なQRコードフォーマット');
        }
        
        return {
            orderId: parts[0],
            table: parts[1],
            productId: parts[2] // メニュー名を商品IDとして扱う
        };
    }

    // 商品情報の表示
    function displayProductInfo(productId) {
        // 以前の商品情報をクリア
        productContainer.innerHTML = '';
        
        // 商品マスターから商品情報を取得
        const product = getProductById(productId);
        
        if (!product) {
            // 商品が見つからない場合
            const notFoundElement = document.createElement('div');
            notFoundElement.classList.add('product-placeholder');
            notFoundElement.textContent = `商品ID「${productId}」の商品情報が見つかりません`;
            productContainer.appendChild(notFoundElement);
            return;
        }
        
        // 商品カードの作成
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        
        // 画像の設定（存在しない場合はプレースホルダー画像を使用）
        const imageElement = document.createElement('img');
        imageElement.classList.add('product-image');
        imageElement.src = product.image;
        imageElement.alt = product.name;
        imageElement.onerror = () => {
            imageElement.src = 'images/no-image.jpg';
            imageElement.alt = '画像がありません';
        };
        
        // 商品詳細情報
        const detailsElement = document.createElement('div');
        detailsElement.classList.add('product-details');
        
        const nameElement = document.createElement('div');
        nameElement.classList.add('product-name');
        nameElement.textContent = product.name;
        
        const priceElement = document.createElement('div');
        priceElement.classList.add('product-price');
        priceElement.textContent = `¥${product.price.toLocaleString()}`;
        
        const descriptionElement = document.createElement('div');
        descriptionElement.classList.add('product-description');
        descriptionElement.textContent = product.description || '商品説明がありません';
        
        // 要素の組み立て
        detailsElement.appendChild(nameElement);
        detailsElement.appendChild(priceElement);
        detailsElement.appendChild(descriptionElement);
        
        productCard.appendChild(imageElement);
        productCard.appendChild(detailsElement);
        
        productContainer.appendChild(productCard);
    }

    // APIにデータを送信
    async function sendToAPI(orderData) {
        try {
            // 実際の環境ではリクエストを送信
            // デモ環境ではモックレスポンスを返す
            let responseData;
            
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        orderId: orderData.orderId,
                        table: orderData.table,
                        menu: orderData.productId // APIの互換性のためmenuキーを使用
                    })
                });

                if (!response.ok) {
                    throw new Error(`APIエラー: ${response.status}`);
                }

                responseData = await response.json();
            } catch (fetchError) {
                // APIが存在しない場合はモックレスポンスを返す
                console.log('デモモード: APIリクエストをシミュレーションします', fetchError);
                
                // モックレスポンスを作成
                const product = getProductById(orderData.productId);
                const productName = product ? product.name : orderData.productId;
                
                responseData = {
                    status: 'success',
                    message: `注文を受け付けました: ${productName}`,
                    orderNumber: orderData.orderId,
                    estimatedTime: Math.floor(5 + Math.random() * 10) // 5～15分のランダムな準備時間
                };
            }
            
            addLog(`注文送信成功: ${orderData.orderId}`, 'success');
            return responseData;
        } catch (error) {
            addLog(`注文送信失敗: ${error.message}`, 'error');
            throw error;
        }
    }

    // シリアルポートからのデータ読み取り
    async function readSerialData() {
        while (port && reader) {
            try {
                const { value, done } = await reader.read();
                if (done) {
                    addLog('読み取り終了', 'info');
                    break;
                }

                // 受信データをテキストに変換
                const decoder = new TextDecoder();
                const text = decoder.decode(value).trim();
                
                if (text) {
                    addLog(`QRコード読み取り: ${text}`, 'info');
                    
                    try {
                        const orderData = parseQRData(text);
                        // 商品情報を表示
                        displayProductInfo(orderData.productId);
                        // APIに注文データを送信
                        await sendToAPI(orderData);
                    } catch (error) {
                        addLog(`データ処理エラー: ${error.message}`, 'error');
                    }
                }
            } catch (error) {
                addLog(`読み取りエラー: ${error.message}`, 'error');
                break;
            }
        }
    }

    // シリアルポート接続
    async function connectToSerialPort() {
        if ('serial' in navigator) {
            try {
                // ユーザーにシリアルポート選択を促す
                port = await navigator.serial.requestPort();
                await port.open({ baudRate: 9600 });
                
                // 接続状態の更新
                isConnected = true;
                connectionStatus.textContent = '接続成功';
                connectionStatus.classList.add('connected');
                connectButton.textContent = '切断';
                addLog('QRコードリーダーに接続しました', 'success');
                
                // 読み取り開始
                reader = port.readable.getReader();
                readableStreamClosed = readSerialData();
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    addLog('デバイスが選択されませんでした', 'info');
                } else {
                    addLog(`接続エラー: ${error.message}`, 'error');
                }
            }
        } else {
            addLog('このブラウザはWeb Serial APIに対応していません', 'error');
        }
    }

    // シリアルポート切断
    async function disconnectFromSerialPort() {
        if (reader) {
            await reader.cancel();
            await readableStreamClosed;
            reader = null;
            readableStreamClosed = null;
        }

        if (port) {
            await port.close();
            port = null;
        }

        // 接続状態の更新
        isConnected = false;
        connectionStatus.textContent = '未接続';
        connectionStatus.classList.remove('connected');
        connectButton.textContent = 'QRコードリーダーに接続';
        addLog('QRコードリーダーから切断しました', 'info');
    }

    // 接続/切断ボタンのイベントリスナー
    connectButton.addEventListener('click', async () => {
        if (isConnected) {
            await disconnectFromSerialPort();
        } else {
            await connectToSerialPort();
        }
    });

    // ページ読み込み時のチェック
    try {
        if (!('serial' in navigator)) {
            connectButton.disabled = true;
            addLog('このブラウザはWeb Serial APIに対応していません。Chrome 89以降をご使用ください。', 'error');
        } else {
            addLog('準備完了。接続ボタンをクリックしてQRコードリーダーに接続してください。', 'info');
        }
    } catch (e) {
        // navigator.serialへのアクセスが制限されている場合
        console.error('シリアルポートアクセス確認エラー:', e);
        connectButton.disabled = true;
        addLog('シリアルポートアクセスが制限されています。テストボタンを使用してください。', 'error');
    }

    // デモ用テスト機能：URLパラメータで商品IDを指定すると表示
    const urlParams = new URLSearchParams(window.location.search);
    const testProductId = urlParams.get('testProduct');
    if (testProductId) {
        addLog(`テストモード: 商品ID ${testProductId} を表示`, 'info');
        displayProductInfo(testProductId);
    }
    
    // 商品マスターが通常のパスの画像を使用している場合に対応する
    function loadProductImages() {
        const products = getProductMaster();
        // デフォルト画像をプリロードするための無効なイメージオブジェクトを作成
        if (products) {
            Object.values(products).forEach(product => {
                if (product.image && !product.image.startsWith('data:') && !product.image.startsWith('product_image_')) {
                    const img = new Image();
                    img.src = product.image;
                    // エラー処理は特に何もしない
                    img.onerror = () => {};
                }
            });
        }
    }
    
    // 商品画像をプリロード
    loadProductImages();
    
    // テスト用商品ボタンのイベントリスナー設定
    const testButtons = document.querySelectorAll('.test-button');
    const testTableSelect = document.getElementById('test-table');
    
    testButtons.forEach(button => {
        button.addEventListener('click', () => {
            // QRコード読み取りをシミュレーション
            const productId = button.getAttribute('data-product-id');
            const table = testTableSelect.value;
            const orderId = 'ORDER' + Math.floor(1000 + Math.random() * 9000); // ランダムな注文ID生成
            
            // QRコードデータフォーマットに合わせた文字列生成
            const qrData = `${orderId}|${table}|${productId}`;
            
            // シミュレーションデータを処理
            addLog(`テスト読取り: ${qrData}`, 'info');
            
            try {
                const orderData = parseQRData(qrData);
                // 商品情報を表示
                displayProductInfo(orderData.productId);
                // APIに注文データを送信
                sendToAPI(orderData).catch(error => {
                    // API送信エラーはすでにハンドルされているのでここでは特に何もしない
                });
            } catch (error) {
                addLog(`データ処理エラー: ${error.message}`, 'error');
            }
        });
    });
});