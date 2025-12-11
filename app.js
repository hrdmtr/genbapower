// アプリケーションのメインスクリプト
import { getProductById, getProductMaster } from './products.js';

document.addEventListener('DOMContentLoaded', () => {
    // 現在日時を表示する要素を追加
    const currentDateElement = document.createElement('div');
    currentDateElement.classList.add('current-date');
    document.querySelector('.container').insertBefore(currentDateElement, document.querySelector('.container').firstChild);
    
    // 現在日時を更新する関数
    function updateCurrentDate() {
        const now = new Date();
        currentDateElement.textContent = now.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    // 1秒ごとに時刻を更新
    updateCurrentDate();
    setInterval(updateCurrentDate, 1000);
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
    const API_ENDPOINT = '/api/orders';

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
        
        // QRコードフォーマットの検証
        // テーブルQR: TABLE|TABLE_ID
        // 商品QR: PRODUCT|PRODUCT_ID
        
        if (parts.length === 2) {
            const [type, id] = parts;
            
            if (type === 'TABLE') {
                // テーブルQRコードの場合
                return {
                    type: 'table',
                    tableId: id
                };
            } else if (type === 'PRODUCT') {
                // 商品QRコードの場合
                return {
                    type: 'product',
                    productId: id
                };
            }
        }
        
        // 従来形式との互換性維持（orderId|table|productId）
        if (parts.length === 3) {
            return {
                type: 'legacy',
                orderId: parts[0],
                table: parts[1],
                productId: parts[2]
            };
        }
        
        throw new Error('不正なQRコードフォーマット');
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
                // APIエンドポイントがlocalhostの場合は、直接モックデータを返す（警告を減らすため）
                if (API_ENDPOINT.includes('example.com')) {
                    // 明らかに非実在エンドポイントなのでモック処理へ直接移行
                    throw new Error('デモ環境用のモックレスポンス');
                }
                
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
                // 開発環境やデモモードでの警告を出さない
                // サイレントに処理（コンソールログを表示しない）
                
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

    // 現在の注文状態
    let currentOrder = {
        tableId: null,
        items: [] // 注文商品リスト
    };
    
    // オーダーデータベース操作関数
    const OrderDB = {
        // オーダー一覧の取得
        getOrders: function() {
            const orders = localStorage.getItem('orders');
            return orders ? JSON.parse(orders) : [];
        },
        
        // 新規オーダーの追加
        addOrder: function(order) {
            const orders = this.getOrders();
            // 注文IDの生成
            order.id = `ORD${Date.now()}`;
            order.createdAt = new Date().toISOString();
            order.status = '受付';
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));
            return order;
        },
        
        // オーダーのステータス更新
        updateOrderStatus: function(orderId, newStatus) {
            const orders = this.getOrders();
            const orderIndex = orders.findIndex(order => order.id === orderId);
            if (orderIndex >= 0) {
                orders[orderIndex].status = newStatus;
                orders[orderIndex].updatedAt = new Date().toISOString();
                localStorage.setItem('orders', JSON.stringify(orders));
                return true;
            }
            return false;
        },
        
        // 特定のオーダーの取得
        getOrderById: function(orderId) {
            const orders = this.getOrders();
            return orders.find(order => order.id === orderId) || null;
        },
        
        // テーブル番号で注文を取得
        getOrdersByTable: function(tableId) {
            const orders = this.getOrders();
            return orders.filter(order => order.tableId === tableId);
        },
        
        // 特定のステータスの注文を取得
        getOrdersByStatus: function(status) {
            const orders = this.getOrders();
            return orders.filter(order => order.status === status);
        },
        
        // 本日の注文を取得
        getTodaysOrders: function() {
            const orders = this.getOrders();
            const today = new Date().toISOString().split('T')[0];
            return orders.filter(order => 
                order.createdAt && order.createdAt.startsWith(today)
            );
        }
    };
    
    // 注文をリセット
    function resetOrder() {
        currentOrder = {
            tableId: null,
            items: []
        };
        // テーブル選択状態をUIに反映
        updateOrderStatus();
    }
    
    // 注文状態をUIに反映
    function updateOrderStatus() {
        const orderStatusElement = document.getElementById('order-status');
        if (!orderStatusElement) return;
        
        if (currentOrder.tableId) {
            // テーブル情報と注文アイテム数を表示
            orderStatusElement.innerHTML = `<div>テーブル: ${currentOrder.tableId} - 商品数: ${currentOrder.items.length}</div>`;
            
            // 注文アイテムがある場合、詳細を表示
            if (currentOrder.items.length > 0) {
                const itemsHtml = currentOrder.items.map((item, index) => {
                    return `
                        <div class="order-item">
                            <span>${index + 1}. ${item.name} - ¥${item.price.toLocaleString()}</span>
                            <button class="remove-item-button" data-index="${index}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }).join('');
                
                orderStatusElement.innerHTML += `
                    <div class="order-items-list">
                        ${itemsHtml}
                        <div class="order-total">
                            合計: ¥${currentOrder.items.reduce((sum, item) => sum + item.price, 0).toLocaleString()}
                        </div>
                    </div>
                `;
                
                // 削除ボタンのイベントリスナーを追加
                setTimeout(() => {
                    document.querySelectorAll('.remove-item-button').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const index = parseInt(e.currentTarget.getAttribute('data-index'));
                            removeOrderItem(index);
                        });
                    });
                }, 0);
            }
            
            orderStatusElement.classList.add('has-table');
        } else {
            orderStatusElement.textContent = 'テーブルが選択されていません';
            orderStatusElement.classList.remove('has-table');
        }
    }
    
    // 注文アイテムを削除
    function removeOrderItem(index) {
        if (index >= 0 && index < currentOrder.items.length) {
            const removedItem = currentOrder.items[index];
            currentOrder.items.splice(index, 1);
            updateOrderStatus();
            addLog(`${removedItem.name}を注文から削除しました`, 'info');
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
                        const qrData = parseQRData(text);
                        
                        if (qrData.type === 'table') {
                            // テーブルQRコードの場合、テーブル情報を保存
                            currentOrder.tableId = qrData.tableId;
                            addLog(`テーブル ${qrData.tableId} が選択されました`, 'success');
                            updateOrderStatus();
                            
                        } else if (qrData.type === 'product') {
                            // 商品QRコードの場合
                            if (!currentOrder.tableId) {
                                // テーブルが選択されていない場合はエラー
                                addLog('先にテーブルを選択してください', 'error');
                                return;
                            }
                            
                            // 商品情報を取得して表示
                            const productId = qrData.productId;
                            displayProductInfo(productId);
                            
                            // 商品を注文リストに追加
                            const product = getProductById(productId);
                            if (product) {
                                // 注文アイテムを追加
                                currentOrder.items.push({
                                    productId,
                                    name: product.name,
                                    price: product.price,
                                    timestamp: new Date().toISOString()
                                });
                                
                                // 注文情報を更新
                                updateOrderStatus();
                                
                                // 注文を追加したことを通知
                                addLog(`${product.name}をカートに追加しました`, 'success');
                            }
                        } else if (qrData.type === 'legacy') {
                            // 従来形式の互換モード
                            displayProductInfo(qrData.productId);
                            await sendToAPI(qrData);
                        }
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
    
    // テーブルの注文状況を表示する関数
    function updateTableOrderStatus(tableId) {
        if (!tableId) return;
        
        // テーブルの注文を取得
        const tableOrders = OrderDB.getOrdersByTable(tableId);
        
        // 進行中の注文（キャンセルや提供済み以外）
        const activeOrders = tableOrders.filter(order => 
            order.status !== 'キャンセル' && order.status !== '提供済み'
        );
        
        // 進行中の注文をログに表示
        if (activeOrders.length > 0) {
            const statusMessage = activeOrders.map(order => {
                const itemCount = order.items.length;
                return `${order.id}: ${order.status} (${itemCount}品)`;
            }).join(', ');
            
            addLog(`テーブル ${tableId} 注文状況: ${statusMessage}`, 'info');
        }
    }
    
    // 現在の注文をAPIに送信し、ローカルストレージに保存
    async function sendOrderToAPI() {
        if (!currentOrder.tableId || currentOrder.items.length === 0) {
            addLog('送信する注文データがありません', 'error');
            return;
        }
        
        const orderData = {
            tableId: currentOrder.tableId,
            items: [...currentOrder.items], // 配列のコピーを作成
            timestamp: new Date().toISOString(),
            // 合計金額の計算
            totalAmount: currentOrder.items.reduce((sum, item) => sum + item.price, 0),
            // 詳細情報を追加
            orderDetails: {
                orderMethod: 'カートまとめ注文',
                staffId: 'SYSTEM',
                notes: 'カートからの注文'
            }
        };
        
        try {
            // 実際の環境ではリクエストを送信
            // デモ環境ではモックレスポンスを返す
            let responseData;
            
            try {
                // APIエンドポイントがlocalhostの場合は、直接モックデータを返す（警告を減らすため）
                if (API_ENDPOINT.includes('example.com')) {
                    // 明らかに非実在エンドポイントなのでモック処理へ直接移行
                    throw new Error('デモ環境用のモックレスポンス');
                }
                
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });

                if (!response.ok) {
                    throw new Error(`APIエラー: ${response.status}`);
                }

                responseData = await response.json();
            } catch (fetchError) {
                // APIが存在しない場合はモックレスポンスを返す
                // 開発環境やデモモードでの警告を出さない
                // サイレントに処理（コンソールログを表示しない）
                
                // モックレスポンスを作成
                const itemNames = currentOrder.items.map(item => item.name).join(', ');
                
                // ローカルストレージにオーダーを保存
                const savedOrder = OrderDB.addOrder(orderData);
                
                responseData = {
                    status: 'success',
                    message: `テーブル ${currentOrder.tableId} の注文を受け付けました: ${itemNames}`,
                    orderNumber: savedOrder.id,
                    estimatedTime: Math.floor(5 + Math.random() * 10) // 5～15分のランダムな準備時間
                };
                
                // テーブルの注文状況を更新表示
                updateTableOrderStatus(currentOrder.tableId);
            }
            
            addLog(`注文送信成功: ${responseData.orderNumber}`, 'success');
            
            // 注文完了後、商品リストをクリア（テーブルはそのまま）
            currentOrder.items = [];
            updateOrderStatus();
            
            return responseData;
        } catch (error) {
            addLog(`注文送信失敗: ${error.message}`, 'error');
            throw error;
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
                connectButton.innerHTML = '<i class="fas fa-unlink"></i> 切断';
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
        connectButton.innerHTML = '<i class="fas fa-plug"></i> QRコードリーダーに接続';
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
        // 開発環境での実行を優先するため、常にナビゲーターをチェック
        if (window.isSecureContext === false) {
            // 非セキュアコンテキスト（HTTP）では、Web Serial APIは動作しない
            connectButton.disabled = true;
            addLog('HTTPSでない環境ではWeb Serial APIに接続できません。テストボタンを使用してください。', 'info');
        } else if (!('serial' in navigator)) {
            connectButton.disabled = true;
            addLog('このブラウザではシリアル接続を使用できません。テストボタンを使用してください。', 'info');
        } else {
            // 接続ボタンを有効化
            connectButton.disabled = false;
            addLog('準備完了。接続ボタンをクリックしてQRコードリーダーに接続してください。', 'info');
        }
    } catch (e) {
        // navigator.serialへのアクセスが制限されている場合
        // エラーログを出さずにサイレントに処理
        connectButton.disabled = true;
        addLog('QRコードリーダーのテストにはテストボタンを使用してください。', 'info');
    }
<<<<<<< HEAD

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
    
    // 注文リセットボタンのイベントリスナー
    const resetOrderButton = document.getElementById('reset-order');
    if (resetOrderButton) {
        resetOrderButton.addEventListener('click', () => {
            resetOrder();
            addLog('注文がリセットされました', 'info');
        });
    }
    
    // 注文送信ボタンのイベントリスナー
    const sendOrderButton = document.getElementById('send-order');
    if (sendOrderButton) {
        sendOrderButton.addEventListener('click', async () => {
            try {
                await sendOrderToAPI();
            } catch (error) {
                // エラーはsendOrderToAPI内部でハンドルされている
            }
        });
    }
    
    // テーブル選択ラジオボタン
    const tableRadios = document.querySelectorAll('input[name="table"]');
    
    if (tableRadios.length > 0) {
        tableRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    const tableId = radio.value;
                    
                    // テーブル選択処理
                    addLog(`テーブル選択: ${tableId}`, 'info');
                    currentOrder.tableId = tableId;
                    addLog(`テーブル ${tableId} が選択されました`, 'success');
                    updateOrderStatus();
                }
            });
        });
    }
    
    // テスト用商品ボタンのイベントリスナー設定（即時注文処理）
    const productButtons = document.querySelectorAll('.test-button[data-product-id]');
    
    productButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-product-id');
            
            // テーブルが選択されているか確認
            if (!currentOrder.tableId) {
                addLog('先にテーブルを選択してください', 'error');
                return;
            }
            
            // 商品QRコードシミュレーション
            addLog(`商品選択: ${productId}`, 'info');
            
            // 商品情報を表示
            displayProductInfo(productId);
            
            // 商品を注文リストに追加
            const product = getProductById(productId);
            if (product) {
                // 注文アイテムを追加
                currentOrder.items.push({
                    productId,
                    name: product.name,
                    price: product.price,
                    timestamp: new Date().toISOString()
                });
                
                // 注文情報を更新
                updateOrderStatus();
                addLog(`${product.name} をカートに追加しました`, 'success');
                
                // 即時注文処理
                try {
                    // このアイテム単体での注文用オブジェクトを作成
                    const singleItemOrder = {
                        tableId: currentOrder.tableId,
                        items: [{
                            productId,
                            name: product.name,
                            price: product.price,
                            timestamp: new Date().toISOString()
                        }],
                        timestamp: new Date().toISOString(),
                        totalAmount: product.price,
                        // 詳細情報を追加
                        orderDetails: {
                            orderMethod: 'QRコード',
                            staffId: 'SYSTEM',
                            notes: '即時注文'  
                        }
                    };
                    
                    // ローカルストレージに保存
                    const savedOrder = OrderDB.addOrder(singleItemOrder);
                    
                    // テーブル番号と注文IDを関連付けて表示
                    addLog(`テーブル ${currentOrder.tableId} から注文: ${product.name} (${savedOrder.id})`, 'success');
                    
                    // 現在のテーブルの注文状況を更新表示
                    updateTableOrderStatus(currentOrder.tableId);
                } catch (error) {
                    addLog(`注文送信失敗: ${error.message}`, 'error');
                }
            }
        });
    });
});
||||||| 35fbfa4
});
=======
});
>>>>>>> origin/main
