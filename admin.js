// 商品管理画面のスクリプト
import { productMaster } from './products.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productImageInput = document.getElementById('product-image');
    const productDescriptionInput = document.getElementById('product-description');
    const saveProductButton = document.getElementById('save-product');
    const deleteProductButton = document.getElementById('delete-product');
    const clearFormButton = document.getElementById('clear-form');
    const productList = document.getElementById('product-list');
    const productSearchInput = document.getElementById('product-search');
    const exportButton = document.getElementById('export-products');
    const importButton = document.getElementById('import-products');
    const importFileInput = document.getElementById('import-file');
    const toast = document.getElementById('toast');
    const imageUpload = document.getElementById('image-upload');
    const previewImg = document.getElementById('preview-img');
    const imagePath = document.getElementById('image-path');

    // 画像ストレージのキープレフィックス
    const IMAGE_STORAGE_PREFIX = 'product_image_';

    // ローカルストレージにデータが存在するか確認
    let products = {};
    const storedProducts = localStorage.getItem('productMaster');
    
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        // 初期データをローカルストレージに保存
        products = { ...productMaster };
        saveProductsToStorage();
    }

    // 商品一覧を表示
    renderProductList();

    // フォームクリア
    function clearForm() {
        productForm.reset();
        productIdInput.readOnly = false;
        deleteProductButton.style.display = 'none';
        productIdInput.focus();
        
        // 画像プレビューをリセット
        previewImg.src = 'images/no-image.jpg';
        imagePath.textContent = '選択されていません';
        productImageInput.value = '';
    }

    // トースト通知を表示
    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.className = isError ? 'toast error show' : 'toast show';
        
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }

    // 商品データをローカルストレージに保存
    function saveProductsToStorage() {
        localStorage.setItem('productMaster', JSON.stringify(products));
    }

    // 画像をBase64形式で保存
    function saveImageToStorage(productId, dataUrl) {
        if (dataUrl && dataUrl !== 'images/no-image.jpg') {
            localStorage.setItem(`${IMAGE_STORAGE_PREFIX}${productId}`, dataUrl);
            return `${IMAGE_STORAGE_PREFIX}${productId}`;
        }
        return '';
    }

    // 保存された画像をロード
    function loadImageFromStorage(imageKey) {
        // imageKeyがストレージキーの場合はストレージから読み込む
        if (imageKey && imageKey.startsWith(IMAGE_STORAGE_PREFIX)) {
            return localStorage.getItem(imageKey) || 'images/no-image.jpg';
        }
        // 通常のパスの場合はそのまま返す
        return imageKey || 'images/no-image.jpg';
    }

    // 商品一覧を表示
    function renderProductList(filterText = '') {
        productList.innerHTML = '';
        
        const filteredProducts = Object.entries(products).filter(([id, product]) => {
            return product.name.toLowerCase().includes(filterText.toLowerCase());
        });

        filteredProducts.forEach(([id, product]) => {
            const row = document.createElement('tr');
            
            // 商品画像のサムネイル要素
            const thumbnailCell = document.createElement('td');
            const thumbnail = document.createElement('div');
            thumbnail.className = 'product-thumbnail';
            
            const thumbnailImg = document.createElement('img');
            thumbnailImg.src = loadImageFromStorage(product.image);
            thumbnailImg.alt = product.name;
            thumbnailImg.className = 'thumbnail-img';
            
            thumbnail.appendChild(thumbnailImg);
            thumbnailCell.appendChild(thumbnail);
            
            // 商品データを表示
            row.innerHTML = `
                <td>${id}</td>
                <td>${product.name}</td>
                <td>¥${product.price.toLocaleString()}</td>
                <td>
                    <button class="action-button edit-button" data-id="${id}">編集</button>
                </td>
            `;
            
            // 先頭にサムネイルを挿入
            row.insertBefore(thumbnailCell, row.firstChild);
            
            productList.appendChild(row);
        });

        // 編集ボタンにイベントリスナーを追加
        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-id');
                const product = products[productId];
                if (product) {
                    // フォームに商品データを設定
                    productIdInput.value = productId;
                    productIdInput.readOnly = true;
                    productNameInput.value = product.name;
                    productPriceInput.value = product.price;
                    productDescriptionInput.value = product.description || '';
                    deleteProductButton.style.display = 'block';
                    
                    // 画像プレビューを設定
                    const imageSrc = loadImageFromStorage(product.image);
                    previewImg.src = imageSrc;
                    imagePath.textContent = product.image || '選択されていません';
                    productImageInput.value = product.image || '';
                }
            });
        });
    }

    // 画像アップロードの処理
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                previewImg.src = dataUrl;
                imagePath.textContent = file.name;
                
                // 画像データをproductImageInputに一時保存（フォーム送信時に使用）
                productImageInput.value = dataUrl;
            };
            
            reader.readAsDataURL(file);
        }
    });

    // 商品保存処理
    saveProductButton.addEventListener('click', () => {
        const id = productIdInput.value.trim();
        const name = productNameInput.value.trim();
        const price = parseInt(productPriceInput.value) || 0;
        const imageData = productImageInput.value;
        const description = productDescriptionInput.value.trim();

        // 入力チェック
        if (!id || !name || price <= 0) {
            showToast('必須項目を入力してください。', true);
            return;
        }

        // 画像をストレージに保存し、キーを取得
        let imageKey = '';
        if (imageData) {
            if (imageData.startsWith('data:image')) {
                // 新しいアップロード画像の場合
                imageKey = saveImageToStorage(id, imageData);
            } else {
                // 既存の画像パスまたはストレージキーの場合
                imageKey = imageData;
            }
        }

        // 商品データを追加または更新
        products[id] = {
            name,
            price,
            image: imageKey || `images/${id.toLowerCase()}.jpg`,
            description
        };

        // ローカルストレージに保存
        saveProductsToStorage();

        // フォームクリアと商品一覧更新
        clearForm();
        renderProductList();
        showToast('商品情報を保存しました。');
    });

    // 商品削除処理
    deleteProductButton.addEventListener('click', () => {
        const id = productIdInput.value.trim();
        
        if (id && products[id]) {
            if (confirm(`商品ID ${id} を削除しますか？`)) {
                // 関連する画像データも削除
                const imageKey = products[id].image;
                if (imageKey && imageKey.startsWith(IMAGE_STORAGE_PREFIX)) {
                    localStorage.removeItem(imageKey);
                }
                
                delete products[id];
                saveProductsToStorage();
                clearForm();
                renderProductList();
                showToast('商品を削除しました。');
            }
        }
    });

    // フォームクリアボタン
    clearFormButton.addEventListener('click', clearForm);

    // 検索機能
    productSearchInput.addEventListener('input', (e) => {
        renderProductList(e.target.value);
    });

    // エクスポート機能
    exportButton.addEventListener('click', () => {
        // 現在の商品データを画像込みでエクスポート準備
        const exportData = {
            products: products,
            images: {}
        };
        
        // 画像データを収集
        Object.values(products).forEach(product => {
            const imageKey = product.image;
            if (imageKey && imageKey.startsWith(IMAGE_STORAGE_PREFIX)) {
                exportData.images[imageKey] = localStorage.getItem(imageKey);
            }
        });
        
        // JSONに変換してダウンロード
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_master_with_images.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('商品データをエクスポートしました。');
    });

    // インポートボタンクリック時はファイル選択ダイアログを開く
    importButton.addEventListener('click', () => {
        importFileInput.click();
    });

    // ファイルが選択されたら処理
    importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    // 形式チェック
                    if (!importedData.products || typeof importedData.products !== 'object') {
                        throw new Error('無効なデータ形式です。products オブジェクトが必要です。');
                    }
                    
                    if (confirm('現在の商品データを上書きしますか？')) {
                        // 画像データをインポート
                        if (importedData.images && typeof importedData.images === 'object') {
                            Object.entries(importedData.images).forEach(([key, value]) => {
                                localStorage.setItem(key, value);
                            });
                        }
                        
                        // 商品データをインポート
                        products = importedData.products;
                        saveProductsToStorage();
                        renderProductList();
                        showToast('商品データをインポートしました。');
                    }
                } catch (error) {
                    showToast('ファイルの読み込みに失敗しました: ' + error.message, true);
                }
                
                // ファイル入力をリセット
                importFileInput.value = '';
            };
            
            reader.readAsText(file);
        }
    });

    // サンプルデータの追加（初回のみ）
    function addSampleProducts() {
        // すでに商品データがある場合は追加しない
        if (Object.keys(products).length > 0) {
            return;
        }
        
        // サンプル商品データ
        const sampleProducts = {
            "P001": {
                name: "醤油ラーメン",
                price: 800,
                image: "images/shoyu_ramen.jpg",
                description: "当店自慢の醤油ベーススープに特製の中太麺が絡む一品"
            },
            "P002": {
                name: "味噌ラーメン",
                price: 850,
                image: "images/miso_ramen.jpg",
                description: "北海道産の味噌を使用した濃厚スープと太麺の組み合わせ"
            },
            "P003": {
                name: "塩ラーメン",
                price: 800,
                image: "images/shio_ramen.jpg",
                description: "あっさりとした塩味のスープに細麺が特徴の一杯"
            },
            "P004": {
                name: "とんこつラーメン",
                price: 900,
                image: "images/tonkotsu_ramen.jpg",
                description: "豚骨を長時間煮込んだ濃厚なスープに細麺を合わせた博多風"
            },
            "P005": {
                name: "つけ麺",
                price: 950,
                image: "images/tsukemen.jpg",
                description: "濃厚なスープに極太麺をつけて食べる人気メニュー"
            },
            "P006": {
                name: "チャーシュー丼",
                price: 400,
                image: "images/chashu_don.jpg",
                description: "特製チャーシューをご飯の上にたっぷりと"
            },
            "P007": {
                name: "餃子（6個）",
                price: 350,
                image: "images/gyoza.jpg",
                description: "手作りの皮に野菜と豚肉をたっぷり包んだ一品"
            },
            "P008": {
                name: "ビール",
                price: 500,
                image: "images/beer.jpg",
                description: "ラーメンとの相性抜群の冷えたビール"
            }
        };
        
        // サンプルデータを追加
        products = { ...sampleProducts };
        saveProductsToStorage();
        renderProductList();
    }

    // サンプルデータを追加
    addSampleProducts();

    // 商品テーブルにサムネイル列のヘッダーを追加
    const tableHeader = document.querySelector('.product-table thead tr');
    if (tableHeader) {
        const thumbnailHeader = document.createElement('th');
        thumbnailHeader.textContent = '画像';
        tableHeader.insertBefore(thumbnailHeader, tableHeader.firstChild);
    }

    // 初期設定
    clearForm();
});