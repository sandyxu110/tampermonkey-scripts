// ==UserScript==
// @name         Credamo 粘贴助手
// @namespace    https://tampermonkey-scripts-eun.pages.dev
// @version      2.2
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
    'beforeinput',
    'contextmenu',
    'dragstart',
  ]);

  const keyboardEvents = new Set(['keydown', 'keypress', 'keyup']);
  let lastEditableTarget = null;
  let pastePanel = null;

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

    #credamo-unlock-paste-button {
      position: fixed !important;
      right: 12px !important;
      bottom: 84px !important;
      z-index: 2147483647 !important;
      width: 58px !important;
      height: 40px !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: #1463ff !important;
      color: #fff !important;
      font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28) !important;
      display: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }

    #credamo-unlock-paste-panel {
      position: fixed !important;
      inset: auto 10px 10px 10px !important;
      z-index: 2147483647 !important;
      padding: 10px !important;
      border-radius: 8px !important;
      background: #fff !important;
      color: #111 !important;
      box-shadow: 0 10px 34px rgba(0, 0, 0, 0.34) !important;
      display: none !important;
      font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }

    #credamo-unlock-paste-panel textarea {
      box-sizing: border-box !important;
      display: block !important;
      width: 100% !important;
      height: 112px !important;
      margin: 0 0 8px !important;
      padding: 8px !important;
      border: 1px solid #bbb !important;
      border-radius: 6px !important;
      color: #111 !important;
      background: #fff !important;
      font: 16px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      -webkit-user-select: text !important;
      user-select: text !important;
    }

    #credamo-unlock-paste-panel .credamo-unlock-actions {
      display: flex !important;
      gap: 8px !important;
      justify-content: flex-end !important;
    }

    #credamo-unlock-paste-panel button {
      min-width: 72px !important;
      height: 36px !important;
      border: 0 !important;
      border-radius: 6px !important;
      font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }

    #credamo-unlock-paste-cancel {
      background: #e8e8e8 !important;
      color: #111 !important;
    }

    #credamo-unlock-paste-insert {
      background: #1463ff !important;
      color: #fff !important;
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

  function isScriptUi(node) {
    return node instanceof HTMLElement &&
      Boolean(node.closest('#credamo-unlock-paste-button, #credamo-unlock-paste-panel'));
  }

  function rememberEditableTarget(node) {
    if (isEditable(node) && !node.disabled && !node.readOnly && !isScriptUi(node)) {
      lastEditableTarget = node;
      showPasteButton();
    }
  }

  function findEditableTarget(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const target = [...path, event.target, document.activeElement].find((node) => {
      return isEditable(node) && !node.disabled && !node.readOnly && !isScriptUi(node);
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

  function insertIntoTarget(target, text) {
    if (!target || !text) {
      return;
    }

    if (target instanceof HTMLTextAreaElement || isTextInput(target)) {
      insertIntoFormControl(target, text);
      return;
    }

    insertIntoContentEditable(target, text);
  }

  function handlePaste(event) {
    const text = event.clipboardData && event.clipboardData.getData('text/plain');
    const target = findEditableTarget(event);

    event.preventDefault();
    event.stopImmediatePropagation();

    insertIntoTarget(target, text);
  }

  function handleBeforeInput(event) {
    if (event.inputType !== 'insertFromPaste') {
      return false;
    }

    const dataTransferText = event.dataTransfer && event.dataTransfer.getData('text/plain');
    const text = dataTransferText || event.data || '';
    const target = findEditableTarget(event);

    if (!text || !target) {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    insertIntoTarget(target, text);
    return true;
  }

  function letBrowserHandle(event) {
    if (isScriptUi(event.target)) {
      event.stopImmediatePropagation();
      return;
    }

    if (event.type === 'beforeinput' && handleBeforeInput(event)) {
      return;
    }

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

  function showPasteButton() {
    const button = document.getElementById('credamo-unlock-paste-button');
    if (button) {
      button.style.display = 'block';
    }
  }

  function hidePastePanel() {
    const panel = document.getElementById('credamo-unlock-paste-panel');
    if (!panel) {
      return;
    }

    panel.style.display = 'none';
    const textarea = panel.querySelector('textarea');
    if (textarea) {
      textarea.value = '';
    }
  }

  function openPastePanel() {
    if (!lastEditableTarget || !document.documentElement.contains(lastEditableTarget)) {
      rememberEditableTarget(document.activeElement);
    }

    const panel = document.getElementById('credamo-unlock-paste-panel');
    const textarea = panel && panel.querySelector('textarea');
    if (!panel || !textarea) {
      return;
    }

    panel.style.display = 'block';
    textarea.value = '';
    textarea.focus();
  }

  function stopPanelEvent(event) {
    event.stopPropagation();
  }

  function installMobilePastePanel() {
    if (document.getElementById('credamo-unlock-paste-button')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'credamo-unlock-paste-button';
    button.type = 'button';
    button.textContent = 'Paste';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPastePanel();
    });

    pastePanel = document.createElement('div');
    pastePanel.id = 'credamo-unlock-paste-panel';
    pastePanel.innerHTML = [
      '<textarea autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste text here"></textarea>',
      '<div class="credamo-unlock-actions">',
      '<button id="credamo-unlock-paste-cancel" type="button">Cancel</button>',
      '<button id="credamo-unlock-paste-insert" type="button">Insert</button>',
      '</div>',
    ].join('');

    ['paste', 'beforeinput', 'input', 'keydown', 'keyup', 'keypress', 'touchstart', 'touchend', 'click']
      .forEach((eventName) => {
        pastePanel.addEventListener(eventName, stopPanelEvent, true);
        button.addEventListener(eventName, stopPanelEvent, true);
      });

    pastePanel.querySelector('#credamo-unlock-paste-cancel').addEventListener('click', (event) => {
      event.preventDefault();
      hidePastePanel();
    });

    pastePanel.querySelector('#credamo-unlock-paste-insert').addEventListener('click', (event) => {
      event.preventDefault();
      const textarea = pastePanel.querySelector('textarea');
      const text = textarea ? textarea.value : '';
      hidePastePanel();
      insertIntoTarget(lastEditableTarget, text);
    });

    document.documentElement.appendChild(button);
    document.documentElement.appendChild(pastePanel);
    document.addEventListener('focusin', (event) => rememberEditableTarget(event.target), true);
    document.addEventListener('touchstart', (event) => rememberEditableTarget(event.target), true);
    document.addEventListener('mousedown', (event) => rememberEditableTarget(event.target), true);
  }

  function clearInlineLocks(root) {
    const targets = [document, document.documentElement, document.body, root].filter(Boolean);

    for (const target of targets) {
      target.onselectstart = null;
      target.oncopy = null;
      target.oncut = null;
      target.onpaste = null;
      target.onbeforeinput = null;
      target.oncontextmenu = null;
      target.ondragstart = null;
      target.onkeydown = null;
      target.onkeypress = null;
      target.onkeyup = null;
    }

    if (root && root.querySelectorAll) {
      root.querySelectorAll('[onselectstart], [oncopy], [oncut], [onpaste], [onbeforeinput], [oncontextmenu], [ondragstart], [onkeydown], [onkeypress], [onkeyup]')
        .forEach((node) => {
          node.removeAttribute('onselectstart');
          node.removeAttribute('oncopy');
          node.removeAttribute('oncut');
          node.removeAttribute('onpaste');
          node.removeAttribute('onbeforeinput');
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
        'onbeforeinput',
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
    installMobilePastePanel();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      addUnlockStyle();
      clearInlineLocks(document.documentElement);
      installMutationCleaner();
      installMobilePastePanel();
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
