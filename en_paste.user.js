// ==UserScript==
// @name         Credamo 粘贴助手
// @namespace    https://tampermonkey-scripts-eun.pages.dev
// @version      1.7
// @description  仅在页面存在 <input type="text"> 时显示按钮，粘贴内容到文本框
// @author       feng + Copilot
// @match        https://www.credamo.com/answer.html*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/en_paste.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/en_paste.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let lastFocusedInput = null;

    // 精确监听 <input type="text"> 和 <textarea> 的 focus 事件
    const trackFocus = () => {
        document.querySelectorAll('input[type="text"]:not([readonly]), textarea').forEach(el => {
            el.addEventListener('focus', () => {
                lastFocusedInput = el;
            });
        });
    };

    // 创建按钮
    const btn = document.createElement('button');
    btn.textContent = '点击粘贴';
    btn.id = 'copilotPasteBtn';
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px 20px';
    btn.style.background = '#007bff'; // 蓝色
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    btn.style.display = 'none'; // 初始隐藏

    // 点击事件：粘贴到最后聚焦的输入框
    btn.onclick = () => {
        if (lastFocusedInput) {
            const text = prompt('请粘贴你的内容：');
            if (text !== null) {
                lastFocusedInput.value = text;
                lastFocusedInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        } else {
            alert('请先点击一个文本输入框使其获得焦点');
        }
    };

    document.body.appendChild(btn);

    // 检查是否存在有效输入框并显示按钮
    const checkInputs = () => {
        const hasTextInput = document.querySelector('input[type="text"]:not([readonly]), textarea');
        btn.style.display = hasTextInput ? 'block' : 'none';
        if (hasTextInput) trackFocus();
    };

    // 初始检查
    checkInputs();

    // 监听 DOM 变化（适用于 SPA 问卷加载）
    const observer = new MutationObserver(checkInputs);
    observer.observe(document.body, { childList: true, subtree: true });
})();
