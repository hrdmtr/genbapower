document.addEventListener('DOMContentLoaded', () => {
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const mobileSaveSettingsBtn = document.getElementById('mobile-save-settings-btn');
    const baseUrlInput = document.getElementById('base-url');
    const recordsPerPageInput = document.getElementById('records-per-page');
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
                baseUrlInput.value = data.data.baseUrl || '';
                recordsPerPageInput.value = data.data.recordsPerPage || 20;
            } else {
                baseUrlInput.value = '';
                recordsPerPageInput.value = 20;
            }
        } catch (error) {
            console.error('サーバー設定取得エラー:', error);
            showAlert(`サーバー設定の取得に失敗しました: ${error.message}`, 'danger');
            
            baseUrlInput.value = '';
            recordsPerPageInput.value = 20;
        }
    }
    
    async function saveSettings() {
        if (!validateForm()) {
            return;
        }
        
        const settingsData = {
            baseUrl: baseUrlInput.value,
            recordsPerPage: parseInt(recordsPerPageInput.value, 10)
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
        
        if (!baseUrlInput.value.trim()) {
            baseUrlInput.classList.add('is-invalid');
            isValid = false;
        } else {
            baseUrlInput.classList.remove('is-invalid');
        }
        
        if (!recordsPerPageInput.value || parseInt(recordsPerPageInput.value, 10) < 1) {
            recordsPerPageInput.classList.add('is-invalid');
            isValid = false;
        } else {
            recordsPerPageInput.classList.remove('is-invalid');
        }
        
        return isValid;
    }
    
    baseUrlInput.addEventListener('input', () => {
        if (baseUrlInput.value.trim()) {
            baseUrlInput.classList.remove('is-invalid');
        }
    });
    
    recordsPerPageInput.addEventListener('input', () => {
        if (recordsPerPageInput.value && parseInt(recordsPerPageInput.value, 10) >= 1) {
            recordsPerPageInput.classList.remove('is-invalid');
        }
    });
    
    saveSettingsBtn.addEventListener('click', saveSettings);
    if (mobileSaveSettingsBtn) {
        mobileSaveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    fetchSettings();
});
