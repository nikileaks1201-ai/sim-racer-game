const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// --- 🔊 СИСТЕМА ЗВУКІВ ---
let isSoundEnabled = true; let audioCtx = null;
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

// --- 👤 ГЛОБАЛЬНІ ЗМІННІ ГРАВЦЯ ---
let racerName = "Mykyta"; 
let racerGender = "Хлопець"; 
let racerHousing = "rent"; 
let racerStyle = "🛹 Стріт-рейсер";
let racerPlatform = "pc";        
let racerISP = "fiber";       
let selectedTalentIdx = 0;

const TALENT_NAMES = ["Природжений Хотлапер", "Java-Гік"];

let money = 1000; 
let energy = 100; 
let maxEnergy = 100; 
let stress = 0;
let currentDay = 1; 
let currentHour = 9; 
let currentMinute = 0; 
let racerAge = 18;
const WEEKDAYS = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
let level = 1; 
let xp = 0; 
let skillPoints = 0; 
let stats = { ment: 0, phys: 0, eng: 0 };
let wheelCondition = 100; 
let upgrades = { keyboard: false, chair: false, ups: false, wheel: false, pedals: false, wheel16: false, monitor: false };
let isRaceActive = false; 
let currentLap = 1; 
let racePosition = 20;

const LEAGUES = [
    { name: "Dark Race Simclub", fee: 0, laps: 3, speed: 4, reward: 500, req: "none" },
    { name: "КМАМК Україна", fee: 400, laps: 4, speed: 5, reward: 1500, req: "wheel" },
    { name: "FIA Formula 3", fee: 1200, laps: 5, speed: 6, reward: 3500, req: "pedals" }
];
let currentLeagueIdx = 0;

const SPONSORS = [
    { name: "Мережа АТБ 🛒", pay: 10, reqLeague: 0, reqUpg: "none" },
    { name: "Мультимаркет Аврора 🛍️", pay: 25, reqLeague: 1, reqUpg: "none" },
    { name: "Нова Пошта 📦", pay: 55, reqLeague: 2, reqUpg: "wheel" },
    { name: "Monobank 🐈", pay: 110, reqLeague: 2, reqUpg: "monitor" }
];
let activeSponsorIdx = null;
let currentActiveQuest = null;

// --- 💼 СИМУЛЯТОР ІНЦИДЕНТІВ ---
let isIncidentActive = false; 
let incidentStability = 100; 
let incidentProgress = 0; 
let incidentInterval = null; 
let currentIncidentType = "";
const INCIDENT_TASKS = [
    { title: "Краш процесингу Monobank 💳", type: "shluz", desc: "Впали сервери оплати. Гравці казино лютують, депозити не проходять." },
    { title: "Атака ботів конкурентів 🛸", type: "ddos", desc: "Сервери чатів підтримки закидує спамом. Потрібно закрити шлюз." },
    { title: "Раптовий повний аудит Керуючої 👑", type: "audit", desc: "Логи піднято. Керуюча шукає баги та косяки в тональності." }
];
const LOG_MESSAGES = {
    shluz: ["[ERR] Connection timeout with Mono API!", "[SYS] Balance sync lost!", "[WARN] 452 players stuck in processing!"],
    ddos: ["[ATTACK] Inbound traffic overflow!", "[SYS] Chat buffer filled up!", "[WARN] CPU Load 98% on support node!"],
    audit: ["[AUDIT] Checking user chats...", "[SYS] Bad tonality flag detected!", "[WARN] Verification mismatch found!"]
};

// ХІД ІНІЦІАЛІЗАЦІЇ
function closeSplashScreen() {
    playClickSound('success');
    document.getElementById('splash-screen').style.display = 'none';
    
    const container = document.getElementById('game-container');
    if (container) container.style.display = 'flex';
    
    updateSaveMenuDisplay();
    generateDailyBriefing();
    
    const loaded = loadGameData();
    if (!loaded) {
        localStorage.clear();
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        const creation = document.getElementById('screen-creation');
        if (creation) creation.classList.add('active');
    }
}

function generateDailyBriefing() {
    const briefingElem = document.getElementById('daily-task-text');
    if (!briefingElem) return;
    let dayIdx = (currentDay - 1) % 7;
    if (dayIdx === 5 || dayIdx === 6) { briefingElem.innerText = "Сьогодні вихідний! Офіс зачинено. Час для симрейсингу."; return; }
    let task = INCIDENT_TASKS[currentDay % INCIDENT_TASKS.length];
    currentIncidentType = task.type;
    briefingElem.innerText = `${task.title} \n(${task.desc})`;
}

function startDailyIncident() {
    let dayIdx = (currentDay - 1) % 7;
    if (dayIdx === 5 || dayIdx === 6) { alert("Вихідний! Офіс не працює."); return; }
    if (energy < 20) { alert("Немає сил для робочої зміни!"); return; }

    playClickSound();
    if (incidentInterval) clearInterval(incidentInterval);
    isIncidentActive = true; 
    incidentStability = 100; 
    incidentProgress = 0;
    document.getElementById('project-init-zone').style.display = 'none';
    document.getElementById('project-development-zone').style.display = 'block';

    incidentInterval = setInterval(() => {
        incidentProgress += 5;
        currentMinute += 10;
        if (currentMinute >= 60) { currentMinute = 0; currentHour++; }

        let stabilityDrop = Math.max(2, 6 - stats.eng); 
        if (upgrades.keyboard) stabilityDrop *= 0.7;
        
        // 📡 ISP: Мобільний інтернет час від часу лагає і сильніше просаджує стабільність офісу
        if (racerISP === "cellular" && Math.random() < 0.15) {
            stabilityDrop += 4; 
        }
        
        // 🛹 Одяг: Стріт-рейсер дає +5% пасивного стресу
        let stressGain = 1.0;
        if (racerStyle === "🛹 Стріт-рейсер") stressGain = 1.05;

        // 💺 Апгрейд: Крісло Recaro гасить 10% стресу
        if (upgrades.chair) stressGain *= 0.9;

        incidentStability = Math.max(0, Math.min(100, incidentStability - Math.floor(stabilityDrop)));
        stress = Math.min(100, stress + (0.5 * stressGain));

        if (Math.random() < 0.7) {
            let list = LOG_MESSAGES[currentIncidentType];
            let msg = list[Math.floor(Math.random() * list.length)];
            let box = document.getElementById('incident-log-box');
            if (box) { box.innerHTML += `<br><span style="color:#ff5722;">${msg}</span>`; box.scrollTop = box.scrollHeight; }
        }

        document.getElementById('incident-stability').innerText = incidentStability;
        document.getElementById('incident-progress').innerText = incidentProgress;

        if (incidentProgress >= 100 || currentHour >= 18 || incidentStability <= 0) { finishDailyIncident(); }
        updateUI(); checkGameOver();
    }, 1000); 
}

function handleIncidentTool(action) {
    if (!isIncidentActive) return;
    playClickSound();
    let box = document.getElementById('incident-log-box'); if (!box) return;

    if (action === 'fix') {
        if (energy < 10) { alert("Мало енергії!"); return; }
        energy -= 10; incidentStability = Math.min(100, incidentStability + 15 + stats.eng * 2);
        box.innerHTML += `<br><span style="color:#4caf50;">[USER] Сервери перезавантажено.</span>`;
    } else if (action === 'filter') {
        if (energy < 5) { alert("Мало енергії!"); return; }
        energy -= 5; incidentStability = Math.min(100, incidentStability + 8);
        box.innerHTML += `<br><span style="color:#2196f3;">[USER] Трафік очищено від спаму.</span>`;
    } else if (action === 'bonus') {
        if (money < 50) { alert("Не вистачає грошей!"); return; }
        money -= 50; incidentStability = Math.min(100, incidentStability + 25); stress = Math.max(0, stress - 5);
        box.innerHTML += `<br><span style="color:#ffcc00;">[USER] Гравцям видано бонуси.</span>`;
    }
    box.scrollTop = box.scrollHeight; updateUI();
}

function finishDailyIncident() {
    clearInterval(incidentInterval); isIncidentActive = false;
    document.getElementById('project-init-zone').style.display = 'block';
    document.getElementById('project-development-zone').style.display = 'none';

    let baseSalary = currentIncidentType === "audit" ? 450 : 250;
    let earned = Math.floor(baseSalary * (incidentStability / 100)); if (earned < 50) earned = 50; 
    
    money += earned; gainXP(incidentStability > 50 ? 30 : 10);
    
    let endStress = Math.floor(15 - stats.ment);
    if (upgrades.chair) endStress = Math.floor(endStress * 0.9);
    stress = Math.min(100, stress + Math.max(2, endStress));

    document.getElementById('work-log').innerHTML = `🏁 <b>Зміну завершено!</b> Стабільність: ${incidentStability}%. ЗП: +${earned}₴`;
    endDayRoutine(); updateUI();
}

// --- КВЕСТИ ---
const QUESTS = [
    {
        title: "🛸 ПРОПОЗИЦІЯ ХАКЕРІВ",
        desc: "Конкуренти пропонують злити базу VIP-гравців за великі гроші. Що вибереш?",
        b1: "Злити базу (+1200₴, Ризик)",
        b2: "Здати в СБ (+15 Холоднокровності)",
        action: (choice) => {
            if (choice === 1) { money += 1200; if (Math.random() < 0.5) { stress = 90; return "💀 СБ виявило витік! Стрес 90%."; } return "💰 Успішно. Гроші перераховані на крипту."; }
            else { stats.ment += 15; return "🛡️ СБ ліквідувало хакерів. Холоднокровність зросла!"; }
        }
    }
];

function checkQuestTrigger() {
    if (currentDay % 3 === 0 && Math.random() < 0.5) {
        currentActiveQuest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
        document.getElementById('quest-title').innerText = currentActiveQuest.title;
        document.getElementById('quest-desc').innerText = currentActiveQuest.desc;
        document.getElementById('btn-q1').innerText = currentActiveQuest.b1;
        document.getElementById('btn-q2').innerText = currentActiveQuest.b2;
        document.getElementById('quest-modal').style.display = 'flex';
        playClickSound('success');
    }
}

function chooseQuest(choice) {
    if (!currentActiveQuest) return;
    playClickSound('success'); let res = currentActiveQuest.action(choice);
    document.getElementById('work-log').innerHTML = res;
    document.getElementById('quest-modal').style.display = 'none'; currentActiveQuest = null; updateUI();
}

function signUkrainianSponsor(idx) {
    let sp = SPONSORS[idx];
    if (currentLeagueIdx < sp.reqLeague) { alert("Твоя гоночна ліга занизька!"); return; }
    if (sp.reqUpg !== "none" && !upgrades[sp.reqUpg]) { alert(`Потрібен девайс: ${sp.reqUpg}`); return; }
    playClickSound('success'); activeSponsorIdx = idx; updateUI();
}

function updateSaveMenuDisplay() {
    const raw = localStorage.getItem('simracer_tycoon_save'); const display = document.getElementById('menu-save-details');
    if (raw && display) {
        try { const data = JSON.parse(raw); display.innerHTML = `👤 Нік: <b>${data.racerName}</b> | 💵 Баланс: <b>${data.money}₴</b>`; } catch(e) { display.innerText = "Помилка файлу"; }
    } else if (display) { display.innerText = "Збережень немає"; }
}

function saveGameData() {
    const saveData = { 
        racerName, racerGender, racerHousing, racerStyle, racerPlatform, racerISP, selectedTalentIdx, 
        money, energy, maxEnergy, stress, currentDay, currentHour, currentMinute, racerAge, 
        level, xp, skillPoints, stats, upgrades, wheelCondition, activeSponsorIdx, currentLeagueIdx
    };
    localStorage.setItem('simracer_tycoon_save', JSON.stringify(saveData));
    playClickSound('success'); alert("💽 Гру збережено!"); updateSaveMenuDisplay(); toggleMenuModal();
}

function loadGameData() {
    try {
        const raw = localStorage.getItem('simracer_tycoon_save'); if (!raw) return false;
        const data = JSON.parse(raw); if (!data || typeof data.activeSponsorIdx === 'undefined') return false; 
        racerName = data.racerName; 
        racerGender = data.racerGender; 
        racerHousing = data.racerHousing; 
        racerStyle = data.racerStyle || "🏢 Без форми";
        racerPlatform = data.racerPlatform || "pc";      
        racerISP = data.racerISP || "fiber";          
        selectedTalentIdx = data.selectedTalentIdx; 
        money = data.money; 
        energy = data.energy;
        maxEnergy = data.maxEnergy || 100;
        stress = data.stress; 
        currentDay = data.currentDay; 
        currentHour = data.currentHour; 
        currentMinute = data.currentMinute; 
        racerAge = data.racerAge;
        level = data.level; 
        xp = data.xp; 
        skillPoints = data.skillPoints; 
        stats = data.stats;
        upgrades = data.upgrades; 
        wheelCondition = data.wheelCondition; 
        activeSponsorIdx = data.activeSponsorIdx; 
        currentLeagueIdx = data.currentLeagueIdx;
        
        Object.keys(upgrades).forEach(key => {
            if (upgrades[key]) {
                const btn = document.getElementById(`btn-${key}`); if (btn) btn.innerText = "КУПЛЕНО";
                const card = document.getElementById(`upg-${key}`); if (card) card.classList.add('owned');
            }
        });
        document.getElementById('main-game-header').style.display = 'block';
        document.getElementById('global-tabs').style.display = 'flex';
        applyBioToUI(); initPassiveEnergyRegen(); switchTab('work'); updateUI(); return true;
    } catch(e) { return false; }
}

function toggleMenuModal() { playClickSound(); const modal = document.getElementById('game-menu-modal'); if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none'; }

function selectTalent(idx) {
    if (idx !== 0 && idx !== 1) return;
    playClickSound();
    selectedTalentIdx = idx;
    document.getElementById('talent-card-0').classList.remove('active');
    document.getElementById('talent-card-1').classList.remove('active');
    document.getElementById(`talent-card-${idx}`).classList.add('active');
}

function toggleSound() { isSoundEnabled = !isSoundEnabled; document.getElementById('sound-status-text').innerText = isSoundEnabled ? "Увімкнено" : "Вимкнено"; playClickSound(); }
function initPassiveEnergyRegen() { setInterval(() => { if (!isIncidentActive && energy < maxEnergy) { energy = Math.min(maxEnergy, energy + 1); updateUI(); } }, 120000); }

function applyBioToUI() { 
    document.getElementById('bio-name').innerText = racerName; 
    document.getElementById('bio-gender').innerText = racerGender; 
    document.getElementById('bio-talent').innerText = TALENT_NAMES[selectedTalentIdx];
    document.getElementById('bio-housing').innerText = racerHousing === "rent" ? "Оренда квартири" : "З батьками";
}

function startGameWithCharacter() {
    playClickSound('success');
    racerName = document.getElementById('creation-name').value.trim() || "Mykyta";
    racerGender = document.getElementById('creation-gender').value;
    racerHousing = document.getElementById('creation-housing').value;
    racerStyle = document.getElementById('creation-style').value;
    racerPlatform = document.getElementById('creation-platform').value;  
    racerISP = document.getElementById('creation-isp').value;            
    
    money = (racerGender === "Дівчина") ? 1500 : 1000;
    
    if (racerPlatform === "pc") stats.eng += 1; 
    else if (racerPlatform === "console") { money += 500; stats.eng = Math.max(0, stats.eng - 1); }
    
    if (racerISP === "fiber") money -= 200; 
    if (selectedTalentIdx === 1) stats.eng += 2;
    
    applyBioToUI();
    document.getElementById('screen-creation').classList.remove('active');
    document.getElementById('main-game-header').style.display = 'block';
    document.getElementById('global-tabs').style.display = 'flex';
    
    initPassiveEnergyRegen();
    switchTab('work');
    updateUI();
}

function switchTab(tabName) {
    if (isIncidentActive || isRaceActive) { alert("Не можна перемикати вкладки під час активного процесу!"); return; }
    playClickSound();
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    const targetScreen = document.getElementById(`screen-${tabName}`);
    if (targetScreen) targetScreen.classList.add('active');
    
    const tabs = ['work', 'racer', 'garage', 'sponsors', 'race'];
    const idx = tabs.indexOf(tabName);
    if (idx !== -1 && document.getElementById('global-tabs').children[idx]) {
        document.getElementById('global-tabs').children[idx].classList.add('active');
    }
    let dayOfWeekIdx = (currentDay - 1) % 7; let isWeekend = (dayOfWeekIdx === 5 || dayOfWeekIdx === 6);
    if (tabName === 'race') {
        if (isWeekend) { document.getElementById('race-active-zone').style.display = "block"; document.getElementById('race-weekday-blocker').style.display = "none"; }
        else { document.getElementById('race-active-zone').style.display = "none"; document.getElementById('race-weekday-blocker').style.display = "block"; }
    }
}

// 💵 ЕКОНОМІЧНЕ БАЛАНСУВАННЯ (80₴ КВАРТИРА / 20₴ БАТЬКИ)
function endDayRoutine() {
    currentHour = 9; currentMinute = 0; currentDay += 1;
    let dailyCost = racerHousing === "rent" ? 80 : 20; 
    money -= dailyCost;
    
    alert(`⏰ День завершено! Розрахунок за житло: -${dailyCost}₴.`);
    generateDailyBriefing(); checkQuestTrigger();
    if (money < 0) endGame("💀 БАНКРУТСТВО", "Ти заліз у борги перед житлово-комунальним сервісом.");
}

function gainXP(amount) {
    // 🏎️ Одяг: Про-пілот дає бонус до досвіду
    if (racerStyle === "🏎️ Про-пілот") amount = Math.floor(amount * 1.2);
    
    if (racerHousing === "parents") amount = Math.floor(amount * 0.8);
    if (racerHousing === "rent") amount = Math.floor(amount * 1.2);
    xp += amount; if (xp >= 100) { xp -= 100; level += 1; skillPoints += 2; playClickSound('success'); }
}

function upgradeStat(stat) { if (skillPoints > 0) { playClickSound('success'); skillPoints -= 1; stats[stat] += 1; updateUI(); } }

function relaxAction(type) {
    if (isIncidentActive) { alert("Йде збій! Працюй!"); return; }
    playClickSound();
    if (type === 'sleep') { energy = Math.min(maxEnergy, energy + 30); stress = Math.max(0, stress - 10); currentHour += 2; }
    else if (type === 'varus') { if (money < 100) return; money -= 100; energy = Math.min(maxEnergy, energy + 35); stress = Math.max(0, stress - 15); currentHour += 1; }
    else if (type === 'glovo') { if (money < 180) return; money -= 180; energy = Math.min(maxEnergy, energy + 55); stress = Math.max(0, stress - 25); currentHour += 1; }
    
    // 🛹 Одяг: Стріт-рейсер дає +10% до спонсорських виплат
    let styleBonus = (racerStyle === "🛹 Стріт-рейсер") ? 1.10 : 1.0;

    if (activeSponsorIdx !== null) { 
        money += Math.floor(SPONSORS[activeSponsorIdx].pay * (type === 'sleep' ? 2 : 1) * styleBonus); 
    }
    if (currentHour >= 18) endDayRoutine();
    updateUI();
}

// --- ГОНКА ---
let currentTactic = 'safe'; let raceTimer = null; let raceTicks = 0;
const RACE_SITUATIONS = [
    { text: "Швидкісна дуга Spa-Francorchamps.", push: "win", safe: "hold", save: "lose" },
    { text: "Різка атака суперника Monza!", push: "win", safe: "lose", save: "lose" },
    { text: "Траєкторія покривається дощем.", push: "lose", safe: "win", save: "hold" }
];

function startStrategicRace() {
    let league = LEAGUES[currentLeagueIdx];
    
    // Перевірка ультимативної бази Moza R16 для вищих змагань
    if (league.req === "wheel" && !upgrades.wheel && !upgrades.wheel16) { alert("Необхідно кермо Moza R9 або R16!"); return; }
    if (league.req !== "none" && league.req !== "wheel" && !upgrades[league.req]) { alert(`Необхідно девайс: ${league.req}`); return; }
    
    if (money < league.fee) { alert("Мало грошей!"); return; }
    money -= league.fee; isRaceActive = true; currentLap = 1; racePosition = 20; raceTicks = 0; currentTactic = 'safe';
    updateUI();
    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('race-simulation-box').style.display = 'block';
    submitTactic('safe'); playRaceTick();
}

function submitTactic(tactic) {
    playClickSound(); currentTactic = tactic;
    document.getElementById('tactic-btn-push').style.borderColor = "#444";
    document.getElementById('tactic-btn-safe').style.borderColor = "#444";
    document.getElementById('tactic-btn-save').style.borderColor = "#444";
    document.getElementById(`tactic-btn-${tactic}`).style.borderColor = "#ff9800";
}

function playRaceTick() {
    if (!isRaceActive) return; raceTicks++;
    let sit = RACE_SITUATIONS[Math.floor(Math.random() * RACE_SITUATIONS.length)];
    document.getElementById('race-live-status').innerText = `🏁 КОЛО ${currentLap} / Тік ${raceTicks}`;
    let outcome = sit[currentTactic]; let posChange = 0;
    if (outcome === 'win') posChange = Math.floor(Math.random() * 3) + 2;
    else if (outcome === 'lose') posChange = -2;
    
    if (currentTactic === 'push' && selectedTalentIdx === 0) posChange += 1;
    if (upgrades.pedals && outcome === 'lose') posChange = -1;

    // 🎮 Одяг: Кіберспортсмен економить 15% сил в гонках
    let baseEnergyCost = (racerStyle === "🎮 Кіберспортсмен") ? 3.4 : 4.0;

    racePosition = Math.max(1, Math.min(20, racePosition - posChange));
    
    let stressFactor = (selectedTalentIdx === 1) ? 1.2 : 1.0; 
    if (upgrades.chair) stressFactor *= 0.9;

    stress = Math.max(0, Math.min(100, stress + (6 - stats.ment) * stressFactor)); 
    energy = Math.max(0, energy - Math.floor(baseEnergyCost));
    
    document.getElementById('race-live-log').innerHTML = `<b>Ситуація:</b> ${sit.text}<br>Тактика: <b>${currentTactic.toUpperCase()}</b>. Позиція: P${racePosition}`;
    if (activeSponsorIdx !== null) money += SPONSORS[activeSponsorIdx].pay;
    updateUI();
    if (raceTicks >= 4) { raceTicks = 0; currentLap++; }
    if (currentLap > LEAGUES[currentLeagueIdx].laps || energy <= 5 || stress >= 95) endStrategicRace();
    else raceTimer = setTimeout(playRaceTick, 4000);
}

function endStrategicRace() {
    isRaceActive = false; clearTimeout(raceTimer);
    document.getElementById('start-race-btn').style.display = 'block'; document.getElementById('race-simulation-box').style.display = 'none';
    let league = LEAGUES[currentLeagueIdx];
    if (racePosition <= 3 && energy > 0 && stress < 100) { 
        money += league.reward; gainXP(70); alert(`🏆 ПОДІУМ! P${racePosition}! +${league.reward}₴`); 
        if (currentLeagueIdx < LEAGUES.length - 1) { 
            const nextLeague = LEAGUES[currentLeagueIdx + 1];
            if (nextLeague.req === "none" || upgrades[nextLeague.req] || (nextLeague.req === "wheel" && upgrades.wheel16)) {
                currentLeagueIdx++; 
                alert("🎖️ Новий рівень ліги відкритий!");
            } else {
                alert(`🔒 Наступна ліга потребує: ${nextLeague.req}. Купи в магазині!`);
            }
        }
    }
    else { alert(`🏁 Фініш на P${racePosition}. Потрібен ТОП-3.`); }
    currentHour += 2; if (currentHour >= 18) endDayRoutine(); updateUI();
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
    document.getElementById('global-stress').innerText = Math.floor(stress);
    document.getElementById('racer-level').innerText = level;
    document.getElementById('racer-xp').innerText = xp;
    document.getElementById('skill-points').innerText = skillPoints;
    document.getElementById('racer-age').innerText = racerAge;
    document.getElementById('game-day').innerText = currentDay;
    document.getElementById('game-hour').innerText = currentHour < 10 ? '0' + currentHour : currentHour;
    document.getElementById('game-minute').innerText = currentMinute === 0 ? '00' : currentMinute;

    let dayIdx = (currentDay - 1) % 7; document.getElementById('game-weekday').innerText = WEEKDAYS[dayIdx];
    let isWeekend = (dayIdx === 5 || dayIdx === 6);
    if (isWeekend) { document.getElementById('work-weekend-notice').style.display = "block"; document.getElementById('project-init-zone').style.display = "none"; }
    else { document.getElementById('work-weekend-notice').style.display = "none"; if (!isIncidentActive) document.getElementById('project-init-zone').style.display = "block"; }

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

    if (activeSponsorIdx !== null) { 
        document.getElementById('active-sponsor-status').innerText = `🤝 Контракт: ${SPONSORS[activeSponsorIdx].name} (+${SPONSORS[activeSponsorIdx].pay}₴/год)`;
    }

    SPONSORS.forEach((s, idx) => {
        const btn = document.getElementById(`btn-spon-${['atb', 'avrora', 'np', 'mono'][idx]}`);
        if (btn) {
            if (activeSponsorIdx === idx) { btn.innerText = "АКТИВНИЙ"; btn.style.background = "#2e7d32"; }
            else if (currentLeagueIdx >= s.reqLeague && (s.reqUpg === "none" || upgrades[s.reqUpg] || (s.reqUpg === "wheel" && upgrades.wheel16))) { btn.innerText = "Підписати"; btn.style.background = "#ff5722"; }
            else { btn.innerText = "Заблоковано"; btn.style.background = "#444"; }
        }
    });
}

function repairWheel() { let cost = Math.max(0, 300 - stats.eng * 50); if (money < cost) return; money -= cost; wheelCondition = 100; playClickSound('success'); updateUI(); }
function checkGameOver() { if (stress >= 100 || energy <= 0) endGame("💀 КІНЕЦЬ ГРИ", "Ресурси вичерпано."); }
function endGame(title, desc) { 
    if (incidentInterval) clearInterval(incidentInterval); 
    clearTimeout(raceTimer); 
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-final').classList.add('active');
    document.getElementById('final-title').innerText = title;
    document.getElementById('final-desc').innerText = desc;
}
function resetGame() { localStorage.removeItem('simracer_tycoon_save'); location.reload(); }

updateUI();
