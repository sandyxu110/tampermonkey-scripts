// ==UserScript==
// @name         问卷计时器
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  网页计时器，不受加速器影响
// @author       Sam.f.xu
// @match           *://www.credamo.cc/answer*
// @match           *://www.credamo.com/answer*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/time.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/time.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* ================= 状态 ================= */
    let box = null;
    let started = false;
    let stopped = false;
    let startTime = 0;
    let rafId = null;
    let agreeBtn = null;
    let lastURL = location.href;

    /* ================= 工具 ================= */
    function format(ms) {
        const t = Math.floor(ms / 1000);
        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(t % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function createBox() {
        if (box) return;
        box = document.createElement('div');
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
    }

    function tick() {
        if (stopped) return;
        box.textContent = format(performance.now() - startTime);
        rafId = requestAnimationFrame(tick);
    }

    function startTimer() {
        if (started) return;
        started = true;
        createBox();
        startTime = performance.now();
        rafId = requestAnimationFrame(tick);
        console.log('[Timer] started');
    }

    function stopTimer(reason) {
        if (!started || stopped) return;
        stopped = true;
        cancelAnimationFrame(rafId);
        box.textContent = format(performance.now() - startTime);
        console.log('[Timer] stopped:', reason);
    }

    /* ================= 找“开始作答”按钮 ================= */
    function findAgreeBtn() {
        const list = Array.from(
            document.querySelectorAll('button, div, a, span')
        ).filter(e => e.innerText && e.innerText.trim() === '同意，开始作答');

        agreeBtn = list.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return (ra.width * ra.height) - (rb.width * rb.height);
        })[0];

        return agreeBtn;
    }

    findAgreeBtn();
    new MutationObserver(findAgreeBtn)
        .observe(document.body, { childList: true, subtree: true });

    /* ================= 严格矩形命中 → 开始 ================= */
    document.addEventListener('pointerdown', (e) => {
        if (!e.isTrusted || started || !agreeBtn) return;

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

    /* ================= 停表：SPA / 跳转 / 切页 ================= */

    // 1️⃣ 页面不可见（很多 SPA 提交后会触发）
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            stopTimer('visibilitychange');
        }
    });

    // 2️⃣ URL 发生变化（SPA 路由）
    (function () {
        const wrap = fn => function () {
            const r = fn.apply(this, arguments);
            window.dispatchEvent(new Event('locationchange'));
            return r;
        };
        history.pushState = wrap(history.pushState);
        history.replaceState = wrap(history.replaceState);
        window.addEventListener('popstate', () => {
            window.dispatchEvent(new Event('locationchange'));
        });
    })();

    window.addEventListener('locationchange', () => {
        if (location.href !== lastURL) {
            lastURL = location.href;
            stopTimer('locationchange');
        }
    });

})();
