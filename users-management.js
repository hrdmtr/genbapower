document.addEventListener('DOMContentLoaded', () => {
    const usersTableBody = document.getElementById('users-table-body');
    const addUserBtn = document.getElementById('add-user-btn');
    const mobileAddUserBtn = document.getElementById('mobile-add-user-btn');
    const saveUserBtn = document.getElementById('save-user-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const alertContainer = document.getElementById('alert-container');
    
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const mobileExportCsvBtn = document.getElementById('mobile-export-csv-btn');
    const mobileImportCsvBtn = document.getElementById('mobile-import-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    
    const userModal = new bootstrap.Modal(document.getElementById('user-modal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-modal'));
    const importModal = new bootstrap.Modal(document.getElementById('import-modal'));
    
    const userIdInput = document.getElementById('user-id');
    const userUserIdInput = document.getElementById('user-user-id');
    const userPointsInput = document.getElementById('user-points');
    const userRegistrationDateInput = document.getElementById('user-registration-date');
    const userStatusInput = document.getElementById('user-status');
    const userRankInput = document.getElementById('user-rank');
    const userMemoInput = document.getElementById('user-memo');
    
    let deleteUserId = null;
    let importData = null;
    
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
    
    let currentSearch = '';
    let currentSortField = '';
    let currentSortOrder = '';
    let currentPage = 1;
    let totalPages = 1;
    let totalUsers = 0;
    const RECORDS_PER_PAGE = 20;

    async function fetchUsers(search = '', sortField = '', sortOrder = '', page = 1) {
        try {
            let url = API_ENDPOINT;
            const params = new URLSearchParams();
            
            if (search) params.append('search', search);
            if (sortField) params.append('sortField', sortField);
            if (sortOrder) params.append('sortOrder', sortOrder);
            params.append('page', page);
            params.append('limit', RECORDS_PER_PAGE);
            
            url += '?' + params.toString();
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'ユーザデータの取得に失敗しました');
            }
            
            if (data.pagination) {
                currentPage = data.pagination.page;
                totalPages = data.pagination.totalPages;
                totalUsers = data.pagination.total;
            }
            
            displayUsers(data.data || []);
            updatePagination();
            updatePageInfo();
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
            
            fetchUsers(currentSearch, currentSortField, currentSortOrder);
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
            
            fetchUsers(currentSearch, currentSortField, currentSortOrder);
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
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    function updatePagination() {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">前へ</a>`;
        paginationContainer.appendChild(prevLi);
        
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item';
            firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
            paginationContainer.appendChild(firstLi);
            
            if (startPage > 2) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
                paginationContainer.appendChild(ellipsisLi);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            paginationContainer.appendChild(pageLi);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
                paginationContainer.appendChild(ellipsisLi);
            }
            
            const lastLi = document.createElement('li');
            lastLi.className = 'page-item';
            lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
            paginationContainer.appendChild(lastLi);
        }
        
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">次へ</a>`;
        paginationContainer.appendChild(nextLi);
    }
    
    function updatePageInfo() {
        const pageInfo = document.getElementById('page-info');
        if (!pageInfo) return;
        
        const startRecord = totalUsers === 0 ? 0 : (currentPage - 1) * RECORDS_PER_PAGE + 1;
        const endRecord = Math.min(currentPage * RECORDS_PER_PAGE, totalUsers);
        
        pageInfo.textContent = `${startRecord}-${endRecord}件を表示（全${totalUsers}件中）`;
    }
    
    function goToPage(page) {
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        fetchUsers(currentSearch, currentSortField, currentSortOrder, currentPage);
    }
    
    function performSearch() {
        currentSearch = searchInput.value.trim();
        currentPage = 1; // Reset to first page on new search
        fetchUsers(currentSearch, currentSortField, currentSortOrder, currentPage);
    }
    
    function clearSearch() {
        searchInput.value = '';
        currentSearch = '';
        currentPage = 1; // Reset to first page
        fetchUsers(currentSearch, currentSortField, currentSortOrder, currentPage);
    }
    
    searchBtn.addEventListener('click', performSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sort-link')) {
            e.preventDefault();
            currentSortField = e.target.getAttribute('data-field');
            currentSortOrder = e.target.getAttribute('data-order');
            currentPage = 1; // Reset to first page on new sort
            fetchUsers(currentSearch, currentSortField, currentSortOrder, currentPage);
        }
        
        if (e.target.classList.contains('page-link') && e.target.getAttribute('data-page')) {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'), 10);
            goToPage(page);
        }
    });

    async function exportUsersToCsv() {
        try {
            showAlert('CSVエクスポートを開始しています...', 'info');
            
            const response = await fetch(`${API_ENDPOINT}/export`);
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'ユーザデータの取得に失敗しました');
            }
            
            const users = data.data || [];
            if (users.length === 0) {
                showAlert('エクスポートするユーザデータがありません', 'warning');
                return;
            }
            
            const headers = ['userId', 'points', 'registrationDate', 'status', 'rank', 'memo'];
            let csvContent = headers.join(',') + '\n';
            
            users.forEach(user => {
                const row = [
                    user.userId || '',
                    user.points || 0,
                    user.registrationDate ? new Date(user.registrationDate).toISOString() : '',
                    user.status || 'ACTIVE',
                    user.rank || 'REGULAR',
                    (user.memo || '').replace(/,/g, '，').replace(/\n/g, ' ') // カンマと改行を置換
                ];
                csvContent += row.join(',') + '\n';
            });
            
            const entityName = 'user';
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
            const checksum = CryptoJS.MD5(entityName).toString();
            const filename = `${entityName}_${timestamp}_${checksum}.csv`;
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert(`${users.length}件のユーザデータをエクスポートしました`, 'success');
        } catch (error) {
            console.error('CSVエクスポートエラー:', error);
            showAlert(`CSVエクスポートに失敗しました: ${error.message}`, 'danger');
        }
    }
    
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            confirmImportBtn.disabled = true;
            document.getElementById('import-preview').classList.add('d-none');
            document.getElementById('import-error').classList.add('d-none');
            return;
        }
        
        if (!file.name.endsWith('.csv')) {
            document.getElementById('import-error').textContent = 'CSVファイルを選択してください';
            document.getElementById('import-error').classList.remove('d-none');
            document.getElementById('import-preview').classList.add('d-none');
            confirmImportBtn.disabled = true;
            return;
        }
        
        const filenameRegex = /^([a-zA-Z0-9_]+)_(\d{14})_([a-fA-F0-9]{32})\.csv$/;
        const match = file.name.match(filenameRegex);
        
        if (!match) {
            document.getElementById('import-error').textContent = 'ファイル名の形式が正しくありません。エクスポート機能で出力したファイルを使用してください。';
            document.getElementById('import-error').classList.remove('d-none');
            document.getElementById('import-preview').classList.add('d-none');
            confirmImportBtn.disabled = true;
            return;
        }
        
        const [_, entityName, timestamp, fileChecksum] = match;
        
        const calculatedChecksum = CryptoJS.MD5(entityName).toString();
        if (fileChecksum.toLowerCase() !== calculatedChecksum.toLowerCase()) {
            document.getElementById('import-error').textContent = 'ファイルのチェックサムが一致しません。ファイルが改ざんされている可能性があります。';
            document.getElementById('import-error').classList.remove('d-none');
            document.getElementById('import-preview').classList.add('d-none');
            confirmImportBtn.disabled = true;
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csvContent = e.target.result;
                const lines = csvContent.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    throw new Error('CSVファイルにデータがありません');
                }
                
                const headers = lines[0].split(',');
                const expectedHeaders = ['userId', 'points', 'registrationDate', 'status', 'rank', 'memo'];
                
                if (!expectedHeaders.every(header => headers.includes(header))) {
                    throw new Error('CSVファイルのヘッダーが正しくありません');
                }
                
                const users = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    if (values.length !== headers.length) continue;
                    
                    const user = {};
                    headers.forEach((header, index) => {
                        user[header] = values[index];
                    });
                    
                    if (user.points) user.points = parseInt(user.points, 10);
                    
                    users.push(user);
                }
                
                importData = users;
                
                document.getElementById('import-filename').textContent = file.name;
                document.getElementById('import-record-count').textContent = users.length;
                document.getElementById('import-preview').classList.remove('d-none');
                document.getElementById('import-error').classList.add('d-none');
                confirmImportBtn.disabled = false;
            } catch (error) {
                console.error('CSVパースエラー:', error);
                document.getElementById('import-error').textContent = `CSVファイルの解析に失敗しました: ${error.message}`;
                document.getElementById('import-error').classList.remove('d-none');
                document.getElementById('import-preview').classList.add('d-none');
                confirmImportBtn.disabled = true;
            }
        };
        
        reader.onerror = function() {
            document.getElementById('import-error').textContent = 'ファイルの読み込みに失敗しました';
            document.getElementById('import-error').classList.remove('d-none');
            document.getElementById('import-preview').classList.add('d-none');
            confirmImportBtn.disabled = true;
        };
        
        reader.readAsText(file);
    }
    
    async function importUsersFromCsv() {
        if (!importData || importData.length === 0) {
            showAlert('インポートするデータがありません', 'warning');
            return;
        }
        
        try {
            showAlert('CSVインポートを開始しています...', 'info');
            
            const response = await fetch(`${API_ENDPOINT}/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ users: importData })
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'ユーザデータのインポートに失敗しました');
            }
            
            importModal.hide();
            
            csvFileInput.value = '';
            importData = null;
            document.getElementById('import-preview').classList.add('d-none');
            confirmImportBtn.disabled = true;
            
            showAlert(`インポートが成功しました。${data.count}件のユーザデータを登録しました。`, 'success');
            
            fetchUsers();
        } catch (error) {
            console.error('CSVインポートエラー:', error);
            showAlert(`CSVインポートに失敗しました: ${error.message}`, 'danger');
        }
    }
    
    exportCsvBtn.addEventListener('click', exportUsersToCsv);
    importCsvBtn.addEventListener('click', () => importModal.show());
    
    if (mobileExportCsvBtn) {
        mobileExportCsvBtn.addEventListener('click', exportUsersToCsv);
    }
    
    if (mobileImportCsvBtn) {
        mobileImportCsvBtn.addEventListener('click', () => importModal.show());
    }
    
    csvFileInput.addEventListener('change', handleFileSelect);
    confirmImportBtn.addEventListener('click', importUsersFromCsv);
    
    fetchUsers();
});
