const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// --- 🔊 СИСТЕМА ЗВУКІВ ---
let isSoundEnabled = true;
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playClickSound(type = 'click') {
    if (!isSoundEnabled) return;
    try {
        initAudio(); if (!audioCtx) return;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'click') {
            osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        }
    } catch (e) {}
}

function closeSplashScreen() {
    playClickSound('success');
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    const loaded = loadGameData();
    if (!loaded) document.getElementById('screen-creation').classList.add('active');
}

// --- СТАН ГРИ ---
let racerName = "Mykyta"; let racerGender = "Хлопець"; let racerHousing = "rent"; let racerStyle = "";
let selectedTalentIdx = 0; const TALENT_NAMES = ["Природжений Хотлапер", "Java-Гік"];
let money = 1000; let energy = 100; let maxEnergy = 100; let stress = 0;
let currentDay = 1; let currentHour = 9; let currentMinute = 0; let racerAge = 18;
const WEEKDAYS = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
let level = 1; let xp = 0; let skillPoints = 0; let stats = { ment: 0, phys: 0, eng: 0 };
let wheelCondition = 100; let upgrades = { keyboard: false, ups: false, wheel: false, pedals: false, monitor: false };
const LEAGUES = [
    { name: "Dark Race Simclub", fee: 0, laps: 3, speed: 4, reward: 500, req: "none" },
    { name: "КМАМК Україна", fee: 400, laps: 4, speed: 5, reward: 1500, req: "wheel" },
    { name: "FIA Formula 3", fee: 1200, laps: 5, speed: 6, reward: 3500, req: "pedals" }
];
let currentLeagueIdx = 0;

// --- 🤝 СИСТЕМА УКРАЇНСЬКИХ СПОНСОРІВ ---
const SPONSORS = [
    { name: "Мережа АТБ 🛒", pay: 5, reqLeague: 0, reqUpg: "none" },
    { name: "Мультимаркет Аврора 🛍️", pay: 15, reqLeague: 1, reqUpg: "none" },
    { name: "Нова Пошта 📦", pay: 35, reqLeague: 2, reqUpg: "wheel" },
    { name: "Monobank 🐈", pay: 75, reqLeague: 2, reqUpg: "monitor" }
];
let activeSponsorIdx = null;

// --- 💻 ДВИГУН РОЗРОБКИ ПРОЕКТІВ (GAME DEV TYCOON STYLE) ---
let isProjectActive = false;
let projectType = 'tickets'; // tickets або vip_audit
let projectProgress = 0;
let projectPhase = 1; // 1, 2, 3
let projectInterval = null;
let pointsSpeed = 0; let pointsQuality = 0; let pointsBugs = 0;
const PHASE_NAMES = {
    tickets: ["Етап 1: Швидкість кліків по чатах", "Етап 2: Ввічливість та Скрипти", "Етап 3: Вирішення технічних затиків"],
    vip_audit: ["Етап 1: Перевірка логів та сесій", "Етап 2: Аналіз конверсії депозитів", "Етап 3: Фінальний звіт Керуючій"]
};

// --- 📰 ВЕЛИКА БАЗА ГОНОЧНИХ ТА СВІТОВИХ НОВИН ---
const NEWS_POOL = [
    "⚡ ДРАБІВ НА ЗВ'ЯЗКУ: Через бурю на Черкащині зафіксовані локальні вимкнення світла. Сімрейсери без ДБЖ під загрозою!",
    "🏎️ DARK RACE SIMCLUB: Співтовариство DRS оголосило про запуск 3-го сезону чемпіонату на трасі Spa! Очікується шалена боротьба.",
    "📦 НОВА ПОШТА ТЕСТУЄ ДОСТАВКУ ДРОНАМИ: Нова партія баз Moza R9 успішно доставлена першим замовникам безпосередньо на балкони.",
    "🐈 MONOBANK РЕКОМЕНДУЄ: Кетбек за купівлю автомобільних педалей з Load Cell цього місяця становить рекордні 10%.",
    "🛒 АТБ ВЛАШТОВУЄ АКЦІЮ: Енергетики Monster Energy за купонами тепер відпускаються зі знижкою 25%. Черги до кас зростають.",
    "🤯 ДЕФІЦИТ НА РИНКУ: Бази Moza R16 та R21 повністю розкуплені в Україні. На OLX б/в варіанти продають за потрійну ціну."
];

function triggerRandomNews() {
    if (!isProjectActive && !isRaceActive) {
        const msg = NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)];
        document.getElementById('news-text').innerText = msg;
        document.getElementById('news-modal').style.display = 'flex';
        playClickSound('success');
    }
}
function closeNewsModal() { playClickSound(); document.getElementById('news-modal').style.display = 'none'; }

function startNewProject(type) {
    if (energy < 25) { alert("Не вистачає сил для старту проекту!"); return; }
    playClickSound();
    isProjectActive = true; projectType = type; projectProgress = 0; projectPhase = 1;
    pointsSpeed = 0; pointsQuality = 0; pointsBugs = 0;

    document.getElementById('project-init-zone').style.display = 'none';
    document.getElementById('project-development-zone').style.display = 'block';
    
    document.getElementById('points-speed').innerText = 0;
    document.getElementById('points-quality').innerText = 0;
    document.getElementById('points-bugs').innerText = 0;
    document.getElementById('project-progress-fill').style.width = '0%';
    
    updateSliderPhaseUI();

    // Пасивний цикл розробки
    projectInterval = setInterval(() => {
        projectProgress += 5;
        currentMinute += 10;
        if (currentMinute >= 60) { currentMinute = 0; currentHour++; }

        // Математика генерації очок залежно від повзунка
        let sliderVal = parseInt(document.getElementById('tycoon-phase-slider').value); // 10 - 90
        energy = Math.max(0, energy - 1);
        stress = Math.min(100, stress + (upgrades.keyboard ? 0.5 : 1));

        if (projectPhase === 1) {
            pointsSpeed += Math.floor((sliderVal / 20) + Math.random() * 2);
            if (sliderVal > 70 && Math.random() < 0.3) pointsBugs++;
        } else if (projectPhase === 2) {
            pointsQuality += Math.floor(((100 - sliderVal) / 20) + Math.random() * 2) + stats.eng;
            if (sliderVal < 30 && Math.random() < 0.2) pointsBugs++;
        } else {
            pointsSpeed += Math.floor((sliderVal / 30));
            pointsQuality += Math.floor(((100 - sliderVal) / 30)) + stats.eng;
            if (Math.random() < 0.15) pointsBugs++;
        }

        // Візуалізація
        document.getElementById('points-speed').innerText = pointsSpeed;
        document.getElementById('points-quality').innerText = pointsQuality;
        document.getElementById('points-bugs').innerText = pointsBugs;
        document.getElementById('project-progress-fill').style.width = projectProgress + '%';

        if (projectProgress >= 100 || currentHour >= 18) {
            finishProjectDevelopment();
        }
        updateUI();
        checkGameOver();
    }, 1000); // 1 сек = 10 хв у грі
}

function updateSliderPhaseUI() {
    document.getElementById('dev-project-title').innerText = `Проект: ${projectType === 'tickets' ? 'Черга чатів' : 'VIP-Аудит'} | Етап ${projectPhase}/3`;
    document.getElementById('slider-label-name').innerText = PHASE_NAMES[projectType][projectPhase - 1];
}

function nextProjectPhase() {
    playClickSound('success');
    if (projectPhase < 3) {
        projectPhase++;
        updateSliderPhaseUI();
    } else {
        finishProjectDevelopment();
    }
}

function finishProjectDevelopment() {
    clearInterval(projectInterval);
    isProjectActive = false;
    document.getElementById('project-init-zone').style.display = 'block';
    document.getElementById('project-development-zone').style.display = 'none';

    // Розрахунок винагороди (Game Dev Tycoon оцінка)
    let finalRating = Math.max(1, Math.min(10, Math.floor((pointsSpeed + pointsQuality) / 5) - pointsBugs));
    let basePayout = projectType === 'tickets' ? 200 : 550;
    let rewardMoney = Math.floor(basePayout * (finalRating / 5)) + (stats.eng * 30);
    if (rewardMoney < 50) rewardMoney = 50; // Мінімалка

    money += rewardMoney;
    gainXP(projectType === 'tickets' ? 25 : 60);

    document.getElementById('work-log').innerHTML = `🏁 <b>Проект завершено!</b><br>📊 Оцінка Керуючої: <b>${finalRating}/10</b>.<br>💵 Нараховано за розробку: <b>+${rewardMoney}₴</b>. Було виправлено багів: ${pointsBugs}.`;
    
    if (currentHour >= 18) endDayRoutine();
    
    // 40% шанс виходу сюжетного квесту по центру екрану
    if (Math.random() < 0.4) triggerCentralQuest();
    updateUI();
}

// --- 🚨 СИСТЕМА МОДАЛЬНИХ ЦЕНТРАЛЬНИХ КВЕСТІВ ---
function triggerCentralQuest() {
    currentActiveQuest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    document.getElementById('quest-title').innerText = currentActiveQuest.title;
    document.getElementById('quest-desc').innerText = currentActiveQuest.desc;
    document.getElementById('btn-q1').innerText = currentActiveQuest.b1;
    document.getElementById('btn-q2').innerText = currentActiveQuest.b2;
    document.getElementById('quest-modal').style.display = 'flex';
    playClickSound('success');
}
function chooseQuest(choice) {
    if (!currentActiveQuest) return;
    playClickSound('success');
    let res = currentActiveQuest.action(choice);
    document.getElementById('work-log').innerHTML = res;
    document.getElementById('quest-modal').style.display = 'none';
    currentActiveQuest = null;
    updateUI();
}

// --- 🤝 УКРАЇНСЬКІ СПОНСОРІВ ---
function signUkrainianSponsor(idx) {
    let sp = SPONSORS[idx];
    if (currentLeagueIdx < sp.reqLeague) { alert("Твоя поточна гоночна ліга занадто низька!"); return; }
    if (sp.reqUpg !== "none" && !upgrades[sp.reqUpg]) { alert(`Для контракту потрібен девайс з гаражу: ${sp.reqUpg}`); return; }

    playClickSound('success');
    activeSponsorIdx = idx;
    updateUI();
}

function saveGameData() {
    const saveData = {
        racerName, racerGender, racerHousing, racerStyle, selectedTalentIdx,
        money, energy, maxEnergy, stress, currentDay, currentHour, currentMinute, racerAge,
        level, xp, skillPoints, stats, wheelCondition, upgrades, currentLeagueIdx, activeSponsorIdx
    };
    localStorage.setItem('simracer_tycoon_save', JSON.stringify(saveData));
    playClickSound('success'); alert("💽 Прогрес збережено!"); toggleMenuModal();
}

function loadGameData() {
    const raw = localStorage.getItem('simracer_tycoon_save'); if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        racerName = data.racerName; racerGender = data.racerGender; racerHousing = data.racerHousing;
        racerStyle = data.racerStyle; selectedTalentIdx = data.selectedTalentIdx; money = data.money;
        energy = data.energy; maxEnergy = data.maxEnergy; stress = data.stress; currentDay = data.currentDay;
        currentHour = data.currentHour; currentMinute = data.currentMinute; racerAge = data.racerAge;
        level = data.level; xp = data.xp; skillPoints = data.skillPoints; stats = data.stats;
        wheelCondition = data.wheelCondition; upgrades = data.upgrades; currentLeagueIdx = data.currentLeagueIdx;
        activeSponsorIdx = data.activeSponsorIdx;

        Object.keys(upgrades).forEach(key => {
            if (upgrades[key]) {
                const btn = document.getElementById(`btn-${key}`); if (btn) btn.innerText = "КУПЛЕНО";
                const card = document.getElementById(`upg-${key}`); if (card) card.classList.add('owned');
            }
        });
        document.getElementById('screen-creation').classList.remove('active');
        document.getElementById('main-game-header').style.display = 'block';
        document.getElementById('global-tabs').style.display = 'flex';
        applyBioToUI(); initPassiveEnergyRegen(); switchTab('work'); updateUI(); return true;
    } catch(e) { return false; }
}

function toggleMenuModal() { playClickSound(); const modal = document.getElementById('game-menu-modal'); if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none'; }
function toggleSound() { isSoundEnabled = !isSoundEnabled; document.getElementById('sound-status-text').innerText = isSoundEnabled ? "Увімкнено" : "Вимкнено"; playClickSound(); }

function initPassiveEnergyRegen() {
    const lastTime = localStorage.getItem('simracer_tycoon_last_time');
    if (lastTime) {
        const diff = Date.now() - parseInt(lastTime); const gained = Math.floor(diff / 120000);
        if (gained > 0) energy = Math.min(maxEnergy, energy + gained);
    }
    setInterval(() => {
        if (!isProjectActive && energy < maxEnergy) { energy = Math.min(maxEnergy, energy + 1); updateUI(); }
        // 5% Шанс виходу поп-ап новини кожні 2 хвилини реального часу
        if (Math.random() < 0.05) triggerRandomNews();
        localStorage.setItem('simracer_tycoon_last_time', Date.now().toString());
    }, 120000);
}

window.addEventListener('beforeunload', () => { localStorage.setItem('simracer_tycoon_last_time', Date.now().toString()); });
function selectTalent(idx, element) { playClickSound(); selectedTalentIdx = idx; document.querySelectorAll('.talent-card').forEach(c => c.classList.remove('active')); element.classList.add('active'); }
function applyBioToUI() { document.getElementById('bio-name').innerText = racerName; document.getElementById('bio-gender').innerText = racerGender; document.getElementById('bio-talent').innerText = TALENT_NAMES[selectedTalentIdx]; document.getElementById('bio-housing').innerText = racerHousing === "parents" ? "З батьками (0₴)" : "Оренда (400₴)"; }

function startGameWithCharacter() {
    playClickSound('success'); racerName = document.getElementById('creation-name').value.trim() || "Mykyta"; racerGender = document.getElementById('creation-gender').value; racerHousing = document.getElementById('creation-housing').value; racerStyle = document.getElementById('creation-style').value;
    money = (racerGender === "Дівчина") ? 1500 : 1000; if (selectedTalentIdx === 1) stats.eng = 2;
    applyBioToUI(); document.getElementById('screen-creation').classList.remove('active'); document.getElementById('main-game-header').style.display = 'block'; document.getElementById('global-tabs').style.display = 'flex';
    initPassiveEnergyRegen(); switchTab('work'); updateUI();
}

function switchTab(tabName) {
    if (isProjectActive || isRaceActive) { alert("Не можна перемикати вкладки під час активного процесу!"); return; }
    playClickSound();
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(`screen-${tabName}`).classList.add('active');
    const tabs = ['work', 'racer', 'garage', 'sponsors', 'race'];
    document.getElementById('global-tabs').children[tabs.indexOf(tabName)].classList.add('active');

    let dayOfWeekIdx = (currentDay - 1) % 7; let isWeekend = (dayOfWeekIdx === 5 || dayOfWeekIdx === 6);
    if (tabName === 'race') {
        if (isWeekend) { document.getElementById('race-active-zone').style.display = "block"; document.getElementById('race-weekday-blocker').style.display = "none"; }
        else { document.getElementById('race-active-zone').style.display = "none"; document.getElementById('race-weekday-blocker').style.display = "block"; }
    }
}

function endDayRoutine() {
    if (projectInterval) clearInterval(projectInterval); isProjectActive = false;
    document.getElementById('project-init-zone').style.display = 'block'; document.getElementById('project-development-zone').style.display = 'none';
    currentHour = 9; currentMinute = 0; currentDay += 1;
    let dailyCost = racerHousing === "rent" ? 400 : 100; money -= dailyCost;
    alert(`⏰ День завершено! \n💸 Знято кошти за оренду та побут: -${dailyCost}₴.`);
    if (currentDay % 10 === 1) { racerAge += 1; alert(`👴 Рік минув! Тобі вже ${racerAge} років.`); }
    if (money < 0) endGame("💀 БАНКРУТСТВО", "Гроші закінчились.");
}

function gainXP(amount) {
    if (racerHousing === "parents") amount = Math.floor(amount * 0.8);
    if (racerHousing === "rent") amount = Math.floor(amount * 1.2);
    xp += amount; if (xp >= 100) { xp -= 100; level += 1; skillPoints += 2; playClickSound('success'); }
}
function upgradeStat(stat) { if (skillPoints > 0) { playClickSound('success'); skillPoints -= 1; stats[stat] += 1; updateUI(); } }

function relaxAction(type) {
    if (isProjectActive) { alert("Ти не можеш відпочивати під час розробки проекту!"); return; }
    playClickSound();
    if (type === 'sleep') { energy = Math.min(maxEnergy, energy + 30); stress = Math.max(0, stress - 10); currentHour += 2; }
    else if (type === 'varus') { if (money < 100) return; money -= 100; energy = Math.min(maxEnergy, energy + 35); stress = Math.max(0, stress - 15); currentHour += 1; }
    else if (type === 'glovo') { if (money < 180) return; money -= 180; energy = Math.min(maxEnergy, energy + 55); stress = Math.max(0, stress - 25); currentHour += 1; }
    
    // Пасивний дохід спонсора нараховується під час відпочинку (за пройдений час)
    if (activeSponsorIdx !== null) {
        let passHours = type === 'sleep' ? 2 : 1;
        money += SPONSORS[activeSponsorIdx].pay * passHours;
    }

    if (currentHour >= 18) endDayRoutine();
    updateUI();
}

// --- 🏁 СТРАТЕГІЧНИЙ СИМУЛЯТОР ГОНКИ ---
let currentTactic = 'safe';
let raceTimer = null;
const SITUATIONS = [
    { text: "Затяжна швидкісна дуга Spa-Francorchamps.", push: "P1", safe: "P0", save: "P-1", sPush: 15, sSave: -5 },
    { text: "Різка атака суперника всередині шпильки!", push: "P2", safe: "P-1", save: "P-2", sPush: 20, sSave: -10 },
    { text: "Траєкторія покривається краплями дощу. Трек слизький.", push: "P-2", safe: "P1", save: "P0", sPush: 25, sSave: -12 }
];

function startStrategicRace() {
    let league = LEAGUES[currentLeagueIdx];
    if (league.req !== "none" && !upgrades[league.req]) { alert(`Потрібен девайс: ${league.req}`); return; }
    if (money < league.fee) { alert("Не вистачає на внесок!"); return; }

    money -= league.fee; isRaceActive = true; currentLap = 1; racePosition = 20; raceTicks = 0;
    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('race-simulation-box').style.display = 'block';
    playRaceTick();
}
function submitTactic(tactic) { playClickSound(); currentTactic = tactic; }

function playRaceTick() {
    if (!isRaceActive) return;
    raceTicks++;
    let sit = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];
    document.getElementById('race-live-status').innerText = `🏁 КОЛО ${currentLap} / Tick ${raceTicks}`;
    
    let posChange = 0; let stressGained = 5; let energyCost = Math.max(2, 8 - stats.phys);
    if (currentTactic === 'push') { posChange = sit.push === "P2" ? 3 : (sit.push === "P1" ? 1 : -2); stressGained = sit.sPush - stats.ment; energyCost += 4; }
    else if (currentTactic === 'save') { posChange = sit.save === "P0" ? 0 : -1; stressGained = sit.sSave; energyCost = 1; }
    else { posChange = sit.safe === "P1" ? 1 : 0; stressGained = 2; }

    racePosition = Math.max(1, Math.min(20, racePosition - posChange));
    stress = Math.max(0, Math.min(100, stress + stressGained)); energy = Math.max(0, energy - energyCost);
    wheelCondition = Math.max(0, wheelCondition - 1);

    document.getElementById('race-live-log').innerHTML = `<b>Подія:</b> ${sit.text}<br>🛑 Тактика: <b>${currentTactic.toUpperCase()}</b>. Позиція: P${racePosition}.`;
    
    // Спонсор платить під час гоночного заїзду теж!
    if (activeSponsorIdx !== null) money += SPONSORS[activeSponsorIdx].pay;

    updateUI();
    if (raceTicks >= 4) { raceTicks = 0; currentLap++; }
    if (currentLap > LEAGUES[currentLeagueIdx].laps || energy <= 5 || stress >= 95) endStrategicRace();
    else raceTimer = setTimeout(playRaceTick, 3500);
}

function endStrategicRace() {
    isRaceActive = false; clearTimeout(raceTimer);
    document.getElementById('start-race-btn').style.display = 'block'; document.getElementById('race-simulation-box').style.display = 'none';
    let league = LEAGUES[currentLeagueIdx];
    if (racePosition <= 3 && energy > 0 && stress < 100) {
        money += league.reward; gainXP(60);
        alert(`🏆 ПОДІУМ! P${racePosition}! Призові: +${league.reward}₴. Ліга пройдена!`);
        if (currentLeagueIdx < LEAGUES.length - 1) currentLeagueIdx++;
    } else { alert(`🏁 Фініш на P${racePosition}. Потрібен ТОП-3. Прокачуй пілота!`); }
    currentHour += 2; if (currentHour >= 18) endDayRoutine();
    updateUI();
}

function buyUpgrade(type, price) {
    if (money < price) { alert("Не вистачає коштів!"); return; }
    if (upgrades[type]) return;
    money -= price; upgrades[type] = true;
    document.getElementById(`upg-${type}`).classList.add('owned');
    document.getElementById(`btn-${type}`).innerText = "КУПЛЕНО";
    playClickSound('success'); updateUI();
}

function updateUI() {
    document.getElementById('global-money').innerText = money;
    document.getElementById('global-energy').innerText = energy;
    document.getElementById('global-stress').innerText = stress;
    document.getElementById('racer-level').innerText = level;
    document.getElementById('racer-xp').innerText = xp;
    document.getElementById('skill-points').innerText = skillPoints;
    document.getElementById('racer-age').innerText = racerAge;
    document.getElementById('game-day').innerText = currentDay;
    document.getElementById('game-hour').innerText = currentHour < 10 ? '0' + currentHour : currentHour;
    document.getElementById('game-minute').innerText = currentMinute === 0 ? '00' : currentMinute;

    let dayIdx = (currentDay - 1) % 7;
    document.getElementById('game-weekday').innerText = WEEKDAYS[dayIdx];
    let isWeekend = (dayIdx === 5 || dayIdx === 6);

    if (isWeekend) {
        document.getElementById('work-weekend-notice').style.display = "block";
        document.getElementById('project-init-zone').style.display = "none";
    } else {
        document.getElementById('work-weekend-notice').style.display = "none";
        if (!isProjectActive) document.getElementById('project-init-zone').style.display = "block";
    }

    document.getElementById('stat-val-ment').innerText = stats.ment;
    document.getElementById('stat-val-phys').innerText = stats.phys;
    document.getElementById('stat-val-eng').innerText = stats.eng;
    document.getElementById('wheel-condition').innerText = wheelCondition;

    let league = LEAGUES[currentLeagueIdx];
    document.getElementById('current-league-name').innerText = league.name;
    document.getElementById('race-fee').innerText = league.fee;
    document.getElementById('target-laps').innerText = league.laps;
    document.getElementById('max-laps-display').innerText = league.laps;
    document.getElementById('race-laps').innerText = currentLap;
    document.getElementById('race-pos').innerText = "P" + racePosition;

    // Спонсорський UI рендер
    if (activeSponsorIdx !== null) {
        document.getElementById('active-sponsor-status').innerText = `🤝 Поточний контракт: ${SPONSORS[activeSponsorIdx].name} (+${SPONSORS[activeSponsorIdx].pay}₴/год)`;
    }

    // Динамічний рендер лінійки спонсорів на вкладці
    SPONSORS.forEach((s, idx) => {
        const btn = document.getElementById(`btn-spon-${['atb', 'avrora', 'np', 'mono'][idx]}`);
        if (btn) {
            if (activeSponsorIdx === idx) {
                btn.innerText = "АКТИВНИЙ"; btn.style.background = "#2e7d32";
            } else if (currentLeagueIdx >= s.reqLeague && (s.reqUpg === "none" || upgrades[s.reqUpg])) {
                btn.innerText = "Підписати"; btn.style.background = "#ff5722";
            } else {
                btn.innerText = "Заблоковано"; btn.style.background = "#444";
            }
        }
    });
}

function checkGameOver() {
    if (stress >= 100) endGame("💀 НЕРВОВИЙ ЗРИВ", "Стрес знищив твою психіку.");
    if (energy <= 0) endGame("💀 ФІЗИЧНИЙ КОЛАПС", "Повне виснаження.");
}
function endGame(title, desc) { if (projectInterval) clearInterval(projectInterval); clearTimeout(raceTimer); document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active')); document.getElementById('global-tabs').style.display = 'none'; document.getElementById('main-game-header').style.display = 'none'; document.getElementById('screen-final').classList.add('active'); document.getElementById('final-title').innerText = title; document.getElementById('final-desc').innerText = desc; }
function resetGame() { localStorage.removeItem('simracer_tycoon_save'); location.reload(); }

updateUI();
