document.addEventListener('DOMContentLoaded', () => {
    const usersTableBody = document.getElementById('users-table-body');
    const addUserBtn = document.getElementById('add-user-btn');
    const mobileAddUserBtn = document.getElementById('mobile-add-user-btn');
    const saveUserBtn = document.getElementById('save-user-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const alertContainer = document.getElementById('alert-container');
    
    const userModal = new bootstrap.Modal(document.getElementById('user-modal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-modal'));
    
    const userIdInput = document.getElementById('user-id');
    const userUserIdInput = document.getElementById('user-user-id');
    const userPointsInput = document.getElementById('user-points');
    const userRegistrationDateInput = document.getElementById('user-registration-date');
    const userStatusInput = document.getElementById('user-status');
    const userRankInput = document.getElementById('user-rank');
    const userMemoInput = document.getElementById('user-memo');
    
    let deleteUserId = null;
    
    const API_ENDPOINT = '/api/users';
    
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
    
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function toISOLocalString(date) {
        if (!date) return '';
        const tzoffset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    }
    
    async function fetchUsers() {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'ユーザデータの取得に失敗しました');
            }
            
            displayUsers(data.data || []);
        } catch (error) {
            console.error('ユーザデータ取得エラー:', error);
            showAlert(`ユーザデータの取得に失敗しました: ${error.message}`, 'danger');
            
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        データの読み込みに失敗しました。再読み込みしてください。
                    </td>
                </tr>
            `;
        }
    }
    
    function displayUsers(users) {
        if (users.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        ユーザがありません
                    </td>
                </tr>
            `;
            return;
        }
        
        usersTableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.userId || ''}</td>
                <td>${user.points ? user.points.toLocaleString() : '0'}</td>
                <td>${formatDate(user.registrationDate)}</td>
                <td>${user.status || 'ACTIVE'}</td>
                <td>${user.rank || 'REGULAR'}</td>
                <td>${user.memo || ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-btn me-1" data-user-id="${user._id}">編集</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-user-id="${user._id}" data-user-name="${user.userId}">削除</button>
                </td>
            `;
            
            usersTableBody.appendChild(row);
        });
        
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-user-id');
                openEditModal(userId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-user-id');
                const userName = button.getAttribute('data-user-name');
                openDeleteModal(userId, userName);
            });
        });
    }
    
    function openAddModal() {
        userIdInput.value = '';
        userUserIdInput.value = '';
        userPointsInput.value = '0';
        userRegistrationDateInput.value = toISOLocalString(new Date());
        userStatusInput.value = 'ACTIVE';
        userRankInput.value = 'REGULAR';
        userMemoInput.value = '';
        
        document.getElementById('user-modal-label').textContent = '新規ユーザ追加';
        
        userModal.show();
    }
    
    async function openEditModal(userId) {
        try {
            const response = await fetch(`${API_ENDPOINT}/${userId}`);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'ユーザデータの取得に失敗しました');
            }
            
            const user = data.data;
            
            userIdInput.value = user._id;
            userUserIdInput.value = user.userId || '';
            userPointsInput.value = user.points || 0;
            
            if (user.registrationDate) {
                const date = new Date(user.registrationDate);
                userRegistrationDateInput.value = toISOLocalString(date);
            } else {
                userRegistrationDateInput.value = '';
            }
            
            userStatusInput.value = user.status || 'ACTIVE';
            userRankInput.value = user.rank || 'REGULAR';
            userMemoInput.value = user.memo || '';
            
            document.getElementById('user-modal-label').textContent = 'ユーザ編集';
            
            userModal.show();
        } catch (error) {
            console.error('ユーザデータ取得エラー:', error);
            showAlert(`ユーザデータの取得に失敗しました: ${error.message}`, 'danger');
        }
    }
    
    function openDeleteModal(userId, userName) {
        deleteUserId = userId;
        document.getElementById('delete-user-id').textContent = userName;
        deleteModal.show();
    }
    
    async function saveUser() {
        const userData = {
            userId: userUserIdInput.value,
            points: parseInt(userPointsInput.value, 10),
            registrationDate: userRegistrationDateInput.value ? new Date(userRegistrationDateInput.value) : new Date(),
            status: userStatusInput.value,
            rank: userRankInput.value,
            memo: userMemoInput.value
        };
        
        const isEdit = userIdInput.value !== '';
        const url = isEdit ? `${API_ENDPOINT}/${userIdInput.value}` : API_ENDPOINT;
        const method = isEdit ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'ユーザの保存に失敗しました');
            }
            
            userModal.hide();
            
            showAlert(isEdit ? 'ユーザが更新されました' : 'ユーザが追加されました');
            
            fetchUsers();
        } catch (error) {
            console.error('ユーザ保存エラー:', error);
            showAlert(`ユーザの保存に失敗しました: ${error.message}`, 'danger');
        }
    }
    
    async function deleteUser() {
        if (!deleteUserId) return;
        
        try {
            const response = await fetch(`${API_ENDPOINT}/${deleteUserId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'ユーザの削除に失敗しました');
            }
            
            deleteModal.hide();
            
            showAlert('ユーザが削除されました');
            
            fetchUsers();
        } catch (error) {
            console.error('ユーザ削除エラー:', error);
            showAlert(`ユーザの削除に失敗しました: ${error.message}`, 'danger');
        } finally {
            deleteUserId = null;
        }
    }
    
    addUserBtn.addEventListener('click', openAddModal);
    if (mobileAddUserBtn) {
        mobileAddUserBtn.addEventListener('click', openAddModal);
    }
    saveUserBtn.addEventListener('click', saveUser);
    confirmDeleteBtn.addEventListener('click', deleteUser);
    
    fetchUsers();
});
