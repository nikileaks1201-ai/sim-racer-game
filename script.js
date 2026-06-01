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

function closeSplashScreen() {
    playClickSound('success');
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    updateSaveMenuDisplay();
    generateDailyBriefing();
    loadGameData();
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

const SPONSORS = [
    { name: "Мережа АТБ 🛒", pay: 10, reqLeague: 0, reqUpg: "none" },
    { name: "Мультимаркет Аврора 🛍️", pay: 25, reqLeague: 1, reqUpg: "none" },
    { name: "Нова Пошта 📦", pay: 55, reqLeague: 2, reqUpg: "wheel" },
    { name: "Monobank 🐈", pay: 110, reqLeague: 2, reqUpg: "monitor" }
];
let activeSponsorIdx = null;

// --- 💼 НОВИЙ СИМУЛЯТОР ІНЦИДЕНТІВ РОБОТИ ---
let isIncidentActive = false;
let incidentStability = 100;
let incidentProgress = 0;
let incidentInterval = null;
let currentIncidentType = "";

const INCIDENT_TASKS = [
    { title: "Краш процесингу Monobank 💳", type: "shluz", desc: "Впали сервери оплати. Гравці казино лютують, депозити не проходять!" },
    { title: "Атака ботів конкурентів 🛸", type: "ddos", desc: "Сервери чатів підтримки закидує спамом. Потрібно закрити шлюзи трафіку." },
    { title: "Раптовий повний аудит Керуючої 👑", type: "audit", desc: "Логи піднято. Керуюча шукає баги та косяки в тональності відповідей." }
];

const LOG_MESSAGES = {
    shluz: ["[ERR] Connection timeout with Mono API!", "[SYS] Balance sync lost!", "[WARN] 452 players stuck in processing!"],
    ddos: ["[ATTACK] Inbound traffic overflow!", "[SYS] Chat buffer filled up!", "[WARN] CPU Load 98% on support node!"],
    audit: ["[AUDIT] Checking user chats...", "[SYS] Bad tonality flag detected!", "[WARN] Verification mismatch found!"]
};

function generateDailyBriefing() {
    let dayIdx = (currentDay - 1) % 7;
    if (dayIdx === 5 || dayIdx === 6) {
        document.getElementById('daily-task-text').innerText = "Сьогодні вихідний! Офіс зачинено. Час для симрейсингу.";
        return;
    }
    let task = INCIDENT_TASKS[currentDay % INCIDENT_TASKS.length];
    currentIncidentType = task.type;
    document.getElementById('daily-task-text').innerText = `${task.title} \n(${task.desc})`;
}

function startDailyIncident() {
    let dayIdx = (currentDay - 1) % 7;
    if (dayIdx === 5 || dayIdx === 6) { alert("Вихідний! Офіс не працює."); return; }
    if (energy < 20) { alert("Немає сил для робочої зміни!"); return; }

    playClickSound();
    isIncidentActive = true;
    incidentStability = 100;
    incidentProgress = 0;

    document.getElementById('project-init-zone').style.display = 'none';
    document.getElementById('project-development-zone').style.display = 'block';
    
    document.getElementById('incident-stability').innerText = "100";
    document.getElementById('incident-progress').innerText = "0";
    document.getElementById('incident-log-box').innerHTML = "[SYS] Систему запущено. Очікування стабілізації...";

    incidentInterval = setInterval(() => {
        incidentProgress += 5;
        currentMinute += 10;
        if (currentMinute >= 60) { currentMinute = 0; currentHour++; }

        // Пасивне падіння стабільності щомиті
        let stabilityDrop = Math.max(2, 6 - stats.eng); // Очки інженерії захищають
        if (upgrades.keyboard) stabilityDrop *= 0.7;
        
        incidentStability = Math.max(0, Math.min(100, incidentStability - Math.floor(stabilityDrop)));
        
        // Рандомний викид логів у консоль
        if (Math.random() < 0.7) {
            let list = LOG_MESSAGES[currentIncidentType];
            let msg = list[Math.floor(Math.random() * list.length)];
            let box = document.getElementById('incident-log-box');
            box.innerHTML += `<br><span style="color:#ff5722;">${msg}</span>`;
            box.scrollTop = box.scrollHeight;
        }

        // Оновлення UI
        document.getElementById('incident-stability').innerText = incidentStability;
        document.getElementById('incident-progress').innerText = incidentProgress;

        if (incidentProgress >= 100 || currentHour >= 18 || incidentStability <= 0) {
            finishDailyIncident();
        }
        updateUI();
        checkGameOver();
    }, 1000); // 1 хід = 1 сек
}

function handleIncidentTool(action) {
    if (!isIncidentActive) return;
    playClickSound();

    let box = document.getElementById('incident-log-box');

    if (action === 'fix') {
        if (energy < 10) { alert("Мало енергії!"); return; }
        energy -= 10;
        incidentStability = Math.min(100, incidentStability + 15 + stats.eng * 2);
        box.innerHTML += `<br><span style="color:#4caf50;">[USER] Сервери перезавантажено. Стабільність відновлюється.</span>`;
    } else if (action === 'filter') {
        if (energy < 5) { alert("Мало енергії!"); return; }
        energy -= 5;
        incidentStability = Math.min(100, incidentStability + 8);
        box.innerHTML += `<br><span style="color:#2196f3;">[USER] Трафік очищено від спаму. Шлюз стабілізовано.</span>`;
    } else if (action === 'bonus') {
        if (money < 50) { alert("Не вистачає грошей на бонуси!"); return; }
        money -= 50;
        incidentStability = Math.min(100, incidentStability + 25);
        stress = Math.max(0, stress - 5);
        box.innerHTML += `<br><span style="color:#ffcc00;">[USER] Гравцям нараховано втішні бонуси. Гнів зменшився.</span>`;
    }
    box.scrollTop = box.scrollHeight;
    updateUI();
}

function finishDailyIncident() {
    clearInterval(incidentInterval);
    isIncidentActive = false;
    document.getElementById('project-init-zone').style.display = 'block';
    document.getElementById('project-development-zone').style.display = 'none';

    let baseSalary = currentIncidentType === "vip_audit" ? 450 : 250;
    let earned = Math.floor(baseSalary * (incidentStability / 100));
    if (earned < 30) earned = 30; // Втішна виплата

    money += earned;
    gainXP(incidentStability > 50 ? 30 : 10);
    stress = Math.min(100, stress + Math.floor(20 - stats.ment));

    document.getElementById('work-log').innerHTML = `🏁 <b>Зміну завершено!</b><br>⚙️ Кінцева стабільність системи: <b>${incidentStability}%</b>.<br>💵 Нараховано ЗП: <b>+${earned}₴</b>. Стрес підскочив.`;
    
    endDayRoutine();
    updateUI();
}

// --- 🚨 СБАЛАНСОВАНА БАЗА КВЕСТІВ ---
const QUESTS = [
    {
        title: "🛸 ПРОПОЗИЦІЯ ХАКЕРІВ",
        desc: "Конкуренти пропонують злити базу VIP-гравців за великі гроші. Що вибереш?",
        b1: "Злити базу (+1200₴, Ризик)",
        b2: "Здати в СБ (+15 Холоднокровності)",
        action: (choice) => {
            if (choice === 1) { money += 1200; if (Math.random() < 0.5) { stress = 90; return "💀 СБ виявило витік! Твій ПК заблоковано, стрес 90%."; } return "💰 Успішно. Гроші анонімно зайшли на карту."; }
            else { stats.ment += 15; return "🛡️ СБ ліквідувало хакерів. Твій авторитет і Холоднокровність виросли!"; }
        }
    },
    {
        title: "🔧 ПОЛОМКА БОЙЛЕРА SOLLY",
        desc: "Вдома прорвало бойлер Solly. Орендарі або батьки вимагають термінового ремонту.",
        b1: "Викликати майстра (-500₴)",
        b2: "Полагодити самому (-30⚡ | Потрібно Інженерія >=2)",
        action: (choice) => {
            if (choice === 1) { money -= 500; return "🔧 Майстер приїхав і все поміняв. Гаманець схуд на 500₴."; }
            if (stats.eng >= 2) { energy -= 30; gainXP(20); return "🛠️ Скіли інженерії врятували! Ти власноруч перезібрав Solly. Сил немає, але гроші цілі."; }
            money -= 500; return "❌ Твоєї інженерії не вистачило, ти розібрав його і зламав остаточно. Довелося купувати новий за 500₴.";
        }
    },
    {
        title: "📦 СПЕКУЛЯЦІЯ НА OLX",
        desc: "Коля терміново скидає б/в руль Moza R3 за 10,000₴. На ринку його можна перепродати за 15,500 UAH.",
        b1: "Викупити кермо (-10,000₴)",
        b2: "Пропустити угоду",
        action: (choice) => {
            if (choice === 1) {
                if (money < 10000) return "❌ У тебе немає стільки готівки на руках!";
                money -= 10000; money += 15500; gainXP(30); return "🚀 Успіх! Купив у Колі за десятку і за дві години продав на OLX за 15,500 UAH. Чистий профіт +5,500₴!";
            }
            return "Ти вирішив не зв'язуватися з перепродажами.";
        }
    }
];

function checkQuestTrigger() {
    // Рандомний квест вилітає чітко раз на 3 дні
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
    playClickSound('success');
    let res = currentActiveQuest.action(choice);
    document.getElementById('work-log').innerHTML = res;
    document.getElementById('quest-modal').style.display = 'none';
    currentActiveQuest = null;
    updateUI();
}

// --- СПОНСОРИ ---
function signUkrainianSponsor(idx) {
    let sp = SPONSORS[idx];
    if (currentLeagueIdx < sp.reqLeague) { alert("Твоя гоночна ліга занизька для цього бренду!"); return; }
    if (sp.reqUpg !== "none" && !upgrades[sp.reqUpg]) { alert(`Потрібен девайс з гаражу: ${sp.reqUpg}`); return; }

    playClickSound('success');
    activeSponsorIdx = idx;
    updateUI();
}

// --- СЕЙВИ ---
function updateSaveMenuDisplay() {
    const raw = localStorage.getItem('simracer_tycoon_save');
    const display = document.getElementById('menu-save-details');
    if (raw && display) {
        try {
            const data = JSON.parse(raw);
            display.innerHTML = `👤 Нік: <b>${data.racerName}</b> | 💵 Баланс: <b>${data.money}₴</b><br>🏆 Рівень пілота: <b>${data.level}</b> | Ліга: <b>${data.currentLeagueIdx + 1}</b>`;
        } catch(e) { display.innerText = "Помилка файлу"; }
    } else if (display) {
        display.innerText = "Збережених ігор на пристрої немає";
    }
}

function saveGameData() {
    const saveData = {
        racerName, racerGender, racerHousing, racerStyle, selectedTalentIdx,
        money, energy, maxEnergy, stress, currentDay, currentHour, currentMinute, racerAge,
        level, xp, skillPoints, stats, wheelCondition, upgrades, currentLeagueIdx, activeSponsorIdx
    };
    localStorage.setItem('simracer_tycoon_save', JSON.stringify(saveData));
    playClickSound('success'); alert("💽 Гру збережено!"); updateSaveMenuDisplay(); toggleMenuModal();
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
        if (!isIncidentActive && energy < maxEnergy) { energy = Math.min(maxEnergy, energy + 1); updateUI(); }
        if (Math.random() < 0.04) triggerRandomNews();
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
    if (isIncidentActive || isRaceActive) { alert("Не можна перемикати вкладки під час активної гонки чи зміні розробки!"); return; }
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

function endDayRoutine() {
    currentHour = 9; currentMinute = 0; currentDay += 1;
    let dailyCost = racerHousing === "rent" ? 400 : 100; money -= dailyCost;
    alert(`⏰ День завершено! \n💸 Борг за житло та їжу списано: -${dailyCost}₴.`);
    
    generateDailyBriefing();
    checkQuestTrigger();
    
    if (money < 0) endGame("💀 БАНКРУТСТВО", "Ти заліз у великі борги. Кокпіт конфісковано виконавчою службою.");
}

function gainXP(amount) {
    if (racerHousing === "parents") amount = Math.floor(amount * 0.8);
    if (racerHousing === "rent") amount = Math.floor(amount * 1.2);
    xp += amount; if (xp >= 100) { xp -= 100; level += 1; skillPoints += 2; playClickSound('success'); }
}
function upgradeStat(stat) { if (skillPoints > 0) { playClickSound('success'); skillPoints -= 1; stats[stat] += 1; updateUI(); } }

function relaxAction(type) {
    if (isIncidentActive) { alert("Йде критичний збій! Ти не можеш піти курити!"); return; }
    playClickSound();
    if (type === 'sleep') { energy = Math.min(maxEnergy, energy + 30); stress = Math.max(0, stress - 10); currentHour += 2; }
    else if (type === 'varus') { if (money < 100) return; money -= 100; energy = Math.min(maxEnergy, energy + 35); stress = Math.max(0, stress - 15); currentHour += 1; }
    else if (type === 'glovo') { if (money < 180) return; money -= 180; energy = Math.min(maxEnergy, energy + 55); stress = Math.max(0, stress - 25); currentHour += 1; }
    
    if (activeSponsorIdx !== null) {
        let passHours = type === 'sleep' ? 2 : 1;
        money += SPONSORS[activeSponsorIdx].pay * passHours;
    }

    if (currentHour >= 18) endDayRoutine();
    updateUI();
}

// --- 🏎️ ФІКС СТРАТЕГІЧНОЇ ГОНКИ ТА КНОПОК ТАКТИКИ ---
let currentTactic = 'safe';
let raceTimer = null;
let raceTicks = 0;

const RACE_SITUATIONS = [
    { text: "Затяжна швидкісна дуга Spa-Francorchamps. Потрібна притискна сила.", push: "win", safe: "hold", save: "lose" },
    { text: "Різка атака суперника всередині шпильки Monza!", push: "win", safe: "lose", save: "lose" },
    { text: "Траєкторія покривається дощем. Трек стає дзеркальним!", push: "lose", safe: "win", save: "hold" }
];

function startStrategicRace() {
    let league = LEAGUES[currentLeagueIdx];
    if (league.req !== "none" && !upgrades[league.req]) { alert(`Обмеження ліги! Необхідно девайс: ${league.req}`); return; }
    if (money < league.fee) { alert("Не вистачає на стартовий внесок!"); return; }

    money -= league.fee; isRaceActive = true; currentLap = 1; racePosition = 20; raceTicks = 0;
    currentTactic = 'safe'; // Старт за замовчуванням

    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('race-simulation-box').style.display = 'block';
    
    // Візуально підсвічуємо дефолтну кнопку темпу
    resetTacticButtonsBorders();
    document.getElementById('tactic-btn-safe').style.borderColor = "#ff9800";

    playRaceTick();
}

// Функція обробки кліку по тактиці під час гонки
function submitTactic(tactic) {
    playClickSound();
    currentTactic = tactic;
    resetTacticButtonsBorders();
    document.getElementById(`tactic-btn-${tactic}`).style.borderColor = "#ff9800";
}

function resetTacticButtonsBorders() {
    document.getElementById('tactic-btn-push').style.borderColor = "#444";
    document.getElementById('tactic-btn-safe').style.borderColor = "#444";
    document.getElementById('tactic-btn-save').style.borderColor = "#444";
}

function playRaceTick() {
    if (!isRaceActive) return;
    raceTicks++;
    
    let sit = RACE_SITUATIONS[Math.floor(Math.random() * RACE_SITUATIONS.length)];
    document.getElementById('race-live-status').innerText = `🏁 КОЛО ${currentLap} / Тік ${raceTicks}`;
    
    let outcome = sit[currentTactic]; // win, hold, lose
    let posChange = 0;
    let energyCost = Math.max(3, 10 - stats.phys);
    let stressGained = 4;

    if (outcome === 'win') {
        posChange = Math.floor(Math.random() * 3) + 2; // Обігнати 2-4 машини
        stressGained += 8; energyCost += 3;
    } else if (outcome === 'hold') {
        posChange = Math.random() < 0.5 ? 1 : 0;
    } else if (outcome === 'lose') {
        posChange = -2; // Відкотитися назад
        stressGained += 12;
    }

    // Бонуси від девайсів та характеристик гонщика
    if (currentTactic === 'push' && selectedTalentIdx === 0) posChange += 1; // Перк хотлапера
    if (upgrades.pedals && outcome === 'lose') posChange = -1; // Load Cell рятує від глибоких промахів

    racePosition = Math.max(1, Math.min(20, racePosition - posChange));
    stress = Math.max(0, Math.min(100, stress + stressGained - Math.floor(stats.ment / 2)));
    energy = Math.max(0, energy - energyCost);
    wheelCondition = Math.max(0, wheelCondition - 1);

    document.getElementById('race-live-log').innerHTML = `<b>Ситуація:</b> ${sit.text}<br>🛑 Обрана тактика: <b style="color:#ffcc00;">${currentTactic.toUpperCase()}</b>.<br>🏁 Результат маневру: Позиція: <b>P${racePosition}</b>.`;
    
    if (activeSponsorIdx !== null) money += SPONSORS[activeSponsorIdx].pay;

    updateUI();

    if (raceTicks >= 4) { raceTicks = 0; currentLap++; }
    
    if (currentLap > LEAGUES[currentLeagueIdx].laps || energy <= 5 || stress >= 95) {
        endStrategicRace();
    } else {
        raceTimer = setTimeout(playRaceTick, 4000); // Подія кожні 4 секунди
    }
}

function endStrategicRace() {
    isRaceActive = false; clearTimeout(raceTimer);
    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('race-simulation-box').style.display = 'none';
    
    let league = LEAGUES[currentLeagueIdx];
    if (racePosition <= 3 && energy > 0 && stress < 100) {
        money += league.reward; gainXP(70);
        alert(`🏆 ФАНТАСТИЧНИЙ ПОДІУМ! P${racePosition}! Призові: +${league.reward}₴. Отримано ліцензію у вищу лігу!`);
        if (currentLeagueIdx < LEAGUES.length - 1) currentLeagueIdx++;
    } else {
        alert(`🏁 Фініш на P${racePosition}. Потрібен ТОП-3. Тобі не вистачило швидкості або витривалості.`);
    }
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
        if (!isIncidentActive) document.getElementById('project-init-zone').style.display = "block";
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

    if (activeSponsorIdx !== null) {
        document.getElementById('active-sponsor-status').innerText = `🤝 Контракт: ${SPONSORS[activeSponsorIdx].name} (+${SPONSORS[activeSponsorIdx].pay}₴/год)`;
    }

    SPONSORS.forEach((s, idx) => {
        const btn = document.getElementById(`btn-spon-${['atb', 'avrora', 'np', 'mono'][idx]}`);
        if (btn) {
            if (activeSponsorIdx === idx) { btn.innerText = "АКТИВНИЙ"; btn.style.background = "#2e7d32"; }
            else if (currentLeagueIdx >= s.reqLeague && (s.reqUpg === "none" || upgrades[s.reqUpg])) { btn.innerText = "Підписати"; btn.style.background = "#ff5722"; }
            else { btn.innerText = "Заблоковано"; btn.style.background = "#444"; }
        }
    });
}

function repairWheel() {
    let cost = Math.max(0, 300 - stats.eng * 50); if (money < cost) return;
    money -= cost; wheelCondition = 100; playClickSound('success'); updateUI();
}
function checkGameOver() {
    if (stress >= 100) endGame("💀 НЕРВОВИЙ ЗРИВ", "Рівень стресу перевищив психологічну норму.");
    if (energy <= 0) endGame("💀 ФІЗИЧНИЙ КОЛАПС", "Твоє тіло повністю виснажене роботою та нічними заїздами.");
}
function endGame(title, desc) { if (incidentInterval) clearInterval(incidentInterval); clearTimeout(raceTimer); document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active')); document.getElementById('global-tabs').style.display = 'none'; document.getElementById('main-game-header').style.display = 'none'; document.getElementById('screen-final').classList.add('active'); document.getElementById('final-title').innerText = title; document.getElementById('final-desc').innerText = desc; }
function resetGame() { localStorage.removeItem('simracer_tycoon_save'); location.reload(); }

updateUI();
