// ==UserScript==
// @name         Credamo 粘贴助手
// @namespace    https://tampermonkey-scripts-eun.pages.dev
// @version      2.1
// @description  解除复制粘贴限制
// @author       feng + Codex
// @match        https://www.credamo.com/answer.html*
// @match        https://www.credamo.cc/answer.html*
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/en_paste.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/en_paste.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

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

  function isTextInput(node) {
    if (!(node instanceof HTMLInputElement)) {
      return false;
    }

    const type = String(node.type || 'text').toLowerCase();
    return ![
      'button',
      'checkbox',
      'color',
      'file',
      'hidden',
      'image',
      'radio',
      'range',
      'reset',
      'submit',
    ].includes(type);
  }

  function isEditable(node) {
    return node instanceof HTMLTextAreaElement ||
      isTextInput(node) ||
      (node instanceof HTMLElement && node.isContentEditable);
  }

  function findEditableTarget(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const target = [...path, event.target, document.activeElement].find((node) => {
      return isEditable(node) && !node.disabled && !node.readOnly;
    });

    return target || null;
  }

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const ownDescriptor = Object.getOwnPropertyDescriptor(element, 'value');
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    const setter = prototypeDescriptor && prototypeDescriptor.set;

    if (setter && (!ownDescriptor || ownDescriptor.set !== setter)) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
  }

  function dispatchEditEvents(element, text) {
    void text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function insertIntoFormControl(element, text) {
    const start = Number.isInteger(element.selectionStart) ? element.selectionStart : element.value.length;
    const end = Number.isInteger(element.selectionEnd) ? element.selectionEnd : start;
    const nextValue = element.value.slice(0, start) + text + element.value.slice(end);
    const nextCursor = start + text.length;

    if (element.maxLength > -1) {
      element.removeAttribute('maxlength');
    }

    element.focus();
    setNativeValue(element, nextValue);

    if (typeof element.setSelectionRange === 'function') {
      element.setSelectionRange(nextCursor, nextCursor);
    }

    dispatchEditEvents(element, text);
  }

  function insertIntoContentEditable(element, text) {
    element.focus();

    const selection = window.getSelection();
    if (!selection) {
      element.textContent += text;
      dispatchEditEvents(element, text);
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();
    if (selection.rangeCount === 0) {
      range.selectNodeContents(element);
      range.collapse(false);
    }

    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    dispatchEditEvents(element, text);
  }

  function handlePaste(event) {
    const text = event.clipboardData && event.clipboardData.getData('text/plain');
    const target = findEditableTarget(event);

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!text || !target) {
      return;
    }

    if (target instanceof HTMLTextAreaElement || isTextInput(target)) {
      insertIntoFormControl(target, text);
      return;
    }

    insertIntoContentEditable(target, text);
  }

  function letBrowserHandle(event) {
    if (event.type === 'paste') {
      handlePaste(event);
      return;
    }

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
          node.removeAttribute('maxlength');
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
