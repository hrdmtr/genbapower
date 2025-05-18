document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.getElementById('products-table-body');
    const addProductBtn = document.getElementById('add-product-btn');
    const saveProductBtn = document.getElementById('save-product-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const alertContainer = document.getElementById('alert-container');
    
    const productModal = new bootstrap.Modal(document.getElementById('product-modal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-modal'));
    
    const productIdInput = document.getElementById('product-id');
    const productProductIdInput = document.getElementById('product-product-id');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productImageInput = document.getElementById('product-image');
    const productDescriptionInput = document.getElementById('product-description');
    
    let deleteProductId = null;
    
    const API_ENDPOINT = '/api/products';
    
    function showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.classList.add('alert', `alert-${type}`, 'alert-dismissible', 'fade', 'show');
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 300);
        }, 5000);
    }
    
    async function fetchProducts() {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '商品データの取得に失敗しました');
            }
            
            displayProducts(data.data || []);
        } catch (error) {
            console.error('商品データ取得エラー:', error);
            showAlert(`商品データの取得に失敗しました: ${error.message}`, 'danger');
            
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        データの読み込みに失敗しました。再読み込みしてください。
                    </td>
                </tr>
            `;
        }
    }
    
    function displayProducts(products) {
        if (products.length === 0) {
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        商品がありません
                    </td>
                </tr>
            `;
            return;
        }
        
        productsTableBody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${product.productId || ''}</td>
                <td>${product.name || ''}</td>
                <td>${product.price ? `${product.price.toLocaleString()}円` : ''}</td>
                <td>
                    ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-image">` : ''}
                </td>
                <td>${product.description || ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-btn me-1" data-product-id="${product._id}">編集</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-product-id="${product._id}" data-product-name="${product.name}">削除</button>
                </td>
            `;
            
            productsTableBody.appendChild(row);
        });
        
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                openEditModal(productId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-product-id');
                const productName = button.getAttribute('data-product-name');
                openDeleteModal(productId, productName);
            });
        });
    }
    
    function openAddModal() {
        productIdInput.value = '';
        productProductIdInput.value = '';
        productNameInput.value = '';
        productPriceInput.value = '';
        productImageInput.value = '';
        productDescriptionInput.value = '';
        
        document.getElementById('product-modal-label').textContent = '新規商品追加';
        
        productModal.show();
    }
    
    async function openEditModal(productId) {
        try {
            const response = await fetch(`${API_ENDPOINT}/${productId}`);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '商品データの取得に失敗しました');
            }
            
            const product = data.data;
            
            productIdInput.value = product._id;
            productProductIdInput.value = product.productId || '';
            productNameInput.value = product.name || '';
            productPriceInput.value = product.price || '';
            productImageInput.value = product.image || '';
            productDescriptionInput.value = product.description || '';
            
            document.getElementById('product-modal-label').textContent = '商品編集';
            
            productModal.show();
        } catch (error) {
            console.error('商品データ取得エラー:', error);
            showAlert(`商品データの取得に失敗しました: ${error.message}`, 'danger');
        }
    }
    
    function openDeleteModal(productId, productName) {
        deleteProductId = productId;
        document.getElementById('delete-product-name').textContent = productName;
        deleteModal.show();
    }
    
    async function saveProduct() {
        const productData = {
            productId: productProductIdInput.value,
            name: productNameInput.value,
            price: parseInt(productPriceInput.value, 10),
            image: productImageInput.value,
            description: productDescriptionInput.value
        };
        
        const isEdit = productIdInput.value !== '';
        const url = isEdit ? `${API_ENDPOINT}/${productIdInput.value}` : API_ENDPOINT;
        const method = isEdit ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '商品の保存に失敗しました');
            }
            
            productModal.hide();
            
            showAlert(isEdit ? '商品が更新されました' : '商品が追加されました');
            
            fetchProducts();
        } catch (error) {
            console.error('商品保存エラー:', error);
            showAlert(`商品の保存に失敗しました: ${error.message}`, 'danger');
        }
    }
    
    async function deleteProduct() {
        if (!deleteProductId) return;
        
        try {
            const response = await fetch(`${API_ENDPOINT}/${deleteProductId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '商品の削除に失敗しました');
            }
            
            deleteModal.hide();
            
            showAlert('商品が削除されました');
            
            fetchProducts();
        } catch (error) {
            console.error('商品削除エラー:', error);
            showAlert(`商品の削除に失敗しました: ${error.message}`, 'danger');
        } finally {
            deleteProductId = null;
        }
    }
    
    addProductBtn.addEventListener('click', openAddModal);
    saveProductBtn.addEventListener('click', saveProduct);
    confirmDeleteBtn.addEventListener('click', deleteProduct);
    
    fetchProducts();
});
