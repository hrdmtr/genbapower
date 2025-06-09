document.addEventListener('DOMContentLoaded', () => {
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const appNameInput = document.getElementById('app-name');
    const appNameDescriptionInput = document.getElementById('app-name-description');
    const baseUrlInput = document.getElementById('base-url');
    const baseUrlDescriptionInput = document.getElementById('base-url-description');
    const recordsPerPageInput = document.getElementById('records-per-page');
    const recordsPerPageDescriptionInput = document.getElementById('records-per-page-description');
    const alertContainer = document.getElementById('alert-container');
    const settingsForm = document.getElementById('settings-form');
    
    const API_ENDPOINT = '/api/server-settings';
    
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
    
    async function fetchSettings() {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'サーバー設定の取得に失敗しました');
            }
            
            if (data.data) {
                appNameInput.value = data.data.appName || '';
                appNameDescriptionInput.value = data.data.appNameDescription || '';
                baseUrlInput.value = data.data.baseUrl || '';
                baseUrlDescriptionInput.value = data.data.baseUrlDescription || '';
                recordsPerPageInput.value = data.data.recordsPerPage || 20;
                recordsPerPageDescriptionInput.value = data.data.recordsPerPageDescription || '';
            } else {
                // デフォルト値を設定
                appNameInput.value = '';
                appNameDescriptionInput.value = '';
                baseUrlInput.value = '';
                baseUrlDescriptionInput.value = '';
                recordsPerPageInput.value = 20;
                recordsPerPageDescriptionInput.value = '';
            }
        } catch (error) {
            console.error('サーバー設定取得エラー:', error);
            showAlert(`サーバー設定の取得に失敗しました: ${error.message}`, 'danger');
            
            // エラー時もデフォルト値を設定
            appNameInput.value = '';
            appNameDescriptionInput.value = '';
            baseUrlInput.value = '';
            baseUrlDescriptionInput.value = '';
            recordsPerPageInput.value = 20;
            recordsPerPageDescriptionInput.value = '';
        }
    }
    
    async function saveSettings() {
        // フォームバリデーション
        if (!validateForm()) {
            return;
        }
        
        const settingsData = {
            appName: appNameInput.value,
            appNameDescription: appNameDescriptionInput.value,
            baseUrl: baseUrlInput.value,
            baseUrlDescription: baseUrlDescriptionInput.value,
            recordsPerPage: parseInt(recordsPerPageInput.value, 10),
            recordsPerPageDescription: recordsPerPageDescriptionInput.value
        };
        
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'サーバー設定の保存に失敗しました');
            }
            
            showAlert('サーバー設定が保存されました');
        } catch (error) {
            console.error('サーバー設定保存エラー:', error);
            showAlert(`サーバー設定の保存に失敗しました: ${error.message}`, 'danger');
        }
    }
    
    function validateForm() {
        let isValid = true;
        
        // アプリケーション名
        if (!appNameInput.value.trim()) {
            appNameInput.classList.add('is-invalid');
            isValid = false;
        } else {
            appNameInput.classList.remove('is-invalid');
        }
        
        // アプリケーション名の説明
        if (!appNameDescriptionInput.value.trim()) {
            appNameDescriptionInput.classList.add('is-invalid');
            isValid = false;
        } else {
            appNameDescriptionInput.classList.remove('is-invalid');
        }
        
        // サーバーベースURL
        if (!baseUrlInput.value.trim()) {
            baseUrlInput.classList.add('is-invalid');
            isValid = false;
        } else {
            baseUrlInput.classList.remove('is-invalid');
        }
        
        // サーバーベースURLの説明
        if (!baseUrlDescriptionInput.value.trim()) {
            baseUrlDescriptionInput.classList.add('is-invalid');
            isValid = false;
        } else {
            baseUrlDescriptionInput.classList.remove('is-invalid');
        }
        
        // １画面の行数
        if (!recordsPerPageInput.value || parseInt(recordsPerPageInput.value, 10) < 1) {
            recordsPerPageInput.classList.add('is-invalid');
            isValid = false;
        } else {
            recordsPerPageInput.classList.remove('is-invalid');
        }
        
        // １画面の行数の説明
        if (!recordsPerPageDescriptionInput.value.trim()) {
            recordsPerPageDescriptionInput.classList.add('is-invalid');
            isValid = false;
        } else {
            recordsPerPageDescriptionInput.classList.remove('is-invalid');
        }
        
        return isValid;
    }
    
    // 入力フィールドのバリデーション
    appNameInput.addEventListener('input', () => {
        if (appNameInput.value.trim()) {
            appNameInput.classList.remove('is-invalid');
        }
    });
    
    appNameDescriptionInput.addEventListener('input', () => {
        if (appNameDescriptionInput.value.trim()) {
            appNameDescriptionInput.classList.remove('is-invalid');
        }
    });
    
    baseUrlInput.addEventListener('input', () => {
        if (baseUrlInput.value.trim()) {
            baseUrlInput.classList.remove('is-invalid');
        }
    });
    
    baseUrlDescriptionInput.addEventListener('input', () => {
        if (baseUrlDescriptionInput.value.trim()) {
            baseUrlDescriptionInput.classList.remove('is-invalid');
        }
    });
    
    recordsPerPageInput.addEventListener('input', () => {
        if (recordsPerPageInput.value && parseInt(recordsPerPageInput.value, 10) >= 1) {
            recordsPerPageInput.classList.remove('is-invalid');
        }
    });
    
    recordsPerPageDescriptionInput.addEventListener('input', () => {
        if (recordsPerPageDescriptionInput.value.trim()) {
            recordsPerPageDescriptionInput.classList.remove('is-invalid');
        }
    });
    
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // 初期データの読み込み
    fetchSettings();
});
