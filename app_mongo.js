// MongoDB連携版アプリケーションのメインスクリプト
import { getProductById, getProductMaster } from './products.js';
import OrderDB from './mongo_orders_db.js';
import { testConnection, getConnectionState, addConnectionListener } from './mongo_connection.js';
import { saveData, getData, removeData } from './db_storage.js';

// グローバル変数として宣言してページリロード時に保持できるようにする
let globalCurrentOrder = {
    tableId: null,
    items: []
};

// スタンドアロンスクリプトからのアクセスを許可するために、
// グローバルスコープに関数を公開
window.restoreCurrentOrderFromGlobal = function() {
    console.log('グローバルスコープから注文復元関数が呼び出されました');
    // 関数が定義された後で呼び出すためにタイマーを設定
    setTimeout(() => {
        if (typeof restoreCurrentOrder === 'function') {
            restoreCurrentOrder();
        } else {
            console.error('restoreCurrentOrder関数がまだ定義されていません');
        }
    }, 0);
};

// ページが閉じる/リロードされる前に実行
window.addEventListener('beforeunload', async function() {
    // 統一ストレージを使用してバックアップ保存
    try {
        const currentOrderData = await getData('currentOrder', 'orders');
        if (currentOrderData) {
            await saveData('currentOrder_backup', currentOrderData, 'orders');
            console.log('unload前にバックアップ作成:', currentOrderData);
        }
    } catch (e) {
        console.error('バックアップ作成エラー:', e);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // MongoDB接続状態を表示する要素を追加
    const dbStatusElement = document.createElement('div');
    dbStatusElement.classList.add('db-status');
    dbStatusElement.id = 'db-status';
    dbStatusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> データベース接続状態を確認中...';
    document.querySelector('.container').insertBefore(dbStatusElement, document.querySelector('.container').firstChild);
    
    // MongoDB接続状態リスナーをセットアップ
    addConnectionListener((available) => {
        console.log('MongoDB接続状態変更:', available ? '接続成功' : '接続失敗');
        OrderDB.checkDatabaseStatus().then(dbStatus => {
            console.log('DB状態確認結果:', dbStatus);
            updateDbStatusElement(dbStatus);
        }).catch(err => {
            console.error('DB状態確認エラー:', err);
            dbStatusElement.innerHTML = '<i class="fas fa-times-circle"></i> データベース接続確認エラー';
            dbStatusElement.className = 'db-status disconnected';
        });
    });
    
    // データベース状態を確認して表示
    try {
        console.log('データベース状態を確認します');
        // 直接最小限の情報を表示（初期状態）
        dbStatusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> データベース接続状態を確認中...';
        dbStatusElement.className = 'db-status pending';
        
        // 非同期でDBステータスを取得
        OrderDB.checkDatabaseStatus().then(dbStatus => {
            console.log('DB状態確認結果:', dbStatus);
            updateDbStatusElement(dbStatus);
        }).catch(err => {
            console.error('DB状態確認エラー:', err);
            dbStatusElement.innerHTML = '<i class="fas fa-times-circle"></i> データベース接続確認エラー';
            dbStatusElement.className = 'db-status disconnected';
        });
    } catch (error) {
        console.error('データベース状態確認エラー:', error);
        dbStatusElement.innerHTML = '<i class="fas fa-times-circle"></i> データベース接続確認エラー';
        dbStatusElement.className = 'db-status disconnected';
    }
    
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
    
    // データベース状態表示を更新する関数
    function updateDbStatusElement(status) {
        console.log('updateDbStatusElement呼び出し:', status);
        const element = document.getElementById('db-status');
        if (!element) {
            console.error('db-status要素が見つかりません');
            return;
        }
        
        if (status.dbAvailable) {
            console.log('MongoDB接続成功表示を設定');
            element.innerHTML = `<i class="fas fa-check-circle"></i> データベース: MongoDB (注文数: ${status.orderStats.totalOrders}件)`;
            element.className = 'db-status connected';
        } else {
            console.log('ローカルストレージ使用表示を設定');
            element.innerHTML = `<i class="fas fa-database"></i> データベース: ローカルストレージ (注文数: ${status.orderStats.totalOrders}件)`;
            element.className = 'db-status disconnected';
        }
        
        console.log('データベース状態表示を更新しました');
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
    const API_ENDPOINT = 'https://example.com/api/orders';

    // ログ追加関数
    function addLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry', `log-${type}`);
        
        // 見出しスタイルを適用（【】で囲まれたタイトル）
        if (message.startsWith('【') && message.includes('】')) {
            logEntry.style.fontWeight = 'bold';
            logEntry.style.borderBottom = '1px solid #ddd';
            logEntry.style.marginTop = '10px';
            logEntry.style.paddingBottom = '3px';
            logEntry.textContent = message;
        } 
        // デバッグセクション開始見出し
        else if (message.startsWith('=====')) {
            logEntry.style.fontWeight = 'bold';
            logEntry.style.backgroundColor = '#f0f8ff';
            logEntry.style.padding = '5px';
            logEntry.style.marginTop = '15px';
            logEntry.style.marginBottom = '5px';
            logEntry.style.borderRadius = '3px';
            logEntry.textContent = message;
        } 
        // 通常のログメッセージ
        else {
            logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        }
        
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

    // 現在の注文状態
    let currentOrder = {
        tableId: null,
        items: [] // 注文商品リスト
    };
    
    // 現在の注文状態をDBに保存
    async function saveCurrentOrder() {
        console.log('注文状態を保存:', currentOrder);
        await saveData('currentOrder', currentOrder, 'orders');
    }
    
    // DBから現在の注文状態を復元
    async function restoreCurrentOrder() {
        console.log('==========================================');
        console.log('【注文情報復元開始】データベースから読み込み');
        console.log('==========================================');
        
        // 1. 現在のカート情報の取得
        let savedOrder = await getData('currentOrder', 'orders');
        let backupOrder = await getData('currentOrder_backup', 'orders');
        
        console.log('1. カート情報（currentOrder）の確認');
        if (savedOrder) {
            try {
                const orderData = savedOrder;
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
            console.log('✗ カート情報なし - データベースにcurrentOrderが見つかりません');
        }
        
        // 2. 注文履歴情報の取得
        OrderDB.getOrders().then(orders => {
            console.log('\n2. 注文履歴情報（MongoDB経由）の確認');
            if (orders && orders.length > 0) {
                const orderCount = orders.length;
                
                // 進行中の注文のみをフィルタリング
                const activeOrders = orders.filter(order => 
                    order.status !== 'キャンセル' && order.status !== '提供済み'
                );
                const activeOrderCount = activeOrders.length;
                
                console.log(`✓ 注文履歴取得成功: 総数=${orderCount}件, 進行中=${activeOrderCount}件`);
                
                if (activeOrderCount > 0) {
                    console.log('  進行中の注文:');
                    activeOrders.forEach((order, idx) => {
                        const date = new Date(order.createdAt || order.timestamp).toLocaleString('ja-JP', {
                            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        console.log(`  ${idx+1}. ID=${order.id.substring(0, 8)}, テーブル=${order.tableId}, 商品数=${order.items.length}点, 状態=${order.status}, 時刻=${date}`);
                    });
                }
                
                // UIの初期表示用にグローバル変数に設定
                window.totalOrderCount = orderCount;
                window.activeOrderCount = activeOrderCount;
            } else {
                console.log('✗ 注文履歴なし - データベースに注文が見つかりません');
                window.totalOrderCount = 0;
                window.activeOrderCount = 0;
            }
            
            // データベース状態を更新表示
            OrderDB.checkDatabaseStatus().then(updateDbStatusElement);
        }).catch(error => {
            console.error('注文履歴取得エラー:', error);
        });
        
        console.log('\n3. カート情報復元処理の実行');
        // 通常のストレージから復元を試みる
        if (savedOrder) {
            try {
                console.log('  データベースからデータを復元します...');
                currentOrder = savedOrder;
                globalCurrentOrder = {...currentOrder}; // グローバル変数にも反映
                
                // 注文状態をUIに反映する前に、DOM要素の存在確認
                const orderStatusElement = document.getElementById('order-status');
                console.log('  注文状態表示要素:', orderStatusElement ? '存在します' : '存在しません');
                
                // 注文状態をUIに反映
                updateOrderStatus();
                console.log('✓ 注文状態UI更新完了 - データベースから復元');
                addLog('以前の注文状態を復元しました', 'info');
                
                // テーブル選択ラジオボタンの状態を更新
                if (currentOrder.tableId) {
                    const tableRadio = document.querySelector(`input[name="table"][value="${currentOrder.tableId}"]`);
                    if (tableRadio) {
                        console.log(`  テーブル ${currentOrder.tableId} の選択状態を設定します`);
                        tableRadio.checked = true;
                    }
                }
                
                console.log('==========================================');
                console.log('【注文情報復元完了】UI更新完了');
                console.log('==========================================');
                return; // 復元成功したので終了
            } catch (error) {
                console.error('✗ 通常データベースからの復元に失敗:', error);
                // 通常ストレージからの復元に失敗したら、バックアップから試みる
            }
        }
        
        // 通常ストレージからの復元に失敗した場合、バックアップから試みる
        if (backupOrder) {
            try {
                console.log('  バックアップからデータを復元します...');
                currentOrder = backupOrder;
                globalCurrentOrder = {...currentOrder}; // グローバル変数にも反映
                // バックアップから復元したデータを通常のストレージにも保存
                await saveData('currentOrder', backupOrder, 'orders');
                // 注文状態をUIに反映
                updateOrderStatus();
                console.log('✓ 注文状態UI更新完了 - バックアップから復元');
                addLog('バックアップから注文状態を復元しました', 'info');
                
                // テーブル選択ラジオボタンの状態を更新
                if (currentOrder.tableId) {
                    const tableRadio = document.querySelector(`input[name="table"][value="${currentOrder.tableId}"]`);
                    if (tableRadio) {
                        console.log(`  テーブル ${currentOrder.tableId} の選択状態を設定します`);
                        tableRadio.checked = true;
                    }
                }
                
                console.log('==========================================');
                console.log('【注文情報復元完了】バックアップから復元 - UI更新完了');
                console.log('==========================================');
                return; // 復元成功したので終了
            } catch (error) {
                console.error('✗ バックアップからの復元にも失敗:', error);
                // どちらからも復元できなかった場合は初期化
            }
        }
        
        // どちらからも復元できなかった場合
        console.log('✗ 復元可能な注文状態が見つかりませんでした');
        addLog('注文情報がありません。新しい注文を開始してください。', 'info');
        console.log('==========================================');
        console.log('【注文情報復元完了】情報なし - 新規注文開始');
        console.log('==========================================');
    }
    
    // 注文をリセット
    async function resetOrder() {
        currentOrder = {
            tableId: null,
            items: []
        };
        // テーブル選択状態をUIに反映
        updateOrderStatus();
        // DBに保存
        await saveCurrentOrder();
    }
    
    // 注文状態をUIに反映
    function updateOrderStatus() {
        console.log('----------------------------------------');
        console.log('【UI更新開始】注文状態の画面表示を更新します');
        const orderStatusElement = document.getElementById('order-status');
        if (!orderStatusElement) {
            console.error('✗ 注文状態表示要素が見つかりません！');
            return;
        }
        
        console.log('現在のカート情報:', JSON.stringify(currentOrder).substring(0, 100) + '...');
        
        // テーブル選択ラジオボタンの状態をcurrentOrderに合わせる
        if (currentOrder.tableId) {
            const tableRadio = document.querySelector(`input[name="table"][value="${currentOrder.tableId}"]`);
            if (tableRadio) {
                console.log(`テーブル ${currentOrder.tableId} ラジオボタン:`, tableRadio.checked ? '選択済み' : '未選択');
                if (!tableRadio.checked) {
                    tableRadio.checked = true;
                    console.log(`テーブル ${currentOrder.tableId} のラジオボタンを選択状態に設定しました`);
                }
            } else {
                console.log(`テーブル ${currentOrder.tableId} のラジオボタンが見つかりません`);
            }
        }
        
        // HTMLコンテンツを構築する
        let statusHtml = '';
        
        // 1. 現在の注文データ（現在選択中のテーブルと注文内容）
        if (currentOrder.tableId) {
            console.log(`テーブル ${currentOrder.tableId} の注文情報を表示します - 商品数: ${currentOrder.items.length}`);
            
            // テーブル情報と注文アイテム数を表示
            statusHtml += `<div class="current-order-header">
                <h3>現在の注文内容</h3>
                <div>テーブル: ${currentOrder.tableId} - 商品数: ${currentOrder.items.length}</div>
            </div>`;
            
            // 注文アイテムがある場合、詳細を表示
            if (currentOrder.items.length > 0) {
                console.log('注文商品一覧を表示します');
                
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
                
                const totalAmount = currentOrder.items.reduce((sum, item) => sum + item.price, 0);
                console.log(`合計金額: ¥${totalAmount.toLocaleString()}`);
                
                statusHtml += `
                    <div class="order-items-list">
                        ${itemsHtml}
                        <div class="order-total">
                            合計: ¥${totalAmount.toLocaleString()}
                        </div>
                    </div>
                `;
            } else {
                console.log('注文商品がありません');
                statusHtml += '<div class="no-items">注文商品がありません</div>';
            }
            
            orderStatusElement.classList.add('has-table');
            console.log('注文状態表示要素に has-table クラスを追加しました');
        } else {
            console.log('テーブルが選択されていません');
            statusHtml = '<div class="no-table">テーブルが選択されていません</div>';
            orderStatusElement.classList.remove('has-table');
        }
        
        // 2. 進行中の注文データ（送信済みの注文履歴）- OrderDBから取得
        console.log('【注文履歴データ取得】OrderDB.getOrders()から取得中...');
        
        // 注文データを非同期で取得して表示を更新
        OrderDB.getOrders().then(allOrders => {
            console.log(`OrderDBから取得した注文数: ${allOrders.length}件`);
            
            const activeOrders = allOrders.filter(order => 
                order.status !== 'キャンセル' && order.status !== '提供済み'
            );
            
            if (activeOrders.length > 0) {
                console.log(`✓ 進行中の注文が ${activeOrders.length} 件あります`);
                console.log('  進行中の注文IDリスト:', activeOrders.map(o => o.id.substring(0, 8)).join(', '));
                
                // 進行中の注文がある場合、セクションを追加
                statusHtml += `
                    <div class="active-orders-section">
                        <h3>進行中の注文 (${activeOrders.length}件)</h3>
                        <div class="active-orders-list">
                `;
                
                // 各注文の詳細を表示
                activeOrders.forEach(order => {
                    const orderDate = new Date(order.createdAt || order.timestamp).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // ステータスに応じた色クラス
                    let statusClass = '';
                    switch(order.status) {
                        case '受付':
                            statusClass = 'status-received';
                            break;
                        case '準備中':
                            statusClass = 'status-preparing';
                            break;
                        case '準備完了':
                            statusClass = 'status-ready';
                            break;
                        case '配膳中':
                            statusClass = 'status-serving';
                            break;
                        default:
                            statusClass = '';
                    }
                    
                    statusHtml += `
                        <div class="active-order-item">
                            <div class="order-header">
                                <span class="order-id">${order.id.substring(0, 8)}</span>
                                <span class="order-table">テーブル ${order.tableId}</span>
                                <span class="order-date">${orderDate}</span>
                            </div>
                            <div class="order-detail">
                                <span class="order-items-count">商品: ${order.items.length}点</span>
                                <span class="order-amount">¥${order.totalAmount ? order.totalAmount.toLocaleString() : '不明'}</span>
                                <span class="order-status ${statusClass}">${order.status}</span>
                            </div>
                        </div>
                    `;
                });
                
                statusHtml += `
                        </div>
                    </div>
                `;
            } else {
                console.log('進行中の注文はありません');
            }
            
            // HTMLを設定
            orderStatusElement.innerHTML = statusHtml;
            
            // 削除ボタンのイベントリスナーを追加
            if (currentOrder.tableId && currentOrder.items.length > 0) {
                setTimeout(() => {
                    console.log('削除ボタンのイベントリスナーを設定します');
                    const removeButtons = document.querySelectorAll('.remove-item-button');
                    console.log(`削除ボタン数: ${removeButtons.length}`);
                    
                    removeButtons.forEach(button => {
                        button.addEventListener('click', (e) => {
                            const index = parseInt(e.currentTarget.getAttribute('data-index'));
                            console.log(`商品 ${index + 1} の削除ボタンがクリックされました`);
                            removeOrderItem(index);
                        });
                    });
                }, 0);
            }
            
            console.log('✓ UI更新完了');
            console.log('  最終的な注文状況内容:', orderStatusElement.innerHTML.substring(0, 100) + '...');
            console.log('----------------------------------------');
        }).catch(error => {
            console.error('注文履歴取得エラー:', error);
            // エラー時は現在の注文情報のみ表示
            orderStatusElement.innerHTML = statusHtml;
        });
    }
    
    // 注文アイテムを削除
    async function removeOrderItem(index) {
        if (index >= 0 && index < currentOrder.items.length) {
            const removedItem = currentOrder.items[index];
            currentOrder.items.splice(index, 1);
            updateOrderStatus();
            // DBに保存
            await saveCurrentOrder();
            addLog(`${removedItem.name}を注文から削除しました`, 'info');
        }
    }
    
    // テーブルの注文状況を表示する関数
    async function updateTableOrderStatus(tableId) {
        if (!tableId) return;
        
        try {
            // テーブルの注文を取得
            const tableOrders = await OrderDB.getOrdersByTable(tableId);
            
            // 進行中の注文（キャンセルや提供済み以外）
            const activeOrders = tableOrders.filter(order => 
                order.status !== 'キャンセル' && order.status !== '提供済み'
            );
            
            // 進行中の注文をログに表示
            if (activeOrders.length > 0) {
                const statusMessage = activeOrders.map(order => {
                    const itemCount = order.items.length;
                    return `${order.id.substring(0, 8)}: ${order.status} (${itemCount}品)`;
                }).join(', ');
                
                addLog(`テーブル ${tableId} 注文状況: ${statusMessage}`, 'info');
            }
        } catch (error) {
            console.error('テーブル注文状況取得エラー:', error);
            addLog(`テーブル ${tableId} の注文状況取得に失敗しました`, 'error');
        }
    }
    
    // 現在の注文をMongoDBに送信
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
            // MongoDB注文保存処理
            addLog(`テーブル ${orderData.tableId} の注文を保存中...`, 'info');
            
            // OrderDBモジュールを使用して注文を保存
            const savedOrder = await OrderDB.addOrder(orderData);
            
            // 保存先の表示
            const storageType = savedOrder._id ? 'MongoDB' : 'ローカルストレージ';
            
            // 成功メッセージ
            const itemNames = currentOrder.items.map(item => item.name).join(', ');
            addLog(`注文送信成功: ${savedOrder.id} (${storageType})`, 'success');
            addLog(`テーブル ${currentOrder.tableId} の注文: ${itemNames}`, 'success');
            
            // テーブルの注文状況を更新表示
            await updateTableOrderStatus(currentOrder.tableId);
            
            // 注文完了後、商品リストをクリア（テーブルはそのまま）
            currentOrder.items = [];
            updateOrderStatus();
            // DBに保存
            await saveCurrentOrder();
            
            // データベース状態を更新表示
            const dbStatus = await OrderDB.checkDatabaseStatus();
            updateDbStatusElement(dbStatus);
            
            return savedOrder;
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
                        const qrData = parseQRData(text);
                        
                        if (qrData.type === 'table') {
                            // テーブルQRコードの場合、テーブル情報を保存
                            currentOrder.tableId = qrData.tableId;
                            addLog(`テーブル ${qrData.tableId} が選択されました`, 'success');
                            updateOrderStatus();
                            // DBに保存
                            await saveCurrentOrder();
                            
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
                                // DBに保存
                                await saveCurrentOrder();
                                
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

    // デモ用テスト機能：URLパラメータで商品IDを指定すると表示
    const urlParams = new URLSearchParams(window.location.search);
    const testProductId = urlParams.get('testProduct');
    if (testProductId) {
        addLog(`テストモード: 商品ID ${testProductId} を表示`, 'info');
        displayProductInfo(testProductId);
    }
    
    // 商品マスターが通常のパスの画像を使用している場合に対応する
    function loadProductImages() {
        // 本番環境で画像が用意される前にエラーコンソールが汚れないようにする
        // 画像は商品表示時に適切に置き換えられるので、ここではプリロードしない
        
        // no-image.jpgのみプリロード
        const noImage = new Image();
        noImage.src = 'images/no-image.jpg';
        
        addLog('商品画像のプリロードは無効化しています（404エラー防止）', 'info');
    }
    
    // 商品画像をプリロード
    loadProductImages();
    
    // 注文リセットボタンのイベントリスナー
    const resetOrderButton = document.getElementById('reset-order');
    if (resetOrderButton) {
        resetOrderButton.addEventListener('click', async () => {
            await resetOrder();
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
            radio.addEventListener('change', async () => {
                if (radio.checked) {
                    const tableId = radio.value;
                    
                    // テーブル選択処理
                    addLog(`テーブル選択: ${tableId}`, 'info');
                    currentOrder.tableId = tableId;
                    addLog(`テーブル ${tableId} が選択されました`, 'success');
                    updateOrderStatus();
                    // DBに保存
                    await saveCurrentOrder();
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
                const newItem = {
                    productId,
                    name: product.name,
                    price: product.price,
                    timestamp: new Date().toISOString()
                };
                currentOrder.items.push(newItem);
                
                // グローバル変数のバックアップも更新
                globalCurrentOrder = {...currentOrder};
                
                // 注文情報を更新
                updateOrderStatus();
                
                // DBに保存 - 確実に保存するため複数回行う
                try {
                    await saveCurrentOrder();
                    // バックアップも作成
                    await saveData('currentOrder_backup', currentOrder, 'orders');
                    
                    // アイテム追加を確認するための特別なフラグ
                    const saveCheck = {
                        lastAction: 'item_added',
                        timestamp: new Date().toISOString(),
                        item: newItem
                    };
                    await saveData('currentOrder_check', saveCheck, 'orders');
                } catch (e) {
                    console.error('保存エラー:', e);
                }
                
                addLog(`${product.name} をカートに追加しました`, 'success');
            }
        });
    });
    
    // データベース情報表示ボタン
    const dbInfoButton = document.getElementById('db-info');
    if (dbInfoButton) {
        dbInfoButton.addEventListener('click', async () => {
            try {
                const dbStatus = await OrderDB.checkDatabaseStatus();
                const connectionState = getConnectionState();
                
                // 現在のログをクリア
                if (logContainer) {
                    logContainer.innerHTML = '';
                }
                
                // 情報表示
                addLog('===== データベース情報 =====', 'info');
                addLog(`データベースタイプ: ${dbStatus.dbType}`, 'info');
                addLog(`接続状態: ${dbStatus.dbAvailable ? '接続済み' : '未接続'}`, dbStatus.dbAvailable ? 'success' : 'info');
                addLog(`MongoDB URI: ${connectionState.config.uri}`, 'info');
                
                // 注文統計情報
                addLog('【注文データ統計】', 'info');
                addLog(`総注文数: ${dbStatus.orderStats.totalOrders}件`, 'info');
                addLog(`本日の注文数: ${dbStatus.orderStats.todayOrders}件`, 'info');
                
                // ステータス別内訳
                if (dbStatus.orderStats.statusCounts) {
                    addLog('【ステータス別内訳】', 'info');
                    for (const [status, count] of Object.entries(dbStatus.orderStats.statusCounts)) {
                        addLog(`${status}: ${count}件`, 'info');
                    }
                }
                
                // テーブル別内訳
                if (dbStatus.orderStats.tableCounts) {
                    addLog('【テーブル別内訳】', 'info');
                    for (const [table, count] of Object.entries(dbStatus.orderStats.tableCounts)) {
                        addLog(`${table}: ${count}件`, 'info');
                    }
                }
                
                // スクロールをログの一番下に
                if (logContainer) {
                    logContainer.scrollTop = logContainer.scrollHeight;
                }
            } catch (error) {
                console.error('データベース情報取得エラー:', error);
                addLog(`データベース情報取得エラー: ${error.message}`, 'error');
            }
        });
    }
    
    // データベース接続テストボタン
    const dbTestButton = document.getElementById('db-test');
    if (dbTestButton) {
        console.log('MongoDB接続テストボタンを検出しました');
        
        dbTestButton.addEventListener('click', async function() {
            console.log('MongoDB接続テストボタンがクリックされました');
            
            // ログを空にする
            if (logContainer) {
                logContainer.innerHTML = '';
            }
            
            try {
                // ボタンを一時的に無効化
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> テスト中...';
                console.log('テストボタン無効化、スピナー表示');
                
                // DB接続状態表示を更新
                const dbStatusElement = document.getElementById('db-status');
                if (dbStatusElement) {
                    dbStatusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MongoDB接続テスト実行中...';
                    dbStatusElement.className = 'db-status pending';
                    console.log('DB接続状態表示を更新: テスト中');
                }
                
                // ログにテスト開始メッセージを表示
                addLog('===== MongoDB接続テスト開始 =====', 'info');
                addLog('MongoDB接続を確認中...', 'info');
                console.log('ログにテスト開始メッセージを表示');
                
                // 接続テスト実行（新しいユーティリティを使用）
                console.log('MongoDB接続テスト関数を呼び出し');
                const dbAvailable = await testConnection();
                console.log('MongoDB接続テスト結果:', dbAvailable ? '成功' : '失敗');
                
                // テスト結果をログに表示
                if (dbAvailable) {
                    addLog('✅ MongoDB接続テスト成功!', 'success');
                    addLog('データベースに正常に接続できました', 'success');
                    console.log('成功メッセージをログに表示');
                } else {
                    addLog('❌ MongoDB接続テスト失敗', 'error');
                    addLog('データベースに接続できません。ローカルストレージを使用します。', 'error');
                    addLog('DB設定を確認してください:', 'info');
                    addLog('1. MongoDB Atlasが正しく設定されていますか?', 'info');
                    addLog('2. 証明書のパスは正しいですか?', 'info');
                    addLog('3. インターネット接続は有効ですか?', 'info');
                    console.log('失敗メッセージとトラブルシューティング情報をログに表示');
                }
                
                // 接続状態を取得して表示
                const connectionState = getConnectionState();
                addLog(`MongoDB URI: ${connectionState.config.uri}`, 'info');
                addLog(`データベース名: ${connectionState.config.dbName}`, 'info');
                
                // 再度DBの状態をチェックして表示を更新
                console.log('DB状態を再チェック');
                const dbStatus = await OrderDB.checkDatabaseStatus();
                console.log('DB状態チェック結果:', dbStatus);
                updateDbStatusElement(dbStatus);
                
                // テスト完了メッセージ
                addLog('===== MongoDB接続テスト完了 =====', 'info');
                console.log('テスト完了メッセージをログに表示');
                
                // スクロールをログの一番下に
                if (logContainer) {
                    logContainer.scrollTop = logContainer.scrollHeight;
                }
            } catch (error) {
                console.error('MongoDB接続テストエラー:', error);
                addLog(`MongoDB接続テストエラー: ${error.message}`, 'error');
            } finally {
                // ボタンを元に戻す
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-vial"></i> DB接続テスト';
                console.log('テストボタンを元に戻しました');
            }
        });
        
        console.log('MongoDB接続テストボタンイベントリスナー設定完了');
    } else {
        console.error('MongoDB接続テストボタンが見つかりません！');
    }
    
    // ページ読み込み時に前回の注文状態を復元
    // 確実にUIが準備できてから実行するために遅延を設定
    console.log('==========================================');
    console.log('【ページ初期化】ページ読み込み完了しました');
    console.log('==========================================');
    
    setTimeout(() => {
        console.log('\n⏳ 注文情報の読み込みを開始します');
        console.log('  タイムスタンプ:', new Date().toLocaleString());
        
        // ブラウザ情報を出力（デバッグ用）
        console.log('  ブラウザ情報:', navigator.userAgent);
        
        // データ読み込み実行
        restoreCurrentOrder();
        
        // UIの確認
        const orderStatusElement = document.getElementById('order-status');
        if (orderStatusElement) {
            console.log('\n⏳ 注文状態の表示を確認します');
            console.log('  要素の長さ:', orderStatusElement.innerHTML.length, '文字');
            
            // クラスの確認
            const hasTableClass = orderStatusElement.classList.contains('has-table');
            console.log(`  テーブル選択状態: ${hasTableClass ? 'あり' : 'なし'}`);
            
            // テーブル選択ラジオボタンの確認
            const selectedRadio = document.querySelector('input[name="table"]:checked');
            if (selectedRadio) {
                console.log(`  選択中のテーブル: ${selectedRadio.value}`);
            } else {
                console.log('  選択中のテーブル: なし');
            }
        } else {
            console.error('✗ 注文状態表示要素が見つかりません');
        }
        
        console.log('==========================================');
        console.log('【ページ初期化完了】注文情報を復元しました');
        console.log('==========================================');
    }, 100); // 100ms遅延で実行
});