// ==UserScript==
// @name         问卷计时器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  开始和结束时点击可统计所用时长
// @match           *://www.credamo.cc/answer*
// @match           *://www.credamo.com/answer*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/time.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/time.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let firstClickTime = null; // 记录第一次点击时间

    // 创建按钮
    const btn = document.createElement('button');
    btn.innerText = '显示时间';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '99999';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '14px';
    btn.style.opacity = '0.6'; // 半透明
    btn.style.background = '#000';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';

    // 格式化 HH:mm:ss
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    // 点击逻辑
    btn.onclick = function () {
        const now = new Date();

        // 第一次点击
        if (!firstClickTime) {
            firstClickTime = now;
            btn.innerText = formatTime(0); // 也可以显示当前时间
            btn.innerText = [
                String(now.getHours()).padStart(2, '0'),
                String(now.getMinutes()).padStart(2, '0'),
                String(now.getSeconds()).padStart(2, '0')
            ].join(':');
        } else {
            // 后续点击：显示时间差
            const diff = now - firstClickTime;
            btn.innerText = formatTime(diff);
        }
    };

    document.body.appendChild(btn);
})();
