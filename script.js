const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("Вийти з гри").show().onClick(() => tg.close());

let energy = 100;
let stress = 0;
let money = 1000;
let hour = 9;

let hasScript = false;
let hasJava = false;
let hasMoza = false;

const logWindow = document.getElementById('log-window');

function updateUI() {
    // Оновлення тексту
    document.getElementById('energy-val').innerText = energy;
    document.getElementById('stress-val').innerText = stress;
    document.getElementById('money-val').innerText = money;
    document.getElementById('time-val').innerText = hour < 10 ? '0' + hour : hour;
    
    // Анімація прогрес-барів через плавну зміну ширини (CSS transition)
    document.getElementById('energy-fill').style.width = energy + '%';
    document.getElementById('stress-fill').style.width = stress + '%';
    
    // Зміна кольору шкал при критичних значеннях
    document.getElementById('energy-fill').style.backgroundColor = energy < 30 ? '#f44336' : '#4caf50';
    document.getElementById('stress-fill').style.backgroundColor = stress > 70 ? '#f44336' : '#9c27b0';
}

function printLog(text) {
    const div = document.createElement('div');
    div.className = "log-entry";
    div.innerHTML = text;
    logWindow.appendChild(div);
    logWindow.scrollTop = logWindow.scrollHeight;
}

function toggleShop() {
    const modal = document.getElementById('shop-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function buyItem(item, price) {
    if (money < price) {
        alert("Не вистачає гривень! Закривай більше чатів підтримки.");
        return;
    }
    if ((item === 'script' && hasScript) || (item === 'java' && hasJava) || (item === 'moza' && hasMoza)) {
        alert("Цей апгрейд уже куплено!");
        return;
    }

    money -= price;
    if (item === 'script') { hasScript = true; printLog("⚙️ <b>АПГРЕЙД:</b> Ти налаштував макроси та автоскрипти для типових питань. Енергія на роботу тепер витрачається вдвічі менше!"); }
    if (item === 'java') { hasJava = true; stress = Math.max(0, stress - 25); printLog("📚 <b>АПГРЕЙД:</b> Купив преміум-курс по Java. Керуюча побачила вкладку на твоєму екрані й похвалила за саморозвиток. Стрес -25%!"); }
    if (item === 'moza') { hasMoza = true; printLog("🏎 <b>АПГРЕЙД:</b> Кур'єр Нової Пошти заніс коробку з педалями Moza CRP. Один їхній вигляд піднімає бойовий дух! Шанс на вечірній подіум виріс!"); }
    
    updateUI();
    toggleShop();
}

function takeStep(action) {
    hour += 1;
    logWindow.innerHTML = ""; // Очищення для свіжого ходу
    
    // Шанс випадкової події (45%)
    let hasEvent = Math.floor(Math.random() * 100) < 45;

    if (action === 'work') {
        let energyCost = hasScript ? 10 : 20;
        
        if (hasEvent) {
            // Якщо сталась подія — логіка роботи переривається форс-мажором (ГРОШІ НЕ ДАЮТЬСЯ ПРОСТО ТАК)
            generateRandomEvent();
        } else {
            // Спокійна успішна година роботи
            energy -= energyCost;
            stress += 12;
            money += 250;
            printLog(`🖥 <b>09:00 - 18:00 | Робочий процес:</b> Година пройшла спокійно. Ти розігрів чат, закрив 12 тікетів по заблокованих акаунтах і допоміг VIP-клієнту. <span class='success-text'>Баланс +250₴</span>. (Енергія -${energyCost}, Стрес +12)`);
        }
    } 
    else if (action === 'varus') {
        money -= 120;
        energy = Math.min(100, energy + 30);
        stress = Math.max(0, stress - 15);
        printLog("🛒 <b>Перерва на Varus:</b> Прогулявся до супермаркету, взяв холодний енергетик та свіжий паніні. Черга на касі змусила понервувати, але сили повернулися. (Баланс -120₴, Енергія +30%, Стрес -15%)");
        if (hasEvent) generateRandomEvent();
    } 
    else if (action === 'race') {
        energy -= 15;
        stress = Math.max(0, stress - 30);
        printLog("🏎 <b>Таємне тренування:</b> Поки Керуюча відійшла, ти увімкнув Moza, зайшов на сервер і проїхав 5 стабільних кіл у Спа. Чистий кайф, нерви відновлено! (Енергія -15%, Стрес -30%)");
        if (hasEvent) generateRandomEvent();
    }

    updateUI();
    checkGameState();
}

function generateRandomEvent() {
    const events = [
        {
            title: "⚠️ <b>АВАРІЯ НА СЕРВЕРІ!</b>",
            desc: "Упав платіжний шлюз! 500 розлючених користувачів одночасно ломанулися в чат, система саппорту горить. Ти цілу годину відбивався від матюків. Грошей не заробив, сил немає. (Енергія -25, Стрес +25%)",
            action: () => { energy -= 25; stress += 25; }
        },
        {
            title: "📞 <b>План із Колею:</b>",
            desc: "Коля затягнув тебе на довгу розмову на курилці. Ви годину обговорювали геніальний план, як показати яйця керуючій і вибити підвищення. Трохи відпочив, але роботу завалено. (Енергія +15, Стрес -5)",
            action: () => { energy = Math.min(100, energy + 15); stress = Math.max(0, stress - 5); }
        },
        {
            title: "👨‍💻 <b>Крик про допомогу від Юри:</b>",
            desc: "Юра запустив свій код, спіймав безкінечний цикл і в паніці пише тобі. Ти зжалився, витратив годину і закрив його баг. За допомогу Юра скинув тобі на карту <span class='success-text'>+200₴</span>! (Енергія -15)",
            action: () => { energy -= 15; money += 200; }
        },
        {
            title: "👑 <b>Раптовий аудит чатів:</b>",
            desc: "Керуюча підняла логи твоїх діалогів за тиждень. Якщо у тебе <u>є курс Java</u>, вона бачить твій потенціал і виписує премію <span class='success-text'>+300₴</span>. Якщо курсу немає — каже, що твої відповіді сухі, і дає догану (Стрес +20%).",
            action: () => { if (hasJava) { money += 300; } else { stress += 20; } }
        }
    ];

    let randomEvent = events[Math.floor(Math.random() * events.length)];
    printLog(`<br><span style="color:#ffcc00">${randomEvent.title}</span> ${randomEvent.desc}`);
    randomEvent.action();
}

function checkGameState() {
    if (energy <= 0) {
        endGame(false, "💀 МОРЛЬНЕ ТА ФІЗИЧНЕ ВИГОРЯННЯ!", "Енергія впала до нуля. Ти заснув прямо з мишкою в руці. Керуюча помітила це через моніторинг екрану і звільнила тебе без виплати залишку. Moza CRP їде в ломбард...");
    } else if (stress >= 100) {
        endGame(false, "🤯 НЕРВОВИЙ ЗРИВ НА РОБОТІ!", "Стрес досяг 100%. Останній клієнт добив тебе питанням 'Чому не заходить депо?'. Ти розбив клавіатуру об стіл, послав Керуючу в загальний чат і гордо пішов у захід сонця. Грошей немає, гонка скасована.");
    } else if (hour >= 18) {
        let winChance = 35; 
        if (hasMoza) winChance += 45;
        if (energy > 70) winChance += 20;
        
        let isVictory = Math.floor(Math.random() * 100) < winChance;
        
        if (isVictory) {
            endGame(true, "🏆 ТОТАЛЬНИЙ ТРІУМФ СІМРЕЙСЕРА!!!", `Ти витримав цю пекельну зміну! На балансі компанії залишилось ${money}₴. А ввечері на лізі в Assetto Corsa Competizione на трасі Spa-Francorchamps ти береш ПОУЛ і впевнено виграєш гонку! Друзі в дикому захваті, Юра видалив компилятор Java зі свого ПК від шоку!`);
        } else {
            endGame(true, "🏁 Зміна закрита, але гонку злито...", `Робочий день закінчено, гроші на базі. Але на вечірньому етапі через втому ти проспав старт, а на другому колі перегазував у повороті Raidillon і розбив машину об відбійник. Потрібно купувати нові педалі Moza CRP для контролю гальм!`);
        }
    }
}

function endGame(isWin, title, desc) {
    document.getElementById('game-controls').style.display = 'none';
    document.getElementById('shop-modal').style.display = 'none';
    
    const finalScreen = document.getElementById('final-screen');
    finalScreen.style.display = 'block';
    
    const titleElem = document.getElementById('final-title');
    titleElem.innerText = title;
    titleElem.className = isWin ? 'success-text' : 'danger-text';
    
    document.getElementById('final-desc').innerHTML = `${desc}<br><br><b>Твій фінальний звіт:</b><br>💵 Зароблено: ${money}₴<br>🔋 Залишок сил: ${energy}%<br>🧠 Рівень психозу: ${stress}%`;
}

function resetGame() {
    energy = 100; stress = 0; money = 1000; hour = 9;
    hasScript = false; hasJava = false; hasMoza = false;
    logWindow.innerHTML = "Зміна розпочалась. Керуюча онлайн. Наплив клієнтів середній. Що будемо робити цю годину?";
    document.getElementById('game-controls').style.display = 'flex';
    document.getElementById('final-screen').style.display = 'none';
    updateUI();
}

updateUI();
