const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// Дані персонажа (Кастомізація на старті)
let racerName = "Mykyta";
let racerGender = "Хлопець";
let racerStyle = "";
let selectedTalentIdx = 0; // 0 - Хотлапер, 1 - Гік, 2 - Заряджений
const TALENT_NAMES = ["Природжений Хотлапер", "Java-Гік", "Заряджений Monster'ом"];

// Ресурси
let money = 1000;
let energy = 100;
let maxEnergy = 100; // Може бути 130 для третього таланту!
let stress = 0;

// ТАЙМ ТА ВІК
let currentDay = 1;
let currentHour = 9;
let racerAge = 18; // Старт у 18 років

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

// --- СИСТЕМА КАСТОМІЗАЦІЇ НА СТАРТІ ---
function selectTalent(idx, element) {
    selectedTalentIdx = idx;
    document.querySelectorAll('.talent-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
}

function startGameWithCharacter() {
    // Зчитуємо дані з форми
    racerName = document.getElementById('creation-name').value.trim() || "Mykyta";
    racerGender = document.getElementById('creation-gender').value;
    racerStyle = document.getElementById('creation-style').value;

    // Застосовуємо ефекти вроджених талантів
    if (selectedTalentIdx === 1) {
        stats.eng = 2; // Java-гік стартує з +2 інженерії
    }
    if (selectedTalentIdx === 2) {
        maxEnergy = 130; // Енергетик має розширений бак сил
        energy = 130;
    }

    // Заповнюємо Досьє на вкладці Гонщика
    document.getElementById('bio-name').innerText = racerName;
    document.getElementById('bio-gender').innerText = racerGender;
    document.getElementById('bio-style').innerText = racerStyle;
    document.getElementById('bio-talent').innerText = TALENT_NAMES[selectedTalentIdx];

    // Ховаємо екран створення, вмикаємо інтерфейс гри
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
        currentHour = 9;
        currentDay += 1;
        
        // Оренда дорожча для таланту №2 (бо п'є багато Monster Energy)
        let rentCost = (selectedTalentIdx === 2) ? 500 : 400;
        money -= rentCost;
        
        alert(`⏰ Зміна завершена! \n💸 Списано ${rentCost}₴ за оренду квартири та інтернет.`);
        
        // СИСТЕМА СТАРІННЯ: Кожні 10 днів — плюс 1 рік життя!
        if (currentDay % 10 === 1 && currentDay > 1) {
            racerAge += 1;
            alert(`👴 СВЯТКУЄМО ДЕНЬ НАРОДЖЕННЯ! \nТобі виповнилося ${racerAge} років! Час іде!`);
        }

        if (money < 0) {
            endGame("💀 БАНКРУТСТВО ТА ВИСЕЛЕННЯ!", "Ти не зміг заробити на оренду квартири. Кокпіт конфісковано за борги.");
        }
    }
    updateUI();
}

function gainXP(amount) {
    // Штраф до досвіду для таланту Хотлапер (-15% XP в офісі)
    if (selectedTalentIdx === 0) {
        amount = Math.floor(amount * 0.85);
    }
    
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
    if (energy < 20) { alert("Немає сил!"); return; }
    
    let salary = (upgrades.monitor ? 450 : 250) + (stats.eng * 20);
    let stressCost = upgrades.keyboard ? 6 : 12;
    
    energy -= 18;
    stress = Math.min(100, stress + stressCost);
    money += salary;
    
    gainXP(15);
    turnsSinceLastQuest += 1;

    document.getElementById('work-log').innerHTML = `🖥 <b>Година роботи:</b> Закрив пачку чатів. Заробіток: +${salary}₴.`;
    
    if (turnsSinceLastQuest >= 3 && currentActiveQuest === null) {
        triggerRandomQuest();
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

function triggerRandomQuest() {
    // Випадкові сюжетні квести
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
        }
    ];
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

// --- ГОНКА ТА МАТЕМАТИКА ТАЛАНТІВ ---
function startRaceWeekend() {
    let league = LEAGUES[currentLeagueIdx];
    if (league.req !== "none" && !upgrades[league.req]) {
        alert(`❌ Потрібно залізо регламенту: ${league.req}`); return;
    }
    if (money < league.fee) { alert("Немає грошень на внесок!"); return; }
    
    money -= league.fee;
    isRaceActive = true;
    currentLap = 0;
    racePosition = 20;
    runnerSpeed = 1;

    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('hit-apex-btn').style.display = 'block';
    document.getElementById('race-log').innerHTML = `🏁 <b>Етап ліги ${league.name} розпочато!</b>`;
    
    isRaceScreenActive = true;
    updateUI();
    startRunnerAnimation();
}

function startRunnerAnimation() {
    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    if (!runner || !track || !isRaceScreenActive) return;

    let league = LEAGUES[currentLeagueIdx];
    
    // ВПЛИВ ТАЛАНТУ №0: Хотлапер спочатку має на 10% повільніший (простіший) бігунок!
    let talentBonus = (selectedTalentIdx === 0) ? 0.9 : 1.0;
    
    // Вплив старіння: після 30 років реакція падає (маркер прискорюється)
    let agePenalty = (racerAge >= 30) ? 1.2 : 1.0;

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

    // Вплив Таланту №1: Java-гік отримує на 20% більше стресу при промахах
    let stressMultiplier = (selectedTalentIdx === 1) ? 1.2 : 1.0;

    if (Math.abs(runnerCenter - trackCenter) <= allowedDiff) {
        let overtakes = Math.floor(Math.random() * 3) + 4; 
        racePosition = Math.max(1, racePosition - overtakes);
        document.getElementById('race-log').innerHTML = `🟢 <b>Коло ${currentLap}:</b> Влучний апекс! Позиція: P${racePosition}.`;
    } else {
        let penaltyStress = (upgrades.pedals ? 8 : 16) * stressMultiplier;
        stress = Math.min(100, stress + penaltyStress);
        racePosition = Math.min(20, racePosition + 1);
        document.getElementById('race-log').innerHTML = `🔴 <b>Коло ${currentLap}:</b> Промах траєкторії! Позиція: P${racePosition}.`;
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
        document.getElementById('race-log').innerHTML = `🏆 <b>ПОДІУМ (P${racePosition})!</b> Призові: +${league.reward}₴. Ліцензію оновлено!`;
        if (currentLeagueIdx < LEAGUES.length - 1) currentLeagueIdx += 1;
        else endGame("🏆 СВІТОВА ЛЕГЕНДА СІМРЕЙСИНГУ!", `Ти виграв F1 World Series у віці ${racerAge} років! Абсолютний тріумф.`);
    } else {
        document.getElementById('race-log').innerHTML = `🏁 <b>Фініш на P${racePosition}.</b> Потрібен ТОП-3.`;
    }
    
    currentLap = 0;
    advanceTime(1);
}

function checkGameOver() {
    if (stress >= 100) endGame("💀 НЕРВОВИЙ ЗРИВ!", "Стрес знищив твою менталку. Кар'єру закінчено.");
    if (energy <= 0) endGame("💀 ФІЗИЧНИЙ КОЛАПС", "Повна перевтома.");
    if (racerAge >= 40) endGame("👴 СІМРЕЙСЕРСЬКА ПЕНСІЯ!", "Тобі стукнуло 40 років. Реакція вже не та, спонсори закрили контракти. Ти йдеш на пенсію оператором підтримки.");
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
    currentDay = 1; currentHour = 9; racerAge = 18;
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
// Створення персонажа активне при запуску, UI гри чекає
updateUI();
