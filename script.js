const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// Твоя економіка
let money = 1000;
let energy = 100;
let stress = 0;

// ТАЙМ-МЕНЕДЖМЕНТ (Твоя зміна)
let currentDay = 1;
let currentHour = 9; // Початок зміни о 09:00

// RPG
let level = 1;
let xp = 0;
let skillPoints = 0;
let stats = { ment: 0, phys: 0, eng: 0 };

// Технічний стан
let wheelCondition = 100;
let upgrades = { 
    keyboard: false, 
    ups: false, 
    wheel: false, 
    pedals: false, 
    monitor: false 
};

// Конфігурація Чемпіонатів
const LEAGUES = [
    { name: "Dark Race Simclub", fee: 0, laps: 3, speed: 3.5, reward: 900, req: "none" },
    { name: "КМАМК Україна", fee: 700, laps: 4, speed: 5.2, reward: 2000, req: "wheel" },
    { name: "FIA Formula 3", fee: 1600, laps: 5, speed: 6.8, reward: 4000, req: "pedals" },
    { name: "FIA Formula 2", fee: 3000, laps: 5, speed: 8.8, reward: 7500, req: "monitor" },
    { name: "F1 World Series", fee: 6000, laps: 6, speed: 11.0, reward: 18000, req: "monitor" }
];
let currentLeagueIdx = 0;

// Заїзд
let currentLap = 0;
let racePosition = 20;
let isRaceActive = false;

// Бігунок
let runnerPos = 0;
let runnerSpeed = 1;
let animationId = null;
let isRaceScreenActive = false;
let shakeTime = 0;

let currentActiveQuest = null;
let turnsSinceLastQuest = 0;

const QUESTS = [
    {
        title: "🛸 ПРОПОЗИЦІЯ ХАКЕРІВ",
        desc: "Конкуренти пропонують тобі злити базу даних хайроллерів твого казіка за великі гроші. Що вибереш?",
        b1: "Злити базу (+2000₴, Ризик)",
        b2: "Здати їх СБ (+15 Очок Менталки)",
        action: (choice) => {
            if (choice === 1) {
                money += 2000;
                if (Math.random() < 0.5) { stress = 90; return "💀 <b>Наслідок:</b> Керуюча помітила витік! Твій стрес підскочив до 90%."; }
                return "💰 <b>Наслідок:</b> Все пройшло гладко. Гроші на карті, але совість гризе.";
            } else {
                stats.ment += 15;
                return "🛡 <b>Наслідок:</b> СБ закрило загрозу. Твоя Холоднокровність виросла!";
            }
        }
    },
    {
        title: "⚡️ КРАШ СЕРВЕРІВ",
        desc: "Впали сервери оплати. Якщо в тебе є ДБЖ (безжеребнійник), ти застрахований. Якщо немає — ти застряг на лінії.",
        b1: "Спробувати пофіксити",
        b2: "Чекати (Мінус сили)",
        action: (choice) => {
            if (upgrades.ups) {
                money += 300; gainXP(20);
                return "🔋 <b>Рятунок ДБЖ:</b> Твоє залізо не вирубилось, ти миттєво переключився на резервний канал і закрив проблему. Керуюча дала премію +300₴!";
            } else {
                energy -= 20; stress = Math.min(100, stress + 25);
                return "🤯 <b>Жах:</b> Твій ПК вирубився, ти втратив купу тікетів. Година пройшла в пекельному стресі (+25% стресу, -20 енергії).";
            }
        }
    }
];

function switchTab(tabName) {
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`screen-${tabName}`).classList.add('active');
    const tabs = ['work', 'racer', 'garage', 'race'];
    document.getElementById('global-tabs').children[tabs.indexOf(tabName)].classList.add('active');

    if (tabName === 'race' && isRaceActive) {
        isRaceScreenActive = true;
        startRunnerAnimation();
    } else {
        isRaceScreenActive = false;
        cancelAnimationFrame(animationId);
    }
}

function advanceTime(hours) {
    currentHour += hours;
    if (currentHour >= 18) {
        // КІНЕЦЬ РОБОЧОГО ДНЯ (Пасивне списання)
        currentHour = 9;
        currentDay += 1;
        money -= 400; // Оренда, комуналка, інтернет
        
        alert(`⏰ Зміна завершена! Настав новий день. \n💸 Знято 400₴ за оренду житла та інтернет.`);
        
        // Перевірка банкрутства
        if (money < 0) {
            endGame("💀 БАНКРУТСТВО ТА ВИСЕЛЕННЯ!", "У тебе закінчилися гроші на оплату оренди. Керуюча звільнила за прогули, а власник квартири виставив твої речі та кокпіт на вулицю.");
        }
    }
    updateUI();
}

function gainXP(amount) {
    xp += amount;
    if (xp >= 100) {
        xp -= 100;
        level += 1;
        skillPoints += 2;
        document.getElementById('work-log').innerHTML += `<br><br>🎉 <b>LEVEL UP!</b> Рівень ${level}! Отримано 2 очки навичок.`;
    }
}

function upgradeStat(stat) {
    if (skillPoints > 0) {
        skillPoints -= 1;
        stats[stat] += 1;
        updateUI();
    }
}

function updateUI() {
    document.getElementById('global-money').innerText = money;
    document.getElementById('global-energy').innerText = energy;
    document.getElementById('global-stress').innerText = stress;
    document.getElementById('racer-level').innerText = level;
    document.getElementById('racer-xp').innerText = xp;
    document.getElementById('skill-points').innerText = skillPoints;
    
    document.getElementById('game-day').innerText = currentDay;
    document.getElementById('game-hour').innerText = currentHour < 10 ? '0' + currentHour : currentHour;

    document.getElementById('stat-val-ment').innerText = stats.ment;
    document.getElementById('stat-val-phys').innerText = stats.phys;
    document.getElementById('stat-val-eng').innerText = stats.eng;
    
    document.getElementById('wheel-condition').innerText = wheelCondition;
    document.getElementById('condition-fill').style.width = wheelCondition + '%';

    let league = LEAGUES[currentLeagueIdx];
    document.getElementById('current-league-name').innerText = league.name;
    document.getElementById('race-fee').innerText = league.fee;
    document.getElementById('target-laps').innerText = league.laps;
    document.getElementById('max-laps-display').innerText = league.laps;
    document.getElementById('race-laps').innerText = currentLap;
    document.getElementById('race-pos').innerText = "P" + racePosition;

    document.getElementById('apex-zone').style.width = upgrades.wheel ? '70px' : '35px';
}

function workAnHour() {
    if (energy < 20) { alert("Немає сил! Збігай у Варус."); return; }
    
    let salary = (upgrades.monitor ? 450 : 250) + (stats.eng * 20);
    let stressCost = upgrades.keyboard ? 6 : 12; // Клавіатура зменшує стрес
    
    energy -= 18;
    stress = Math.min(100, stress + stressCost);
    money += salary;
    
    gainXP(15);
    turnsSinceLastQuest += 1;

    document.getElementById('work-log').innerHTML = `🖥 <b>Година роботи:</b> Закрив пачку чатів користувачів казіка. Заробіток: +${salary}₴.`;
    
    if (turnsSinceLastQuest >= 3 && currentActiveQuest === null) {
        triggerRandomQuest();
    }

    advanceTime(1); // Кожна робота забирає 1 годину
    checkGameOver();
}

function goToVarus() {
    if (money < 120) { alert("Не вистачає коштів!"); return; }
    money -= 120;
    energy = Math.min(100, energy + 45);
    stress = Math.max(0, stress - 15);
    document.getElementById('work-log').innerHTML = "🛒 <b>Varus:</b> Хвилина спокою, енергетик та паніні відновлюють показники.";
    
    advanceTime(1); // Похід у магазин забирає 1 годину
}

function triggerRandomQuest() {
    currentActiveQuest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    document.getElementById('quest-zone').style.display = "block";
    document.getElementById('quest-title').innerText = currentActiveQuest.title;
    document.getElementById('quest-desc').innerText = currentActiveQuest.desc;
    document.getElementById('btn-q1').innerText = currentActiveQuest.b1;
    document.getElementById('btn-q2').innerText = currentActiveQuest.b2;
}

function chooseQuest(choice) {
    if (!currentActiveQuest) return;
    let res = currentActiveQuest.action(choice);
    document.getElementById('work-log').innerHTML = res;
    document.getElementById('quest-zone').style.display = "none";
    currentActiveQuest = null;
    turnsSinceLastQuest = 0;
    updateUI();
    checkGameOver();
}

function buyUpgrade(type, price) {
    if (money < price) { alert("Не вистачає коштів!"); return; }
    if (upgrades[type]) { alert("Вже куплено!"); return; }

    money -= price;
    upgrades[type] = true;
    document.getElementById(`upg-${type}`).classList.add('owned');
    document.getElementById(`btn-${type}`).innerText = "КУПЛЕНО";
    updateUI();
}

function repairWheel() {
    let repairCost = Math.max(0, 400 - (stats.eng * 80));
    if (money < repairCost) { alert("Немає грошей!"); return; }
    
    money -= repairCost;
    wheelCondition = 100;
    updateUI();
}

// --- ГОНКА: НОВИЙ БАЛАНС ОБГОНІВ ДЛЯ DARK RACE SIMCLUB ---
function startRaceWeekend() {
    let league = LEAGUES[currentLeagueIdx];
    if (league.req !== "none" && !upgrades[league.req]) {
        let reqName = league.req === "wheel" ? "Moza R9" : league.req === "pedals" ? "Moza CRP" : "Тримонітор";
        alert(`❌ Обмеження регламенту ліги! Необхідно: ${reqName}`);
        return;
    }
    if (money < league.fee) { alert("Немає грошей на внесок!"); return; }
    
    money -= league.fee;
    isRaceActive = true;
    currentLap = 0;
    racePosition = 20; // Починаємо з кінця решітки P20

    runnerSpeed = 1; // напрямок руху

    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('hit-apex-btn').style.display = 'block';
    document.getElementById('race-log').innerHTML = `🏁 <b>Етап ліги ${league.name} розпочато!</b> Ти на P20. Кожен вдалий апекс гарантує потужний прорив!`;
    
    isRaceScreenActive = true;
    updateUI();
    startRunnerAnimation();
}

function startRunnerAnimation() {
    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    if (!runner || !track || !isRaceScreenActive) return;

    let league = LEAGUES[currentLeagueIdx];
    
    // Вплив менталки на швидкість
    let targetSpeed = league.speed - (stats.ment * 0.15);
    if (targetSpeed < 1.5) targetSpeed = 1.5; // мінімальний ліміт швидкості

    let shake = 0;
    if (wheelCondition < 50) {
        shakeTime += 0.2;
        shake = Math.sin(shakeTime) * (50 - wheelCondition) * 0.2;
    }

    runnerPos += (runnerSpeed > 0 ? targetSpeed : -targetSpeed) + shake;
    
    let maxPos = track.clientWidth - runner.clientWidth;
    if (runnerPos >= maxPos) { runnerPos = maxPos; runnerSpeed = -1; }
    if (runnerPos <= 0) { runnerPos = 0; runnerSpeed = 1; }

    runner.style.left = runnerPos + 'px';
    animationId = requestAnimationFrame(startRunnerAnimation);
}

function hitApex() {
    if (!isRaceActive) return;
    
    let energyCost = Math.max(4, 15 - stats.phys * 2);
    if (energy < energyCost) { alert("Немає сил тиснути педалі!"); return; }
    
    energy -= energyCost;
    currentLap += 1;
    wheelCondition = Math.max(0, wheelCondition - 5);

    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    const apex = document.getElementById('apex-zone');

    let runnerCenter = runnerPos + (runner.clientWidth / 2);
    let trackCenter = track.clientWidth / 2;
    let allowedDiff = apex.clientWidth / 2;

    // ПЕРЕПИСАНА МАТЕМАТИКА ОБГОНІВ (БІЛЬШ СТАБІЛЬНА ДЛЯ ПОДІУМУ)
    if (Math.abs(runnerCenter - trackCenter) <= allowedDiff) {
        // ВЛУЧИВ: гарантований прорив на 4-6 позицій вгору!
        let overtakes = Math.floor(Math.random() * 3) + 4; 
        racePosition = Math.max(1, racePosition - overtakes);
        document.getElementById('race-log').innerHTML = `🟢 <b>Коло ${currentLap}:</b> Філігранний апекс! Ти пройшов групу машин. Позиція: P${racePosition}.`;
    } else {
        // ПРОМАХНУВСЯ: втрата всього 1-2 позицій, а не кінець гонки
        let penaltyStress = upgrades.pedals ? 8 : 16;
        stress = Math.min(100, stress + penaltyStress);
        racePosition = Math.min(20, racePosition + Math.floor(Math.random() * 2) + 1);
        document.getElementById('race-log').innerHTML = `🔴 <b>Коло ${currentLap}:</b> Помилка по ширині треку. Суперники контратакують. Позиція: P${racePosition}.`;
    }

    if (currentLap >= LEAGUES[currentLeagueIdx].laps) {
        endRaceWeekend();
    }

    updateUI();
    checkGameOver();
}

function endRaceWeekend() {
    isRaceActive = false;
    isRaceScreenActive = false;
    cancelAnimationFrame(animationId);

    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('hit-apex-btn').style.display = 'none';

    let league = LEAGUES[currentLeagueIdx];

    // Умова проходження далі: ТОП-3 (Подіум)
    if (racePosition <= 3) {
        money += league.reward;
        gainXP(60);
        document.getElementById('race-log').innerHTML = `🏆 <b>ФІНІШ НА ПОДІУМІ (P${racePosition})!</b> Спонсори задоволені. Призові: +${league.reward}₴. Відкрита наступна категорія перегонів!`;
        if (currentLeagueIdx < LEAGUES.length - 1) currentLeagueIdx += 1;
        else endGame("🏆 СВІТОВА ЛЕГЕНДА СІМРЕЙСИНГУ!", "Ти пройшов кар'єру від оператора саппорту до чемпіона світу Formula 1!");
    } else {
        document.getElementById('race-log').innerHTML = `🏁 <b>Фініш на P${racePosition}.</b> Непогано, але для кваліфікації далі потрібен ТОР-3. Прокачай Холоднокровність або візьми Moza DD базу в Гаражі!`;
    }
    
    currentLap = 0;
    advanceTime(1); // Гонка забирає 1 годину робочої зміни
    updateUI();
}

function checkGameOver() {
    if (stress >= 100) endGame("💀 НЕРВОВИЙ ЗРИВ!", "Стрес 100%. Ти послав Керуючу, розбив робочий комп і вилетів з кар'єри.");
    if (energy <= 0) endGame("💀 ФІЗИЧНИЙ КОЛАПС", "У тебе повністю закінчилися сили прямо посеред зміни.");
}

function endGame(title, desc) {
    isRaceActive = false; isRaceScreenActive = false; cancelAnimationFrame(animationId);
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('global-tabs').style.display = 'none';
    const finalScreen = document.getElementById('screen-final');
    finalScreen.classList.add('active');
    document.getElementById('final-title').innerText = title;
    document.getElementById('final-desc').innerText = desc;
}

function resetGame() {
    money = 1000; energy = 100; stress = 0; currentLeagueIdx = 0; level = 1; xp = 0; skillPoints = 0;
    currentDay = 1; currentHour = 9;
    stats = { ment: 0, phys: 0, eng: 0 }; wheelCondition = 100; isRaceActive = false;
    upgrades = { keyboard: false, ups: false, wheel: false, pedals: false, monitor: false };

    document.querySelectorAll('.upgrade-card').forEach(c => c.classList.remove('owned'));
    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('hit-apex-btn').style.display = 'none';
    document.getElementById('global-tabs').style.display = 'flex';
    document.getElementById('quest-zone').style.display = "none";
    currentActiveQuest = null; turnsSinceLastQuest = 0;
    
    updateUI();
    switchTab('work');
}

updateUI();
