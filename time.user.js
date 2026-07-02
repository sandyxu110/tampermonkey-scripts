// ==UserScript==
// @name         问卷计时器
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  网页计时器，自动计时，见数专用
// @author       Sam.f.xu
// @match           *://www.credamo.cc/answer*
// @match           *://www.credamo.com/answer*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/time.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/time.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const START_TEXTS = new Set([
        '同意，开始作答',
        'I Agree, Start Survey'
    ]);

    /************** 显示框 **************/
    const box = document.createElement('div');

 Object.assign(box.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: '99999',
    padding: '4px 10px',
    fontSize: '14px',
    fontFamily: 'Consolas, monospace',
    lineHeight: '1.2',
    background: '#000',
    color: '#fff',
    borderRadius: '5px',
    opacity: '0.75',
    pointerEvents: 'none',
    display: 'none',
    whiteSpace: 'pre'
 });

    box.textContent = "⚡ 00:00:00\n🕒 00:00:00";
    document.body.appendChild(box);

    let started = false;
    let stopped = false;

    let startDate = 0;
    let startPerf = 0;

    let rafId = null;
    let agreeBtn = null;
    const initialURL = location.href;

    function format(ms) {
        const t = Math.floor(ms / 1000);

        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(t % 60).padStart(2, '0');

        return `${h}:${m}:${s}`;
    }

    function tick() {

        if (stopped) return;

        const fast = format(Date.now() - startDate);
        const real = format(performance.now() - startPerf);

        box.textContent =
            `⚡ ${fast}\n🕒 ${real}`;

        rafId = requestAnimationFrame(tick);
    }

    function startTimer() {

        if (started) return;

        started = true;

        startDate = Date.now();
        startPerf = performance.now();

        box.style.display = 'block';

        rafId = requestAnimationFrame(tick);

        console.log('[Timer] started');
    }

    function stopTimer(reason) {

        if (!started || stopped) return;

        stopped = true;

        cancelAnimationFrame(rafId);

        console.log('[Timer] stopped:', reason);
        console.log(box.textContent);
    }

    function findStartButton() {

        const candidates = Array.from(
            document.querySelectorAll('button, div, a, span')
        ).filter(e => {

            if (!e.innerText) return false;

            return START_TEXTS.has(e.innerText.trim());

        });

        if (!candidates.length) return null;

        return candidates.sort((a, b) => {

            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();

            return (ra.width * ra.height) - (rb.width * rb.height);

        })[0];
    }

    agreeBtn = findStartButton();

    const observer = new MutationObserver(() => {

        if (!agreeBtn) {
            agreeBtn = findStartButton();
        }

    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    document.addEventListener('pointerdown', (e) => {

        if (started) return;
        if (!e.isTrusted) return;
        if (!agreeBtn) return;

        const r = agreeBtn.getBoundingClientRect();

        if (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
        ) {
            startTimer();
        }

    }, true);

    function checkEnd() {

        if (!started || stopped) return;

        if (
            location.href !== initialURL &&
            !findStartButton()
        ) {
            stopTimer('navigation-end');
        }

    }

    setInterval(checkEnd, 500);

})();
