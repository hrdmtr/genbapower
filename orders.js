document.addEventListener('DOMContentLoaded', () => {
    const ordersTableBody = document.getElementById('orders-table-body');
    const statusMessage = document.getElementById('status-message');

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            console.error('日付フォーマットエラー:', error);
            return dateString || '不明';
        }
    }

    function createStatusElement(status) {
        const statusSpan = document.createElement('span');
        statusSpan.classList.add(`status-${status.toLowerCase()}`);
        statusSpan.textContent = status;
        return statusSpan;
    }

    async function fetchOrders() {
        try {
            statusMessage.style.display = 'none';
            statusMessage.textContent = '';
            statusMessage.classList.remove('error');

            const response = await fetch('/api/orders');
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status}`);
            }

            const { success, data, message } = await response.json();
            
            if (!success) {
                throw new Error(message || 'データ取得に失敗しました');
            }

            ordersTableBody.innerHTML = '';

            if (!data || data.length === 0) {
                const noDataRow = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.setAttribute('colspan', '5');
                noDataCell.textContent = '注文データがありません';
                noDataCell.style.textAlign = 'center';
                noDataCell.style.padding = '20px';
                noDataRow.appendChild(noDataCell);
                ordersTableBody.appendChild(noDataRow);
                return;
            }

            data.forEach(order => {
                const row = document.createElement('tr');
                
                const idCell = document.createElement('td');
                idCell.textContent = order._id ? (order._id.$oid || order._id) : '不明';
                row.appendChild(idCell);
                
                const tableCell = document.createElement('td');
                tableCell.textContent = order.tableNumber || '不明';
                row.appendChild(tableCell);
                
                const dateCell = document.createElement('td');
                if (order.orderDate) {
                    const dateValue = order.orderDate.$date 
                        ? order.orderDate.$date.$numberLong 
                        : order.orderDate;
                    dateCell.textContent = formatDate(parseInt(dateValue) || dateValue);
                } else {
                    dateCell.textContent = '不明';
                }
                row.appendChild(dateCell);
                
                const statusCell = document.createElement('td');
                statusCell.appendChild(createStatusElement(order.status || 'UNKNOWN'));
                row.appendChild(statusCell);
                
                const productCell = document.createElement('td');
                productCell.textContent = order.productId 
                    ? (order.productId.$numberInt || order.productId) 
                    : '不明';
                row.appendChild(productCell);
                
                ordersTableBody.appendChild(row);
            });

        } catch (error) {
            console.error('注文データ取得エラー:', error);
            statusMessage.textContent = `エラー: ${error.message}`;
            statusMessage.classList.add('error');
            statusMessage.style.display = 'block';
        }
    }

    fetchOrders();
});
