// ==UserScript==
// @name         Credamo 粘贴助手
// @namespace    https://tampermonkey-scripts-eun.pages.dev
// @version      2.0
// @description  粘贴内容到文本框
// @author       feng + Codex
// @match        https://www.credamo.com/answer.html*
// @match        https://www.credamo.cc/answer.html*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/en_paste.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/en_paste.user.js
// @grant        none
// ==/UserScript==


(function () {
  'use strict';
//主要解除：禁止选中、禁止右键、禁止复制/剪切/粘贴
  const lockedEvents = new Set([
    'selectstart',
    'selectionchange',
    'copy',
    'cut',
    'paste',
    'contextmenu',
    'dragstart',
  ]);

  const keyboardEvents = new Set(['keydown', 'keypress', 'keyup']);

  const styleText = `
    * {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }

    input,
    textarea,
    [contenteditable=""],
    [contenteditable="true"] {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;

  function addUnlockStyle() {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(styleText);
      return;
    }

    const style = document.createElement('style');
    style.textContent = styleText;
    (document.head || document.documentElement).appendChild(style);
  }

  function isClipboardShortcut(event) {
    const key = String(event.key || '').toLowerCase();
    return (event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(key);
  }

  function letBrowserHandle(event) {
    if (lockedEvents.has(event.type)) {
      event.stopImmediatePropagation();
      return;
    }

    if (keyboardEvents.has(event.type) && isClipboardShortcut(event)) {
      event.stopImmediatePropagation();
    }
  }

  function clearInlineLocks(root) {
    const targets = [document, document.documentElement, document.body, root].filter(Boolean);

    for (const target of targets) {
      target.onselectstart = null;
      target.oncopy = null;
      target.oncut = null;
      target.onpaste = null;
      target.oncontextmenu = null;
      target.ondragstart = null;
      target.onkeydown = null;
      target.onkeypress = null;
      target.onkeyup = null;
    }

    if (root && root.querySelectorAll) {
      root.querySelectorAll('[onselectstart], [oncopy], [oncut], [onpaste], [oncontextmenu], [ondragstart], [onkeydown], [onkeypress], [onkeyup]')
        .forEach((node) => {
          node.removeAttribute('onselectstart');
          node.removeAttribute('oncopy');
          node.removeAttribute('oncut');
          node.removeAttribute('onpaste');
          node.removeAttribute('oncontextmenu');
          node.removeAttribute('ondragstart');
          node.removeAttribute('onkeydown');
          node.removeAttribute('onkeypress');
          node.removeAttribute('onkeyup');
        });
    }
  }

  function installCaptureGuards() {
    const eventNames = [...lockedEvents, ...keyboardEvents];

    for (const eventName of eventNames) {
      window.addEventListener(eventName, letBrowserHandle, true);
      document.addEventListener(eventName, letBrowserHandle, true);
    }
  }

  function installMutationCleaner() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          clearInlineLocks(mutation.target);
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            clearInlineLocks(node);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'onselectstart',
        'oncopy',
        'oncut',
        'onpaste',
        'oncontextmenu',
        'ondragstart',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'style',
      ],
    });
  }

  installCaptureGuards();

  if (document.documentElement) {
    addUnlockStyle();
    clearInlineLocks(document.documentElement);
    installMutationCleaner();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      addUnlockStyle();
      clearInlineLocks(document.documentElement);
      installMutationCleaner();
    }, { once: true });
  }

  // ✅ 拦截 fullscreenchange 事件传播（捕获阶段）
    document.addEventListener('fullscreenchange', event => {
        event.stopImmediatePropagation();
        console.warn('fullscreenchange 事件已拦截');
    }, true);

    document.addEventListener('webkitfullscreenchange', event => {
        event.stopImmediatePropagation();
        console.warn('webkitfullscreenchange 事件已拦截');
    }, true);
})();
