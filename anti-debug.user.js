// ==UserScript==
// @name         Disable Debugger Protection
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Bypass debugger and redirection protection
// @author       Sam.xu
// @match        *://*/*
// @run-at       document-start
// @sandbox      raw
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/anti-debug.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/anti-debug.user.js
// @grant        none
// ==/UserScript==

(() => {
  console.info("[调试辅助] 已加载", location.href);

  const originalSetInterval = window.setInterval;

  window.setInterval = function (callback, delay, ...args) {
    let source = "";

    try {
      source = typeof callback === "function"
        ? Function.prototype.toString.call(callback)
        : String(callback);
    } catch {}

    const isDebugTrap =
      /\bdebugger\b/.test(source) &&
      /performance\.now\s*\(/.test(source) &&
      /about:blank/.test(source);

    if (isDebugTrap) {
      console.info("[调试辅助] 已拦截反调试定时器");
      return 0;
    }

    return originalSetInterval.call(this, callback, delay, ...args);
  };
})();
