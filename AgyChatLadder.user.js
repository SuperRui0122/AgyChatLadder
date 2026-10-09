// ==UserScript==
// @name         AgyChatLadder (对话天梯)
// @namespace    https://github.com/SuperRui0122/AgyChatLadder
// @version      1.2.0
// @description  Antigravity 专属长对话微型时间轴与四级天梯导航引擎（支持叠层 ^ 图标、智能悬停预览与多分屏）
// @author       SuperRui0122
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * AgyChatLadder (对话天梯) - v1.2.0
 * Antigravity 专属长对话微型时间轴与四级天梯导航引擎（支持叠层 ^ 图标、智能悬停预览与多分屏）
 * GitHub: https://github.com/SuperRui0122/AgyChatLadder
 * 
 * - 图标规范: 登顶首提为上下双重 ^ 叠层, 上一问为单 ^, 下一问为单 v, 触底最新为双重 v 叠层
 * - 智能悬停: 鼠标悬停踏板圆点展示第 N 问与提问摘要预览；悬停按键展示功能说明；无遮挡轻量弹出
 * - 多分屏感知: 自动识别左右/上下分屏视口，各自独立挂载专属天梯与滚动控制器
 * - 原生隔离容器 offsetTop 毫秒级原生平滑滚动
 * - 静态常亮翠绿踏板圆点，无闪烁
 */
(function () {
  'use strict';

  function initLadderSystem() {
    try {
      const targetBody = document.body || document.documentElement;
      if (!targetBody) return false;

      // 1. 清理历史遗留全局旧实例
      const oldFixed = document.getElementById('agy-chat-ladder-rail');
      if (oldFixed) oldFixed.remove();
      const oldLegacyRail = document.getElementById('agy-voyager-rail');
      if (oldLegacyRail) oldLegacyRail.remove();
      const oldLegacyStyle = document.getElementById('agy-voyager-style');
      if (oldLegacyStyle) oldLegacyStyle.remove();

      // 2. 注入全局天梯样式
      let style = document.getElementById('agy-chat-ladder-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'agy-chat-ladder-style';
        (document.head || targetBody).appendChild(style);
      }
      style.textContent = `
        .agy-chat-ladder-rail {
          position: absolute !important;
          right: 12px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 5px !important;
          z-index: 50 !important;
          background: rgba(22, 24, 29, 0.88) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
          padding: 7px 4px !important;
          border-radius: 20px !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45) !important;
          opacity: 0.75;
          transition: opacity 0.2s ease;
          max-height: 80% !important;
          user-select: none !important;
          pointer-events: auto !important;
        }
        .agy-chat-ladder-rail:hover {
          opacity: 1 !important;
        }

        .ladder-btn {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.75);
          border-radius: 5px;
          position: relative;
          transition: background 0.15s, color 0.15s, transform 0.15s;
        }
        .ladder-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.15);
        }

        .ladder-icon-svg {
          width: 15px;
          height: 15px;
          stroke-width: 2.6;
          stroke: currentColor;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          display: block;
        }

        .ladder-line {
          width: 12px;
          height: 1px;
          background: rgba(255, 255, 255, 0.12);
          margin: 2px 0;
        }

        .ladder-dots {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          max-height: calc(80vh - 130px);
          overflow-y: auto;
          padding: 4px 2px;
          scrollbar-width: none;
        }
        .ladder-dots::-webkit-scrollbar {
          display: none;
        }

        .ladder-dot-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .ladder-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.35);
          transition: background 0.15s ease, transform 0.15s ease;
          pointer-events: none;
        }
        .ladder-dot-wrap:hover .ladder-dot {
          background: #3b82f6;
          transform: scale(1.4);
        }
        .ladder-dot-wrap.active .ladder-dot {
          background: #10b981 !important;
          transform: scale(1.35) !important;
          box-shadow: none !important;
          animation: none !important;
        }

        /* 精致悬停提示框 (Hover Tooltip) */
        .ladder-tooltip {
          position: absolute !important;
          right: calc(100% + 12px) !important;
          top: 50% !important;
          transform: translateY(-50%) scale(0.95) !important;
          background: rgba(16, 18, 24, 0.96) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55) !important;
          border-radius: 7px !important;
          padding: 6px 10px !important;
          color: #f3f4f6 !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
          white-space: nowrap !important;
          max-width: 280px !important;
          pointer-events: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease !important;
          z-index: 100 !important;
          text-align: left !important;
        }

        /* 气泡三角指示标 */
        .ladder-tooltip::after {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent transparent rgba(16, 18, 24, 0.96);
        }

        .ladder-btn:hover .ladder-tooltip,
        .ladder-dot-wrap:hover .ladder-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(-50%) scale(1) !important;
        }

        .ladder-tooltip-title {
          font-weight: 600;
          color: #10b981;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ladder-tooltip-text {
          color: #e5e7eb;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 250px;
        }
      `;

      // SVG 图标库
      const ICONS = {
        // 登顶首提: 双重 ^ 纵向叠在一起 (非并列)
        topDouble: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="18 11 12 5 6 11"></polyline><polyline points="18 18 12 12 6 18"></polyline></svg>`,
        // 上一问: 单 ^ 向上
        upSingle: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
        // 下一问: 单 v 向下
        downSingle: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
        // 触底最新: 双重 v 纵向叠在一起
        bottomDouble: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="6 6 12 12 18 6"></polyline><polyline points="6 13 12 19 18 13"></polyline></svg>`
      };

      function getTurnsData(sc) {
        if (!sc) return [];
        const list = sc.querySelector('.relative.flex.flex-col.gap-y-3') || sc.querySelector('.relative.w-full');
        if (list) {
          const items = Array.from(list.querySelectorAll(':scope > div.flex.items-start, :scope > div[class*="flex"][class*="items-start"]'));
          if (items.length > 0) {
            return items.map((it, idx) => {
              const userTextEl = it.querySelector('.md-sticky-message-bleed') || it.querySelector('[class*="user-input"]') || it;
              let raw = (userTextEl.textContent || '').trim().replace(/\s+/g, ' ');
              raw = raw.replace(/\d{1,2}:\d{2}\s*$/, '').trim(); // 过滤末尾时间戳
              return {
                el: it,
                offsetTop: it.offsetTop,
                text: raw.length > 50 ? raw.slice(0, 50) + '...' : raw
              };
            });
          }
        }
        const userPrompts = Array.from(sc.querySelectorAll('.md-sticky-message-bleed, [class*="user-input-step"]'));
        if (userPrompts.length > 0) {
          return userPrompts.map((it, idx) => {
            let raw = (it.textContent || '').trim().replace(/\s+/g, ' ');
            raw = raw.replace(/\d{1,2}:\d{2}\s*$/, '').trim();
            return {
              el: it,
              offsetTop: it.offsetTop,
              text: raw.length > 50 ? raw.slice(0, 50) + '...' : raw
            };
          });
        }
        return [];
      }

      function createTooltip(title, text) {
        const tip = document.createElement('div');
        tip.className = 'ladder-tooltip';
        if (text) {
          tip.innerHTML = `<div class="ladder-tooltip-title">${title}</div><div class="ladder-tooltip-text">${text}</div>`;
        } else {
          tip.innerHTML = `<div class="ladder-tooltip-text" style="font-weight: 600;">${title}</div>`;
        }
        return tip;
      }

      function mountLadderToPane(sc) {
        const parent = sc.parentElement;
        if (!parent) return;

        if (window.getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }

        if (parent.__agyLadder && parent.querySelector('.agy-chat-ladder-rail')) {
          parent.__agyLadder.update();
          return;
        }

        let existing = parent.querySelector('.agy-chat-ladder-rail');
        if (existing) existing.remove();

        const rail = document.createElement('div');
        rail.className = 'agy-chat-ladder-rail';

        let currentActive = 0;
        let turnsCache = [];

        function updateActive(idx) {
          currentActive = idx;
          dotsContainer.querySelectorAll('.ladder-dot-wrap').forEach((w, i) => {
            w.classList.toggle('active', i === idx);
          });
        }

        function scrollToTurn(idx) {
          if (turnsCache.length === 0) turnsCache = getTurnsData(sc);
          if (turnsCache.length === 0) return;
          const clamped = Math.max(0, Math.min(turnsCache.length - 1, idx));
          currentActive = clamped;
          const target = turnsCache[clamped];
          if (target) {
            sc.scrollTo({ top: Math.max(0, target.offsetTop - 10), behavior: 'smooth' });
          }
          updateActive(clamped);
        }

        // 1. 登顶首提 (双 ^ 纵向叠在一起)
        const firstBtn = document.createElement('div');
        firstBtn.className = 'ladder-btn';
        firstBtn.innerHTML = ICONS.topDouble;
        firstBtn.appendChild(createTooltip('登顶首提', '瞬时跳转至第一个问题'));
        firstBtn.onclick = (e) => {
          e.stopPropagation();
          if (turnsCache.length > 0) scrollToTurn(0);
          else sc.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // 2. 上一问 (单 ^)
        const prevBtn = document.createElement('div');
        prevBtn.className = 'ladder-btn';
        prevBtn.innerHTML = ICONS.upSingle;
        prevBtn.appendChild(createTooltip('上一问', '回跳至上一个提问'));
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive - 1);
        };

        const l1 = document.createElement('div'); l1.className = 'ladder-line';
        const dotsContainer = document.createElement('div'); dotsContainer.className = 'ladder-dots';
        const l2 = document.createElement('div'); l2.className = 'ladder-line';

        // 3. 下一问 (单 v)
        const nextBtn = document.createElement('div');
        nextBtn.className = 'ladder-btn';
        nextBtn.innerHTML = ICONS.downSingle;
        nextBtn.appendChild(createTooltip('下一问', '顺流前往下一个提问'));
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive + 1);
        };

        // 4. 触底最新 (双 v 纵向叠在一起)
        const lastBtn = document.createElement('div');
        lastBtn.className = 'ladder-btn';
        lastBtn.innerHTML = ICONS.bottomDouble;
        lastBtn.appendChild(createTooltip('触底最新', '瞬时直达最新生成的回复'));
        lastBtn.onclick = (e) => {
          e.stopPropagation();
          sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
          if (turnsCache.length > 0) updateActive(turnsCache.length - 1);
        };

        rail.append(firstBtn, prevBtn, l1, dotsContainer, l2, nextBtn, lastBtn);
        parent.appendChild(rail);

        function render() {
          turnsCache = getTurnsData(sc);
          dotsContainer.innerHTML = '';

          if (turnsCache.length === 0) {
            const wrap = document.createElement('div');
            wrap.className = 'ladder-dot-wrap active';
            const dot = document.createElement('div');
            dot.className = 'ladder-dot';
            wrap.appendChild(dot);
            wrap.appendChild(createTooltip('会话就绪', ''));
            dotsContainer.appendChild(wrap);
            return;
          }

          turnsCache.forEach((item, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'ladder-dot-wrap' + (i === currentActive ? ' active' : '');
            const dot = document.createElement('div');
            dot.className = 'ladder-dot';
            wrap.appendChild(dot);

            // 悬停预览 (显示第几问及问题文字摘要)
            const tipTitle = `第 ${i + 1} 问`;
            const tipText = item.text || '点击快速跳转';
            wrap.appendChild(createTooltip(tipTitle, tipText));

            wrap.onclick = (e) => {
              e.stopPropagation();
              scrollToTurn(i);
            };
            dotsContainer.appendChild(wrap);
          });
        }

        function syncScroll() {
          if (turnsCache.length === 0) return;
          const curTop = sc.scrollTop;
          let bestIdx = 0;
          for (let i = 0; i < turnsCache.length; i++) {
            if (turnsCache[i].offsetTop <= curTop + 150) {
              bestIdx = i;
            }
          }
          updateActive(bestIdx);
        }

        let scrollTimer = null;
        sc.addEventListener('scroll', () => {
          if (scrollTimer) return;
          scrollTimer = setTimeout(() => {
            scrollTimer = null;
            syncScroll();
          }, 50);
        }, { passive: true });

        render();
        syncScroll();

        parent.__agyLadder = {
          update: () => {
            render();
            syncScroll();
          }
        };
      }

      function scanAndMountAllPanes() {
        const scs = Array.from(document.querySelectorAll('.overflow-y-auto.isolate, [class*="overflow-y-auto"][class*="isolate"]'));
        const validScs = scs.filter(s => {
          const r = s.getBoundingClientRect();
          return r.width > 100 && r.height > 100;
        });
        validScs.forEach(sc => mountLadderToPane(sc));
      }

      if (!window.__agyLadderWatcher) {
        window.__agyLadderWatcher = new MutationObserver(() => {
          if (window.__agyLadderTimer) clearTimeout(window.__agyLadderTimer);
          window.__agyLadderTimer = setTimeout(scanAndMountAllPanes, 300);
        });
        window.__agyLadderWatcher.observe(targetBody, { childList: true, subtree: true });
      }

      scanAndMountAllPanes();
      return true;
    } catch (e) {
      console.error('[AgyChatLadder Error]', e);
      return false;
    }
  }

  // 多阶定时器异步兜底挂载 (防冷启动白屏)
  const bootstrap = () => {
    if (!initLadderSystem()) {
      setTimeout(initLadderSystem, 300);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  setTimeout(initLadderSystem, 500);
  setTimeout(initLadderSystem, 1200);
  setTimeout(initLadderSystem, 2500);
  setTimeout(initLadderSystem, 5000);
  console.log('[AgyChatLadder] 叠层图标与智能悬停天梯系统已就绪！');
})();
