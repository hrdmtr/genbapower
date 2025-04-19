// アプリケーションのメインスクリプト
import { getProductById } from './products.js';

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

            const responseData = await response.json();
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
    if (!('serial' in navigator)) {
        connectButton.disabled = true;
        addLog('このブラウザはWeb Serial APIに対応していません。Chrome 89以降をご使用ください。', 'error');
    } else {
        addLog('準備完了。接続ボタンをクリックしてQRコードリーダーに接続してください。', 'info');
    }

    // デモ用テスト機能：URLパラメータで商品IDを指定すると表示
    const urlParams = new URLSearchParams(window.location.search);
    const testProductId = urlParams.get('testProduct');
    if (testProductId) {
        addLog(`テストモード: 商品ID ${testProductId} を表示`, 'info');
        displayProductInfo(testProductId);
    }
});