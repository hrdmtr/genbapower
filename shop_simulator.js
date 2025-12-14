// ラーメン店シミュレーター - メインスクリプト

// デモンストレーションモード管理
let isDemoMode = false;

// 商品マスター（products.jsから）
const PRODUCTS = {
    'P001': { name: '醤油ラーメン', price: 800 },
    'P002': { name: '味噌ラーメン', price: 850 },
    'P003': { name: '塩ラーメン', price: 800 },
    'P004': { name: 'とんこつラーメン', price: 900 },
    'P005': { name: 'つけ麺', price: 950 },
    'P006': { name: 'チャーシュー丼', price: 400 },
    'P007': { name: '餃子（6個）', price: 350 },
    'P008': { name: 'ビール', price: 500 }
};

// 茹で時間の好み設定（割合: 合計100%）
const COOKING_TIME_PREFERENCES = {
    hard: { seconds: 80, name: '硬め', ratio: 0.2 },      // 20%
    normal: { seconds: 90, name: '普通', ratio: 0.6 },    // 60%
    soft: { seconds: 100, name: '柔らかめ', ratio: 0.2 }  // 20%
};

// ランダムに茹で時間を決定（割合に基づく）
function getRandomCookingTime() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [key, pref] of Object.entries(COOKING_TIME_PREFERENCES)) {
        cumulative += pref.ratio;
        if (rand < cumulative) {
            return pref;
        }
    }

    // フォールバック（通常ここには到達しない）
    return COOKING_TIME_PREFERENCES.normal;
}

// 店舗ステータス管理クラス
class ShopStatus {
    constructor() {
        // 客のステータス（人数）
        this.customersInLine = 0;      // 食券に並んでいる
        this.customersWaiting = 0;     // 料理を待っている
        this.customersEating = 0;      // 食事中
        this.customersLeaving = 0;     // 退店待ち

        // 厨房・料理状態
        this.noodles = [];              // 茹で中の麺 [{id, remainingTime, totalTime, interval}]
        this.platingWaiting = 0;        // 盛り付け待ち（茹で上がった麺）
        this.noodlePlated = 0;          // 麺盛り付け済み（具材待ち）
        this.readyToServe = 0;          // 提供可能（盛り付け完了）
        this.dishesToWash = 0;          // 洗い物
        this.cutleryCount = 100;        // カトラリー残量

        // 未提供の料理（商品ID_硬さ => 件数）
        // 例: 'P004_hard': 2, 'P004_normal': 3, 'P004_soft': 1
        this.pendingDishes = {};

        // 注文ごとの茹で時間（注文ID => {productId, cookingTime}）
        this.orderQueue = [];

        // スタッフ状態
        this.mainStaff = {
            status: '手が空いている',
            queue: []  // 指示キュー
        };

        this.subStaff = {
            status: '手が空いている',
            queue: []  // 指示キュー
        };

        // 作業中のタイマーID
        this.mainStaffTimer = null;
        this.subStaffTimer = null;
    }

    // カトラリーが使用可能かチェック
    canUseCutlery() {
        return this.cutleryCount > 0;
    }

    // カトラリーを使用
    useCutlery() {
        if (this.canUseCutlery()) {
            this.cutleryCount--;
            return true;
        }
        return false;
    }

    // カトラリーを補充
    refillCutlery() {
        this.cutleryCount += 50;
    }

    // 茹で中の麺を追加
    addNoodle(cookingTimeSeconds) {
        if (this.noodles.length >= 2) {
            return false; // 最大2つまで
        }

        const noodleId = Date.now();
        const noodle = {
            id: noodleId,
            remainingTime: cookingTimeSeconds,
            totalTime: cookingTimeSeconds
        };

        // 1秒ごとに残り時間を減らす
        noodle.interval = setInterval(() => {
            noodle.remainingTime--;

            if (noodle.remainingTime <= 0) {
                clearInterval(noodle.interval);
                // 茹で上がり → 盛り付け待ちに自動移動
                shopStatus.platingWaiting++;
                // 配列から削除
                const index = shopStatus.noodles.findIndex(n => n.id === noodle.id);
                if (index !== -1) {
                    shopStatus.noodles.splice(index, 1);
                }

                // 茹で中の麺がなくなったら、メインスタッフを手が空いている状態に戻す
                if (shopStatus.noodles.length === 0 && shopStatus.mainStaff.status === '茹で作業中') {
                    shopStatus.mainStaff.status = '手が空いている';
                    // キューに次の指示があれば実行
                    if (shopStatus.mainStaff.queue.length > 0) {
                        const nextInstruction = shopStatus.mainStaff.queue.shift();
                        handleQueuedInstruction('main', nextInstruction);
                    }
                }

                showAlert('麺が茹で上がりました！盛り付けしてください', 'success', false);
                speakText('麺盛り付けしてください');
            }

            updateUI();
        }, 1000);

        this.noodles.push(noodle);
        return true;
    }

    // 茹で上がった麺を取り出す
    removeFinishedNoodle() {
        // 茹で上がった麺を探す（残り時間0）
        const finishedIndex = this.noodles.findIndex(n => n.remainingTime <= 0);

        if (finishedIndex !== -1) {
            const noodle = this.noodles[finishedIndex];
            clearInterval(noodle.interval);
            this.noodles.splice(finishedIndex, 1);
            return true;
        }

        return false;
    }

    // 茹で中かチェック
    hasNoodlesCooking() {
        return this.noodles.length > 0;
    }
}

// グローバル状態
const shopStatus = new ShopStatus();

// DOM要素
let elements = {};

// 自動処理タイマー
let ticketQueueTimer = null;

// アラート表示
function showAlert(message, type = 'error', enableSpeech = true) {
    const alertBox = elements.alertBox;
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.style.display = 'block';

    // デモモードの場合は常に音声ガイドを有効化
    const shouldSpeak = isDemoMode || enableSpeech;

    if (shouldSpeak) {
        speakText(message);
    }

    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 3000);
}

// トースト通知を表示
function showToast(message, type = 'info', enableSpeech = true) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        min-width: 300px;
        max-width: 500px;
        padding: 20px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        white-space: pre-line;
    `;

    if (type === 'success') {
        toast.style.background = '#d4edda';
        toast.style.color = '#155724';
        toast.style.borderLeft = '5px solid #28a745';
    } else if (type === 'error') {
        toast.style.background = '#f8d7da';
        toast.style.color = '#721c24';
        toast.style.borderLeft = '5px solid #dc3545';
    } else {
        toast.style.background = '#d1ecf1';
        toast.style.color = '#0c5460';
        toast.style.borderLeft = '5px solid #17a2b8';
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    // デモモードの場合は常に音声ガイドを有効化
    const shouldSpeak = isDemoMode || enableSpeech;

    if (shouldSpeak) {
        speakText(message);
    }

    // 3秒後にフェードアウトして削除
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// UIを更新
function updateUI() {
    // 客のステータス
    elements.customersInLine.textContent = `${shopStatus.customersInLine}人`;
    elements.customersWaiting.textContent = `${shopStatus.customersWaiting}人`;
    elements.customersEating.textContent = `${shopStatus.customersEating}人`;
    elements.customersLeaving.textContent = `${shopStatus.customersLeaving}人`;

    // 厨房・料理状態
    elements.noodlesCookingCount.textContent = `${shopStatus.noodles.length}/2`;

    // 茹で中の詳細表示
    const noodlesDetail = elements.noodlesDetail;
    if (shopStatus.noodles.length > 0) {
        noodlesDetail.innerHTML = shopStatus.noodles.map((noodle, index) => {
            return `<div style="margin-bottom: 5px;">${index + 1}つ目: 残り<strong>${noodle.remainingTime}</strong>秒</div>`;
        }).join('');
    } else {
        noodlesDetail.innerHTML = '<div style="color: #999;">茹で中の麺はありません</div>';
    }

    elements.platingWaiting.textContent = `${shopStatus.platingWaiting}件`;
    elements.noodlePlated.textContent = `${shopStatus.noodlePlated}件`;
    elements.readyToServe.textContent = `${shopStatus.readyToServe}件`;
    elements.dishesToWash.textContent = `${shopStatus.dishesToWash}個`;

    // カトラリー（0個の場合は警告色）
    elements.cutleryCount.textContent = `${shopStatus.cutleryCount}個`;
    if (shopStatus.cutleryCount === 0) {
        elements.cutleryCount.classList.add('warning');
    } else {
        elements.cutleryCount.classList.remove('warning');
    }

    // 未提供の料理
    updatePendingDishes();

    // スタッフ状態
    updateStaffStatus();
}

// 未提供の料理を更新
function updatePendingDishes() {
    const container = elements.pendingDishes;
    container.innerHTML = '';

    // 硬さの日本語表示マップ
    const hardnessLabels = {
        'hard': '硬め',
        'normal': '普通',
        'soft': '柔らかめ'
    };

    Object.keys(shopStatus.pendingDishes).forEach(dishKey => {
        const count = shopStatus.pendingDishes[dishKey];
        if (count > 0) {
            // dishKey = "P004_hard" のような形式
            const [productId, hardnessKey] = dishKey.split('_');

            const dishItem = document.createElement('div');
            dishItem.className = 'dish-item';

            const dishName = document.createElement('span');
            dishName.className = 'dish-name';
            const hardnessLabel = hardnessLabels[hardnessKey] || hardnessKey;
            dishName.textContent = `${PRODUCTS[productId].name}（${hardnessLabel}）`;

            const dishCount = document.createElement('span');
            dishCount.className = 'dish-count';
            dishCount.textContent = `${count}件`;

            dishItem.appendChild(dishName);
            dishItem.appendChild(dishCount);
            container.appendChild(dishItem);
        }
    });

    if (container.children.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.gridColumn = '1 / -1';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#999';
        emptyMsg.textContent = '未提供の料理はありません';
        container.appendChild(emptyMsg);
    }

    // 合計数を計算して表示
    updateTotalCounts();
}

// 未提供の料理と作成中の料理の合計数を更新
function updateTotalCounts() {
    // 未提供の料理の総数（食券購入済みだが提供していない）
    const pendingCount = Object.values(shopStatus.pendingDishes).reduce((sum, count) => sum + count, 0);
    const totalPending = pendingCount + shopStatus.noodles.length + shopStatus.platingWaiting + shopStatus.noodlePlated + shopStatus.readyToServe;

    // 作成中の料理の総数（茹で開始以降）
    const totalInProgress = shopStatus.noodles.length + shopStatus.platingWaiting + shopStatus.noodlePlated + shopStatus.readyToServe;

    // デバッグ用
    console.log('=== 未提供の料理カウント ===');
    console.log('pendingDishes:', shopStatus.pendingDishes);
    console.log('pendingCount (未調理):', pendingCount);
    console.log('noodles.length (茹で中):', shopStatus.noodles.length);
    console.log('platingWaiting (盛付待):', shopStatus.platingWaiting);
    console.log('noodlePlated (具材待):', shopStatus.noodlePlated);
    console.log('readyToServe (提供待):', shopStatus.readyToServe);
    console.log('totalPending (合計):', totalPending);
    console.log('totalInProgress (作成中):', totalInProgress);

    elements.totalPendingCount.textContent = `${totalPending}件`;
    elements.totalInProgressCount.textContent = `${totalInProgress}件`;
    elements.summaryPlatingWaiting.textContent = `${shopStatus.platingWaiting}件`;
    elements.summaryReadyToServe.textContent = `${shopStatus.readyToServe}件`;

    // 今すぐやるべきことを更新
    updateUrgentActions();
}

// 音声で読み上げる関数
function speakText(text) {
    console.log('🔊 音声再生:', text);

    // 利用可能な音声をチェック
    const voices = window.speechSynthesis.getVoices();
    console.log('📢 利用可能な音声数:', voices.length);

    if (voices.length === 0) {
        console.warn('⚠️ 音声がまだロードされていません。少し待ってから再試行します。');
        // 音声がロードされるのを待つ
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            speakTextInternal(text);
        }, { once: true });
        return;
    }

    speakTextInternal(text);
}

function speakTextInternal(text) {
    // Chrome対策: speechSynthesisをリセット
    if (window.speechSynthesis.speaking) {
        console.log('⏸️ 既存の音声を停止');
        window.speechSynthesis.cancel();
    }

    // 少し待ってから音声を作成
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // 日本語音声を優先的に選択
        const voices = window.speechSynthesis.getVoices();
        const japaneseVoice = voices.find(voice => voice.lang === 'ja-JP' || voice.lang === 'ja');
        if (japaneseVoice) {
            utterance.voice = japaneseVoice;
            console.log('🗣️ 使用する音声:', japaneseVoice.name);
        } else {
            console.warn('⚠️ 日本語音声が見つかりません。デフォルト音声を使用します。');
        }

        utterance.onerror = (event) => {
            console.error('❌ 音声エラー:', event);
        };

        utterance.onstart = () => {
            console.log('▶️ 音声開始:', text);
        };

        utterance.onend = () => {
            console.log('⏹️ 音声終了:', text);
        };

        console.log('🎵 speak()を呼び出します');
        window.speechSynthesis.speak(utterance);
    }, 50);
}

// 今すぐやるべきことを更新
function updateUrgentActions() {
    const container = elements.urgentActions;
    container.innerHTML = '';

    // 調理待ち（未調理の注文）
    const pendingCount = Object.values(shopStatus.pendingDishes).reduce((sum, count) => sum + count, 0);
    // メインスタッフが茹で作業中でない、かつ茹で釜に空きがある場合のみ表示
    if (pendingCount > 0 && shopStatus.mainStaff.status !== '茹で作業中' && shopStatus.noodles.length < 2) {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 15px; background: #fee2e2; border-left: 5px solid #ef4444; border-radius: 5px; font-size: 16px; font-weight: bold; color: #991b1b; cursor: pointer; transition: transform 0.2s;';
        item.innerHTML = `🔥 調理待ち: <span style="color: #ef4444; font-size: 20px;">${pendingCount}件</span> ← 今すぐ調理を開始してください！`;
        item.addEventListener('mouseenter', () => item.style.transform = 'scale(1.02)');
        item.addEventListener('mouseleave', () => item.style.transform = 'scale(1)');
        item.addEventListener('click', () => {
            speakText(`調理を開始してください`);
        });
        container.appendChild(item);
    }

    // 盛り付け待ち（メインスタッフが麺盛り付け中でない場合のみ表示）
    if (shopStatus.platingWaiting > 0 && shopStatus.mainStaff.status !== '麺盛り付け中') {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 15px; background: #dbeafe; border-left: 5px solid #3b82f6; border-radius: 5px; font-size: 16px; font-weight: bold; color: #1e40af; cursor: pointer; transition: transform 0.2s;';
        item.innerHTML = `🍜 盛り付け待ち: <span style="color: #3b82f6; font-size: 20px;">${shopStatus.platingWaiting}件</span> ← 今すぐ麺盛り付けしてください！`;
        item.addEventListener('mouseenter', () => item.style.transform = 'scale(1.02)');
        item.addEventListener('mouseleave', () => item.style.transform = 'scale(1)');
        item.addEventListener('click', () => {
            speakText(`麺を盛り付けてください`);
        });
        container.appendChild(item);
    }

    // 具材待ち（サブスタッフが具材盛り付け中でない場合のみ表示）
    if (shopStatus.noodlePlated > 0 && shopStatus.subStaff.status !== '具材盛り付け中') {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 15px; background: #fef3c7; border-left: 5px solid #f59e0b; border-radius: 5px; font-size: 16px; font-weight: bold; color: #92400e; cursor: pointer; transition: transform 0.2s;';
        item.innerHTML = `🥢 具材待ち: <span style="color: #f59e0b; font-size: 20px;">${shopStatus.noodlePlated}件</span> ← 今すぐ具材盛り付けしてください！`;
        item.addEventListener('mouseenter', () => item.style.transform = 'scale(1.02)');
        item.addEventListener('mouseleave', () => item.style.transform = 'scale(1)');
        item.addEventListener('click', () => {
            speakText(`具材を盛り付けてください`);
        });
        container.appendChild(item);
    }

    // 提供待ち（誰も配膳中でない場合のみ表示）
    if (shopStatus.readyToServe > 0 &&
        shopStatus.mainStaff.status !== '配膳中' &&
        shopStatus.subStaff.status !== '配膳中') {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 15px; background: #d1fae5; border-left: 5px solid #10b981; border-radius: 5px; font-size: 16px; font-weight: bold; color: #065f46; cursor: pointer; transition: transform 0.2s;';
        item.innerHTML = `✅ 提供待ち: <span style="color: #10b981; font-size: 20px;">${shopStatus.readyToServe}件</span> ← 今すぐ提供してください！`;
        item.addEventListener('mouseenter', () => item.style.transform = 'scale(1.02)');
        item.addEventListener('mouseleave', () => item.style.transform = 'scale(1)');
        item.addEventListener('click', () => {
            speakText(`料理を提供してください`);
        });
        container.appendChild(item);
    }

    // 何もない場合
    if (container.children.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding: 15px; text-align: center; color: #999; font-size: 16px;';
        emptyMsg.textContent = '現在、緊急のアクションはありません';
        container.appendChild(emptyMsg);
    }
}

// スタッフ状態を更新
function updateStaffStatus() {
    // メインスタッフ
    elements.mainStaffStatus.textContent = shopStatus.mainStaff.status;
    if (shopStatus.mainStaff.queue.length > 0) {
        elements.mainStaffQueue.textContent = `[${shopStatus.mainStaff.queue.join(' → ')}]`;
    } else {
        elements.mainStaffQueue.textContent = 'なし';
    }

    // サブスタッフ
    elements.subStaffStatus.textContent = shopStatus.subStaff.status;
    if (shopStatus.subStaff.queue.length > 0) {
        elements.subStaffQueue.textContent = `[${shopStatus.subStaff.queue.join(' → ')}]`;
    } else {
        elements.subStaffQueue.textContent = 'なし';
    }
}

// スタッフに指示を追加（キュー管理）
function addInstructionToStaff(staff, instruction, duration, onComplete) {
    const staffObj = staff === 'main' ? shopStatus.mainStaff : shopStatus.subStaff;

    // スタッフが手が空いている場合は即座に開始
    if (staffObj.status === '手が空いている') {
        startStaffWork(staff, instruction, duration, onComplete);
    } else {
        // キューに追加
        staffObj.queue.push(instruction);
        updateUI();
    }
}

// スタッフの作業を開始
function startStaffWork(staff, instruction, duration, onComplete) {
    const staffObj = staff === 'main' ? shopStatus.mainStaff : shopStatus.subStaff;

    staffObj.status = instruction;
    updateUI();

    const timer = setTimeout(() => {
        // 作業完了
        if (onComplete) {
            onComplete();
        }

        // 次の指示があればキューから取り出して開始
        if (staffObj.queue.length > 0) {
            const nextInstruction = staffObj.queue.shift();
            // 次の指示の処理（TODO: 指示ごとの処理を実装）
            handleQueuedInstruction(staff, nextInstruction);
        } else {
            staffObj.status = '手が空いている';
        }

        updateUI();
    }, duration);

    if (staff === 'main') {
        shopStatus.mainStaffTimer = timer;
    } else {
        shopStatus.subStaffTimer = timer;
    }
}

// キューから取り出した指示を処理
function handleQueuedInstruction(staff, instruction) {
    switch (instruction) {
        case '麺盛り付け中':
            startStaffWork(staff, instruction, 10000, () => {
                shopStatus.platingWaiting = Math.max(0, shopStatus.platingWaiting - 1);
                shopStatus.noodlePlated++;
                showAlert('麺の盛り付けが完了しました', 'success', false);
                speakText('具材盛り付けしてください');
            });
            break;
        case '具材盛り付け中':
            startStaffWork(staff, instruction, 10000, () => {
                shopStatus.noodlePlated = Math.max(0, shopStatus.noodlePlated - 1);
                shopStatus.readyToServe++;
                showAlert('具材の盛り付けが完了しました！提供できます', 'success', false);
                speakText('料理提供してください');
            });
            break;
        case 'カトラリー補充作業中':
            startStaffWork(staff, instruction, 30000, () => {
                shopStatus.refillCutlery();
                showAlert('カトラリーを補充しました（+50個）', 'success', false);
            });
            break;
        case '洗い物中':
            startStaffWork(staff, instruction, 60000, () => {
                shopStatus.dishesToWash = Math.max(0, shopStatus.dishesToWash - 10);
                showAlert('洗い物を完了しました（-10個）', 'success', false);
            });
            break;
        case '店内清掃中':
            startStaffWork(staff, instruction, 120000, () => {
                showAlert('店内清掃を完了しました', 'success', false);
            });
            break;
        default:
            shopStatus[staff === 'main' ? 'mainStaff' : 'subStaff'].status = '手が空いている';
    }
}

// ===== イベントハンドラ =====

// 客が来店
function handleCustomerArrival() {
    shopStatus.customersInLine++;
    showAlert('客が来店しました', 'success', false);
    updateUI();

    // 自動食券購入処理を開始（まだ開始していなければ）
    if (!ticketQueueTimer) {
        startTicketQueueProcessing();
    }
}

// 食券列の自動処理を開始
function startTicketQueueProcessing() {
    ticketQueueTimer = setInterval(() => {
        if (shopStatus.customersInLine > 0) {
            // 自動で食券購入
            shopStatus.customersInLine = Math.max(0, shopStatus.customersInLine - 1);
            shopStatus.customersWaiting++;

            // とんこつラーメンのみ注文（P004）
            const productId = 'P004';

            // 茹で時間をランダムに決定（割合に基づく）
            const cookingPref = getRandomCookingTime();

            // 硬さのキーを取得（hard/normal/soft）
            let hardnessKey = 'normal';
            if (cookingPref.seconds === 80) hardnessKey = 'hard';
            else if (cookingPref.seconds === 100) hardnessKey = 'soft';

            // 未提供料理を硬さ別に追加
            const dishKey = `${productId}_${hardnessKey}`;
            if (!shopStatus.pendingDishes[dishKey]) {
                shopStatus.pendingDishes[dishKey] = 0;
            }
            shopStatus.pendingDishes[dishKey]++;

            shopStatus.orderQueue.push({
                productId: productId,
                cookingTime: cookingPref.seconds,
                hardness: cookingPref.name,
                hardnessKey: hardnessKey
            });

            // 視覚的にはシンプルな通知、音声では直接的な指示を伝える
            const visualMessage = `自動食券購入：${PRODUCTS[productId].name}（${cookingPref.name}）`;
            const voiceMessage = `調理を開始してください`;

            showAlert(visualMessage, 'success', false); // 画面表示は注文内容
            speakText(voiceMessage); // 音声は指示
            updateUI();
        }
    }, 15000); // 15秒ごと
}

// 食券購入（手動）
function handlePurchaseTicket() {
    if (shopStatus.customersInLine <= 0) {
        showAlert('食券に並んでいる客がいません');
        return;
    }

    shopStatus.customersInLine = Math.max(0, shopStatus.customersInLine - 1);
    shopStatus.customersWaiting++;

    // とんこつラーメンのみ注文（P004）
    const productId = 'P004';

    // 茹で時間をランダムに決定（割合に基づく）
    const cookingPref = getRandomCookingTime();

    // 硬さのキーを取得（hard/normal/soft）
    let hardnessKey = 'normal';
    if (cookingPref.seconds === 80) hardnessKey = 'hard';
    else if (cookingPref.seconds === 100) hardnessKey = 'soft';

    // 未提供料理を硬さ別に追加
    const dishKey = `${productId}_${hardnessKey}`;
    if (!shopStatus.pendingDishes[dishKey]) {
        shopStatus.pendingDishes[dishKey] = 0;
    }
    shopStatus.pendingDishes[dishKey]++;

    shopStatus.orderQueue.push({
        productId: productId,
        cookingTime: cookingPref.seconds,
        hardness: cookingPref.name,
        hardnessKey: hardnessKey
    });

    // 視覚的にはシンプルな通知、音声では直接的な指示を伝える
    const visualMessage = `食券購入：${PRODUCTS[productId].name}（${cookingPref.name}）`;
    const voiceMessage = `調理を開始してください`;

    showAlert(visualMessage, 'success', false); // 画面表示は注文内容
    speakText(voiceMessage); // 音声は指示
    updateUI();
}

// 調理開始（自動で茹で時間を決定）
function handleStartCookingAuto() {
    const totalPending = Object.values(shopStatus.pendingDishes).reduce((a, b) => a + b, 0);

    if (totalPending === 0) {
        showAlert('調理する料理がありません');
        return;
    }

    if (shopStatus.noodles.length >= 2) {
        showAlert('茹で釜がいっぱいです（最大2つまで）');
        return;
    }

    // 注文キューから最初の注文を取得
    if (shopStatus.orderQueue.length === 0) {
        showAlert('注文キューが空です');
        return;
    }

    const order = shopStatus.orderQueue.shift();

    // 麺を追加
    if (shopStatus.addNoodle(order.cookingTime)) {
        // 未提供料理から1件減らす（硬さ別）
        const dishKey = `${order.productId}_${order.hardnessKey}`;
        if (shopStatus.pendingDishes[dishKey] && shopStatus.pendingDishes[dishKey] > 0) {
            shopStatus.pendingDishes[dishKey]--;
            if (shopStatus.pendingDishes[dishKey] === 0) {
                delete shopStatus.pendingDishes[dishKey];
            }
        }

        // 茹で中は待ち時間なので、メインスタッフのステータスは変更しない

        showAlert(`調理を開始しました（${order.hardness} ${order.cookingTime}秒）`, 'success', false);
        updateUI();
    }
}

// 調理開始（茹で時間を手動指定）
function handleStartCooking(cookingTime, hardness) {
    const totalPending = Object.values(shopStatus.pendingDishes).reduce((a, b) => a + b, 0);

    if (totalPending === 0) {
        showAlert('調理する料理がありません');
        return;
    }

    if (shopStatus.noodles.length >= 2) {
        showAlert('茹で釜がいっぱいです（最大2つまで）');
        return;
    }

    // 麺を追加
    if (shopStatus.addNoodle(cookingTime)) {
        // 未提供料理から1件減らす（最初の料理）
        for (let dishKey in shopStatus.pendingDishes) {
            if (shopStatus.pendingDishes[dishKey] > 0) {
                shopStatus.pendingDishes[dishKey]--;
                if (shopStatus.pendingDishes[dishKey] === 0) {
                    delete shopStatus.pendingDishes[dishKey];
                }
                break;
            }
        }

        // キューからも削除（あれば）
        if (shopStatus.orderQueue.length > 0) {
            shopStatus.orderQueue.shift();
        }

        // メインスタッフを茹で作業中に変更
        if (shopStatus.mainStaff.status === '手が空いている') {
            shopStatus.mainStaff.status = '茹で作業中';
        }

        showAlert(`調理を開始しました（${hardness} ${cookingTime}秒）`, 'success', false);
        updateUI();
    }
}

// 料理提供
function handleServeDish() {
    if (shopStatus.readyToServe <= 0) {
        showAlert('提供可能な料理がありません（盛り付けを完了してください）');
        return;
    }

    if (shopStatus.customersWaiting <= 0) {
        showAlert('料理を待っている客がいません');
        return;
    }

    // カトラリーチェック
    if (!shopStatus.canUseCutlery()) {
        showAlert('カトラリーが不足しています！補充してください');
        return;
    }

    // 提供可能な料理を提供
    shopStatus.readyToServe = Math.max(0, shopStatus.readyToServe - 1);
    shopStatus.customersWaiting = Math.max(0, shopStatus.customersWaiting - 1);
    shopStatus.customersEating++;
    shopStatus.useCutlery();
    shopStatus.dishesToWash++;

    showAlert('料理を提供しました', 'success', false);
    updateUI();
}

// 食事完了
function handleFinishEating() {
    if (shopStatus.customersEating <= 0) {
        showAlert('食事中の客がいません');
        return;
    }

    shopStatus.customersEating = Math.max(0, shopStatus.customersEating - 1);
    shopStatus.customersLeaving++;

    showAlert('客が食事を完了しました', 'success', false);
    updateUI();
}

// 客が退店
function handleCustomerLeave() {
    if (shopStatus.customersLeaving <= 0) {
        showAlert('退店待ちの客がいません');
        return;
    }

    shopStatus.customersLeaving = Math.max(0, shopStatus.customersLeaving - 1);

    showAlert('客が退店しました', 'success', false);
    updateUI();
}

// カトラリー補充指示
function handleRefillCutlery() {
    addInstructionToStaff('sub', 'カトラリー補充作業中', 30000, () => {
        shopStatus.refillCutlery();
        showAlert('カトラリーを補充しました（+50個）', 'success', false);
    });
    showAlert('カトラリー補充を指示しました', 'success', false);
}

// 洗い物開始指示
function handleStartDishwashing() {
    if (shopStatus.dishesToWash <= 0) {
        showAlert('洗い物がありません');
        return;
    }

    addInstructionToStaff('sub', '洗い物中', 60000, () => {
        shopStatus.dishesToWash = Math.max(0, shopStatus.dishesToWash - 10);
        showAlert('洗い物を完了しました（-10個）', 'success', false);
    });
    showAlert('洗い物を指示しました', 'success', false);
}

// 店内清掃開始指示
function handleStartCleaning() {
    addInstructionToStaff('sub', '店内清掃中', 120000, () => {
        showAlert('店内清掃を完了しました', 'success', false);
    });
    showAlert('店内清掃を指示しました', 'success', false);
}

// 麺盛り付け指示（メインスタッフ）
function handlePlateNoodles() {
    if (shopStatus.platingWaiting <= 0) {
        showAlert('盛り付け待ちの麺がありません');
        return;
    }

    addInstructionToStaff('main', '麺盛り付け中', 10000, () => {
        shopStatus.platingWaiting = Math.max(0, shopStatus.platingWaiting - 1);
        shopStatus.noodlePlated++;
        showAlert('麺の盛り付けが完了しました', 'success', false);
        speakText('具材盛り付けしてください');
    });
    showAlert('麺の盛り付けを開始しました', 'success', false);
}

// 具材盛り付け指示（サブスタッフ）
function handlePlateIngredients() {
    if (shopStatus.noodlePlated <= 0) {
        showAlert('麺が盛り付けられた料理がありません');
        return;
    }

    addInstructionToStaff('sub', '具材盛り付け中', 10000, () => {
        shopStatus.noodlePlated = Math.max(0, shopStatus.noodlePlated - 1);
        shopStatus.readyToServe++;
        showAlert('具材の盛り付けが完了しました！提供できます', 'success', false);
        speakText('料理提供してください');
    });
    showAlert('具材の盛り付けを開始しました', 'success', false);
}

// メインスタッフへの指示を取得
function getMainStaffInstruction() {
    const pendingCount = Object.values(shopStatus.pendingDishes).reduce((sum, count) => sum + count, 0);

    // 今すぐやるべきことを優先順位順にチェック

    // 1. 調理待ち（未調理の注文があり、茹で釜に空きがある場合）
    // 茹で釜に空きがあれば、メインスタッフが茹で作業中でも追加調理が可能
    if (pendingCount > 0 && shopStatus.noodles.length < 2) {
        return `🔥 調理待ち: ${pendingCount}件 ← 今すぐ調理を開始してください！`;
    }

    // 2. 盛り付け待ち（茹で上がった麺がある場合）
    if (shopStatus.platingWaiting > 0 && shopStatus.mainStaff.status !== '麺盛り付け中') {
        return `🍜 盛り付け待ち: ${shopStatus.platingWaiting}件 ← 今すぐ麺盛り付けしてください！`;
    }

    // 3. 提供待ち（完成した料理がある場合）
    if (shopStatus.readyToServe > 0 &&
        shopStatus.mainStaff.status !== '配膳中' &&
        shopStatus.subStaff.status !== '配膳中') {
        return `✅ 提供待ち: ${shopStatus.readyToServe}件 ← 今すぐ提供してください！`;
    }

    // 何もない場合は厨房の整理・クリーンナップ
    return '🧹 厨房の整理・クリーンナップをしてください';
}

// サブスタッフへの指示を取得
function getSubStaffInstruction() {
    // 今すぐやるべきことを優先順位順にチェック

    // 1. 具材待ち（麺盛り付け済みで具材待ちの料理がある場合）
    if (shopStatus.noodlePlated > 0 && shopStatus.subStaff.status !== '具材盛り付け中') {
        return `🥢 具材待ち: ${shopStatus.noodlePlated}件 ← 今すぐ具材盛り付けしてください！`;
    }

    // 2. 提供待ち（完成した料理がある場合）
    if (shopStatus.readyToServe > 0 &&
        shopStatus.mainStaff.status !== '配膳中' &&
        shopStatus.subStaff.status !== '配膳中') {
        return `✅ 提供待ち: ${shopStatus.readyToServe}件 ← 今すぐ提供してください！`;
    }

    // 3. 洗い物（洗い物がたまっている場合）
    if (shopStatus.dishesToWash > 5) {
        return `🧽 洗い物: ${shopStatus.dishesToWash}個 ← 洗い物をお願いします`;
    }

    // 4. カトラリー不足（カトラリーが少ない場合）
    if (shopStatus.cutleryCount < 20) {
        return `🍴 カトラリー残量: ${shopStatus.cutleryCount}個 ← カトラリー補充をお願いします`;
    }

    // 何もない場合は厨房の整理・クリーンナップ
    return '🧹 厨房の整理・クリーンナップをしてください';
}

// メイン指示ボタン
function handleInstructMain() {
    const instruction = getMainStaffInstruction();
    showToast(`【メインスタッフへの指示】\n${instruction}`, 'info');
}

// サブ指示ボタン
function handleInstructSub() {
    const instruction = getSubStaffInstruction();
    showToast(`【サブスタッフへの指示】\n${instruction}`, 'info');
}

// モード切り替えハンドラー
function handleToggleMode() {
    isDemoMode = !isDemoMode;

    const btn = document.getElementById('toggleModeBtn');
    const desc = document.getElementById('modeDescription');

    if (isDemoMode) {
        // デモモードON
        btn.textContent = '🎤 デモンストレーションモード: ON';
        btn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        btn.style.boxShadow = '0 5px 15px rgba(239, 68, 68, 0.4)';
        desc.textContent = 'デモモード: 全ての状況を音声でアナウンス';

        // モード切り替えを音声で通知
        speakText('デモンストレーションモードをオンにしました。全ての状況を音声でお知らせします。');
    } else {
        // デモモードOFF
        btn.textContent = '🎤 デモンストレーションモード: OFF';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.style.boxShadow = '0 5px 15px rgba(16, 185, 129, 0.4)';
        desc.textContent = '通常モード: 指示のみ音声ガイダンス';

        // モード切り替えを音声で通知
        speakText('デモンストレーションモードをオフにしました。指示のみ音声でお知らせします。');
    }
}

// 音声合成の初期化（ユーザーインタラクション後に呼ばれる）
function initializeSpeechSynthesis() {
    // 空の音声を再生して音声合成を「アンロック」する
    const utterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(utterance);
    console.log('✅ 音声合成を初期化しました');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素を取得
    elements = {
        alertBox: document.getElementById('alertBox'),
        customersInLine: document.getElementById('customersInLine'),
        customersWaiting: document.getElementById('customersWaiting'),
        customersEating: document.getElementById('customersEating'),
        customersLeaving: document.getElementById('customersLeaving'),
        noodlesCookingCount: document.getElementById('noodlesCookingCount'),
        noodlesDetail: document.getElementById('noodlesDetail'),
        platingWaiting: document.getElementById('platingWaiting'),
        noodlePlated: document.getElementById('noodlePlated'),
        readyToServe: document.getElementById('readyToServe'),
        dishesToWash: document.getElementById('dishesToWash'),
        cutleryCount: document.getElementById('cutleryCount'),
        pendingDishes: document.getElementById('pendingDishes'),
        urgentActions: document.getElementById('urgentActions'),
        totalPendingCount: document.getElementById('totalPendingCount'),
        totalInProgressCount: document.getElementById('totalInProgressCount'),
        summaryPlatingWaiting: document.getElementById('summaryPlatingWaiting'),
        summaryReadyToServe: document.getElementById('summaryReadyToServe'),
        mainStaffStatus: document.getElementById('mainStaffStatus'),
        mainStaffQueue: document.getElementById('mainStaffQueue'),
        subStaffStatus: document.getElementById('subStaffStatus'),
        subStaffQueue: document.getElementById('subStaffQueue')
    };

    // イベントリスナーを設定
    document.getElementById('toggleModeBtn').addEventListener('click', () => {
        initializeSpeechSynthesis();
        handleToggleMode();
    });
    document.getElementById('btnCustomerArrival').addEventListener('click', () => {
        initializeSpeechSynthesis();
        handleCustomerArrival();
    });
    document.getElementById('btnPurchaseTicket').addEventListener('click', handlePurchaseTicket);
    document.getElementById('btnStartCookingAuto').addEventListener('click', handleStartCookingAuto);
    document.getElementById('btnStartCookingHard').addEventListener('click', () => handleStartCooking(80, '硬め'));
    document.getElementById('btnStartCookingNormal').addEventListener('click', () => handleStartCooking(90, '普通'));
    document.getElementById('btnStartCookingSoft').addEventListener('click', () => handleStartCooking(100, '柔らかめ'));
    document.getElementById('btnPlateNoodles').addEventListener('click', handlePlateNoodles);
    document.getElementById('btnPlateIngredients').addEventListener('click', handlePlateIngredients);
    document.getElementById('btnServeDish').addEventListener('click', handleServeDish);
    document.getElementById('btnFinishEating').addEventListener('click', handleFinishEating);
    document.getElementById('btnCustomerLeave').addEventListener('click', handleCustomerLeave);
    document.getElementById('btnRefillCutlery').addEventListener('click', handleRefillCutlery);
    document.getElementById('btnStartDishwashing').addEventListener('click', handleStartDishwashing);
    document.getElementById('btnStartCleaning').addEventListener('click', handleStartCleaning);
    document.getElementById('btnInstructMain').addEventListener('click', handleInstructMain);
    document.getElementById('btnInstructSub').addEventListener('click', handleInstructSub);

    // 初期表示
    updateUI();
});
