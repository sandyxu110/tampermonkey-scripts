// ==UserScript==
// @name         问卷计时器
// @namespace    http://tampermonkey.net/
// @version      2.3
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

    /************** 配置区 **************/
    const START_TEXTS = new Set([
        '同意，开始作答',
        'I Agree, Start Survey'
    ]);

    /************** 计时显示 **************/
    const box = document.createElement('div');
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
        pointerEvents: 'none',
        display: 'none' // ★开始前不显示
    });
    box.textContent = '00:00:00';
    document.body.appendChild(box);

    let started = false;
    let stopped = false;
    let startTime = 0;
    let rafId = null;
    let agreeBtn = null;
    let initialURL = location.href;

    function format(ms) {
        const t = Math.floor(ms / 1000);
        const h = String(Math.floor(t / 3600)).padStart(2, '0');
        const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const s = String(t % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function tick() {
        if (stopped) return;
        box.textContent = format(performance.now() - startTime);
        rafId = requestAnimationFrame(tick);
    }

    function startTimer() {
        if (started) return;
        started = true;
        startTime = performance.now();
        box.style.display = 'block';
        rafId = requestAnimationFrame(tick);
        console.log('[Timer] started');
    }

    function stopTimer(reason) {
        if (!started || stopped) return;
        stopped = true;
        cancelAnimationFrame(rafId);
        console.log('[Timer] stopped:', reason, box.textContent);
    }

    /************** 查找开始按钮（严格白名单） **************/
    function findStartButton() {
        const candidates = Array.from(
            document.querySelectorAll('button, div, a, span')
        ).filter(e => {
            if (!e.innerText) return false;
            return START_TEXTS.has(e.innerText.trim());
        });

        if (!candidates.length) return null;

        // 选面积最小的，避免命中外层容器
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

    /************** 只在“点中开始按钮矩形”时启动 **************/
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

    /************** 提交并跳转后停表（不影响“下一页”） **************/
    function checkEnd() {
        if (!started || stopped) return;

        // URL 变化 + 开始按钮不可能再出现 = 本次答题结束
        if (location.href !== initialURL && !findStartButton()) {
            stopTimer('navigation-end');
        }
    }

    setInterval(checkEnd, 500);

})();
