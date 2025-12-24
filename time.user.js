// ==UserScript==
// @name         问卷计时器
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  网页计时器，不受加速器影响，自动计时
// @author       Sam.f.xu
// @match           *://www.credamo.cc/answer*
// @match           *://www.credamo.com/answer*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/time.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/time.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* ===== 悬浮计时 ===== */
    const box = document.createElement('div');
    box.textContent = '00:00:00';
    Object.assign(box.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: '99999',
        padding: '6px 12px',
        fontSize: '14px',
        background: '#000',
        color: '#fff',
        borderRadius: '4px',
        opacity: '0.7',
        pointerEvents: 'none'
    });
    document.body.appendChild(box);

    let started = false;
    let startTime = 0;
    let agreeBtn = null;

    function format(ms) {
        const t = Math.floor(ms / 1000);
        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(t % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function tick() {
        box.textContent = format(performance.now() - startTime);
        requestAnimationFrame(tick);
    }

    function startTimer() {
        if (started) return;
        started = true;
        startTime = performance.now();
        requestAnimationFrame(tick);
        console.log('[Timer] started');
    }

    /* ===== 找“真正的按钮元素”（文本最小的那个）===== */
    function findButton() {
        const candidates = Array.from(document.querySelectorAll('button, div, a, span'))
            .filter(e => e.innerText && e.innerText.trim() === '同意，开始作答');

        // 选“面积最小”的那个（通常才是真按钮）
        agreeBtn = candidates.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return (ra.width * ra.height) - (rb.width * rb.height);
        })[0];

        return agreeBtn;
    }

    findButton();

    const observer = new MutationObserver(() => {
        if (findButton()) observer.disconnect();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    /* ===== 全局监听：严格基于矩形 ===== */
    document.addEventListener('pointerdown', (e) => {
        if (started) return;
        if (!e.isTrusted) return;
        if (!agreeBtn) return;

        const r = agreeBtn.getBoundingClientRect();

        const x = e.clientX;
        const y = e.clientY;

        const inside =
            x >= r.left &&
            x <= r.right &&
            y >= r.top &&
            y <= r.bottom;

        if (inside) {
            startTimer();
        }
    }, true);

})();
