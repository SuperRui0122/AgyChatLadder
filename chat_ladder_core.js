/**
 * AgyChatLadder (对话天梯) - v2.2.0 (精准去重与像素级跳转终极版)
 * Antigravity 专属长对话微型时间轴与四级天梯导航引擎
 * GitHub: https://github.com/SuperRui0122/AgyChatLadder
 * 
 * - 纯净单点映射: 严格一问一点，彻底根除多重节点抓取引起的连续重复点与假跳转 bug
 * - 累积偏移计算: 逐级累加至滚动视口，解决嵌套 offsetTop 偏差，确保每次跳转置顶居中
 * - 极致零闪烁: 轨道单例永久存续，增量 Diff 比对，无变化零 DOM 操作
 * - 独立悬浮预览: 悬停踏板圆点与四级按键在左侧平滑弹出精致横向卡片，移开即隐
 * - 多分屏感知: 自动识别左右/上下分屏视口，各自独立挂载专属天梯与滚动控制器
 * - 静态常亮翠绿踏板圆点，无晃眼动画
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initLadderSystem() {
    try {
      const targetBody = document.body || document.documentElement;
      if (!targetBody) return false;

      // 1. 全量清理历史遗留全局旧实例与旧版内嵌提示标签
      document.querySelectorAll('.agy-chat-ladder-rail').forEach(r => r.remove());
      document.querySelectorAll('.ladder-tooltip, .ladder-floating-tooltip').forEach(t => t.remove());
      const oldStyle = document.getElementById('agy-chat-ladder-style');
      if (oldStyle) oldStyle.remove();
      const oldLegacyRail = document.getElementById('agy-voyager-rail');
      if (oldLegacyRail) oldLegacyRail.remove();
      const oldLegacyStyle = document.getElementById('agy-voyager-style');
      if (oldLegacyStyle) oldLegacyStyle.remove();

      document.querySelectorAll('*').forEach(el => {
        if (el.__agyLadder) el.__agyLadder = null;
      });

      // 2. 注入全局天梯样式
      let style = document.createElement('style');
      style.id = 'agy-chat-ladder-style';
      (document.head || targetBody).appendChild(style);

      style.textContent = `
        .ladder-tooltip {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

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
          opacity: 0.82 !important;
          transition: opacity 0.2s ease, transform 0.2s ease !important;
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
          pointer-events: none;
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
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.35);
          transition: background 0.15s ease, transform 0.15s ease;
          pointer-events: none;
        }
        .ladder-dot-wrap:hover .ladder-dot {
          background: #38bdf8 !important;
          transform: scale(1.4) !important;
        }
        .ladder-dot-wrap.active .ladder-dot {
          background: #10b981 !important;
          transform: scale(1.35) !important;
          box-shadow: none !important;
          animation: none !important;
        }

        /* 独立脱离裁剪的横向悬浮预览卡片 */
        .ladder-floating-tooltip {
          position: absolute !important;
          right: calc(100% + 14px) !important;
          top: 50%;
          transform: translateY(-50%) scale(0.96) !important;
          background: rgba(15, 18, 26, 0.96) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          color: #f3f4f6 !important;
          font-size: 11px !important;
          line-height: 1.45 !important;
          pointer-events: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transition: opacity 0.15s ease, transform 0.15s ease, top 0.1s ease !important;
          z-index: 99999 !important;
          text-align: left !important;
          min-width: 140px !important;
          max-width: 270px !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        .ladder-floating-tooltip.show {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(-50%) scale(1) !important;
        }
        .ladder-floating-tooltip::after {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-width: 6px;
          border-style: solid;
          border-color: transparent transparent transparent rgba(15, 18, 26, 0.96);
        }
        .ladder-floating-tooltip-title {
          font-weight: 600;
          color: #10b981;
          font-size: 12px;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ladder-floating-tooltip-text {
          color: #d1d5db;
          font-size: 11px;
          max-height: 65px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          line-height: 1.4;
        }
      `;

      // SVG 图标库
      const ICONS = {
        topDouble: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="18 11 12 5 6 11"></polyline><polyline points="18 18 12 12 6 18"></polyline></svg>`,
        upSingle: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
        downSingle: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
        bottomDouble: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="6 6 12 12 18 6"></polyline><polyline points="6 13 12 19 18 13"></polyline></svg>`
      };

      // 精准提取单点映射提问，彻底杜绝多重抓取与重复点
      function getTurnsData(sc) {
        if (!sc) return [];
        let nodes = Array.from(sc.querySelectorAll('.md-sticky-message-bleed'));
        if (nodes.length === 0) {
          nodes = Array.from(sc.querySelectorAll('.group\\/user-input-step'));
        }

        const turns = [];
        let lastOffset = -999;

        for (const it of nodes) {
          let raw = (it.textContent || '').trim().replace(/\s+/g, ' ');
          raw = raw.replace(/\d{1,2}:\d{2}\s*$/, '').trim();
          if (!raw) continue;

          // 累加计算相对于 sc 滚动视口的真实总 offsetTop
          let curr = it;
          let totalTop = 0;
          while (curr && curr !== sc) {
            totalTop += curr.offsetTop;
            curr = curr.offsetParent;
          }
          const actualTop = totalTop > 0 ? totalTop : it.offsetTop;

          // 物理距离严格去重（同一提问节点距离差小于 10px 视为重复）
          if (Math.abs(actualTop - lastOffset) < 10) {
            continue;
          }

          lastOffset = actualTop;
          turns.push({
            el: it,
            offsetTop: actualTop,
            text: raw.length > 55 ? raw.slice(0, 55) + '...' : raw
          });
        }

        return turns;
      }

      function mountLadderToPane(sc) {
        const parent = sc.parentElement;
        if (!parent) return;

        if (window.getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }

        let existingRail = parent.querySelector('.agy-chat-ladder-rail');
        if (existingRail && parent.__agyLadder) {
          parent.__agyLadder.update();
          return;
        }

        if (existingRail) {
          existingRail.remove();
        }

        const rail = document.createElement('div');
        rail.className = 'agy-chat-ladder-rail';

        const floatingTip = document.createElement('div');
        floatingTip.className = 'ladder-floating-tooltip';
        rail.appendChild(floatingTip);

        function showTip(targetEl, title, text) {
          const rRect = rail.getBoundingClientRect();
          const tRect = targetEl.getBoundingClientRect();
          const relTop = (tRect.top + tRect.height / 2) - rRect.top;
          floatingTip.style.top = `${relTop}px`;
          if (text) {
            floatingTip.innerHTML = `<div class="ladder-floating-tooltip-title">${escapeHtml(title)}</div><div class="ladder-floating-tooltip-text">${escapeHtml(text)}</div>`;
          } else {
            floatingTip.innerHTML = `<div class="ladder-floating-tooltip-title" style="margin-bottom: 0;">${escapeHtml(title)}</div>`;
          }
          floatingTip.classList.add('show');
        }

        function hideTip() {
          floatingTip.classList.remove('show');
        }

        rail.addEventListener('mouseover', (e) => {
          const btn = e.target.closest('.ladder-btn');
          const dot = e.target.closest('.ladder-dot-wrap');
          if (btn && btn.__ladderTip) {
            showTip(btn, btn.__ladderTip.title, btn.__ladderTip.text);
            return;
          }
          if (dot && dot.__ladderTip) {
            showTip(dot, dot.__ladderTip.title, dot.__ladderTip.text);
            return;
          }
          hideTip();
        });

        rail.addEventListener('mouseleave', () => {
          hideTip();
        });

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
            sc.scrollTo({ top: Math.max(0, target.offsetTop - 12), behavior: 'smooth' });
          }
          updateActive(clamped);
        }

        // 1. 登顶首提
        const firstBtn = document.createElement('div');
        firstBtn.className = 'ladder-btn';
        firstBtn.innerHTML = ICONS.topDouble;
        firstBtn.__ladderTip = { title: '登顶首提', text: '瞬时直达会话首个提问' };
        firstBtn.onclick = (e) => {
          e.stopPropagation();
          if (turnsCache.length > 0) scrollToTurn(0);
          else sc.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // 2. 上一问
        const prevBtn = document.createElement('div');
        prevBtn.className = 'ladder-btn';
        prevBtn.innerHTML = ICONS.upSingle;
        prevBtn.__ladderTip = { title: '上一问', text: '返回上一个提问轮次' };
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive - 1);
        };

        const l1 = document.createElement('div'); l1.className = 'ladder-line';
        const dotsContainer = document.createElement('div'); dotsContainer.className = 'ladder-dots';
        const l2 = document.createElement('div'); l2.className = 'ladder-line';

        // 3. 下一问
        const nextBtn = document.createElement('div');
        nextBtn.className = 'ladder-btn';
        nextBtn.innerHTML = ICONS.downSingle;
        nextBtn.__ladderTip = { title: '下一问', text: '顺流前往下一个提问' };
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive + 1);
        };

        // 4. 触底最新
        const lastBtn = document.createElement('div');
        lastBtn.className = 'ladder-btn';
        lastBtn.innerHTML = ICONS.bottomDouble;
        lastBtn.__ladderTip = { title: '触底最新', text: '瞬时直达最新生成的回复' };
        lastBtn.onclick = (e) => {
          e.stopPropagation();
          sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
          if (turnsCache.length > 0) updateActive(turnsCache.length - 1);
        };

        rail.append(firstBtn, prevBtn, l1, dotsContainer, l2, nextBtn, lastBtn);
        parent.appendChild(rail);

        function render() {
          dotsContainer.innerHTML = '';

          if (turnsCache.length === 0) {
            const wrap = document.createElement('div');
            wrap.className = 'ladder-dot-wrap active';
            const dot = document.createElement('div');
            dot.className = 'ladder-dot';
            wrap.appendChild(dot);
            wrap.__ladderTip = { title: '会话就绪', text: '当前暂无更多提问轮次' };
            dotsContainer.appendChild(wrap);
            return;
          }

          turnsCache.forEach((item, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'ladder-dot-wrap' + (i === currentActive ? ' active' : '');
            const dot = document.createElement('div');
            dot.className = 'ladder-dot';
            wrap.appendChild(dot);

            wrap.__ladderTip = {
              title: `第 ${i + 1} 轮提问`,
              text: item.text || '点击快速跳转至此轮'
            };

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
            if (turnsCache[i].offsetTop <= curTop + 120) {
              bestIdx = i;
            }
          }
          updateActive(bestIdx);
        }

        function update() {
          const newTurns = getTurnsData(sc);
          const sameCount = newTurns.length === turnsCache.length;
          let sameContent = sameCount;
          if (sameCount && newTurns.length > 0) {
            const lastNew = newTurns[newTurns.length - 1];
            const lastOld = turnsCache[turnsCache.length - 1];
            if (lastNew.text !== lastOld.text) {
              sameContent = false;
            }
          }

          if (sameContent) {
            syncScroll();
            return;
          }

          turnsCache = newTurns;
          render();
          syncScroll();
        }

        let scrollTimer = null;
        sc.addEventListener('scroll', () => {
          if (scrollTimer) return;
          scrollTimer = setTimeout(() => {
            scrollTimer = null;
            syncScroll();
          }, 60);
        }, { passive: true });

        let scDebounce = null;
        const scObserver = new MutationObserver(() => {
          if (scDebounce) clearTimeout(scDebounce);
          scDebounce = setTimeout(update, 400);
        });
        scObserver.observe(sc, { childList: true, subtree: true });

        turnsCache = getTurnsData(sc);
        render();
        syncScroll();

        parent.__agyLadder = {
          update: update
        };
      }

      function scanAndMountAllPanes() {
        const scs = Array.from(document.querySelectorAll('.overflow-y-auto.isolate, [class*="overflow-y-auto"][class*="isolate"]'));
        const validScs = scs.filter(s => {
          const rect = s.getBoundingClientRect();
          return rect.width > 120 && rect.height > 120;
        });

        if (validScs.length === 0) return;
        validScs.forEach(sc => mountLadderToPane(sc));
      }

      scanAndMountAllPanes();

      setInterval(scanAndMountAllPanes, 1500);

      console.log('[AgyChatLadder] 精准去重与像素级跳转终极版已就绪！');
      return true;
    } catch (e) {
      console.warn('[AgyChatLadder] 初始化遇到异常:', e);
      return false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLadderSystem);
  } else {
    initLadderSystem();
  }
})();
