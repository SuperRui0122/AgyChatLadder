/**
 * AgyChatLadder (对话天梯) - v1.1.0
 * Antigravity 专属长对话微型时间轴与四级天梯导航引擎（支持多分屏与动态挂载）
 * GitHub: https://github.com/SuperRui0122/AgyChatLadder
 * 
 * - 4级天梯按键: ▲▲ 登顶首提, ▲ 攀升上一问, ▼ 下探下一问, ▼▼ 触底最新
 * - 原生支持多分屏 (Split Conversation): 每个分屏视口独立挂载专属天梯与滚动控制
 * - 原生隔离容器 offsetTop 毫秒级原生平滑滚动
 * - 静态常亮翠绿踏板圆点，无闪烁、无遮挡弹窗
 * - 多级定时器与 MutationObserver 动态挂载，兼容冷启动与路由切屏
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
      const oldVoyager = document.getElementById('agy-voyager-rail');
      if (oldVoyager) oldVoyager.remove();
      const oldVoyagerStyle = document.getElementById('agy-voyager-style');
      if (oldVoyagerStyle) oldVoyagerStyle.remove();

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
          max-height: calc(80vh - 120px);
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

      function getTurns(sc) {
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

      function mountLadderToPane(sc) {
        const parent = sc.parentElement;
        if (!parent) return;

        // 确保容器为相对定位，以便 absolute 的天梯正确定位在当前分屏内部
        if (window.getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }

        // 如果该 pane 已经有 ladder 控制器，直接复用并更新
        if (parent.__agyLadder && parent.querySelector('.agy-chat-ladder-rail')) {
          parent.__agyLadder.update();
          return;
        }

        // 清理已有 rail 避免重复
        let existing = parent.querySelector('.agy-chat-ladder-rail');
        if (existing) existing.remove();

        const rail = document.createElement('div');
        rail.className = 'agy-chat-ladder-rail';

        let currentActive = 0;
        let turnsCache = [];

        function updateActive(idx) {
          currentActive = idx;
          dotsContainer.querySelectorAll('.ladder-dot').forEach((d, i) => {
            d.classList.toggle('active', i === idx);
          });
        }

        function scrollToTurn(idx) {
          if (turnsCache.length === 0) turnsCache = getTurns(sc);
          if (turnsCache.length === 0) return;
          const clamped = Math.max(0, Math.min(turnsCache.length - 1, idx));
          currentActive = clamped;
          const target = turnsCache[clamped];
          if (target) {
            sc.scrollTo({ top: Math.max(0, target.offsetTop - 10), behavior: 'smooth' });
          }
          updateActive(clamped);
        }

        const firstBtn = document.createElement('div');
        firstBtn.className = 'ladder-btn double';
        firstBtn.innerText = '▲▲';
        firstBtn.title = '登顶首提 (Top / First Prompt)';
        firstBtn.onclick = (e) => {
          e.stopPropagation();
          if (turnsCache.length > 0) scrollToTurn(0);
          else sc.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const prevBtn = document.createElement('div');
        prevBtn.className = 'ladder-btn';
        prevBtn.innerText = '▲';
        prevBtn.title = '去上一问 (Previous Prompt)';
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive - 1);
        };

        const l1 = document.createElement('div'); l1.className = 'ladder-line';
        const dotsContainer = document.createElement('div'); dotsContainer.className = 'ladder-dots';
        const l2 = document.createElement('div'); l2.className = 'ladder-line';

        const nextBtn = document.createElement('div');
        nextBtn.className = 'ladder-btn';
        nextBtn.innerText = '▼';
        nextBtn.title = '去下一问 (Next Prompt)';
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive + 1);
        };

        const lastBtn = document.createElement('div');
        lastBtn.className = 'ladder-btn double';
        lastBtn.innerText = '▼▼';
        lastBtn.title = '触底去最新回复 (Bottom / Latest)';
        lastBtn.onclick = (e) => {
          e.stopPropagation();
          sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
          if (turnsCache.length > 0) updateActive(turnsCache.length - 1);
        };

        rail.append(firstBtn, prevBtn, l1, dotsContainer, l2, nextBtn, lastBtn);
        parent.appendChild(rail);

        function render() {
          turnsCache = getTurns(sc);
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

        validScs.forEach(sc => {
          mountLadderToPane(sc);
        });
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
  console.log('[AgyChatLadder] 多分屏智能对话天梯系统已就绪！');
})();
