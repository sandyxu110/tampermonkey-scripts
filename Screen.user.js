// ==UserScript==
// @name         虚拟网页分辨率
// @namespace    https://tampermonkey-scripts-eun.pages.dev
// @version      1.0
// @description  随机虚拟分辨率
// @author       Sam
// @match        https://www.credamo.com/answer.html*
// @match        https://www.credamo.cc/answer.html*
// @run-at       document-start
// @updateURL    https://tampermonkey-scripts-eun.pages.dev/screen.meta.js
// @downloadURL  https://tampermonkey-scripts-eun.pages.dev/screen.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 常见屏幕配置（CSS像素）
    const profiles = [
        { width: 1920, height: 1280, dpr: 1 },
        { width: 1440, height: 900, dpr: 2 },
        { width: 1536, height: 864, dpr: 1.25 },
        { width: 1600, height: 900, dpr: 1 },
        { width: 1680, height: 1050, dpr: 1 },
        { width: 1707, height: 960, dpr: 1.5 },
        { width: 1920, height: 1080, dpr: 1 },
        { width: 1920, height: 1200, dpr: 1 },
        { width: 2560, height: 1440, dpr: 1.5 },
        { width: 1504, height: 1003, dpr: 1.5 },
        { width: 1180, height: 820, dpr: 2 }
    ];

    // 随机选择一个配置
    const fake = profiles[Math.floor(Math.random() * profiles.length)];

    // 模拟任务栏高度（Windows）
    fake.availWidth = fake.width;
    fake.availHeight = fake.height - 40;
    fake.devicePixelRatio = fake.dpr;

    function override(obj, prop, value) {
        try {
            Object.defineProperty(obj, prop, {
                get() {
                    return value;
                },
                configurable: true,
                enumerable: true
            });

            console.log(`[FakeScreen] ${prop}:`, value);
        } catch (e) {
            console.error(`[FakeScreen] ${prop} failed:`, e);
        }
    }

    // 覆盖 Screen
    override(screen, "width", fake.width);
    override(screen, "height", fake.height);
    override(screen, "availWidth", fake.availWidth);
    override(screen, "availHeight", fake.availHeight);

    // 覆盖 DPR
    override(window, "devicePixelRatio", fake.devicePixelRatio);

    console.log("%cFakeScreen Loaded", "color:green;font-weight:bold;");
    console.table({
        screenWidth: screen.width,
        screenHeight: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        devicePixelRatio: window.devicePixelRatio
    });

})();
