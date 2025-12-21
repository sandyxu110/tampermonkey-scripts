// ==UserScript==
// @name         问卷计时器
// @namespace    http://tampermonkey.net/
// @version      1.6
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

    // 创建按钮
    const btn = document.createElement('button');
    btn.innerText = '开始计时';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '99999';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '14px';
    btn.style.minWidth = '90px';
    btn.style.height = '32px';
    btn.style.textAlign = 'center';
    btn.style.opacity = '0.6';
    btn.style.background = '#000';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';

    document.body.appendChild(btn);

    // 计时状态
    let running = false;
    let elapsed = 0;
    let lastTime = 0;
    let rafId = null;

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function tick(now) {
        if (!running) return;

        elapsed += now - lastTime;
        lastTime = now;

        btn.innerText = formatTime(elapsed);
        rafId = requestAnimationFrame(tick);
    }

    btn.onclick = function () {
        if (!running) {
            running = true;
            lastTime = performance.now();
            btn.innerText = formatTime(elapsed);
            rafId = requestAnimationFrame(tick);
        } else {
            running = false;
            cancelAnimationFrame(rafId);
        }
    };

})();
