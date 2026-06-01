const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// --- 🔊 СИСТЕМА ЗВУКІВ (WEB AUDIO API — ПРАЦЮЄ БЕЗ ФАЙЛІВ) ---
let isSoundEnabled = true;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playClickSound(type = 'click') {
    if (!isSoundEnabled) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        }
    } catch (e) { console.log("Audio error", e); }
}

function closeSplashScreen() {
    playClickSound('success');
    document.getElementById('splash-screen').style.display = 'none';
    
    // НАДІЙНИЙ ЗАПУСК КОНТЕЙНЕРА ГРИ
    const container = document.getElementById('game-container');
    if (container) container.style.style = "display: flex;"; // дубльований фікс
    container.style.display = 'flex';
    
    // Спробувати завантажити збереження. Якщо там помилка — відкриється створення
    const loaded = loadGameData();
    if (!loaded) {
        const creation = document.getElementById('screen-creation');
        if (creation) creation.classList.add('active');
    }
}

// --- СТАН ГРИ ---
let racerName = "Mykyta";
let racerGender = "Хлопець";
let racerHousing = "rent";
let racerStyle = "";
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
let upgrades = { keyboard: false, ups: false, wheel: false, pedals: false, monitor: false };

const LEAGUES = [
    { name: "Dark Race Simclub", fee: 0, laps: 3, speed: 4, reward: 500, req: "none" },
    { name: "КМАМК Україна", fee: 400, laps: 4, speed: 5, reward: 1500, req: "wheel" },
    { name: "FIA Formula 3", fee: 1200, laps: 5, speed: 6, reward: 3500, req: "pedals" }
];
let currentLeagueIdx = 0;

const SPONSORS = [
    { name: "Місцева Шаурма", pay: 3, reqLeague: 1 },
    { name: "Varus Енерджі", pay: 8, reqLeague: 2 }
];
let activeSponsor = null;

// Пасивні таймери (Tycoon Engine)
let tycoonWorkInterval = null;
let isWorkShiftActive = false;

// Гонка
let isRaceActive = false;
let currentLap = 0;
let racePosition = 20;
let raceTicks = 0;
let raceTimer = null;

let currentActiveQuest = null;
let turnsSinceLastQuest = 0;

const QUESTS = [
    {
        title: "🛸 ПРОПОЗИЦІЯ ХАКЕРІВ",
        desc: "Конкуренти пропонують злити базу гравців твого казино за гроші.",
        b1: "Злити (+1000₴, Ризик)",
        b2: "Здати в СБ (+10 Холоднокровності)",
        action: (choice) => {
            if (choice === 1) { money += 1000; if (Math.random() < 0.5) { stress = 90; return "💀 Базу злито, але СБ накрило твій ПК! Стрес 90%."; } return "💰 База пішла, гроші на карті."; }
            else { stats.ment += 10; return "🛡 СБ оцінило вірність. Холоднокровність +10."; }
        }
    },
    {
        title: "⚡️ ВИМКНЕННЯ СВІТЛА",
        desc: "У Драбові раптово зникло світло під час важливого чату підтримки!",
        b1: "Тримати лінію",
        b2: "Зачекати",
        action: (choice) => {
            if (upgrades.ups) { money += 100; return "🔋 ДБЖ врятував! Ти залишився онлайн і закрив тікет. Премія +100₴."; }
            stress = Math.min(100, stress + 25); energy -= 15; return "🤯 ПК згас, чат втрачено. Керуюча виписала догану (+25% стресу).";
        }
    }
];

// --- 📁 ФІКС СИСТЕМИ ЗБЕРЕЖЕНЬ ВІД ЗЛАМУ ---
function saveGameData() {
    const saveData = {
        racerName, racerGender, racerHousing, racerStyle, selectedTalentIdx,
        money, energy, maxEnergy, stress, currentDay, currentHour, currentMinute, racerAge,
        level, xp, skillPoints, stats, wheelCondition, upgrades, currentLeagueIdx
    };
    localStorage.setItem('simracer_tycoon_save', JSON.stringify(saveData));
    playClickSound('success');
    alert("💽 Гру успішно збережено!");
    toggleMenuModal();
}

function loadGameData() {
    const raw = localStorage.getItem('simracer_tycoon_save');
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        
        // Перевірка на цілісність даних нової структури
        if (!data.stats || typeof data.currentMinute === 'undefined') {
            console.log("Old version save format detected. Wiping corrupt storage.");
            localStorage.removeItem('simracer_tycoon_save');
            return false;
        }

        racerName = data.racerName; racerGender = data.racerGender; racerHousing = data.racerHousing;
        racerStyle = data.racerStyle; selectedTalentIdx = data.selectedTalentIdx;
        money = data.money; energy = data.energy; maxEnergy = data.maxEnergy; stress = data.stress;
        currentDay = data.currentDay; currentHour = data.currentHour; currentMinute = data.currentMinute;
        racerAge = data.racerAge; level = data.level; xp = data.xp; skillPoints = data.skillPoints;
        stats = data.stats; wheelCondition = data.wheelCondition; upgrades = data.upgrades;
        currentLeagueIdx = data.currentLeagueIdx;

        // Оновлення девайсів
        Object.keys(upgrades).forEach(key => {
            if (upgrades[key]) {
                const btn = document.getElementById(`btn-${key}`);
                if (btn) btn.innerText = "КУПЛЕНО";
                const card = document.getElementById(`upg-${key}`);
                if (card) card.classList.add('owned');
            }
        });

        document.getElementById('screen-creation').classList.remove('active');
        document.getElementById('main-game-header').style.display = 'block';
        document.getElementById('global-tabs').style.display = 'flex';
        
        applyBioToUI();
        initPassiveEnergyRegen();
        switchTab('work');
        updateUI();
        return true;
    } catch(e) { 
        console.log("Corrupt save clear", e);
        localStorage.removeItem('simracer_tycoon_save');
        return false;
    }
}

function toggleMenuModal() {
    playClickSound();
    const modal = document.getElementById('game-menu-modal');
    if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    document.getElementById('sound-status-text').innerText = isSoundEnabled ? "Увімкнено" : "Вимкнено";
    playClickSound();
}

function initPassiveEnergyRegen() {
    const lastTime = localStorage.getItem('simracer_tycoon_last_time');
    if (lastTime) {
        const diff = Date.now() - parseInt(lastTime);
        const gained = Math.floor(diff / 120000); 
        if (gained > 0) energy = Math.min(maxEnergy, energy + gained);
    }
    setInterval(() => {
        if (!isWorkShiftActive && energy < maxEnergy) {
            energy = Math.min(maxEnergy, energy + 1);
            updateUI();
        }
        localStorage.setItem('simracer_tycoon_last_time', Date.now().toString());
    }, 120000);
}

window.addEventListener('beforeunload', () => {
    localStorage.setItem('simracer_tycoon_last_time', Date.now().toString());
});

function selectTalent(idx, element) {
    playClickSound();
    selectedTalentIdx = idx;
    document.querySelectorAll('.talent-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
}

function applyBioToUI() {
    document.getElementById('bio-name').innerText = racerName;
    document.getElementById('bio-gender').innerText = racerGender;
    document.getElementById('bio-talent').innerText = TALENT_NAMES[selectedTalentIdx];
    document.getElementById('bio-housing').innerText = racerHousing === "parents" ? "З батьками (0₴)" : "Оренда (400₴)";
}

function startGameWithCharacter() {
    playClickSound('success');
    racerName = document.getElementById('creation-name').value.trim() || "Mykyta";
    racerGender = document.getElementById('creation-gender').value;
    racerHousing = document.getElementById('creation-housing').value;
    racerStyle = document.getElementById('creation-style').value;

    money = (racerGender === "Дівчина") ? 1500 : 1000;
    if (selectedTalentIdx === 1) stats.eng = 2;

    applyBioToUI();

    document.getElementById('screen-creation').classList.remove('active');
    document.getElementById('main-game-header').style.display = 'block';
    document.getElementById('global-tabs').style.display = 'flex';
    
    initPassiveEnergyRegen();
    switchTab('work');
    updateUI();
}

function switchTab(tabName) {
    playClickSound();
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`screen-${tabName}`).classList.add('active');
    const tabs = ['work', 'racer', 'garage', 'race'];
    document.getElementById('global-tabs').children[tabs.indexOf(tabName)].classList.add('active');

    let dayOfWeekIdx = (currentDay - 1) % 7;
    let isWeekend = (dayOfWeekIdx === 5 || dayOfWeekIdx === 6);

    if (tabName === 'race') {
        if (isWeekend) {
            document.getElementById('race-active-zone').style.display = "block";
            document.getElementById('race-weekday-blocker').style.display = "none";
        } else {
            document.getElementById('race-active-zone').style.display = "none";
            document.getElementById('race-weekday-blocker').style.display = "block";
        }
    }
}

function toggleWorkShift() {
    playClickSound();
    const btn = document.getElementById('tycoon-work-btn');
    
    if (isWorkShiftActive) {
        stopWorkShift();
    } else {
        if (energy < 15) { alert("Немає сил для старту зміни!"); return; }
        let dayIdx = (currentDay - 1) % 7;
        if (dayIdx === 5 || dayIdx === 6) { alert("Сьогодні вихідний! Офіс зачинено."); return; }

        isWorkShiftActive = true;
        btn.innerText = "🛑 ЗУПИНИТИ ЗМІНУ (ПАСИВНИЙ ТЕМП)";
        btn.className = "main-action-btn status-btn-red";
        document.getElementById('work-log').innerHTML = "💼 <b>Зміна активна:</b> Час пішов пасивно в реальному часі. Твоє казино приймає депозити...";

        tycoonWorkInterval = setInterval(() => {
            currentMinute += 10;
            if (currentMinute >= 60) {
                currentMinute = 0;
                currentHour += 1;
                
                let salary = (upgrades.monitor ? 25 : 12) + (stats.eng * 2);
                let stressPenalty = upgrades.keyboard ? 1 : 3;
                
                money += salary;
                energy = Math.max(0, energy - 2);
                stress = Math.min(100, stress + stressPenalty);
                gainXP(2);
                
                if (activeSponsor) money += activeSponsor.pay;

                document.getElementById('work-log').innerHTML = `🖥 <b>Робочий процес:</b> Опрацьовано чати. Година +1. Дохід: +${salary}₴.`;
                
                turnsSinceLastQuest++;
                if (turnsSinceLastQuest >= 4 && currentActiveQuest === null && Math.random() < 0.4) {
                    triggerQuest();
                }
            }

            if (currentHour >= 18) {
                endDayRoutine();
            }
            updateUI();
            checkGameOver();
        }, 1000); 
    }
}

function stopWorkShift() {
    if (tycoonWorkInterval) clearInterval(tycoonWorkInterval);
    isWorkShiftActive = false;
    const btn = document.getElementById('tycoon-work-btn');
    if (btn) {
        btn.innerText = "🟢 ЗАПУСТИТИ РОБОЧУ ЗМІНУ";
        btn.className = "main-action-btn status-btn-green";
    }
}

function triggerQuest() {
    currentActiveQuest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    document.getElementById('quest-zone').style.display = "block";
    document.getElementById('quest-title').innerText = currentActiveQuest.title;
    document.getElementById('quest-desc').innerText = currentActiveQuest.desc;
    document.getElementById('btn-q1').innerText = currentActiveQuest.b1;
    document.getElementById('btn-q2').innerText = currentActiveQuest.b2;
    stopWorkShift();
}

function chooseQuest(choice) {
    playClickSound('success');
    if (!currentActiveQuest) return;
    let logResult = currentActiveQuest.action(choice);
    document.getElementById('work-log').innerHTML = logResult;
    document.getElementById('quest-zone').style.display = "none";
    currentActiveQuest = null;
    turnsSinceLastQuest = 0;
    updateUI();
}

function endDayRoutine() {
    stopWorkShift();
    currentHour = 9;
    currentMinute = 0;
    currentDay += 1;
    
    let dailyCost = racerHousing === "rent" ? 400 : 100;
    money -= dailyCost;
    
    alert(`⏰ День завершено! \n💸 Знято кошти за оренду та побут: -${dailyCost}₴.`);
    if (currentDay % 10 === 1) {
        racerAge += 1;
        alert(`👴 Рік минув! Тобі вже ${racerAge} років.`);
    }
    if (money < 0) endGame("💀 БАНКРУТСТВО", "Гроші закінчились.");
}

function gainXP(amount) {
    if (racerHousing === "parents") amount = Math.floor(amount * 0.8);
    if (racerHousing === "rent") amount = Math.floor(amount * 1.2);
    xp += amount;
    if (xp >= 100) {
        xp -= 100; level += 1; skillPoints += 2;
        playClickSound('success');
    }
}

function upgradeStat(stat) {
    if (skillPoints > 0) {
        playClickSound('success');
        skillPoints -= 1;
        stats[stat] += 1;
        updateUI();
    }
}

function relaxAction(type) {
    playClickSound();
    stopWorkShift();
    if (type === 'sleep') {
        energy = Math.min(maxEnergy, energy + 30);
        stress = Math.max(0, stress - 10);
        currentHour += 2;
    } else if (type === 'varus') {
        if (money < 100) return; money -= 100;
        energy = Math.min(maxEnergy, energy + 35);
        stress = Math.max(0, stress - 15);
        currentHour += 1;
    } else if (type === 'glovo') {
        if (money < 180) return; money -= 180;
        energy = Math.min(maxEnergy, energy + 55);
        stress = Math.max(0, stress - 25);
        currentHour += 1;
    }
    if (currentHour >= 18) endDayRoutine();
    updateUI();
}

// --- 🏁 СТРАТЕГІЧНИЙ СИМУЛЯТОР ГОНКИ ---
let currentTactic = 'safe';
const SITUATIONS = [
    { text: "Затяжна швидкісна дуга Spa-Francorchamps.", push: "P1", safe: "P0", save: "P-1", sPush: 15, sSave: -5 },
    { text: "Різка атака суперника всередині шпильки!", push: "P2", safe: "P-1", save: "P-2", sPush: 20, sSave: -10 },
    { text: "Траєкторія покривається краплями дощу. Трек слизький.", push: "P-2", safe: "P1", save: "P0", sPush: 25, sSave: -12 }
];

function startStrategicRace() {
    let league = LEAGUES[currentLeagueIdx];
    if (league.req !== "none" && !upgrades[league.req]) { alert(`Потрібен девайс: ${league.req}`); return; }
    if (money < league.fee) { alert("Не вистачає на внесок!"); return; }

    money -= league.fee;
    isRaceActive = true;
    currentLap = 1;
    racePosition = 20;
    raceTicks = 0;

    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('race-simulation-box').style.display = 'block';
    
    playRaceTick();
}

function submitTactic(tactic) {
    playClickSound();
    currentTactic = tactic;
    document.querySelectorAll('.tactic-btn').forEach(b => b.style.borderColor = '#444');
}

function playRaceTick() {
    if (!isRaceActive) return;

    raceTicks++;
    let sit = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];
    document.getElementById('race-live-status').innerText = `🏁 КОЛО ${currentLap} / Tick ${raceTicks}`;
    
    let posChange = 0;
    let stressGained = 5;
    let energyCost = Math.max(2, 8 - stats.phys);

    if (currentTactic === 'push') {
        posChange = sit.push === "P2" ? 3 : (sit.push === "P1" ? 1 : -2);
        stressGained = sit.sPush - stats.ment;
        energyCost += 4;
    } else if (currentTactic === 'save') {
        posChange = sit.save === "P0" ? 0 : -1;
        stressGained = sit.sSave;
        energyCost = 1;
    } else { 
        posChange = sit.safe === "P1" ? 1 : 0;
        stressGained = 2;
    }

    racePosition = Math.max(1, Math.min(20, racePosition - posChange));
    stress = Math.max(0, Math.min(100, stress + stressGained));
    energy = Math.max(0, energy - energyCost);
    wheelCondition = Math.max(0, wheelCondition - 1);

    document.getElementById('race-live-log').innerHTML = `<b>Подія:</b> ${sit.text}<br>🛑 Тактика: <b>${currentTactic.toUpperCase()}</b>. Позиція: P${racePosition}.`;
    updateUI();

    if (raceTicks >= 4) {
        raceTicks = 0;
        currentLap++;
    }

    if (currentLap > LEAGUES[currentLeagueIdx].laps || energy <= 5 || stress >= 95) {
        endStrategicRace();
    } else {
        raceTimer = setTimeout(playRaceTick, 3500); 
    }
}

function endStrategicRace() {
    isRaceActive = false;
    clearTimeout(raceTimer);
    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('race-simulation-box').style.display = 'none';

    let league = LEAGUES[currentLeagueIdx];
    if (racePosition <= 3 && energy > 0 && stress < 100) {
        money += league.reward;
        gainXP(60);
        alert(`🏆 ПОДІУМ! P${racePosition}! Призові: +${league.reward}₴. Ліга пройдена!`);
        if (currentLeagueIdx < LEAGUES.length - 1) currentLeagueIdx++;
    } else {
        alert(`🏁 Фініш на P${racePosition}. Потрібен ТОП-3. Прокачуй пілота!`);
    }
    currentHour += 2;
    if (currentHour >= 18) endDayRoutine();
    updateUI();
}

function buyUpgrade(type, price) {
    if (money < price) { alert("Не вистачає коштів!"); return; }
    if (upgrades[type]) return;

    money -= price;
    upgrades[type] = true;
    document.getElementById(`upg-${type}`).classList.add('owned');
    document.getElementById(`btn-${type}`).innerText = "КУПЛЕНО";
    playClickSound('success');
    updateUI();
}

function signSponsor() {
    let availableSponsor = SPONSORS.find(s => s.reqLeague <= currentLeagueIdx);
    if (availableSponsor) {
        activeSponsor = availableSponsor;
        playClickSound('success');
        updateUI();
    }
}

function repairWheel() {
    let cost = Math.max(0, 300 - stats.eng * 50);
    if (money < cost) return;
    money -= cost; wheelCondition = 100;
    playClickSound('success');
    updateUI();
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
        document.getElementById('work-actions-block').style.display = "none";
        stopWorkShift();
    } else {
        document.getElementById('work-weekend-notice').style.display = "none";
        document.getElementById('work-actions-block').style.display = "block";
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

    if (activeSponsor) {
        document.getElementById('sponsor-name').innerText = `🤝 Контракт: ${activeSponsor.name}`;
        document.getElementById('sponsor-effect').innerText = `Пасивний дохід: +${activeSponsor.pay}₴ / год`;
        document.getElementById('btn-sponsor').style.display = 'none';
    }
}

function checkGameOver() {
    if (stress >= 100) endGame("💀 НЕРВОВИЙ ЗРИВ", "Стрес знищив твою психіку.");
    if (energy <= 0) endGame("💀 ФІЗИЧНИЙ КОЛАПС", "Повне виснаження.");
}

function endGame(title, desc) {
    stopWorkShift();
    clearTimeout(raceTimer);
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('global-tabs').style.display = 'none';
    document.getElementById('main-game-header').style.display = 'none';
    document.getElementById('screen-final').classList.add('active');
    document.getElementById('final-title').innerText = title;
    document.getElementById('final-desc').innerText = desc;
}

function resetGame() {
    localStorage.removeItem('simracer_tycoon_save');
    location.reload();
}

// Початковий UI апдейт
updateUI();
