// 從 assets.js 引入圖片路徑陣列
import { cricketImagePaths } from './assets.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 遊戲數據結構 (修改: 使用 imagePath) ---
    class CricketData {
        constructor(name, imagePath, level, maxHp, attack, maxStamina) {
            this.name = name;
            this.imagePath = imagePath; // 修改：儲存圖片檔案的路徑
            this.level = level;
            this.maxHp = maxHp;
            this.currentHp = maxHp;
            this.attack = attack;
            this.maxStamina = maxStamina;
            this.currentStamina = maxStamina;
            this.isTaunted = false;
        }

        resetForBattle() {
            this.currentHp = this.maxHp;
            this.currentStamina = this.maxStamina;
            this.isTaunted = false;
        }
    }
    
    // --- 全局遊戲管理器 (修改: 使用新的圖片系統) ---
    const GameManager = {
        playerCricket: null,
        currentStage: 1,
        trainingSessionsUsed: 0,
        ACTION_COSTS: { attack: 15, defend: 5, taunt: -10 },
        
        NAME_PREFIX: ["鐵", "銅", "銀", "金", "玉", "猛", "狂", "霸"],
        NAME_SUFFIX: ["將軍", "元帥", "先鋒", "力士", "霸王", "旋風"],
        
        randi_range(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); },
        pick_random(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

        generateCricket(baseLevel) {
            const level = Math.max(1, baseLevel + this.randi_range(-1, 2));
            const baseHp = 80 + level * 8;
            const baseAttack = 10 + level * 2;
            const baseStamina = 30 + level * 3;

            const maxHp = baseHp + this.randi_range(-5, 10);
            const attack = baseAttack + this.randi_range(-1, 3);
            const maxStamina = baseStamina + this.randi_range(-2, 4);

            const name = this.pick_random(this.NAME_PREFIX) + this.pick_random(this.NAME_SUFFIX);
            
            // **修改點**: 從圖片路徑庫隨機挑選一個路徑
            const imagePath = this.pick_random(cricketImagePaths); 

            return new CricketData(name, imagePath, level, maxHp, attack, maxStamina);
        }
    };

    const dom = { 
        screens: { start: document.getElementById('start-screen'), hub: document.getElementById('hub-screen'), map: document.getElementById('map-screen'), catch: document.getElementById('catch-screen'), train: document.getElementById('train-screen'), battle: document.getElementById('battle-screen'), },
        modal: { container: document.getElementById('modal'), content: document.getElementById('modal-content'), buttons: document.getElementById('modal-buttons'), confirmBtn: document.getElementById('modal-confirm-btn'), cancelBtn: document.getElementById('modal-cancel-btn'), },
        hub: { card: document.getElementById('player-cricket-card'), stageLevel: document.getElementById('stage-level'), },
        map: { imageContainer: document.getElementById('map-image-container') },
        catch: { container: document.getElementById('grass-container'), },
        train: { pointer: document.getElementById('train-pointer'), actionBtn: document.getElementById('train-action-btn'), result: document.getElementById('train-result'), },
        battle: { playerInfo: document.getElementById('player-info-card'), opponentInfo: document.getElementById('opponent-info-card'), playerSprite: document.getElementById('player-cricket-battle'), opponentSprite: document.getElementById('opponent-cricket-battle'), log: document.getElementById('battle-log'), actionButtons: document.getElementById('action-buttons'), }
    };

    // --- 畫面切換與 Modal 邏輯 ---
    function switchScreen(screenName) { Object.values(dom.screens).forEach(s => s.classList.remove('active')); dom.screens[screenName].classList.add('active'); if (screenName === 'hub') updateHubUI(); if (screenName === 'catch') setupCatchScreen(); if (screenName === 'train') resetTrainScreen(); if (screenName === 'battle') startBattle(); }
    function showModal({ content, confirmText = "確定", cancelText = null, onConfirm, onCancel }) { dom.modal.content.innerHTML = content; dom.modal.confirmBtn.textContent = confirmText; if (cancelText) { dom.modal.cancelBtn.textContent = cancelText; dom.modal.cancelBtn.style.display = 'inline-flex'; } else { dom.modal.cancelBtn.style.display = 'none'; } dom.modal.container.classList.remove('hidden'); dom.modal.container.classList.add('flex'); dom.modal.confirmBtn.onclick = () => { hideModal(); if (onConfirm) onConfirm(); }; dom.modal.cancelBtn.onclick = () => { hideModal(); if (onCancel) onCancel(); }; }
    function hideModal() { dom.modal.container.classList.add('hidden'); dom.modal.container.classList.remove('flex'); }

    // --- UI 更新 (修改: 使用 <img> 標籤來顯示圖片) ---
    function updateHubUI() {
        dom.hub.stageLevel.textContent = GameManager.currentStage;
        const c = GameManager.playerCricket;
        const trainBtn = document.querySelector('button[data-scene="train"]');
        const battleBtn = document.querySelector('button[data-scene="battle"]');

        if (c) {
            dom.hub.card.innerHTML = `
            <div class="flex items-center">
                <div class="w-32 h-32 mr-4 shrink-0">
                    <img src="${c.imagePath}" alt="${c.name}" class="w-full h-full object-contain filter drop-shadow-md">
                </div>
                <div>
                    <h3 class="text-xl font-bold text-amber-950">${c.name} <span class="text-sm font-normal text-gray-600">Lv.${c.level}</span></h3>
                    <div class="text-sm space-y-1 mt-1 grid grid-cols-2 gap-x-4">
                        <p>❤️ 體力: <span class="font-semibold">${c.maxHp}</span></p>
                        <p>⚔️ 鬥性: <span class="font-semibold">${c.attack}</span></p>
                        <p>⚡ 精力: <span class="font-semibold">${c.maxStamina}</span></p>
                    </div>
                </div>
            </div>`;
            trainBtn.disabled = false;
            battleBtn.disabled = false;
        } else {
            dom.hub.card.innerHTML = `
            <div class="text-center p-4">
                <h3 class="font-bold text-lg text-amber-900">你還沒有夥伴！</h3>
                <p class="text-amber-700 mt-2">請先到 [野外捕捉] 一隻屬於你的蟋蟀夥伴吧。</p>
            </div>`;
            trainBtn.disabled = true;
            battleBtn.disabled = true;
        }
    }
    
    // --- 捕捉畫面邏輯 ---
    function setupCatchScreen() { 
        dom.catch.container.innerHTML = ''; 
        for (let i = 0; i < 6; i++) { 
            const holeDiv = document.createElement('div'); 
            holeDiv.className = 'hole cursor-pointer p-2'; 
            holeDiv.innerHTML = `<img src="images/hole.png" alt="地洞" class="w-full h-full object-contain filter hover:brightness-110 transition-all duration-200">`; 
            holeDiv.style.animation = `pulse ${1.5 + Math.random()}s ease-in-out infinite`; 
            holeDiv.onclick = () => handleCatch(holeDiv); 
            dom.catch.container.appendChild(holeDiv); 
        } 
    }
    function handleCatch(holeDiv) {
        dom.catch.container.querySelectorAll('.hole').forEach(g => g.onclick = null);
        holeDiv.style.opacity = 0.5;
        setTimeout(() => {
            if (Math.random() < 0.7) {
                const newCricket = GameManager.generateCricket(GameManager.currentStage);
                showModal({
                    content: `<h3 class="text-xl font-bold mb-2">抓到了！</h3>
                              <div class="w-32 h-32 mx-auto mb-2">
                                <img src="${newCricket.imagePath}" alt="${newCricket.name}" class="w-full h-full object-contain filter drop-shadow-md">
                              </div>
                              <p class="font-bold text-lg">${newCricket.name} <span class="text-sm font-normal">Lv.${newCricket.level}</span></p>
                              <div class="text-sm"><p>❤️ 體力: ${newCricket.maxHp}</p><p>⚔️ 鬥性: ${newCricket.attack}</p><p>⚡ 精力: ${newCricket.maxStamina}</p></div>`,
                    confirmText: "替換夥伴", cancelText: "放生",
                    onConfirm: () => { GameManager.playerCricket = newCricket; updateHubUI(); switchScreen('hub'); },
                    onCancel: () => setupCatchScreen()
                });
            } else {
                showModal({ content: '<p class="font-bold text-lg">唉呀，讓牠跑了！</p>', onConfirm: () => setupCatchScreen() });
            }
        }, 500);
    }

    // --- 訓練畫面邏輯 (無變動) ---
    let trainState = { id: null, position: 0, direction: 1, speed: 250, lastTime: null };
    function resetTrainScreen() { 
        const remaining = 3 - GameManager.trainingSessionsUsed;
        dom.train.actionBtn.textContent = '開始訓練'; 
        dom.train.result.innerHTML = `本關卡剩餘訓練次數: <span class="font-bold text-lg">${remaining}</span>`; 
        trainState.position = 0; 
        trainState.direction = 1; 
        dom.train.pointer.style.left = '0%'; 
        if (trainState.id) cancelAnimationFrame(trainState.id); 
        trainState.id = null; 
        dom.train.actionBtn.disabled = false;
    }
    function trainingLoop(timestamp) { if (!trainState.lastTime) trainState.lastTime = timestamp; const delta = (timestamp - trainState.lastTime) / 1000; const barWidth = dom.train.pointer.parentElement.offsetWidth; trainState.position += trainState.direction * trainState.speed * delta; if (trainState.position >= barWidth || trainState.position <= 0) { trainState.direction *= -1; trainState.position = Math.max(0, Math.min(barWidth, trainState.position)); } dom.train.pointer.style.left = `${trainState.position}px`; trainState.lastTime = timestamp; trainState.id = requestAnimationFrame(trainingLoop); }
    function handleTrainAction() {
        if (trainState.id) {
            cancelAnimationFrame(trainState.id);
            trainState.id = null;
            dom.train.actionBtn.textContent = '再次訓練';

            const posPercent = (trainState.position / dom.train.pointer.parentElement.offsetWidth) * 100;
            const statMap = { maxHp: "體力", attack: "鬥性", maxStamina: "精力上限" };
            const statToIncrease = GameManager.pick_random(Object.keys(statMap));
            let increaseAmount = 0;
            let resultText = "";

            if (posPercent >= 40 && posPercent <= 60) { resultText = "完美！能力大幅提升！"; increaseAmount = GameManager.randi_range(3, 5); } 
            else if (posPercent >= 20 && posPercent <= 80) { resultText = "不錯，能力提升了。"; increaseAmount = GameManager.randi_range(1, 2); } 
            else { resultText = "失誤...沒有效果。"; }
            
            let statUpText = "";
            if (increaseAmount > 0) {
                GameManager.playerCricket[statToIncrease] += increaseAmount;
                statUpText = `${statMap[statToIncrease]} 上升了 ${increaseAmount}！`;
            }

            GameManager.trainingSessionsUsed++;
            const remaining = 3 - GameManager.trainingSessionsUsed;

            dom.train.result.innerHTML = `${resultText}<br>${statUpText}<br>本關卡剩餘訓練次數: <span class="font-bold text-lg">${remaining}</span>`;

            if (remaining <= 0) {
                dom.train.actionBtn.textContent = '次數用盡';
                dom.train.actionBtn.disabled = true;
            }
        } else {
            trainState.lastTime = null;
            dom.train.result.textContent = "";
            dom.train.actionBtn.textContent = "停止！";
            trainState.id = requestAnimationFrame(trainingLoop);
        }
    }
    
    // --- 戰鬥畫面邏輯 ---
    let battleState = { player: null, opponent: null, isOver: false };

    function startBattle() {
        battleState.player = Object.assign(new CricketData(), JSON.parse(JSON.stringify(GameManager.playerCricket)));
        battleState.opponent = GameManager.generateCricket(GameManager.currentStage);
        
        battleState.player.resetForBattle();
        battleState.opponent.resetForBattle();
        battleState.isOver = false;

        dom.battle.log.innerHTML = "";
        addBattleLog(`[b]戰鬥開始！[/b]`);
        
        updateBattleUI();
        updateActionButtonsState();
        dom.battle.actionButtons.style.visibility = 'visible';
    }

    function updateBattleUI() {
        const createInfoCard = (cricket) => {
            const hpPercent = Math.max(0, (cricket.currentHp / cricket.maxHp) * 100);
            const stPercent = Math.max(0, (cricket.currentStamina / cricket.maxStamina) * 100);
            return `
            <div class="bg-amber-200/70 p-2 rounded-lg border-2 border-amber-400 space-y-1">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-amber-950">${cricket.name} <span class="text-xs">Lv.${cricket.level}</span></span>
                </div>
                <div class="flex items-center text-xs">
                    <span class="font-bold text-red-700 w-8">HP</span>
                    <div class="w-full bg-gray-300 rounded-full h-3.5 border border-gray-400">
                        <div class="bg-red-600 h-full rounded-full transition-all duration-300" style="width: ${hpPercent}%;"></div>
                    </div>
                    <span class="w-16 text-right font-semibold">${cricket.currentHp}/${cricket.maxHp}</span>
                </div>
                <div class="flex items-center text-xs">
                    <span class="font-bold text-sky-700 w-8">SP</span>
                    <div class="w-full bg-gray-300 rounded-full h-3.5 border border-gray-400">
                        <div class="bg-sky-500 h-full rounded-full transition-all duration-300" style="width: ${stPercent}%;"></div>
                    </div>
                    <span class="w-16 text-right font-semibold">${cricket.currentStamina}/${cricket.maxStamina}</span>
                </div>
                ${cricket.isTaunted ? '<div class="text-center text-xs text-red-600 font-bold mt-1 animate-pulse">防禦下降！</div>' : ''}
            </div>`;
        };
        dom.battle.playerInfo.innerHTML = createInfoCard(battleState.player);
        dom.battle.opponentInfo.innerHTML = createInfoCard(battleState.opponent);

        // **修改點**: 使用 <img> 標籤來顯示戰鬥中的蟋蟀圖片
        dom.battle.playerSprite.innerHTML = `<img src="${battleState.player.imagePath}" alt="${battleState.player.name}" class="w-full h-full object-contain filter drop-shadow-md">`;
        dom.battle.opponentSprite.innerHTML = `<img src="${battleState.opponent.imagePath}" alt="${battleState.opponent.name}" class="w-full h-full object-contain filter drop-shadow-md">`;
    }

    function addBattleLog(message) {
        message = message.replace(/\[b\](.*?)\[\/b\]/g, '<strong class="text-amber-900">$1</strong>');
        dom.battle.log.innerHTML += `<p>${message}</p>`;
        dom.battle.log.scrollTop = dom.battle.log.scrollHeight;
    }

    function updateActionButtonsState() {
        const playerStamina = battleState.player.currentStamina;
        dom.battle.actionButtons.querySelectorAll('.fight-action').forEach(btn => {
            const action = btn.dataset.action;
            const cost = GameManager.ACTION_COSTS[action];
            btn.disabled = playerStamina < cost;
        });
    }
    
    async function handlePlayerAction(playerAction) {
        if (battleState.isOver) return;
        const cost = GameManager.ACTION_COSTS[playerAction];
        if (battleState.player.currentStamina < cost && playerAction !== 'taunt') return;
        dom.battle.actionButtons.style.visibility = 'hidden';
        const opponentAction = getOpponentAction();
        dom.battle.playerSprite.className = "w-36 h-36 transform -scale-x-100";
        dom.battle.opponentSprite.className = "w-36 h-36";
        await resolveTurn(playerAction, opponentAction);
        if (!battleState.isOver) {
            updateActionButtonsState();
            dom.battle.actionButtons.style.visibility = 'visible';
        }
    }
    
    function getOpponentAction() {
        const { opponent } = battleState;
        const availableActions = Object.keys(GameManager.ACTION_COSTS).filter(action => opponent.currentStamina >= GameManager.ACTION_COSTS[action] || action === 'taunt');
        if (availableActions.length === 0) return 'taunt';
        if (opponent.currentStamina < GameManager.ACTION_COSTS.attack && availableActions.includes('taunt')) { return 'taunt'; }
        const choices = {};
        if (availableActions.includes('attack')) choices.attack = 3;
        if (availableActions.includes('taunt')) choices.taunt = 3;
        if (availableActions.includes('defend')) choices.defend = 3;
        if (battleState.player.currentHp / battleState.player.maxHp < 0.4) { if (choices.attack) choices.attack = 6; }
        if (opponent.isTaunted) { if (choices.attack) choices.attack = 7; if (choices.taunt) choices.taunt = 1; }
        const totalWeight = Object.values(choices).reduce((sum, weight) => sum + weight, 0);
        let randomPick = Math.random() * totalWeight;
        for (const [action, weight] of Object.entries(choices)) { if (randomPick < weight) return action; randomPick -= weight; }
        return availableActions[0];
    }

    async function resolveTurn(pAction, oAction) {
        const { player, opponent } = battleState;
        const { ACTION_COSTS } = GameManager;
        player.currentStamina = Math.min(player.maxStamina, player.currentStamina - ACTION_COSTS[pAction]);
        if (ACTION_COSTS[pAction] > 0) addBattleLog(`[你] 消耗了 ${ACTION_COSTS[pAction]} 精力。`); else addBattleLog(`[你] 回復了 ${-ACTION_COSTS[pAction]} 精力。`);
        opponent.currentStamina = Math.min(opponent.maxStamina, opponent.currentStamina - ACTION_COSTS[oAction]);
        if (ACTION_COSTS[oAction] > 0) addBattleLog(`[敵] 消耗了 ${ACTION_COSTS[oAction]} 精力。`); else addBattleLog(`[敵] 回復了 ${-ACTION_COSTS[oAction]} 精力。`);
        updateBattleUI();
        await new Promise(r => setTimeout(r, 800));
        if (pAction === 'taunt') { opponent.isTaunted = true; addBattleLog(`[你] ${player.name} 發出挑釁！`); dom.battle.playerSprite.classList.add('charge-anim'); }
        if (oAction === 'taunt') { player.isTaunted = true; addBattleLog(`[敵] ${opponent.name} 發出挑釁！`); dom.battle.opponentSprite.classList.add('charge-anim-opponent'); }
        updateBattleUI();
        await new Promise(r => setTimeout(r, 800));
        if (pAction === 'attack') { dom.battle.playerSprite.classList.add('shake-anim'); addBattleLog(`[你] ${player.name} 發動猛攻！`); if (oAction !== 'defend') { const damage = calculateDamage(player, opponent); opponent.currentHp -= damage; addBattleLog(`對敵人造成了 [b]${damage}[/b] 點傷害！`); } else { addBattleLog(`你的攻擊被防禦了！`); } }
        if (oAction === 'attack') { dom.battle.opponentSprite.classList.add('shake-anim-opponent'); addBattleLog(`[敵] ${opponent.name} 發動猛攻！`); if (pAction !== 'defend') { const damage = calculateDamage(opponent, player); player.currentHp -= damage; addBattleLog(`你受到了 [b]${damage}[/b] 點傷害！`); } else { addBattleLog(`敵人的攻擊被你防禦了！`); } }
        updateBattleUI();
        await new Promise(r => setTimeout(r, 800));
        player.isTaunted = false;
        dom.battle.playerSprite.className = "w-36 h-36 transform -scale-x-100";
        dom.battle.opponentSprite.className = "w-36 h-36";
        updateBattleUI();
        checkBattleEnd();
    }
    
    function calculateDamage(attacker, defender) { let finalDamage = attacker.attack + GameManager.randi_range(-2, 3); if (defender.isTaunted) finalDamage = Math.round(finalDamage * 1.5); if (Math.random() < 0.1) { finalDamage = Math.round(finalDamage * 1.5); addBattleLog(`💥 [b]爆擊！[/b]`); } return Math.max(0, finalDamage); }
    function checkBattleEnd() {
        if (battleState.player.currentHp <= 0) { battleState.isOver = true; addBattleLog(`[b]你失敗了...[/b]`); setTimeout(() => showModal({ content: '<h3>挑戰失敗</h3><p>再接再厲！</p>', onConfirm: () => switchScreen('hub') }), 1000); } 
        else if (battleState.opponent.currentHp <= 0) { 
            battleState.isOver = true; 
            addBattleLog(`[b]你獲勝了！[/b]`); 
            GameManager.currentStage++; 
            GameManager.trainingSessionsUsed = 0; // 重置訓練次數 
            
            // 升級邏輯
            const cricket = GameManager.playerCricket;
            const oldLevel = cricket.level;
            cricket.level++;
            cricket.maxHp += 3;
            cricket.attack += 3;
            cricket.maxStamina += 3;

            const levelUpMessage = `
                <h3>恭喜獲勝！</h3>
                <p>成功晉級到下一關！</p>
                <div class="mt-4 text-left p-2 bg-amber-200/50 rounded-lg border border-amber-400">
                    <h4 class="font-bold text-center text-amber-950">夥伴升級了！</h4>
                    <p>等級: <span class="font-bold">${oldLevel}</span> -> <span class="font-bold text-green-600 text-lg">${cricket.level}</span></p>
                    <p>❤️ 體力上限 <span class="font-semibold text-green-600">+3</span></p>
                    <p>⚔️ 鬥性 <span class="font-semibold text-green-600">+3</span></p>
                    <p>⚡ 精力上限 <span class="font-semibold text-green-600">+3</span></p>
                </div>`;

            setTimeout(() => showModal({ 
                content: levelUpMessage, 
                onConfirm: () => switchScreen('hub') 
            }), 1000); 
        }
    }
    function initGame() { 
        document.getElementById('bgm').play();
        GameManager.playerCricket = null; 
        switchScreen('hub'); 
    }
    
    // --- 事件監聽器 ---
    document.getElementById('start-game-btn').addEventListener('click', initGame);
    document.querySelectorAll('.scene-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scene = btn.dataset.scene;
            if (scene === 'train') {
                if (GameManager.playerCricket && GameManager.trainingSessionsUsed >= 3) {
                    showModal({
                        content: '<h3>訓練次數用盡</h3><p>本關卡的訓練次數已用完，請挑戰關主以晉級。</p>',
                        confirmText: "了解"
                    });
                } else {
                    switchScreen(scene);
                }
            } else {
                switchScreen(scene);
            }
        });
    });
    dom.train.actionBtn.addEventListener('click', handleTrainAction);
    dom.battle.actionButtons.addEventListener('click', (e) => { const action = e.target.closest('.fight-action')?.dataset.action; if (action) handlePlayerAction(action); });
    dom.map.imageContainer.addEventListener('click', () => switchScreen('catch'));
    
    // 初始化開始畫面的蟋蟀圖案 (使用圖片)
    if (cricketImagePaths.length > 0) {
        dom.screens.start.querySelector('.cricket-svg-container').innerHTML = `<img src="images/intro.png" alt="蟋蟀" class="w-full h-full object-contain filter drop-shadow-md">`;
    }
});

