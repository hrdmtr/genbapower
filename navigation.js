// navigation.js - シンプルなハンバーガーメニュー実装

// ページ読み込み完了後に実行
window.addEventListener('load', function() {
    // メニュー項目の設定
    const menuItems = [
        { title: 'ホーム', url: 'index.html', icon: 'fa-home' },
        { title: '注文一覧', url: 'orders.html', icon: 'fa-list-alt' },
        { title: 'ホールスタッフ画面', url: 'hall_staff.html', icon: 'fa-concierge-bell' },
        { title: 'QRコードで注文', url: 'qr_order.html', icon: 'fa-qrcode' },
        { title: 'QRコードテスト', url: 'qr_test.html', icon: 'fa-vial' },
        { title: '商品管理', url: 'admin.html', icon: 'fa-cog' },
        { title: '商品マスタ', url: 'product_admin.html', icon: 'fa-tags' },
        { title: '注文分析', url: 'analytics.html', icon: 'fa-chart-line' },
        { title: '処理時間分析', url: 'time_analysis.html', icon: 'fa-stopwatch' },
        { title: 'DB初期化', url: 'db_init_simple.html', icon: 'fa-database' }
    ];

    // 現在のページ名を取得
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // ハンバーガーメニューを作成
    createMenu();
    
    function createMenu() {
        // HTML要素を直接追加
        const menuHTML = `
            <div id="hamburger-menu" style="position: fixed; top: 20px; right: 20px; z-index: 1000; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; background-color: #4361ee;">
                <svg width="26" height="26" viewBox="0 0 100 100" style="display: block;">
                    <rect x="20" y="30" width="60" height="8" rx="4" fill="white"></rect>
                    <rect x="20" y="50" width="60" height="8" rx="4" fill="white"></rect>
                    <rect x="20" y="70" width="60" height="8" rx="4" fill="white"></rect>
                </svg>
            </div>

            <div id="menu-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 1001; display: none;">
            </div>

            <div id="slide-menu" style="position: fixed; top: 0; right: -280px; width: 280px; height: 100%; background-color: white; z-index: 1002; transition: right 0.3s ease; box-shadow: -5px 0 15px rgba(0,0,0,0.2); overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background-color: #4361ee; color: white;">
                    <div style="font-weight: bold; font-size: 1.2rem;">QRコード注文システム</div>
                    <div id="close-menu" style="cursor: pointer; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 50%; background: rgba(255,255,255,0.2);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </div>
                <div id="menu-items" style="padding: 20px;">
                    <!-- メニュー項目はJSで挿入 -->
                </div>
            </div>
        `;

        // ボディにメニュー要素を追加
        const menuContainer = document.createElement('div');
        menuContainer.innerHTML = menuHTML;
        document.body.appendChild(menuContainer);

        // メニュー項目を追加
        const menuItemsContainer = document.getElementById('menu-items');
        menuItems.forEach(item => {
            const itemElem = document.createElement('a');
            itemElem.href = item.url;
            itemElem.style.display = 'flex';
            itemElem.style.alignItems = 'center';
            itemElem.style.padding = '15px';
            itemElem.style.color = '#333';
            itemElem.style.textDecoration = 'none';
            itemElem.style.borderBottom = '1px solid #eee';
            itemElem.style.transition = 'all 0.3s ease';
            itemElem.style.fontWeight = '500';
            
            // 現在のページはハイライト
            if (currentPage === item.url) {
                itemElem.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
                itemElem.style.color = '#4361ee';
                itemElem.style.fontWeight = 'bold';
                itemElem.style.borderLeft = '3px solid #4361ee';
                itemElem.style.paddingLeft = '12px';
            }

            itemElem.innerHTML = `<i class="fas ${item.icon}" style="width: 25px; margin-right: 15px; color: #4361ee; text-align: center;"></i>${item.title}`;
            
            // ホバーエフェクト
            itemElem.addEventListener('mouseenter', () => {
                if (currentPage !== item.url) {
                    itemElem.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
                    itemElem.style.paddingLeft = '20px';
                }
            });
            
            itemElem.addEventListener('mouseleave', () => {
                if (currentPage !== item.url) {
                    itemElem.style.backgroundColor = '';
                    itemElem.style.paddingLeft = '15px';
                }
            });
            
            menuItemsContainer.appendChild(itemElem);
        });

        // ハンバーガーメニューのクリックイベント
        document.getElementById('hamburger-menu').addEventListener('click', function() {
            openMenu();
        });

        // 閉じるボタンのクリックイベント
        document.getElementById('close-menu').addEventListener('click', function() {
            closeMenu();
        });

        // オーバーレイのクリックイベント
        document.getElementById('menu-overlay').addEventListener('click', function() {
            closeMenu();
        });
    }

    // メニューを開く
    function openMenu() {
        document.getElementById('menu-overlay').style.display = 'block';
        document.getElementById('slide-menu').style.right = '0';
    }

    // メニューを閉じる
    function closeMenu() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('slide-menu').style.right = '-280px';
    }
});