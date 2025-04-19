// 経過時間の更新関数
function updateElapsedTimes() {
    const elapsedTimeElements = document.querySelectorAll('.elapsed-time');
    const now = new Date();
    
    elapsedTimeElements.forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (!timestamp) return;
        
        const orderTime = new Date(timestamp);
        const elapsedMs = now - orderTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        const elapsedDays = Math.floor(elapsedHours / 24);
        
        const elapsedTimeValue = element.querySelector('.elapsed-time-value');
        
        // 親要素からステータスを取得
        const orderCard = element.closest('.order-card');
        const orderStatus = orderCard.querySelector('.order-status')?.textContent;
        const orderId = orderCard.getAttribute('data-order-id');
        
        // 提供済みの場合は最終ステータス変更までの時間を表示
        if (orderStatus === '提供済み') {
            // ローカルストレージから注文データを取得
            const orders = localStorage.getItem('orders');
            const parsedOrders = orders ? JSON.parse(orders) : [];
            const orderData = parsedOrders.find(o => o.id === orderId);
            
            if (orderData && orderData.statusHistory && orderData.statusHistory.length > 0) {
                // 最初と最後のステータス変更を取得
                const startTime = new Date(orderData.timestamp);
                const lastStatusChange = orderData.statusHistory
                    .filter(history => history.to === '提供済み')[0];
                
                if (lastStatusChange) {
                    const endTime = new Date(lastStatusChange.timestamp);
                    const totalSeconds = Math.floor((endTime - startTime) / 1000);
                    elapsedTimeValue.textContent = totalSeconds;
                    
                    const unitElement = element.querySelector('.elapsed-time-unit');
                    if (unitElement) {
                        unitElement.innerHTML = '秒<br><span style="font-size:0.75rem;">提供完了</span>';
                    }
                    
                    // 長時間かかった場合は警告色を設定
                    if (totalSeconds > 1800) { // 30分以上
                        element.classList.add('elapsed-time-urgent');
                    } else if (totalSeconds > 900) { // 15分以上
                        element.classList.add('elapsed-time-warning');
                    }
                } else {
                    elapsedTimeValue.textContent = elapsedSeconds;
                    
                    const unitElement = element.querySelector('.elapsed-time-unit');
                    if (unitElement) {
                        unitElement.innerHTML = '秒<br><span style="font-size:0.75rem;">提供完了</span>';
                    }
                }
            } else {
                elapsedTimeValue.textContent = elapsedSeconds;
                
                const unitElement = element.querySelector('.elapsed-time-unit');
                if (unitElement) {
                    unitElement.innerHTML = '秒<br><span style="font-size:0.75rem;">提供完了</span>';
                }
            }
        } 
        // キャンセルの場合は「キャンセル」と表示
        else if (orderStatus === 'キャンセル') {
            elapsedTimeValue.textContent = '- -';
            
            const unitElement = element.querySelector('.elapsed-time-unit');
            if (unitElement) {
                unitElement.innerHTML = '<span style="font-size:0.75rem;">キャンセル</span>';
            }
            
            element.classList.add('elapsed-time-cancelled');
        } 
        // 進行中の注文の場合は、リアルタイムの経過時間を表示
        else {
            elapsedTimeValue.textContent = elapsedSeconds;
            
            // 長時間の場合は警告色を設定
            if (elapsedMinutes >= 30) element.classList.add('elapsed-time-warning');
            if (elapsedHours >= 1) element.classList.add('elapsed-time-urgent');
        }
    });
}

// エクスポート
export { updateElapsedTimes };