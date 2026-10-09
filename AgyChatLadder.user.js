// ==UserScript==
// @name         AgyChatLadder (对话天梯)
// @namespace    https://github.com/SuperRui0122/AgyChatLadder
// @version      1.0.0
// @description  Antigravity 专属右侧长对话微型时间轴与四级天梯导航引擎
// @author       SuperRui0122
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * AgyChatLadder (对话天梯) - v1.0.0
 * Antigravity 专属长对话微型时间轴与四级天梯导航引擎
 * GitHub: https://github.com/SuperRui0122/AgyChatLadder
 * 
 * - 4级天梯按钮: ▲▲ 登顶首提, ▲ 攀升上一问, ▼ 下探下一问, ▼▼ 触底最新
 * - 原生隔离容器 offsetTop 毫秒级原生平滑滚动
 * - 静态常亮翠绿踏板圆点，无闪烁、无遮挡弹窗
 * - 多级定时器异步容错挂载，完美兼容冷启动
 */
(function () {
  'use strict';

  function safeInitLadder() {
    try {
      const targetBody = document.body || document.documentElement;
      if (!targetBody) return false;

      // 1. 清理旧实例 (包括历史 voyager 与旧版 ladder)
      const oldRail = document.getElementById('agy-chat-ladder-rail') || document.getElementById('agy-voyager-rail');
      if (oldRail) oldRail.remove();
      const oldStyle = document.getElementById('agy-voyager-style');
      if (oldStyle) oldStyle.remove();

      // 2. 注入专属天梯样式
      let style = document.getElementById('agy-chat-ladder-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'agy-chat-ladder-style';
        (document.head || targetBody).appendChild(style);
      }
      style.textContent = `
        #agy-chat-ladder-rail {
          position: fixed !important;
          right: 14px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 5px !important;
          z-index: 2147483647 !important;
          background: rgba(22, 24, 29, 0.88) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
          padding: 7px 4px !important;
          border-radius: 20px !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45) !important;
          opacity: 0.75;
          transition: opacity 0.2s ease;
          max-height: 82vh;
          user-select: none !important;
        }
        #agy-chat-ladder-rail:hover {
          opacity: 1 !important;
        }

        .ladder-btn {
          width: 22px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.75);
          font-size: 11px;
          font-weight: bold;
          line-height: 1;
          border-radius: 4px;
          transition: background 0.15s, color 0.15s, transform 0.15s;
        }
        .ladder-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.15);
        }
        .ladder-btn.double {
          font-size: 9px;
          letter-spacing: -1px;
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
          max-height: calc(82vh - 120px);
          overflow-y: auto;
          padding: 4px 2px;
          scrollbar-width: none;
        }
        .ladder-dots::-webkit-scrollbar {
          display: none;
        }

        .ladder-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.35);
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
          flex-shrink: 0;
        }
        .ladder-dot:hover {
          background: #3b82f6;
          transform: scale(1.4);
        }

        /* 静态翠绿踏板 - 稳固不闪烁 */
        .ladder-dot.active {
          background: #10b981 !important;
          transform: scale(1.35) !important;
          box-shadow: none !important;
          animation: none !important;
        }
      `;

      // 3. 原生滚动视口与问答卡片侦测
      function getChatScroll() {
        return document.querySelector('.overflow-y-auto.isolate') ||
               document.querySelector('.md-table-bleed') ||
               document.querySelector('[class*="overflow-y-auto"][class*="isolate"]');
      }

      function getTurns() {
        const sc = getChatScroll();
        if (!sc) return [];
        const list = sc.querySelector('.relative.flex.flex-col.gap-y-3') || sc.querySelector('.relative.w-full');
        if (list) {
          const items = Array.from(list.querySelectorAll(':scope > div.flex.items-start, :scope > div[class*="flex"][class*="items-start"]'));
          if (items.length > 0) return items;
        }
        const userPrompts = Array.from(sc.querySelectorAll('.md-sticky-message-bleed, [class*="user-input-step"]'));
        if (userPrompts.length > 0) return userPrompts;
        return [];
      }

      // 4. 构建天梯 UI
      const rail = document.createElement('div');
      rail.id = 'agy-chat-ladder-rail';

      let currentActive = 0;
      let turnsCache = [];

      function scrollToTurn(idx) {
        const sc = getChatScroll();
        if (!sc) return;
        if (turnsCache.length === 0) {
          turnsCache = getTurns();
        }
        if (turnsCache.length === 0) return;
        const clamped = Math.max(0, Math.min(turnsCache.length - 1, idx));
        currentActive = clamped;
        const target = turnsCache[clamped];
        if (target) {
          sc.scrollTo({ top: Math.max(0, target.offsetTop - 10), behavior: 'smooth' });
        }
        updateActive(clamped);
      }

      // 天梯按钮 1: ▲▲ 登顶直达首提
      const firstBtn = document.createElement('div');
      firstBtn.className = 'ladder-btn double';
      firstBtn.innerText = '▲▲';
      firstBtn.title = '登顶直达首提 (Top / First Prompt)';
      firstBtn.onclick = () => {
        if (turnsCache.length > 0) {
          scrollToTurn(0);
        } else {
          const sc = getChatScroll();
          if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };

      // 天梯按钮 2: ▲ 上爬一级 (上一问)
      const prevBtn = document.createElement('div');
      prevBtn.className = 'ladder-btn';
      prevBtn.innerText = '▲';
      prevBtn.title = '去上一问 (Previous Prompt)';
      prevBtn.onclick = () => {
        scrollToTurn(currentActive - 1);
      };

      const l1 = document.createElement('div'); l1.className = 'ladder-line';
      const dotsContainer = document.createElement('div'); dotsContainer.className = 'ladder-dots';
      const l2 = document.createElement('div'); l2.className = 'ladder-line';

      // 天梯按钮 3: ▼ 下探一级 (下一问)
      const nextBtn = document.createElement('div');
      nextBtn.className = 'ladder-btn';
      nextBtn.innerText = '▼';
      nextBtn.title = '去下一问 (Next Prompt)';
      nextBtn.onclick = () => {
        scrollToTurn(currentActive + 1);
      };

      // 天梯按钮 4: ▼▼ 触底最新回复
      const lastBtn = document.createElement('div');
      lastBtn.className = 'ladder-btn double';
      lastBtn.innerText = '▼▼';
      lastBtn.title = '触底去最新回复 (Bottom / Latest)';
      lastBtn.onclick = () => {
        const sc = getChatScroll();
        if (sc) {
          sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
          if (turnsCache.length > 0) updateActive(turnsCache.length - 1);
        }
      };

      rail.append(firstBtn, prevBtn, l1, dotsContainer, l2, nextBtn, lastBtn);
      targetBody.appendChild(rail);

      function updateActive(idx) {
        currentActive = idx;
        dotsContainer.querySelectorAll('.ladder-dot').forEach((d, i) => {
          d.classList.toggle('active', i === idx);
        });
      }

      function render() {
        turnsCache = getTurns();
        dotsContainer.innerHTML = '';

        if (turnsCache.length === 0) {
          const d = document.createElement('div');
          d.className = 'ladder-dot active';
          dotsContainer.appendChild(d);
          return;
        }

        turnsCache.forEach((turn, i) => {
          const d = document.createElement('div');
          d.className = 'ladder-dot' + (i === currentActive ? ' active' : '');
          d.onclick = (e) => {
            e.stopPropagation();
            scrollToTurn(i);
          };
          dotsContainer.appendChild(d);
        });
      }

      function syncScroll() {
        const sc = getChatScroll();
        if (!sc || turnsCache.length === 0) return;
        const curTop = sc.scrollTop;
        let bestIdx = 0;
        for (let i = 0; i < turnsCache.length; i++) {
          if (turnsCache[i].offsetTop <= curTop + 150) {
            bestIdx = i;
          }
        }
        updateActive(bestIdx);
      }

      let lastSc = null;
      function attachScroll() {
        const sc = getChatScroll();
        if (sc && sc !== lastSc) {
          lastSc = sc;
          let timer = null;
          sc.addEventListener('scroll', () => {
            if (timer) return;
            timer = setTimeout(() => {
              timer = null;
              syncScroll();
            }, 50);
          }, { passive: true });
        }
      }

      let mTimer = null;
      const watcher = new MutationObserver(() => {
        clearTimeout(mTimer);
        mTimer = setTimeout(() => {
          render();
          attachScroll();
          syncScroll();
        }, 300);
      });
      watcher.observe(targetBody, { childList: true, subtree: true });

      render();
      attachScroll();
      syncScroll();
      return true;
    } catch (e) {
      console.error('[AgyChatLadder Error]', e);
      return false;
    }
  }

  // 多阶定时器异步兜底挂载 (防冷启动白屏)
  const bootstrap = () => {
    if (!safeInitLadder()) {
      setTimeout(safeInitLadder, 300);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  setTimeout(safeInitLadder, 500);
  setTimeout(safeInitLadder, 1200);
  setTimeout(safeInitLadder, 2500);
  setTimeout(safeInitLadder, 5000);
  console.log('[AgyChatLadder] 对话天梯导航系统已就绪！');
})();
