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
    let agreeGoneAt = 0;

    const STOP_GUARD_MS = 120;

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
    }

    function stopTimer(reason) {
        if (!started || stopped) return;
        if (performance.now() - startTime < STOP_GUARD_MS) return;
        stopped = true;
        cancelAnimationFrame(rafId);
        box.textContent = format(performance.now() - startTime);
        console.log('[Timer] stopped:', reason);
    }

    /* ================= 找开始按钮 ================= */
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

    /* ================= 点击开始 ================= */
    document.addEventListener('pointerdown', e => {
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

    /* ================= 判断开始按钮消失 ================= */
    new MutationObserver(() => {
        if (started && !agreeBtn) {
            agreeGoneAt ||= performance.now();
        }
    }).observe(document.body, { childList: true, subtree: true });

    /* ================= SPA 路由变化 ================= */
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
        if (!started || stopped) return;

        // ✅ 关键条件：开始按钮已消失
        if (!agreeBtn && location.href !== lastURL) {
            lastURL = location.href;
            stopTimer('route+agreeGone');
        }
    });

    /* ================= 页面不可见 / 真跳转兜底 ================= */
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            stopTimer('visibilitychange');
        }
    });

})();
