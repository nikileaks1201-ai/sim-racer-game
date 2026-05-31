const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// Дані кастомізації
let racerName = "Mykyta";
let racerGender = "Хлопець";
let racerHousing = "rent"; //parents або rent
let racerStyle = "";
let selectedTalentIdx = 0;
const TALENT_NAMES = ["Природжений Хотлапер", "Java-Гік", "Заряджений Monster'ом"];

// Ресурси
let money = 1000;
let energy = 100;
let maxEnergy = 100;
let stress = 0;

// ЧАС ТА ВІК
let currentDay = 1;
let currentHour = 9;
let racerAge = 18;
const WEEKDAYS = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

// RPG
let level = 1;
let xp = 0;
let skillPoints = 0;
let stats = { ment: 0, phys: 0, eng: 0 };

let wheelCondition = 100;
let upgrades = { keyboard: false, ups: false, wheel: false, pedals: false, monitor: false };

const LEAGUES = [
    { name: "Dark Race Simclub", fee: 0, laps: 3, speed: 3.5, reward: 900, req: "none" },
    { name: "КМАМК Україна", fee: 700, laps: 4, speed: 5.2, reward: 2000, req: "wheel" },
    { name: "FIA Formula 3", fee: 1600, laps: 5, speed: 6.8, reward: 4000, req: "pedals" },
    { name: "FIA Formula 2", fee: 3000, laps: 5, speed: 8.8, reward: 7500, req: "monitor" },
    { name: "F1 World Series", fee: 6000, laps: 6, speed: 11.0, reward: 18000, req: "monitor" }
];
let currentLeagueIdx = 0;

// Спонсори
const SPONSORS = [
    { name: "Місцева Шаурма", pay: 40, reqLeague: 0 },
    { name: "Varus Енерджі", pay: 100, reqLeague: 1 },
    { name: "Moza Racing UA", pay: 220, reqLeague: 2 },
    { name: "Гейм-Хаб Інвест", pay: 450, reqLeague: 3 }
];
let activeSponsor = null;

let currentLap = 0;
let racePosition = 20;
let isRaceActive = false;
let runnerPos = 0;
let runnerSpeed = 1;
let animationId = null;
let isRaceScreenActive = false;
let shakeTime = 0;

let currentActiveQuest = null;
let turnsSinceLastQuest = 0;

// ВЕЛИКА БАЗА СЮЖЕТНИХ КВЕСТІВ (Тепер їх 5 і вони випадкові)
const QUESTS = [
    {
        title: "🛸 ПРОПОЗИЦІЯ ХАКЕРІВ",
        desc: "Конкуренти пропонують тобі злити базу даних хайроллерів твого казіка за великі гроші. Що вибереш?",
        b1: "Злити базу (+2000₴, Ризик)",
        b2: "Здати їх СБ (+15 Очок Менталки)",
        action: (choice) => {
            if (choice === 1) { money += 2000; if (Math.random() < 0.5) { stress = 90; return "💀 <b>Наслідок:</b> Витік помітили! Твій стрес підскочив до 90%."; } return "💰 <b>Наслідок:</b> Гроші отримано успішно."; }
            else { stats.ment += 15; return "🛡 <b>Наслідок:</b> СБ закрило загрозу. Твоя Холоднокровність виросла!"; }
        }
    },
    {
        title: "⚡️ ТЕХНІЧНИЙ ЗБІЙ ШЛЮЗУ",
        desc: "Впали сервери оплати. Якщо в тебе є ДБЖ (безперебійник), ти застрахований. Якщо немає — ти застряг на лінії.",
        b1: "Спробувати пофіксити",
        b2: "Чекати (Мінус сили)",
        action: (choice) => {
            if (upgrades.ups) { money += 300; gainXP(20); return "🔋 <b>Рятунок ДБЖ:</b> Твоє залізо не вирубилось, ти миттєво переключився на резервний канал і закрив проблему. Керуюча дала премію +300₴!"; }
            else { energy -= 20; stress = Math.min(100, stress + 25); return "🤯 <b>Жах:</b> Твій ПК вирубився. Година пройшла в пекельному стресі (+25% стресу, -20 енергії)."; }
        }
    },
    {
        title: "👑 РАПТОВИЙ АУДИТ ВІД КЕРУЮЧОЇ",
        desc: "Керуюча підняла логи твоїх чатів за тиждень для перевірки тональності спілкування.",
        b1: "Показати ідеальні чати",
        b2: "Спробувати видалити косяки",
        action: (choice) => {
            if (choice === 1) { gainXP(30); return "📊 <b>Аудит пройдено:</b> Твої відповіді визнали еталонними. Отримано +30 XP!"; }
            else { stress = Math.min(100, stress + 20); return "🛑 <b>Догана:</b> Твою хитрість розкрили, ти отримав офіційне попередження та стрес +20%."; }
        }
    },
    {
        title: "💬 СТАРТАП ВІД ЮРИ",
        desc: "Юра пропонує скинутися по 500₴, щоб написати власного ТГ-бота на Java для крипти.",
        b1: "Скинутись (-500₴)",
        b2: "Відмовитись",
        action: (choice) => {
            if (choice === 1) {
                money -= 500;
                if (Math.random() < 0.6) { money += 1800; gainXP(40); return "🚀 <b>УСПІХ!</b> Бот залетів у тренди! Ти отримав +1800₴ дивідендів."; }
                return "📉 <b>Крах:</b> Проект провалився, код видалено. Гроші згоріли.";
            }
            return "Ти вирішив не ризикувати грошима.";
        }
    },
    {
        title: "🚬 ПЕРЕКУР З КОЛЕЮ",
        desc: "Коля кличе терміново обговорити нариллену схему абузу бонусів, поки Керуюча на обіді.",
        b1: "Піти з Колею (-1 год роботи)",
        b2: "Залишитись на лінії",
        action: (choice) => {
            if (choice === 1) { stress = Math.max(0, stress - 15); energy = Math.min(maxEnergy, energy + 10); return "🚬 <b>Перекусон:</b> Нерви розвантажив, але годину роботи пропустив. (Стрес -15%, Енергія +10)"; }
            else { money += 100; return "🖥 <b>Трудоголік:</b> Ти залишився закривати чати на самоті. Керуюча помітила і скинула бонус +100₴."; }
        }
    }
];

function selectTalent(idx, element) {
    selectedTalentIdx = idx;
    document.querySelectorAll('.talent-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
}

function startGameWithCharacter() {
    racerName = document.getElementById('creation-name').value.trim() || "Mykyta";
    racerGender = document.getElementById('creation-gender').value;
    racerHousing = document.getElementById('creation-housing').value;
    racerStyle = document.getElementById('creation-style').value;

    // Вплив статі на стартовий баланс
    if (racerGender === "Дівчина") {
        money = 1500;
    } else {
        money = 1000;
    }

    if (selectedTalentIdx === 1) stats.eng = 2;
    if (selectedTalentIdx === 2) { maxEnergy = 130; energy = 130; }

    // Рендер Біо
    document.getElementById('bio-name').innerText = racerName;
    document.getElementById('bio-gender').innerText = racerGender;
    document.getElementById('bio-style').innerText = racerStyle;
    document.getElementById('bio-talent').innerText = TALENT_NAMES[selectedTalentIdx];
    document.getElementById('bio-housing').innerText = racerHousing === "parents" ? "З батьками (0₴ оренда)" : "Оренда квартири (400₴)";

    document.getElementById('screen-creation').classList.remove('active');
    document.getElementById('main-game-header').style.display = 'block';
    document.getElementById('global-tabs').style.display = 'flex';
    
    switchTab('work');
    updateUI();
}

function switchTab(tabName) {
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`screen-${tabName}`).classList.add('active');
    const tabs = ['work', 'racer', 'garage', 'race'];
    document.getElementById('global-tabs').children[tabs.indexOf(tabName)].classList.add('active');

    // Керування логікою екрану гонок (ДОСТУПНО ТІЛЬКИ ПО ВИХІДНИХ)
    let dayOfWeekIdx = (currentDay - 1) % 7;
    let isWeekend = (dayOfWeekIdx === 5 || dayOfWeekIdx === 6); // Субота чи Неділя

    if (tabName === 'race') {
        if (isWeekend) {
            document.getElementById('race-active-zone').style.display = "block";
            document.getElementById('race-weekday-blocker').style.display = "none";
            if (isRaceActive) {
                isRaceScreenActive = true;
                startRunnerAnimation();
            }
        } else {
            document.getElementById('race-active-zone').style.display = "none";
            document.getElementById('race-weekday-blocker').style.display = "block";
            isRaceScreenActive = false;
            cancelAnimationFrame(animationId);
        }
    } else {
        isRaceScreenActive = false;
        cancelAnimationFrame(animationId);
    }
}

function advanceTime(hours) {
    currentHour += hours;
    
    // ПАСИВНИЙ ДОХІД СПОНСОРА ЗА КОЖЕН ХІД (ГОДИНУ)
    if (activeSponsor) {
        money += activeSponsor.pay;
    }

    if (currentHour >= 18) {
        currentHour = 9;
        currentDay += 1;
        
        // РОЗРАХУНОК ЩОДЕННИХ ВИТРАТ З УРАХУВАННЯМ ВІКУ ТА ЖИТЛА
        let dailyCost = 0;
        
        // 1. Оренда
        if (racerHousing === "rent") {
            dailyCost += (selectedTalentIdx === 2) ? 500 : 400;
        }
        
        // 2. Додаткові життєві зобов'язання з віком
        if (racerAge >= 26 && racerAge <= 35) {
            dailyCost += 150; // Кредити, побут
        } else if (racerAge >= 36) {
            dailyCost += 300; // Сімейні зобов'язання, криза віку
        }
        
        money -= dailyCost;
        alert(`⏰ Зміна завершена! Почався новий день. \n💸 Щоденні списання (оренда/побут/вік): -${dailyCost}₴.`);
        
        // Старіння: кожні 10 днів = 1 рік
        if (currentDay % 10 === 1 && currentDay > 1) {
            racerAge += 1;
            alert(`👴 З ДНЕМ НАРОДЖЕННЯ! Тобі виповнилося ${racerAge} років! Витрати та зобов'язання зростають.`);
        }

        if (money < 0) {
            endGame("💀 БАНКРУТСТВО ТА ВИТРАТИ!", "Ти не зміг покрити щоденні життєві зобов'язання. Боргова яма закрила кар'єру.");
        }
    }
    updateUI();
}

function gainXP(amount) {
    // Ефект житла на XP фокус
    if (racerHousing === "parents") amount = Math.floor(amount * 0.8); // Батьки відволікають
    if (racerHousing === "rent") amount = Math.floor(amount * 1.2);    // Своя хата — повний фокус
    
    if (selectedTalentIdx === 0) amount = Math.floor(amount * 0.85); // Хотлапер штраф в офісі
    
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
    document.getElementById('max-energy-display').innerText = maxEnergy;
    document.getElementById('global-stress').innerText = stress;
    document.getElementById('racer-level').innerText = level;
    document.getElementById('racer-xp').innerText = xp;
    document.getElementById('skill-points').innerText = skillPoints;
    document.getElementById('racer-age').innerText = racerAge;
    
    document.getElementById('game-day').innerText = currentDay;
    document.getElementById('game-hour').innerText = currentHour < 10 ? '0' + currentHour : currentHour;

    // Розрахунок дня тижня
    let dayIdx = (currentDay - 1) % 7;
    document.getElementById('game-weekday').innerText = WEEKDAYS[dayIdx];
    let isWeekend = (dayIdx === 5 || dayIdx === 6);
    document.getElementById('game-day-type').innerText = isWeekend ? "Вихідний" : "Будній";

    // Візуальні блоки залежно від буднів/вихідних
    if (isWeekend) {
        document.getElementById('work-weekend-notice').style.display = "block";
        document.getElementById('work-actions-block').style.display = "none";
    } else {
        document.getElementById('work-weekend-notice').style.display = "none";
        document.getElementById('work-actions-block').style.display = "block";
    }

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

    // РЕНДЕР СТАНУ СПОНСОРІВ
    if (activeSponsor) {
        document.getElementById('sponsor-name').innerText = `🤝 Контракт: ${activeSponsor.name}`;
        document.getElementById('sponsor-effect').innerText = `Пасивний дохід: +${activeSponsor.pay}₴ / кожну годину`;
        document.getElementById('btn-sponsor').style.display = 'none';
    } else {
        let availableSponsor = SPONSORS.find(s => s.reqLeague <= currentLeagueIdx);
        if (availableSponsor) {
            document.getElementById('sponsor-name').innerText = `Доступний спонсор: ${availableSponsor.name}`;
            document.getElementById('sponsor-effect').innerText = `Пропозиція: +${availableSponsor.pay}₴ за годину гри`;
            document.getElementById('btn-sponsor').style.display = 'inline-block';
        } else {
            document.getElementById('sponsor-name').innerText = "Немає доступних спонсорів для твоєї ліги";
            document.getElementById('btn-sponsor').style.display = 'none';
        }
    }
}

function workAnHour() {
    if (energy < 20) { alert("Немає сил!"); return; }
    
    let salary = (upgrades.monitor ? 450 : 250) + (stats.eng * 20);
    // З віком (36+) Керуюча бісить сильніше — стрес росте швидше!
    let ageStressPenalty = (racerAge >= 36) ? 1.5 : 1.0;
    let stressCost = (upgrades.keyboard ? 6 : 12) * ageStressPenalty;
    
    energy -= 18;
    stress = Math.min(100, stress + stressCost);
    money += salary;
    
    gainXP(15);
    turnsSinceLastQuest += 1;

    document.getElementById('work-log').innerHTML = `🖥 <b>Година роботи:</b> Закрив пачку чатів підтримки. Заробіток: +${salary}₴.`;
    
    // Ротація випадкових квестів (Тепер випадає будь-який з 5!)
    if (turnsSinceLastQuest >= 3 && currentActiveQuest === null) {
        currentActiveQuest = QUESTS[Math.floor(Math.random() * QUESTS.length)];
        document.getElementById('quest-zone').style.display = "block";
        document.getElementById('quest-title').innerText = currentActiveQuest.title;
        document.getElementById('quest-desc').innerText = currentActiveQuest.desc;
        document.getElementById('btn-q1').innerText = currentActiveQuest.b1;
        document.getElementById('btn-q2').innerText = currentActiveQuest.b2;
    }

    advanceTime(1);
    checkGameOver();
}

function goToVarus() {
    if (money < 120) { alert("Не вистачає коштів!"); return; }
    money -= 120;
    energy = Math.min(maxEnergy, energy + 45);
    stress = Math.max(0, stress - 15);
    document.getElementById('work-log').innerHTML = "🛒 <b>Varus:</b> Заправився паніні та кавою.";
    advanceTime(1);
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

function signSponsor() {
    let availableSponsor = SPONSORS.find(s => s.reqLeague <= currentLeagueIdx);
    if (availableSponsor) {
        activeSponsor = availableSponsor;
        document.getElementById('work-log').innerHTML = `🤝 <b>Угода підписана:</b> Бренд '${activeSponsor.name}' тепер платить пасивні гривні!`;
        updateUI();
    }
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

// --- ГОНКА ---
function startRaceWeekend() {
    let league = LEAGUES[currentLeagueIdx];
    if (league.req !== "none" && !upgrades[league.req]) {
        alert(`❌ Обмеження регламенту ліги! Необхідно: ${league.req}`); return;
    }
    if (money < league.fee) { alert("Немає грошей на внесок!"); return; }
    
    money -= league.fee;
    isRaceActive = true;
    currentLap = 0;
    racePosition = 20;
    runnerSpeed = 1;

    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('hit-apex-btn').style.display = 'block';
    document.getElementById('race-log').innerHTML = `🏁 <b>Етап ліги ${league.name} розпочато!</b> Зроби серію влучних тапів для прориву на подіум!`;
    
    isRaceScreenActive = true;
    updateUI();
    startRunnerAnimation();
}

function startRunnerAnimation() {
    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    if (!runner || !track || !isRaceScreenActive) return;

    let league = LEAGUES[currentLeagueIdx];
    let talentBonus = (selectedTalentIdx === 0) ? 0.9 : 1.0;
    let agePenalty = (racerAge >= 30) ? 1.25 : 1.0; // реакція падає швидше після 30

    let targetSpeed = (league.speed - (stats.ment * 0.15)) * talentBonus * agePenalty;
    if (targetSpeed < 1.5) targetSpeed = 1.5;

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
    if (energy < energyCost) { alert("Немає сил!"); return; }
    
    energy -= energyCost;
    currentLap += 1;
    wheelCondition = Math.max(0, wheelCondition - 5);

    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    const apex = document.getElementById('apex-zone');

    let runnerCenter = runnerPos + (runner.clientWidth / 2);
    let trackCenter = track.clientWidth / 2;
    let allowedDiff = apex.clientWidth / 2;

    let stressMultiplier = (selectedTalentIdx === 1) ? 1.2 : 1.0;
    // З віком (36+) стрес у гонках росте швидше!
    if (racerAge >= 36) stressMultiplier *= 1.25;

    if (Math.abs(runnerCenter - trackCenter) <= allowedDiff) {
        let overtakes = Math.floor(Math.random() * 3) + 4; 
        racePosition = Math.max(1, racePosition - overtakes);
        document.getElementById('race-log').innerHTML = `🟢 <b>Коло ${currentLap}:</b> Влучний апекс! Позиція: P${racePosition}.`;
    } else {
        let penaltyStress = (upgrades.pedals ? 8 : 16) * stressMultiplier;
        stress = Math.min(100, stress + penaltyStress);
        racePosition = Math.min(20, racePosition + 1);
        document.getElementById('race-log').innerHTML = `🔴 <b>Коло ${currentLap}:</b> Промахнувся повз траєкторію. Позиція: P${racePosition}.`;
    }

    if (currentLap >= LEAGUES[currentLeagueIdx].laps) {
        endRaceWeekend();
    }

    updateUI();
    checkGameOver();
}

function endRaceWeekend() {
    isRaceActive = false; isRaceScreenActive = false; cancelAnimationFrame(animationId);
    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('hit-apex-btn').style.display = 'none';

    let league = LEAGUES[currentLeagueIdx];

    if (racePosition <= 3) {
        money += league.reward;
        gainXP(60);
        document.getElementById('race-log').innerHTML = `🏆 <b>ПОДІУМ (P${racePosition})!</b> Етап пройдено. Призові: +${league.reward}₴. Отримано ліцензію далі!`;
        if (currentLeagueIdx < LEAGUES.length - 1) {
            currentLeagueIdx += 1;
            activeSponsor = null; // При переході в нову лігу шукаємо нового спонсора!
        }
        else endGame("🏆 СВІТОВА ЛЕГЕНДА СІМРЕЙСИНГУ!", `Ти виграв чемпіонат світу у віці ${racerAge} років! Повний тріумф.`);
    } else {
        document.getElementById('race-log').innerHTML = `🏁 <b>Фініш на P${racePosition}.</b> Недостатньо для ліцензії вищого рівня. Потрібен ТОП-3!`;
    }
    
    currentLap = 0;
    advanceTime(1);
}

function checkGameOver() {
    if (stress >= 100) endGame("💀 НЕРВОВИЙ ЗРИВ!", "Стрес знищив твою психіку. Кар'єру завершено.");
    if (energy <= 0) endGame("💀 ФІЗИЧНИЙ КОЛАПС", "Повне виснаження.");
    if (racerAge >= 40) endGame("👴 СІМРЕЙСЕРСЬКА ПЕНСІЯ!", "Тобі стукнуло 40 років. Реакція впала, спонсори пішли. Час на пенсію.");
}

function endGame(title, desc) {
    isRaceActive = false; isRaceScreenActive = false; cancelAnimationFrame(animationId);
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('global-tabs').style.display = 'none';
    document.getElementById('main-game-header').style.display = 'none';
    const finalScreen = document.getElementById('screen-final');
    finalScreen.classList.add('active');
    document.getElementById('final-title').innerText = title;
    document.getElementById('final-desc').innerText = desc;
}

function resetGame() {
    money = 1000; energy = 100; maxEnergy = 100; stress = 0; currentLeagueIdx = 0; level = 1; xp = 0; skillPoints = 0;
    currentDay = 1; currentHour = 9; racerAge = 18; activeSponsor = null;
    stats = { ment: 0, phys: 0, eng: 0 }; wheelCondition = 100; isRaceActive = false;
    upgrades = { keyboard: false, ups: false, wheel: false, pedals: false, monitor: false };

    document.querySelectorAll('.upgrade-card').forEach(c => c.classList.remove('owned'));
    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('hit-apex-btn').style.display = 'none';
    document.getElementById('main-game-header').style.display = 'none';
    document.getElementById('quest-zone').style.display = "none";
    currentActiveQuest = null; turnsSinceLastQuest = 0;
    
    document.getElementById('screen-creation').classList.add('active');
}

updateUI();
