const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// Ресурси та базова аналітика
let money = 1000;
let energy = 100;
let stress = 0;

let upgrades = { wheel: false, pedals: false, monitor: false };

// КОНФІГУРАЦІЯ ЧЕМПІОНАТІВ (База даних ліг як у Менеджерах)
const LEAGUES = [
    { name: "DRS (Digital Racing Series)", fee: 0, laps: 3, speed: 3.5, reward: 800, req: "none" },
    { name: "КМАМК Україна", fee: 500, laps: 4, speed: 5.0, reward: 1500, req: "wheel" },
    { name: "FIA Formula 3", fee: 1200, laps: 5, speed: 6.5, reward: 3000, req: "pedals" },
    { name: "FIA Formula 2 Grid", fee: 2500, laps: 5, speed: 8.5, reward: 6000, req: "monitor" },
    { name: "F1 World Championship", fee: 5000, laps: 6, speed: 11.0, reward: 15000, req: "monitor" }
];
let currentLeagueIdx = 0;

// Спонсори
const SPONSORS = [
    { name: "Місцева Шаурма", pay: 40, reqLeague: 0 },
    { name: "Varus Енерджі", pay: 100, reqLeague: 1 },
    { name: "Moza Racing UA", pay: 250, reqLeague: 2 },
    { name: "Гейм-Хаб Інвест", pay: 500, reqLeague: 3 }
];
let activeSponsor = null;

// Стан поточного заїзду
let currentLap = 0;
let racePosition = 20;
let isRaceActive = false;

// Рух бігунка
let runnerPos = 0;
let runnerSpeed = 3;
let animationId = null;
let isRaceScreenActive = false;

function switchTab(tabName) {
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`screen-${tabName}`).classList.add('active');
    const tabs = ['work', 'garage', 'race'];
    document.getElementById('global-tabs').children[tabs.indexOf(tabName)].classList.add('active');

    if (tabName === 'race' && isRaceActive) {
        isRaceScreenActive = true;
        startRunnerAnimation();
    } else {
        isRaceScreenActive = false;
        cancelAnimationFrame(animationId);
    }
}

function updateUI() {
    document.getElementById('global-money').innerText = money;
    document.getElementById('global-energy').innerText = energy;
    document.getElementById('global-stress').innerText = stress;
    
    let league = LEAGUES[currentLeagueIdx];
    document.getElementById('current-league-name').innerText = league.name;
    document.getElementById('race-fee').innerText = league.fee;
    document.getElementById('target-laps').innerText = league.laps;
    document.getElementById('max-laps-display').innerText = league.laps;
    document.getElementById('race-laps').innerText = currentLap;
    document.getElementById('race-pos').innerText = "P" + racePosition;

    // Прокачка керма розширює зону апексу
    document.getElementById('apex-zone').style.width = upgrades.wheel ? '70px' : '35px';

    // Рендер стану спонсора
    if (activeSponsor) {
        document.getElementById('sponsor-name').innerText = `🤝 Спонсор: ${activeSponsor.name}`;
        document.getElementById('sponsor-effect').innerText = `Дохід: +${activeSponsor.pay}₴ кожну годину`;
        document.getElementById('btn-sponsor').style.display = 'none';
    } else {
        let availableSponsor = SPONSORS.find(s => s.reqLeague <= currentLeagueIdx);
        if (availableSponsor) {
            document.getElementById('sponsor-name').innerText = `Доступний контракт: ${availableSponsor.name}`;
            document.getElementById('sponsor-effect').innerText = `Пропозиція: +${availableSponsor.pay}₴ / хід`;
            document.getElementById('btn-sponsor').style.display = 'inline-block';
        }
    }
}

// ПАСИВНИЙ ХІД (Викликається при діях, рахує спонсорські гроші)
function triggerPassiveTurn() {
    if (activeSponsor) {
        money += activeSponsor.pay;
    }
}

function workAnHour() {
    if (energy < 20) { alert("Немає сил! Потрібен перекусон."); return; }
    energy -= 20;
    stress = Math.min(100, stress + 8);
    money += 250;
    
    triggerPassiveTurn();
    document.getElementById('work-log').innerHTML = "🖥 <b>Зміна в саппорті:</b> Закрив пачку діалогів про злиті депозити користувачів. Зарплата на базі.";
    updateUI();
    checkGameOver();
}

function goToVarus() {
    if (money < 120) { alert("Не вистачає коштів!"); return; }
    money -= 120;
    energy = Math.min(100, energy + 40);
    stress = Math.max(0, stress - 15);
    triggerPassiveTurn();
    document.getElementById('work-log').innerHTML = "🛒 <b>Забіг у Варус:</b> Енергетик заправлений, нерви відновлюються.";
    updateUI();
}

function signSponsor() {
    let availableSponsor = SPONSORS.find(s => s.reqLeague <= currentLeagueIdx);
    if (availableSponsor) {
        activeSponsor = availableSponsor;
        document.getElementById('work-log').innerHTML = `🤝 <b>Угода підписана:</b> Бренд '${activeSponsor.name}' тепер фінансує твою кар'єру!`;
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

// --- ЛОГІКА ГОНОЧНОГО ВІКЕНДУ ---
function startRaceWeekend() {
    let league = LEAGUES[currentLeagueIdx];
    
    // Перевірка технічного регламенту ліги (Requirements як у F1 Manager)
    if (league.req !== "none" && !upgrades[league.req]) {
        let reqName = league.req === "wheel" ? "Moza R9" : league.req === "pedals" ? "Moza CRP" : "Тримонітор";
        alert(`❌ Твій кокпіт не відповідає регламенту ліги! Необхідно купити в Гаражі: ${reqName}`);
        return;
    }

    if (money < league.fee) { alert("Немає грошей на стартовий внесок етапу!"); return; }
    
    money -= league.fee;
    isRaceActive = true;
    currentLap = 0;
    racePosition = 20;
    
    // Встановлюємо швидкість бігунка відповідно до поточної ліги!
    runnerSpeed = league.speed;

    document.getElementById('start-race-btn').style.display = 'none';
    document.getElementById('hit-apex-btn').style.display = 'block';
    document.getElementById('race-log').innerHTML = `🏁 <b>Зелені прапори!</b> Етап розпочато. Позиція: P20. Тисни кнопку на апексах, щоб прориватися вгору!`;
    
    isRaceScreenActive = true;
    updateUI();
    startRunnerAnimation();
}

function startRunnerAnimation() {
    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    if (!runner || !track || !isRaceScreenActive) return;

    runnerPos += runnerSpeed;
    let maxPos = track.clientWidth - runner.clientWidth;
    if (runnerPos >= maxPos || runnerPos <= 0) {
        runnerSpeed = -runnerSpeed;
    }
    runner.style.left = runnerPos + 'px';
    animationId = requestAnimationFrame(startRunnerAnimation);
}

function hitApex() {
    if (!isRaceActive) return;
    if (energy < 15) { alert("Фізичне виснаження! Ти не можеш тримати кермо. Сходи у Варус."); return; }
    
    energy -= 15;
    currentLap += 1;

    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    const apex = document.getElementById('apex-zone');

    let runnerCenter = runnerPos + (runner.clientWidth / 2);
    let trackCenter = track.clientWidth / 2;
    let allowedDiff = apex.clientWidth / 2;

    let league = LEAGUES[currentLeagueIdx];

    if (Math.abs(runnerCenter - trackCenter) <= allowedDiff) {
        // УСПІШНИЙ МАНЕВР
        let overtakes = Math.floor(Math.random() * 3) + 2; // Обгін 2-4 машин
        racePosition = Math.max(1, racePosition - overtakes);
        stress = Math.max(0, stress - 5);
        document.getElementById('race-log').innerHTML = `🟢 <b>Коло ${currentLap}:</b> Чистий обгін за внутрішнім радіусом! Ти пройшов суперників. Позиція: P${racePosition}.`;
    } else {
        // ПРОМАХ АПЕКСУ
        let penaltyStress = upgrades.pedals ? 10 : 20; // Педалі CRP рятують від стресу
        stress = Math.min(100, stress + penaltyStress);
        racePosition = Math.min(20, racePosition + (Math.floor(Math.random() * 2) + 1));
        document.getElementById('race-log').innerHTML = `🔴 <b>Коло ${currentLap}:</b> Помилка на гальмуванні! Машина пішла на брудний асфальт, втрата темпу. Позиція: P${racePosition}.`;
    }

    // Перевірка завершення дистанції гонки
    if (currentLap >= league.laps) {
        endRaceWeekend();
    } else {
        // З кожним колом швидкість бігунка трохи зростає для хардкору!
        runnerSpeed = runnerSpeed > 0 ? runnerSpeed + 0.5 : runnerSpeed - 0.5;
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

    if (racePosition <= 3) {
        // Подіум — перехід у наступну лігу!
        money += league.reward;
        document.getElementById('race-log').innerHTML = `🏆 <b>ФІНІШ НА ПОДІУМІ (P${racePosition})!</b> Ти розірвав цей чемпіонат! Призові: <span style="color:#4caf50">+${league.reward}₴</span>. Отримано допуск до наступної ліги!`;
        
        if (currentLeagueIdx < LEAGUES.length - 1) {
            currentLeagueIdx += 1;
            activeSponsor = null; // Спонсорський контракт закінчується при зміні класу ліг
        } else {
            // Якщо пройшов F1
            endGame("🏆 ЛЕГЕНДА СВІТОВОГО СІМРЕЙСИНГУ!", `Ти пройшов шлях від чатів підтримки до чемпіона F1 World Championship! Твій кабінет заставлений базами Moza, Юра та Коля носять тебе на руках! Фінальний баланс: ${money}₴.`);
        }
    } else {
        // Не зміг заїхати на подіум
        document.getElementById('race-log').innerHTML = `🏁 <b>Фініш на P${racePosition}.</b> Непогано, але спонсори вимагають ТОП-3 для ліцензії вищого рівня. Прокачай залізо в Гаражі та спробуй цей етап ще раз!`;
    }
    
    currentLap = 0;
    updateUI();
}

function checkGameOver() {
    if (stress >= 100) {
        endGame("💀 КРАХ КАР'ЄРИ: Нервове вигорання", "Ти розбив кокпіт, послав спонсорів і Керуючу саппорту. Повна дискваліфікація.");
    }
    if (energy <= 0) {
        endGame("💀 ФІЗИЧНИЙ КОЛАПС", "Ти знепритомнів прямо під час гонки від перевтоми. Спонсори розірвали контракти.");
    }
}

function endGame(title, desc) {
    isRaceActive = false;
    isRaceScreenActive = false;
    cancelAnimationFrame(animationId);

    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('global-tabs').style.display = 'none';
    
    const finalScreen = document.getElementById('screen-final');
    finalScreen.classList.add('active');
    
    document.getElementById('final-title').innerText = title;
    document.getElementById('final-desc').innerText = desc;
}

function resetGame() {
    money = 1000; energy = 100; stress = 0; currentLeagueIdx = 0; activeSponsor = null;
    isRaceActive = false; currentLap = 0;
    upgrades = { wheel: false, pedals: false, monitor: false };

    document.querySelectorAll('.upgrade-card').forEach(c => c.classList.remove('owned'));
    document.getElementById('btn-wheel').innerText = "Купити (1500₴)";
    document.getElementById('btn-pedals').innerText = "Купити (2500₴)";
    document.getElementById('btn-monitor').innerText = "Купити (4000₴)";

    document.getElementById('start-race-btn').style.display = 'block';
    document.getElementById('hit-apex-btn').style.display = 'none';
    document.getElementById('global-tabs').style.display = 'flex';
    
    document.getElementById('work-log').innerHTML = "Зміна розпочалась. Обери стратегію фінансування кар'єри.";
    
    updateUI();
    switchTab('work');
}

updateUI();
