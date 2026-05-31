const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Вийти з гри").show().onClick(() => tg.close());

// Початковий стан гри
let energy = 100;
let stress = 0;
let money = 1000;
let hour = 9;

let hasScript = false;
let hasJava = false;
let hasMoza = false;

const logWindow = document.getElementById('log-window');

function updateUI() {
    document.getElementById('energy-val').innerText = energy;
    document.getElementById('stress-val').innerText = stress;
    document.getElementById('money-val').innerText = money;
    document.getElementById('time-val').innerText = hour < 10 ? '0' + hour : hour;
    
    // Динамічна зміна кольору тексту при критичних показниках
    document.getElementById('energy-val').style.color = energy < 30 ? '#f44336' : '#e0e0e0';
    document.getElementById('stress-val').style.color = stress > 70 ? '#f44336' : '#e0e0e0';
}

function printLog(text) {
    const p = document.createElement('div');
    p.style.marginBottom = "8px";
    p.innerHTML = text;
    logWindow.appendChild(p);
    logWindow.scrollTop = logWindow.scrollHeight;
}

function toggleShop() {
    const modal = document.getElementById('shop-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function buyItem(item, price) {
    if (money < price) {
        alert("Не вистачає гривень! Треба більше працювати в підтримці.");
        return;
    }
    if ((item === 'script' && hasScript) || (item === 'java' && hasJava) || (item === 'moza' && hasMoza)) {
        alert("Цей апгрейд уже куплено!");
        return;
    }

    money -= price;
    if (item === 'script') { hasScript = true; printLog("⚙️ <b>Куплено автоматизацію:</b> Тепер робота забирає на 50% менше енергії."); }
    if (item === 'java') { hasJava = true; stress = Math.max(0, stress - 20); printLog("☕️ <b>Куплено курс Java:</b> Керуюча задоволена твоєю ініціативністю. Стрес упав."); }
    if (item === 'moza') { hasMoza = true; printLog("🏎 <b>Встановлено педалі Moza CRP:</b> Шанси на перемогу у вечірній гонці значно зросли!"); }
    
    updateUI();
    toggleShop();
}

function takeStep(action) {
    hour += 1;
    logWindow.innerHTML = ""; 
    let eventRoll = Math.floor(Math.random() * 100);

    if (action === 'work') {
        let energyCost = hasScript ? 10 : 20;
        energy -= energyCost;
        stress += 15;
        money += 250;
        printLog(`🖥 <b>Ви відпрацювали годину:</b> Закрили 15 тікетів. Зарплата +250₴. (Енергія -${energyCost}, Стрес +15)`);
    } 
    else if (action === 'varus') {
        money -= 120;
        energy = Math.min(100, energy + 25);
        stress = Math.max(0, stress - 15);
        printLog("🛒 <b>Похід у Varus:</b> Енергетик та сендвіч роблять речі. (Баланс -120₴, Енергія +25%, Стрес -15%)");
    } 
    else if (action === 'race') {
        energy -= 15;
        stress = Math.max(0, stress - 25);
        printLog("🏎 <b>Тренування v ACC:</b> Катнув практику в Монці. Стрес як рукою зняло! (Енергія -15%, Стрес -25%)");
    }

    if (hour < 18 && eventRoll < 40) { 
        generateRandomEvent();
    }

    updateUI();
    checkGameState();
}

function generateRandomEvent() {
    const events = [
        {
            title: "⚠️ <b>КРАШ СЕРВЕРІВ!</b>",
            desc: "Усі сервери впали, 300 злих геймерів ломанулися в чат саппорту! Стрес +20%.",
            action: () => { stress += 20; }
        },
        {
            title: "💬 <b>Дзвінок від Колі:</b>",
            desc: "Коля кличе обговорити важливий план на перекурі. Енергія +10%, але Керуюча незадоволена (Стрес +5%).",
            action: () => { energy = Math.min(100, energy + 10); stress += 5; }
        },
        {
            title: "👨‍💻 <b>Юра просить допомоги:</b>",
            desc: "Юра в шоці від Java і просить знайти баг. Ви витратили сили (Енергія -15%), зате він скинув на карту 150₴ за хелп.",
            action: () => { energy -= 15; money += 150; }
        },
        {
            title: "👑 <b>Аудит від Керуючої:</b>",
            desc: "Твої чати перевіряють. Якщо є курс Java, вона каже 'Красава' (-10% стресу). Якщо немає — виписує догану (Стрес +15%).",
            action: () => { if (hasJava) { stress = Math.max(0, stress - 10); } else { stress += 15; } }
        }
    ];

    let randomEvent = events[Math.floor(Math.random() * events.length)];
    printLog(`<br><span style="color:#ffcc00">${randomEvent.title}</span> ${randomEvent.desc}`);
    randomEvent.action();
}

function checkGameState() {
    if (energy <= 0) {
        endGame(false, "💀 ГЕЙМ ОВЕР: Повне вигорання!", "У тебе закінчилися сили, ти заснув прямо за робочим столом. Керуюча звільнила тебе, а Moza покрилася пилом.");
    } else if (stress >= 100) {
        endGame(false, "💀 ГЕЙМ ОВЕР: Нервовий зрив!", "Ти не витримав тупих питань у чаті, розбив монітор і викинув роутер у вікно.");
    } else if (hour >= 18) {
        let winChance = 40; 
        if (hasMoza) winChance += 40;
        if (energy > 60) winChance += 20;
        
        let isVictory = Math.floor(Math.random() * 100) < winChance;
        
        if (isVictory) {
            endGame(true, "🏆 ТОТАЛЬНА ПЕРЕМОГА!", `Ти допрацював зміну із балансом ${money}₴! А ввечері на гонці в ACC ти взяв ПОУЛ і виграв золото в Спа! Хлопці в шоці, Юра видалив Java від заздрощів!`);
        } else {
            endGame(true, "🏁 Зміна закінчена, але гонка злита...", `Ти вижив на роботі, але через брак сил твою машину розвернуло в першому ж повороті Монци. Треба купувати апгрейди в магазині!`);
        }
    }
}

function endGame(isWin, title, desc) {
    document.getElementById('game-core-ui').style.display = 'none'; 
    document.getElementById('game-controls').style.display = 'none';
    document.getElementById('shop-modal').style.display = 'none';
    
    const finalScreen = document.getElementById('final-screen');
    finalScreen.style.display = 'block';
    
    const titleElem = document.getElementById('final-title');
    titleElem.innerText = title;
    titleElem.className = isWin ? 'success-text' : 'danger-text';
    
    document.getElementById('final-desc').innerHTML = `${desc}<br><br><b>Твої фінальні ресурси:</b><br>💵 Гроші: ${money}₴ | 🔋 Енергія: ${energy}% | 🧠 Стрес: ${stress}%`;
}

function resetGame() {
    energy = 100; stress = 0; money = 1000; hour = 9;
    hasScript = false; hasJava = false; hasMoza = false;
    logWindow.innerHTML = "Зміна розпочалась. Керуюча онлайн. Що будемо робити цю годину?";
    document.getElementById('game-controls').style.display = 'flex';
    document.getElementById('final-screen').style.display = 'none';
    updateUI();
}

// Перший запуск
updateUI();
