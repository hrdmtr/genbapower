// 管理画面機能
import { saveData, getData } from './db_storage.js';

// 定数
const IMAGE_STORAGE_PREFIX = 'product_image_';

document.addEventListener('DOMContentLoaded', async function() {
    // DOM要素
    const productForm = document.getElementById('product-form');
    const productList = document.getElementById('product-list');
    const productModal = document.getElementById('product-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productDescriptionInput = document.getElementById('product-description');
    const productImageInput = document.getElementById('product-image');
    const productImagePreview = document.getElementById('image-preview');
    
    // 追加ボタン
    const addProductButton = document.getElementById('add-product');
    
    // トースト通知要素
    const toast = document.getElementById('toast');
    
    // 編集中の商品ID
    let editingProductId = null;
    let isCreatingNew = false;
    
    // 商品データ
    let products = [];
    
    // 初期化
    init();
    
    // 初期化関数
    async function init() {
        // データベースから商品データを読み込む
        const storedProducts = await getData('productMaster', 'products');
        if (storedProducts) {
            products = storedProducts;
            renderProductList();
            showToast('商品データを読み込みました');
        } else {
            // 初期データが無ければデフォルト商品を設定
            products = getDefaultProducts();
            await saveProductsToStorage();
            renderProductList();
            showToast('デフォルト商品データを生成しました');
        }
    }
    
    // トースト通知を表示
    function showToast(message) {
        toast.textContent = message;
        toast.className = 'toast show';
        
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }

    // 商品データをデータベースに保存
    async function saveProductsToStorage() {
        await saveData('productMaster', products, 'products');
    }

    // 画像をBase64形式で保存
    async function saveImageToStorage(productId, dataUrl) {
        if (dataUrl && dataUrl !== 'images/no-image.jpg') {
            await saveData(`${IMAGE_STORAGE_PREFIX}${productId}`, dataUrl, 'images');
            return `${IMAGE_STORAGE_PREFIX}${productId}`;
        }
        return '';
    }

    // 保存された画像をロード
    async function loadImageFromStorage(imageKey) {
        // imageKeyがストレージキーの場合はストレージから読み込む
        if (imageKey && imageKey.startsWith(IMAGE_STORAGE_PREFIX)) {
            const imageData = await getData(imageKey, 'images');
            return imageData || 'images/no-image.jpg';
        }
        // 通常のパスの場合はそのまま返す
        return imageKey || 'images/no-image.jpg';
    }
    
    // 商品リストの表示更新
    async function renderProductList() {
        productList.innerHTML = '';
        
        products.forEach(async (product) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // 画像の取得
            let imageUrl = 'images/no-image.jpg';
            if (product.image) {
                imageUrl = await loadImageFromStorage(product.image);
            }
            
            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image">
                </div>
                <div class="product-details">
                    <div class="product-id">${product.id}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">¥${product.price.toLocaleString()}</div>
                    <div class="product-description">${product.description || '説明なし'}</div>
                </div>
                <div class="product-actions">
                    <button class="edit-button" data-id="${product.id}">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="delete-button" data-id="${product.id}">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            `;
            
            // 編集ボタンのイベント
            const editButton = card.querySelector('.edit-button');
            editButton.addEventListener('click', () => {
                openEditModal(product.id);
            });
            
            // 削除ボタンのイベント
            const deleteButton = card.querySelector('.delete-button');
            deleteButton.addEventListener('click', () => {
                deleteProduct(product.id);
            });
            
            productList.appendChild(card);
        });
    }
    
    // 編集モーダルを開く
    async function openEditModal(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        editingProductId = productId;
        isCreatingNew = false;
        
        modalTitle.textContent = `商品編集: ${product.name}`;
        productIdInput.value = product.id;
        productIdInput.disabled = true;
        productNameInput.value = product.name;
        productPriceInput.value = product.price;
        productDescriptionInput.value = product.description || '';
        
        // 画像の表示
        if (product.image) {
            const imageUrl = await loadImageFromStorage(product.image);
            productImagePreview.src = imageUrl;
            productImagePreview.style.display = 'block';
        } else {
            productImagePreview.src = 'images/no-image.jpg';
            productImagePreview.style.display = 'block';
        }
        
        productModal.style.display = 'block';
    }
    
    // 新規商品追加モーダルを開く
    function openNewProductModal() {
        editingProductId = null;
        isCreatingNew = true;
        
        modalTitle.textContent = '新規商品追加';
        
        // 新規IDを生成
        const maxId = products.reduce((max, p) => {
            const idNum = parseInt(p.id.replace('P', ''));
            return idNum > max ? idNum : max;
        }, 0);
        
        const newId = `P${(maxId + 1).toString().padStart(3, '0')}`;
        
        productIdInput.value = newId;
        productIdInput.disabled = false;
        productNameInput.value = '';
        productPriceInput.value = '0';
        productDescriptionInput.value = '';
        productImagePreview.src = 'images/no-image.jpg';
        productImagePreview.style.display = 'block';
        
        productModal.style.display = 'block';
    }
    
    // モーダルを閉じる
    function closeProductModal() {
        productModal.style.display = 'none';
        editingProductId = null;
        isCreatingNew = false;
    }
    
    // 商品を削除
    async function deleteProduct(productId) {
        if (!confirm(`商品ID: ${productId} を削除してもよろしいですか？`)) return;
        
        // 商品リストから削除
        products = products.filter(p => p.id !== productId);
        
        // ストレージを更新
        await saveProductsToStorage();
        
        // 画面を更新
        renderProductList();
        
        showToast(`商品ID: ${productId} を削除しました`);
    }
    
    // 画像ファイル選択時のプレビュー処理
    productImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // ファイルサイズチェック（1MB以下）
        if (file.size > 1024 * 1024) {
            alert('画像サイズは1MB以下にしてください');
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            productImagePreview.src = event.target.result;
            productImagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
    
    // フォーム送信処理
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const productId = productIdInput.value.trim();
        const productName = productNameInput.value.trim();
        const productPrice = parseInt(productPriceInput.value);
        const productDescription = productDescriptionInput.value.trim();
        
        // 入力検証
        if (!productId || !productName || isNaN(productPrice)) {
            alert('必須項目を入力してください');
            return;
        }
        
        // ID形式チェック
        const idRegex = /^P\d{3}$/;
        if (!idRegex.test(productId)) {
            alert('商品IDは「P」に続く3桁の数字にしてください（例: P001）');
            return;
        }
        
        // 新規追加時のID重複チェック
        if (isCreatingNew && products.some(p => p.id === productId)) {
            alert(`商品ID ${productId} は既に使用されています`);
            return;
        }
        
        // 画像データの保存準備
        let imageKey = '';
        
        // 画像ファイルが選択されている場合
        if (productImageInput.files && productImageInput.files[0]) {
            imageKey = await saveImageToStorage(productId, productImagePreview.src);
        } 
        // 既存の画像がある場合（編集モード）
        else if (editingProductId) {
            const existingProduct = products.find(p => p.id === editingProductId);
            if (existingProduct && existingProduct.image) {
                imageKey = existingProduct.image;
            }
        }
        
        // 商品オブジェクトの作成
        const product = {
            id: productId,
            name: productName,
            price: productPrice,
            description: productDescription,
            image: imageKey || (productImagePreview.src !== 'images/no-image.jpg' ? productImagePreview.src : '')
        };
        
        // 新規追加または既存商品の更新
        if (isCreatingNew) {
            products.push(product);
            showToast(`商品 ${productName} を追加しました`);
        } else {
            const index = products.findIndex(p => p.id === editingProductId);
            if (index !== -1) {
                products[index] = product;
                showToast(`商品 ${productName} を更新しました`);
            }
        }
        
        // ストレージを更新
        await saveProductsToStorage();
        
        // 画面を更新
        renderProductList();
        
        // モーダルを閉じる
        closeProductModal();
    });
    
    // 追加ボタンのイベント
    addProductButton.addEventListener('click', openNewProductModal);
    
    // モーダル閉じるボタンのイベント
    closeModal.addEventListener('click', closeProductModal);
    
    // モーダル外クリックで閉じる
    window.addEventListener('click', function(event) {
        if (event.target === productModal) {
            closeProductModal();
        }
    });
    
    // デフォルト商品データ
    function getDefaultProducts() {
        return [
            {
                id: 'P001',
                name: 'コーヒー',
                price: 480,
                description: '香り豊かな深煎りコーヒー',
                image: 'images/coffee.jpg'
            },
            {
                id: 'P002',
                name: 'カフェラテ',
                price: 520,
                description: '濃厚なエスプレッソとミルクの組み合わせ',
                image: 'images/latte.jpg'
            },
            {
                id: 'P003',
                name: 'クッキー',
                price: 320,
                description: 'サクサク食感のチョコチップクッキー',
                image: 'images/cookie.jpg'
            },
            {
                id: 'P004',
                name: 'アイスクリーム',
                price: 450,
                description: 'バニラビーンズたっぷりのアイスクリーム',
                image: 'images/ice_cream.jpg'
            }
        ];
    }
});