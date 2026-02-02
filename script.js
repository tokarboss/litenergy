const tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
    tg.enableClosingConfirmation(); // Подтверждение закрытия, чтобы не потерять прогресс
}

// --- ДАННЫЕ И ПРОГРЕССИЯ ---
let score = parseFloat(localStorage.getItem('score')) || 0;
let level = parseInt(localStorage.getItem('level')) || 1;
let clickPower = parseInt(localStorage.getItem('clickPower')) || 1;
let autoPower = parseFloat(localStorage.getItem('autoPower')) || 0;
let critChance = parseFloat(localStorage.getItem('critChance')) || 0;

let costMulti = parseInt(localStorage.getItem('costMulti')) || 50;
let costAuto = parseInt(localStorage.getItem('costAuto')) || 100;
let costCrit = parseInt(localStorage.getItem('costCrit')) || 500;

let isMuted = localStorage.getItem('isMuted') === 'true';
let isSubscribed = localStorage.getItem('isSubscribed') === 'true';
let earnedAchievements = JSON.parse(localStorage.getItem('earnedAchievements')) || [];

// Переменная для авто-назначения (админская функция из твоих инструкций)
let autoAssignment = localStorage.getItem('autoAssignment') === 'true';

// Элементы
const elements = {
    citySnd: document.getElementById('bg-city'),
    rockSnd: document.getElementById('rocket-sound'),
    clickSnd: document.getElementById('click-sound'),
    rocket: document.getElementById('rocket'),
    score: document.getElementById('score'),
    lvl: document.getElementById('user-level'),
    clickDisplay: document.getElementById('click-power-display'),
    dps: document.getElementById('dps'),
    audioToggle: document.getElementById('audio-toggle'),
    btnCrit: document.getElementById('buy-crit'),
    taskSub: document.getElementById('task-sub'),
    inviteBtn: document.getElementById('invite-friend'),
    achToast: document.getElementById('achievement-container'),
    achText: document.getElementById('achievement-text'),
    clickBtn: document.getElementById('click-btn')
};

// --- ФИКС ВЫСОТЫ И ЦЕНТРОВКИ ---
function fixLayout() {
    // Устанавливаем реальную высоту экрана
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Принудительная центровка банки, если CSS подвел
    if (elements.clickBtn) {
        elements.clickBtn.style.top = "55%";
        elements.clickBtn.style.left = "50%";
        elements.clickBtn.style.transform = "translate(-50%, -50%)";
    }
}

// --- СИСТЕМА ДОСТИЖЕНИЙ ---
const achievements = [
    { id: 'rich_1', text: "Начинающий магнат (10k ⚡)", condition: () => score >= 10000 },
    { id: 'rich_2', text: "Энергетический барон (100k ⚡)", condition: () => score >= 100000 },
    { id: 'lvl_5', text: "Профи: 5 уровень достигнут!", condition: () => level >= 5 }
];

function checkAchievements() {
    achievements.forEach(ach => {
        if (!earnedAchievements.includes(ach.id) && ach.condition()) {
            showAchievement(ach.text);
            earnedAchievements.push(ach.id);
            save();
        }
    });
}

function showAchievement(text) {
    if (!elements.achToast || !elements.achText) return;
    elements.achText.innerText = text;
    elements.achToast.classList.add('show');
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    setTimeout(() => elements.achToast.classList.remove('show'), 4000);
}

function save() {
    localStorage.setItem('score', score);
    localStorage.setItem('level', level);
    localStorage.setItem('clickPower', clickPower);
    localStorage.setItem('autoPower', autoPower);
    localStorage.setItem('critChance', critChance);
    localStorage.setItem('costMulti', costMulti);
    localStorage.setItem('costAuto', costAuto);
    localStorage.setItem('costCrit', costCrit);
    localStorage.setItem('isMuted', isMuted);
    localStorage.setItem('isSubscribed', isSubscribed);
    localStorage.setItem('autoAssignment', autoAssignment);
    localStorage.setItem('earnedAchievements', JSON.stringify(earnedAchievements));
}

function updateUI() {
    checkAchievements();
    if (elements.score) elements.score.innerText = Math.floor(score).toLocaleString();
    if (elements.lvl) elements.lvl.innerText = level;
    if (elements.clickDisplay) elements.clickDisplay.innerText = clickPower + (level - 1);
    if (elements.dps) elements.dps.innerText = autoPower.toFixed(1);

    if (document.getElementById('multi-cost')) document.getElementById('multi-cost').innerText = costMulti;
    if (document.getElementById('auto-cost')) document.getElementById('auto-cost').innerText = costAuto;
    if (document.getElementById('crit-cost')) document.getElementById('crit-cost').innerText = costCrit;

    if (document.getElementById('buy-multi')) document.getElementById('buy-multi').disabled = score < costMulti;
    if (document.getElementById('buy-auto')) document.getElementById('buy-auto').disabled = score < costAuto;
    
    if (elements.btnCrit) {
        elements.btnCrit.disabled = score < costCrit || critChance >= 50;
        if (critChance >= 50) {
            elements.btnCrit.innerText = "MAX";
            elements.btnCrit.style.background = "#222";
        }
    }

    if (elements.taskSub && isSubscribed) {
        elements.taskSub.innerText = "ГОТОВО";
        elements.taskSub.disabled = true;
        elements.taskSub.style.opacity = "0.5";
    }
}

// МЕХАНИКА КЛИКА
function handlePress(x, y) {
    let isCrit = Math.random() * 100 < critChance;
    let baseVal = clickPower + (level - 1); 
    let finalVal = isCrit ? baseVal * 5 : baseVal;
    score += finalVal;

    if (!isMuted && elements.clickSnd) {
        elements.clickSnd.currentTime = 0;
        elements.clickSnd.play().catch(() => {});
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred(isCrit ? 'heavy' : 'medium');
    
    spawnParticle(x, y, isCrit ? `🔥 ${finalVal}` : `+${finalVal}`);
    
    if (score >= level * 1000) {
        level++;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        spawnParticle(window.innerWidth / 2, window.innerHeight / 2, "LEVEL UP! ✨");
    }
    updateUI();
}

// --- РАКЕТА ---
function spawnRocket() {
    if (!elements.rocket || elements.rocket.style.display === 'block') return;
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const startY = Math.random() * (window.innerHeight * 0.4) + 100;
    
    elements.rocket.style.display = 'block';
    elements.rocket.style.top = startY + 'px';
    elements.rocket.style[side] = '-100px';
    elements.rocket.style[side === 'left' ? 'right' : 'left'] = 'auto';
    
    const targetX = window.innerWidth + 200;
    const duration = 4000;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = elapsed / duration;
        if (progress < 1) {
            elements.rocket.style[side] = (-100 + (targetX * progress)) + 'px';
            requestAnimationFrame(animate);
        } else { elements.rocket.style.display = 'none'; }
    }
    requestAnimationFrame(animate);
}

if (elements.rocket) {
    elements.rocket.onclick = (e) => {
        e.stopPropagation();
        const bonus = (clickPower + level) * 50;
        score += bonus;
        if (!isMuted && elements.rockSnd) {
            elements.rockSnd.currentTime = 0;
            elements.rockSnd.play().catch(() => {});
        }
        elements.rocket.style.display = 'none';
        spawnParticle(e.clientX, e.clientY, `🚀 +${bonus}`);
        updateUI();
        save();
    };
}

setInterval(() => { if (Math.random() > 0.7) spawnRocket(); }, 15000);

// --- ЗАДАНИЯ И РЕФЕРАЛЫ ---
if (elements.inviteBtn) {
    elements.inviteBtn.onclick = () => {
        const userId = tg.initDataUnsafe?.user?.id || 0;
        // Замени на актуальную ссылку своего бота
        const inviteLink = `https://t.me/litvin_clicker_bot?start=${userId}`;
        const shareText = `Присоединяйся к Lit Energy Game! По моей ссылке дадут бонус ⚡`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`);
    };
}

if (elements.taskSub) {
    elements.taskSub.onclick = () => {
        if (!isSubscribed) {
            tg.openTelegramLink('https://t.me/fullSsshit');
            setTimeout(() => {
                isSubscribed = true;
                score += 5000;
                spawnParticle(window.innerWidth / 2, window.innerHeight / 2, "+5000 ⚡");
                updateUI();
                save();
            }, 3000); // 3 секунды ожидания "проверки"
        }
    };
}

// --- АУДИО ---
if (elements.audioToggle) {
    elements.audioToggle.innerText = isMuted ? '🔇' : '🔊';
    elements.audioToggle.onclick = (e) => {
        e.stopPropagation();
        isMuted = !isMuted;
        elements.audioToggle.innerText = isMuted ? '🔇' : '🔊';
        if (elements.citySnd) {
            isMuted ? elements.citySnd.pause() : elements.citySnd.play().catch(() => {});
        }
        save();
    };
}

// --- ПОКУПКИ ---
document.getElementById('buy-multi').onclick = () => {
    if(score >= costMulti) { 
        score -= costMulti; clickPower++; costMulti = Math.round(costMulti * 1.8); 
        updateUI(); save(); 
    }
};
document.getElementById('buy-auto').onclick = () => {
    if(score >= costAuto) { 
        score -= costAuto; autoPower++; costAuto = Math.round(costAuto * 1.8); 
        updateUI(); save(); 
    }
};
document.getElementById('buy-crit').onclick = () => {
    if(score >= costCrit && critChance < 50) { 
        score -= costCrit; critChance += 2; costCrit = Math.round(costCrit * 2.5); 
        updateUI(); save(); 
    }
};

function spawnParticle(x, y, t) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = t;
    p.style.left = x + 'px'; p.style.top = y + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
}

// --- ОБРАБОТКА КЛИКА (ФИКС) ---
if (elements.clickBtn) {
    elements.clickBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handlePress(touch.clientX, touch.clientY);
    }, { passive: false });

    elements.clickBtn.addEventListener('mousedown', (e) => {
        handlePress(e.clientX, e.clientY);
    });
}

// --- МАГАЗИН ---
document.getElementById('open-shop').onclick = () => document.getElementById('shop-modal').classList.add('active');
document.getElementById('close-shop').onclick = () => document.getElementById('shop-modal').classList.remove('active');

// --- ГЛАВНЫЕ ЦИКЛЫ ---
setInterval(() => {
    if (autoPower > 0) {
        score += autoPower / 10;
        updateUI();
    }
}, 100);

// Автосохранение раз в 10 секунд
setInterval(save, 10000);

// Запуск фикса раскладки
window.addEventListener('resize', fixLayout);
window.addEventListener('load', fixLayout);
fixLayout();
updateUI();

// Функция для тебя (админа), чтобы через консоль менять авто-назначение
window.toggleAdminAutoAssign = () => {
    autoAssignment = !autoAssignment;
    save();
    console.log("Auto-assignment is now: " + autoAssignment);
};
