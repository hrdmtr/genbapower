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

    // 商品一覧を表示
    function renderProductList(filterText = '') {
        productList.innerHTML = '';
        
        const filteredProducts = Object.entries(products).filter(([id, product]) => {
            return product.name.toLowerCase().includes(filterText.toLowerCase());
        });

        filteredProducts.forEach(([id, product]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${id}</td>
                <td>${product.name}</td>
                <td>¥${product.price.toLocaleString()}</td>
                <td>
                    <button class="action-button edit-button" data-id="${id}">編集</button>
                </td>
            `;
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
                    productImageInput.value = product.image || '';
                    productDescriptionInput.value = product.description || '';
                    deleteProductButton.style.display = 'block';
                }
            });
        });
    }

    // 商品保存処理
    saveProductButton.addEventListener('click', () => {
        const id = productIdInput.value.trim();
        const name = productNameInput.value.trim();
        const price = parseInt(productPriceInput.value) || 0;
        const image = productImageInput.value.trim();
        const description = productDescriptionInput.value.trim();

        // 入力チェック
        if (!id || !name || price <= 0) {
            showToast('必須項目を入力してください。', true);
            return;
        }

        // 商品データを追加または更新
        products[id] = {
            name,
            price,
            image: image || `images/${id.toLowerCase()}.jpg`,
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
        // 現在の商品データをJSON形式でダウンロード
        const jsonData = JSON.stringify(products, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_master.json';
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
                    if (typeof importedData !== 'object') {
                        throw new Error('無効なデータ形式です。');
                    }
                    
                    if (confirm('現在の商品データを上書きしますか？')) {
                        products = importedData;
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

    // 初期設定
    clearForm();
});