
(function () {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    // ====== Настройки паттерна ======
    const CIRCLE_RADIUS = 38;
    const INNER_OFFSET = 6;
    const LINE_WIDTH = 1.5;
    const CIRCLE_COLOR = 'rgba(121, 157, 171, 0.4)';

    const CONNECT_COLOR = 'rgba(121, 157, 171, 0.4)';
    const CONNECT_LINE_WIDTH = 1.5;   // толщина каждой из двух линий
    const CONNECT_GAP = 8;            // расстояние между линиями (полость)

    const MIN_NEIGHBORS = 2;
    const MAX_NEIGHBORS = 5;

    const MIN_DISTANCE = 300;
    const MAX_CONNECT_DIST = 450;
    const DENSITY_DIVISOR = 9000;
    const MAX_PLACEMENT_ATTEMPTS = 30;

    let dpr = window.devicePixelRatio || 1;

    function resizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = document.documentElement.scrollHeight; // высота всей страницы, не только экрана
    
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
    
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    
        drawPattern(w, h);
    }

    // ---- Случайная генерация точек с минимальным расстоянием (dart throwing) ----
    function generatePoints(w, h) {
        const points = [];
        const targetCount = Math.floor((w * h) / DENSITY_DIVISOR);

        const cellSize = MIN_DISTANCE;
        const gridCols = Math.ceil(w / cellSize);
        const gridRows = Math.ceil(h / cellSize);
        const grid = new Array(gridCols * gridRows);

        function gridIndex(x, y) {
            const gx = Math.floor(x / cellSize);
            const gy = Math.floor(y / cellSize);
            return { gx, gy };
        }

        function isFarEnough(x, y) {
            const { gx, gy } = gridIndex(x, y);
            for (let ny = gy - 2; ny <= gy + 2; ny++) {
                for (let nx = gx - 2; nx <= gx + 2; nx++) {
                    if (nx < 0 || ny < 0 || nx >= gridCols || ny >= gridRows) continue;
                    const cell = grid[ny * gridCols + nx];
                    if (!cell) continue;
                    for (const p of cell) {
                        const dx = p.x - x;
                        const dy = p.y - y;
                        if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        function addPoint(x, y) {
            points.push({ x, y });
            const { gx, gy } = gridIndex(x, y);
            const key = gy * gridCols + gx;
            if (!grid[key]) grid[key] = [];
            grid[key].push({ x, y });
        }

        let attempts = 0;
        const maxTotalAttempts = targetCount * MAX_PLACEMENT_ATTEMPTS;

        while (points.length < targetCount && attempts < maxTotalAttempts) {
            const x = Math.random() * w;
            const y = Math.random() * h;

            if (isFarEnough(x, y)) {
                addPoint(x, y);
            }
            attempts++;
        }

        return points;
    }

    // ---- Поиск N ближайших соседей ----
    function findNearestNeighbors(points, index, count) {
        const p = points[index];
        const distances = [];

        for (let i = 0; i < points.length; i++) {
            if (i === index) continue;
            const other = points[i];
            const dx = other.x - p.x;
            const dy = other.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= MAX_CONNECT_DIST) {
                distances.push({ index: i, dist });
            }
        }

        distances.sort((a, b) => a.dist - b.dist);
        return distances.slice(0, count).map(d => d.index);
    }

    // ---- Построение уникальных связей ----
    function buildConnections(points) {
        const connections = new Set();

        for (let i = 0; i < points.length; i++) {
            const neighborCount = MIN_NEIGHBORS +
                Math.floor(Math.random() * (MAX_NEIGHBORS - MIN_NEIGHBORS + 1));

            const neighbors = findNearestNeighbors(points, i, neighborCount);

            neighbors.forEach(j => {
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                connections.add(key);
            });
        }

        return Array.from(connections).map(key => {
            const [a, b] = key.split('-').map(Number);
            return { a, b };
        });
    }

    function drawCircle(cx, cy) {
        ctx.beginPath();
        ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, CIRCLE_RADIUS - INNER_OFFSET, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ---- Рисуем "полую" толстую линию между краями двух кругов ----
    function drawHollowConnection(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // если круги слишком близко/накладываются — не рисуем
        if (dist <= CIRCLE_RADIUS * 2) return;

        const ux = dx / dist; // единичный вектор направления
        const uy = dy / dist;

        // обрезаем отрезок до краёв окружностей
        const startX = p1.x + ux * CIRCLE_RADIUS;
        const startY = p1.y + uy * CIRCLE_RADIUS;
        const endX = p2.x - ux * CIRCLE_RADIUS;
        const endY = p2.y - uy * CIRCLE_RADIUS;

        // перпендикулярный вектор для смещения двух линий (эффект "полой" трубы)
        const px = -uy;
        const py = ux;
        const offset = CONNECT_GAP / 2;

        ctx.beginPath();
        ctx.moveTo(startX + px * offset, startY + py * offset);
        ctx.lineTo(endX + px * offset, endY + py * offset);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(startX - px * offset, startY - py * offset);
        ctx.lineTo(endX - px * offset, endY - py * offset);
        ctx.stroke();
    }

    function drawPattern(w, h) {
        ctx.clearRect(0, 0, w, h);

        const points = generatePoints(w, h);
        const connections = buildConnections(points);

        ctx.strokeStyle = CONNECT_COLOR;
        ctx.lineWidth = CONNECT_LINE_WIDTH;
        connections.forEach(({ a, b }) => {
            drawHollowConnection(points[a], points[b]);
        });

        ctx.strokeStyle = CIRCLE_COLOR;
        ctx.lineWidth = LINE_WIDTH;
        points.forEach(p => drawCircle(p.x, p.y));
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
})();




    (function () {
    "use strict";


    var CONFIG = {
        chatText: "Contact Us",
        chatHref: "contact.html#message",

        callLabel: "Call Us",
        phoneText: "+31 612345678",
        phoneHref: "tel:+ 31 612345678",

    };

    var STORAGE_KEY = "callWidgetClosed";
    var SMALL_SCREEN = 600; 


    var ICON_CHAT =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>' +
        '<circle cx="8" cy="10.5" r="0.6"/><circle cx="12" cy="10.5" r="0.6"/><circle cx="16" cy="10.5" r="0.6"/>' +
        '</svg>';

    var ICON_PHONE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 ' +
        '19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 ' +
        '2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 ' +
        '12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

    var ICON_CLOSE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';


    var widget = document.createElement("aside");
    widget.className = "call-widget";
    widget.setAttribute("aria-label", "Contact options");
    widget.innerHTML =
        '<button type="button" class="call-widget__close" aria-label="Close">' + ICON_CLOSE + '</button>' +

        '<a href="' + CONFIG.chatHref + '" class="call-widget__chat">' +
            ICON_CHAT + '<span>' + CONFIG.chatText + '</span>' +
        '</a>' +

        '<div class="call-widget__call">' +
            '<span class="call-widget__label">' + ICON_PHONE + CONFIG.callLabel + '</span>' +
            '<a href="' + CONFIG.phoneHref + '" class="call-widget__number">' + CONFIG.phoneText + '</a>' +
        '</div>' 

    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "call-tab";
    tab.setAttribute("aria-label", "Open contact options");
    tab.innerHTML = ICON_PHONE;

    var closeBtn = widget.querySelector(".call-widget__close");


    /* ---------- Состояние ---------- */
    function readStored() {
        try {
            var v = sessionStorage.getItem(STORAGE_KEY);
            return v === null ? null : v === "1";
        } catch (e) {
            return null;
        }
    }

    function store(closed) {
        try {
            sessionStorage.setItem(STORAGE_KEY, closed ? "1" : "0");
        } catch (e) { /* хранилище недоступно — не страшно */ }
    }

    function setClosed(closed) {
        widget.hidden = closed;
        tab.hidden = !closed;
    }

    closeBtn.addEventListener("click", function () {
        setClosed(true);
        store(true);
        tab.focus();
    });

    tab.addEventListener("click", function () {
        setClosed(false);
        store(false);
        closeBtn.focus();
    });

    widget.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            setClosed(true);
            store(true);
            tab.focus();
        }
    });

    document.body.appendChild(widget);
    document.body.appendChild(tab);

    var stored = readStored();
    setClosed(stored !== null ? stored : window.innerWidth < SMALL_SCREEN);
})();




(function () {
    const viewport = document.getElementById('reviews-viewport');
    if (!viewport) return;

    const slider = viewport.closest('.reviews__slider');
    const prev = slider.querySelector('.reviews__btn--prev');
    const next = slider.querySelector('.reviews__btn--next');
    const cards = Array.from(viewport.querySelectorAll('.review'));
    const n = cards.length;
    const half = Math.floor(n / 2);
    let active = 0;

    function ringPos(i) {
        // позиция по кругу: от -half до n-half-1
        return ((i - active + half) % n + n) % n - half;
    }

    function apply(card, o, hidden) {
        card.style.setProperty('--o', o);
        card.classList.toggle('is-active', o === 0);
        card.classList.toggle('is-hidden', hidden);
        card.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }

    function render(dir) {
        const pending = [];

        // 1. Карточки, которые должны въехать с «невидимой» стороны,
        //    сначала без анимации ставим за край
        cards.forEach((card, i) => {
            const o = ringPos(i);
            const old = card.dataset.o === undefined ? null : Number(card.dataset.o);
            const hidden = Math.abs(o) > 1;

            if (old === null) {                       // первый запуск
                card.dataset.o = o;
                apply(card, o, hidden);
            } else if (Math.abs(o - old) <= 1) {      // обычный сдвиг
                pending.push(() => { card.dataset.o = o; apply(card, o, hidden); });
            } else if (!hidden) {                     // карточка въезжает с края
                card.classList.add('no-anim');
                apply(card, o + dir, true);
                pending.push(() => {
                    card.classList.remove('no-anim');
                    card.dataset.o = o;
                    apply(card, o, false);
                });
            } else {                                  // карточка уезжает и скрывается
                pending.push(() => {
                    card.dataset.o = o;
                    apply(card, old - dir, true);
                });
            }
        });

        // 2. Применяем стили без transition
        void viewport.offsetWidth;

        // 3. Запускаем анимацию
        pending.forEach((fn) => fn());
    }

    function go(dir) {
        active = (active + dir + n) % n;
        render(dir);
    }

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));

    // Клик по боковой карточке переключает на неё
    cards.forEach((card) => {
        card.addEventListener('click', () => {
            const o = Number(card.dataset.o);
            if (o === -1) go(-1);
            if (o === 1) go(1);
        });
    });

    // Стрелки клавиатуры
    viewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });

    // Свайп на телефоне
    let startX = null;
    viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    viewport.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });

    render(1);
})();


(function () {
    function normalize(path) {
        var name = path.split('?')[0].split('#')[0].split('/').pop();
        if (!name) name = 'index';               // адрес вида https://site/ → главная
        return name.replace(/\.html?$/i, '').toLowerCase();   // products.html и /products — одно и то же
    }
 
    var current = normalize(location.pathname);
 
    document.querySelectorAll('.nav a').forEach(function (link) {
        var href = link.getAttribute('href') || '';
 
        // ссылки-якоря (#reviews, index.html#reviews) не считаем «текущей страницей»
        var isCurrent = href.indexOf('#') === -1 && normalize(href) === current;
 
        link.classList.toggle('is-current', isCurrent);
        if (isCurrent) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
})();
 