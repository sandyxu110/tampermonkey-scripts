// ==UserScript==
// @name         右上角点击显示系统时间
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  右上角半透明按钮，点击才显示系统时间 HH:mm:ss
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
    btn.innerText = '显示时间';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '99999';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '14px';
    btn.style.opacity = '0.6';
    btn.style.background = '#000';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';

    // 时间格式 HH:mm:ss
    function formatTime(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    // 点击才显示一次时间
    btn.onclick = function () {
        btn.innerText = formatTime(new Date());
        btn.style.cursor = 'default';
    };

    document.body.appendChild(btn);
})();
