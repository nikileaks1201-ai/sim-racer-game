const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Закрити гру").show().onClick(() => tg.close());

// Основні ресурси
let money = 1000;
let energy = 100;
let stress = 0;

// Стан прокачки
let upgrades = {
    wheel: false,    // Moza R9
    pedals: false,   // Moza CRP
    monitor: false   // Тримонітор
};

// Стан гонки
let racePoints = 0;

// Перемінні для анімації бігунка
let runnerPos = 0;
let runnerSpeed = 3; 
let animationId = null;
let isRaceScreenActive = false;

// --- СИСТЕМА ПЕРЕКЛЮЧЕННЯ ВКЛАДОК ---
function switchTab(tabName) {
    // Ховаємо всі екрани
    document.querySelectorAll('.game-screen').forEach(screen => screen.classList.remove('active'));
    // Знімаємо підсвітку з усіх кнопок таб-бару
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    // Показуємо потрібний екран
    document.getElementById(`screen-${tabName}`).classList.add('active');
    
    // Підсвічуємо поточну кнопку в таб-барі
    const tabs = ['work', 'garage', 'race'];
    const idx = tabs.indexOf(tabName);
    document.getElementById('global-tabs').children[idx].classList.add('active');

    // Керування рухом бігунка: запускаємо рух ТІЛЬКИ на вкладці Гонки
    if (tabName === 'race') {
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
    document.getElementById('race-points').innerText = racePoints;

    // Якщо купили кермо Moza R9 -> розширюємо зелену зону апексу на екрані!
    if (upgrades.wheel) {
        document.getElementById('apex-zone').style.width = '75px';
    }
}

// --- ЛОГІКА ВКЛАДКИ: РОБОТА ---
function workAnHour() {
    if (energy < 15) { alert("Немає сил! Сходи у Varus по енергетик."); return; }
    
    // Якщо куплено Тримонітор -> платять більше!
    let salary = upgrades.monitor ? 400 : 250;
    energy -= 15;
    stress = Math.min(100, stress + 10);
    money += salary;

    let logText = `🖥 <b>Чати закриті:</b> Розібрав скаргу VIP-гравця на затримку виплати в казіку. Керуюча задоволена. Заробіток: <span style="color:#4caf50">+${salary}₴</span>.`;
    
    // Рандомний форс-мажор на зміні (30% шанс)
    if (Math.random() * 100 < 30) {
        stress = Math.min(100, stress + 15);
        logText += "<br><br>⚠️ <b>ФОРС-МАЖОР:</b> Упали платіжні шлюзи! Наплив матюків у чаті збільшився. (Стрес +15%)";
    }

    document.getElementById('work-log').innerHTML = logText;
    updateUI();
    checkGameOver();
}

function goToVarus() {
    if (money < 120) { alert("Не вистачає грошей на Varus! Треба працювати."); return; }
    money -= 120;
    energy = Math.min(100, energy + 35);
    stress = Math.max(0, stress - 15);
    document.getElementById('work-log').innerHTML = "🛒 <b>Varus хелпує:</b> Випив холодний енергетик Monster та з'їв сендвіч. Сили повернулись, стрес трохи відпустив. (Енергія +35%, Стрес -15%)";
    updateUI();
}

// --- ЛОГІКА ВКЛАДКИ: ГАРАЖ (ПРОКАЧКА) ---
function buyUpgrade(type, price) {
    if (money < price) { alert("Не вистачає коштів!"); return; }
    if (upgrades[type]) { alert("Вже куплено!"); return; }

    money -= price;
    upgrades[type] = true;

    const card = document.getElementById(`upg-${type}`);
    card.classList.add('owned');
    
    if (type === 'wheel') {
        document.getElementById('wheel-desc').innerText = "Зона апексу: ШИРОКА (Полегшує гонку)";
        document.getElementById('btn-wheel').innerText = "КУПЛЕНО";
    }
    if (type === 'pedals') {
        document.getElementById('pedals-desc').innerText = "Енергія на тренуваннях: 0 (Педалі CRP ідеальні)";
        document.getElementById('btn-pedals').innerText = "КУПЛЕНО";
    }
    if (type === 'monitor') {
        document.getElementById('monitor-desc').innerText = "Зарплата в саппорті: +400₴/год";
        document.getElementById('btn-monitor').innerText = "КУПЛЕНО";
    }

    updateUI();
}

// --- ДВИГУН МІНІ-ГРИ: РУХ БІГУНКА (ГОНКА) ---
function startRunnerAnimation() {
    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    
    if (!runner || !track || !isRaceScreenActive) return;

    // Рухаємо бігунок
    runnerPos += runnerSpeed;

    // Якщо вперлися в край шкали — розвертаємо назад
    let maxPos = track.clientWidth - runner.clientWidth;
    if (runnerPos >= maxPos || runnerPos <= 0) {
        runnerSpeed = -runnerSpeed;
    }

    runner.style.left = runnerPos + 'px';

    // Зациклюємо анімацію екрану в реальному часі
    animationId = requestAnimationFrame(startRunnerAnimation);
}

// КЛІК НА КНОПКУ ТАП! (ПЕРЕВІРКА ВЛУЧАННЯ В АПЕКС)
function hitApex() {
    let cost = upgrades.pedals ? 0 : 15; // Якщо педалі пластикові — бере сили, якщо CRP — 0!
    if (energy < cost) { alert("Немає сил тиснути на педалі! Сходи в Varus."); return; }
    
    energy -= cost;

    const runner = document.getElementById('car-runner');
    const track = document.querySelector('.track-line');
    const apex = document.getElementById('apex-zone');

    // Вираховуємо координати центру бігунка та центру зеленої зони
    let runnerCenter = runnerPos + (runner.clientWidth / 2);
    let trackCenter = track.clientWidth / 2;
    
    // Допуск влучання залежить від ширини зони апексу
    let allowedDiff = apex.clientWidth / 2;

    if (Math.abs(runnerCenter - trackCenter) <= allowedDiff) {
        // ВЛУЧИВ!
        racePoints += 1;
        document.getElementById('race-log').innerHTML = "🟢 <b>ІДЕАЛЬНИЙ АПЕКС!</b> Ти філігранно влучив у траєкторію повороту Eau Rouge! Позиція покращена. Очки чемпіонату зростають!";
    } else {
        // ПРОМАЗАВ
        stress = Math.min(100, stress + 15);
        document.getElementById('race-log').innerHTML = "🔴 <b>ПРОМАХ!</b> Ти запізнився з гальмуванням, машину викинуло на поребрик і розвернуло! Шматок гуми відлетів. (Стрес +15%)";
    }

    updateUI();
    checkGameOver();
}

// --- ПЕРЕВІРКА СТАНУ ГРИ ---
function checkGameOver() {
    if (stress >= 100) {
        endGame("💀 НЕРВОВИЙ ЗРИВ!", "Стрес досяг 100%. Ти не витримав напливу клієнтів казіка, викинув роутер у вікно та злив зміну. Сімрейсинг заблоковано.");
    } else if (energy <= 0) {
        endGame("💀 ПОВНЕ ВИГОРЯННЯ!", "Сили на нулі. Ти заснув прямо на клавіатурі. Керуюча звільнила тебе за сон на робочому місці.");
    } else if (racePoints >= 5) {
        endGame("🏆 ЧЕМПІОН СВІТУ!", `ТИ ЗРОБИВ ЦЕ! Накопичив грошей, зібрав кокпіт на базі Moza і виграв офіційну лігу в Спа! Юра видалив Java, Коля аплодує стоячи! Твій фінальний баланс: ${money}₴.`);
    }
}

function endGame(title, desc) {
    cancelAnimationFrame(animationId);
    isRaceScreenActive = false;
    
    // Ховаємо всі екрани та меню
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('global-tabs').style.display = 'none';
    
    // Показуємо екран фіналу
    const finalScreen = document.getElementById('screen-final');
    finalScreen.classList.add('active');
    
    document.getElementById('final-title').innerText = title;
    document.getElementById('final-desc').innerText = desc;
}

function resetGame() {
    money = 1000; energy = 100; stress = 0; racePoints = 0;
    upgrades = { wheel: false, pedals: false, monitor: false };
    
    // Скидаємо картки гаражу в початковий стан
    document.querySelectorAll('.upgrade-card').forEach(c => c.classList.remove('owned'));
    document.getElementById('wheel-desc').innerText = "Зона апексу: Вузька";
    document.getElementById('btn-wheel').innerText = "Купити Moza R9 (800₴)";
    document.getElementById('pedals-desc').innerText = "Енергія на тренуваннях: -20";
    document.getElementById('btn-pedals').innerText = "Moza CRP (1200₴)";
    document.getElementById('monitor-desc').innerText = "Зарплата в саппорті: Базова";
    document.getElementById('btn-monitor').innerText = "Тримонітор (1500₴)";

    document.getElementById('global-tabs').style.display = 'flex';
    document.getElementById('work-log').innerHTML = "Зміна розпочалась. Керуюча онлайн. Наплив клієнтів середній. Що будемо робити цю годину?";
    
    updateUI();
    switchTab('work');
}

// Запуск
updateUI();
