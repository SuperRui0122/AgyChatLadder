/**
 * AgyChatLadder (对话天梯) - v3.0.0 (十点分页视窗与六级天梯对偶终极版)
 * Antigravity 专属长对话微型时间轴与四级天梯导航引擎
 * GitHub: https://github.com/SuperRui0122/AgyChatLadder
 * 
 * - 方案 C 经典六键对偶:
 *   [ ⌃⌃ ] 登顶首提 (严格上下叠层双尖角)
 *   [  ^  ] 上一页 (大步跨 10 问，Page Up 联动跳转)
 *   [  <  ] 上一问 (向上微调 1 问)
 *   ─────── 视窗分隔线 ───────
 *   [ 最多 10 个圆点踏板 ] (不足 10 问时自适应，不留多余空位)
 *   ─────── 视窗分隔线 ───────
 *   [  >  ] 下一问 (向下微调 1 问)
 *   [  v  ] 下一页 (大步跨 10 问，Page Down 联动跳转)
 *   [ vv  ] 触底最新 (严格上下叠层双尖角)
 * - 双向视口智能吸附: 自由滚动正文时自动感知所处轮次并无感切换所属页码块
 * - 全景历史自动穿透: 自动探测并穿透 Antigravity sr-only 截断分页，无遗漏补齐踏板
 * - 纯净权威单点映射: 严格一问一点，物理距离去重，像素级置顶对齐
 * - 轻量微型页码卡片: 悬停清晰反馈当前页码与跨度信息
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

      // 1. 全量清理历史遗留旧实例与旧版内嵌提示标签
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
          gap: 4px !important;
          z-index: 50 !important;
          background: rgba(22, 24, 29, 0.90) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
          padding: 6px 4px !important;
          border-radius: 20px !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45) !important;
          opacity: 0.85 !important;
          transition: opacity 0.2s ease, transform 0.2s ease !important;
          max-height: 85% !important;
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
          transition: background 0.15s, color 0.15s, transform 0.15s, opacity 0.15s;
        }
        .ladder-btn:hover:not(.disabled) {
          color: #fff;
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.14);
        }
        .ladder-btn.disabled {
          opacity: 0.25 !important;
          cursor: not-allowed !important;
          transform: none !important;
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
          background: rgba(255, 255, 255, 0.14);
          margin: 2px 0;
          cursor: default;
        }

        .ladder-dots {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 3px 2px;
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

      // SVG 图标库 (严谨矢量设计)
      const ICONS = {
        // 登顶首提: 严格上下纵向叠层的双尖角
        topDouble: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="18 11 12 5 6 11"></polyline><polyline points="18 18 12 12 6 18"></polyline></svg>`,
        // 上一页: 向上单尖角
        pageUp: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
        // 上一问: 向左尖角 (小步回退)
        turnPrev: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
        // 下一问: 向右尖角 (小步前进)
        turnNext: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
        // 下一页: 向下单尖角
        pageDown: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
        // 触底最新: 严格上下纵向叠层的双尖角
        bottomDouble: `<svg class="ladder-icon-svg" viewBox="0 0 24 24"><polyline points="6 6 12 12 18 6"></polyline><polyline points="6 13 12 19 18 13"></polyline></svg>`
      };

      // 智能检测并无感自动展开更早历史（穿透 Antigravity 的 sr-only 截断分页）
      function autoLoadOlderMessages(sc) {
        if (!sc) return false;
        const loadBtn = sc.querySelector('button[aria-label*="Load older messages"], button.sr-only');
        if (!loadBtn || loadBtn.disabled || loadBtn.getAttribute('aria-disabled') === 'true') return false;

        const label = loadBtn.getAttribute('aria-label') || loadBtn.textContent || '';
        if (label.includes('No more older messages')) return false;
        if (!label.toLowerCase().includes('load older messages')) return false;

        // 冷却锁与防护上限
        if (sc.__ladderLoadingOlder) return false;
        sc.__ladderLoadCount = (sc.__ladderLoadCount || 0) + 1;
        if (sc.__ladderLoadCount > 35) return false;

        sc.__ladderLoadingOlder = true;
        try {
          loadBtn.click();
        } catch (_) {}

        setTimeout(() => {
          sc.__ladderLoadingOlder = false;
          if (sc.parentElement && sc.parentElement.__agyLadder) {
            sc.parentElement.__agyLadder.update();
          }
        }, 350);
        return true;
      }

      // 精准提取单点映射提问，彻底杜绝多重抓取与重复点
      function getTurnsData(sc) {
        if (!sc) return [];

        autoLoadOlderMessages(sc);

        let nodes = Array.from(sc.querySelectorAll('.md-sticky-message-bleed'));
        const userSteps = Array.from(sc.querySelectorAll('.group\\/user-input-step'));

        // 若 bleeds 数量少于 userSteps，以卡片根节点为准容错补齐
        if (nodes.length < userSteps.length) {
          nodes = userSteps;
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

        sc.__ladderLoadCount = 0;
        sc.__ladderLoadingOlder = false;

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
          const line = e.target.closest('.ladder-line');
          if (btn && btn.__ladderTip) {
            showTip(btn, btn.__ladderTip.title, btn.__ladderTip.text);
            return;
          }
          if (dot && dot.__ladderTip) {
            showTip(dot, dot.__ladderTip.title, dot.__ladderTip.text);
            return;
          }
          if (line && line.__ladderTip) {
            showTip(line, line.__ladderTip.title, line.__ladderTip.text);
            return;
          }
          hideTip();
        });

        rail.addEventListener('mouseleave', () => {
          hideTip();
        });

        // 核心状态管理 (固定每页 10 问)
        const PAGE_SIZE = 10;
        let currentActive = 0; // 全局提问索引 (0 ~ N-1)
        let currentPage = 0;   // 当前展示页码 (0 ~ totalPages-1)
        let turnsCache = [];

        function getTotalPages() {
          return Math.max(1, Math.ceil(turnsCache.length / PAGE_SIZE));
        }

        function getPageForTurn(turnIdx) {
          return Math.floor(Math.max(0, turnIdx) / PAGE_SIZE);
        }

        function updateActiveDots() {
          dotsContainer.querySelectorAll('.ladder-dot-wrap').forEach((w) => {
            const gIdx = w.__globalIndex;
            w.classList.toggle('active', gIdx === currentActive);
          });
        }

        // 翻页与平滑滚动防竞争锁
        let isNavigatingLock = false;
        let navLockTimer = null;
        function lockNavigation(ms = 800) {
          isNavigatingLock = true;
          if (navLockTimer) clearTimeout(navLockTimer);
          navLockTimer = setTimeout(() => {
            isNavigatingLock = false;
          }, ms);
        }

        function scrollToTurn(globalIdx) {
          if (turnsCache.length === 0) turnsCache = getTurnsData(sc);
          if (turnsCache.length === 0) return;

          const clamped = Math.max(0, Math.min(turnsCache.length - 1, globalIdx));
          currentActive = clamped;

          // 自动感知页码跨越
          const targetPage = getPageForTurn(clamped);
          currentPage = targetPage;
          render();

          lockNavigation(800);

          const target = turnsCache[clamped];
          if (target) {
            sc.scrollTo({ top: Math.max(0, target.offsetTop - 12), behavior: 'smooth' });
          }
        }

        function scrollToPage(pageIdx) {
          const totalPages = getTotalPages();
          const clampedPage = Math.max(0, Math.min(totalPages - 1, pageIdx));
          currentPage = clampedPage;
          // 方式 A：翻页即联动跳跃，直接置顶该页首问
          const targetTurn = clampedPage * PAGE_SIZE;
          scrollToTurn(targetTurn);
        }

        // ================= 方案 C 经典六键结构构建 =================

        // 1. 登顶首提 (⌃⌃ 上下叠层)
        const firstBtn = document.createElement('div');
        firstBtn.className = 'ladder-btn';
        firstBtn.innerHTML = ICONS.topDouble;
        firstBtn.onclick = (e) => {
          e.stopPropagation();
          const loadBtn = sc.querySelector('button[aria-label*="Load older messages"], button.sr-only');
          const hasMore = loadBtn && !loadBtn.disabled &&
                          loadBtn.getAttribute('aria-disabled') !== 'true' &&
                          !(loadBtn.getAttribute('aria-label') || '').includes('No more older messages');

          if (hasMore) {
            try { loadBtn.click(); } catch (_) {}
            setTimeout(() => {
              const freshTurns = getTurnsData(sc);
              if (freshTurns.length > 0) scrollToTurn(0);
              else sc.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);
          } else {
            if (turnsCache.length > 0) scrollToTurn(0);
            else sc.scrollTo({ top: 0, behavior: 'smooth' });
          }
        };

        // 2. 上一页 (^ 向上尖角，Page Up 跳 10 问)
        const pagePrevBtn = document.createElement('div');
        pagePrevBtn.className = 'ladder-btn';
        pagePrevBtn.innerHTML = ICONS.pageUp;
        pagePrevBtn.onclick = (e) => {
          e.stopPropagation();
          if (currentPage > 0) {
            scrollToPage(currentPage - 1);
          } else {
            if (currentActive > 0) {
              scrollToTurn(0);
            } else {
              showTip(pagePrevBtn, '上一页 (已至首页)', `当前已在第 1 页 (第 1~${Math.min(PAGE_SIZE, turnsCache.length)} 问)`);
              setTimeout(hideTip, 1600);
            }
          }
        };

        // 3. 上一问 (< 向左尖角，微调 1 问)
        const turnPrevBtn = document.createElement('div');
        turnPrevBtn.className = 'ladder-btn';
        turnPrevBtn.innerHTML = ICONS.turnPrev;
        turnPrevBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive - 1);
        };

        const l1 = document.createElement('div'); l1.className = 'ladder-line';
        const dotsContainer = document.createElement('div'); dotsContainer.className = 'ladder-dots';
        const l2 = document.createElement('div'); l2.className = 'ladder-line';

        // 4. 下一问 (> 向右尖角，微调 1 问)
        const turnNextBtn = document.createElement('div');
        turnNextBtn.className = 'ladder-btn';
        turnNextBtn.innerHTML = ICONS.turnNext;
        turnNextBtn.onclick = (e) => {
          e.stopPropagation();
          scrollToTurn(currentActive + 1);
        };

        // 5. 下一页 (v 向下尖角，Page Down 跳 10 问)
        const pageNextBtn = document.createElement('div');
        pageNextBtn.className = 'ladder-btn';
        pageNextBtn.innerHTML = ICONS.pageDown;
        pageNextBtn.onclick = (e) => {
          e.stopPropagation();
          const totalPages = getTotalPages();
          if (currentPage < totalPages - 1) {
            scrollToPage(currentPage + 1);
          } else {
            const lastIdx = turnsCache.length - 1;
            if (currentActive < lastIdx) {
              scrollToTurn(lastIdx);
            } else {
              showTip(pageNextBtn, '下一页 (已至末页)', `当前共 ${turnsCache.length} 问（已在最后一页）`);
              setTimeout(hideTip, 1600);
            }
          }
        };

        // 6. 触底最新 (vv 上下叠层)
        const lastBtn = document.createElement('div');
        lastBtn.className = 'ladder-btn';
        lastBtn.innerHTML = ICONS.bottomDouble;
        lastBtn.onclick = (e) => {
          e.stopPropagation();
          sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
          if (turnsCache.length > 0) {
            scrollToTurn(turnsCache.length - 1);
          }
        };

        rail.append(firstBtn, pagePrevBtn, turnPrevBtn, l1, dotsContainer, l2, turnNextBtn, pageNextBtn, lastBtn);
        parent.appendChild(rail);

        // 刷新按键状态与轻量悬停提示
        function updateControlsTips() {
          const totalTurns = turnsCache.length;
          const totalPages = getTotalPages();
          const isFirstPage = currentPage === 0;
          const isLastPage = currentPage >= totalPages - 1;

          // 1. 登顶首提提示
          const loadBtn = sc.querySelector('button[aria-label*="Load older messages"], button.sr-only');
          const hasUnloaded = loadBtn && !(loadBtn.getAttribute('aria-label') || '').includes('No more older messages');
          firstBtn.__ladderTip = {
            title: '登顶首提 (首问)',
            text: hasUnloaded ? '直达第 1 问（自动展开更早历史）' : '直达会话第 1 轮提问'
          };

          // 2. 上一页提示与状态
          pagePrevBtn.classList.toggle('disabled', isFirstPage);
          pagePrevBtn.__ladderTip = {
            title: `上一页 (第 ${currentPage + 1}/${totalPages} 页)`,
            text: isFirstPage ? `当前已在首页 (第 1~${Math.min(PAGE_SIZE, totalTurns)} 问)` : `向前翻 10 问 (直达第 ${(currentPage - 1) * PAGE_SIZE + 1} 问)`
          };

          // 3. 上一问提示
          turnPrevBtn.__ladderTip = {
            title: '上一问 (微调)',
            text: currentActive > 0 ? `返回第 ${currentActive} 问: ${escapeHtml(turnsCache[currentActive - 1]?.text || '')}` : '当前已在首个提问'
          };

          // 4. 下一问提示
          turnNextBtn.__ladderTip = {
            title: '下一问 (微调)',
            text: currentActive < totalTurns - 1 ? `前进至第 ${currentActive + 2} 问: ${escapeHtml(turnsCache[currentActive + 1]?.text || '')}` : '当前已在最新一问'
          };

          // 5. 下一页提示与状态
          pageNextBtn.classList.toggle('disabled', isLastPage);
          pageNextBtn.__ladderTip = {
            title: `下一页 (第 ${currentPage + 1}/${totalPages} 页)`,
            text: isLastPage ? `当前已在末页 (共 ${totalTurns} 问)` : `向后翻 10 问 (直达第 ${(currentPage + 1) * PAGE_SIZE + 1} 问)`
          };

          // 6. 触底最新提示
          lastBtn.__ladderTip = {
            title: '触底最新',
            text: '瞬时直达最新生成的回复'
          };

          // 分割线页码信息提示
          const lineTip = {
            title: `第 ${currentPage + 1} / ${totalPages} 页`,
            text: `当前视窗展示第 ${currentPage * PAGE_SIZE + 1} ~ ${Math.min(totalTurns, (currentPage + 1) * PAGE_SIZE)} 问 (共 ${totalTurns} 问)`
          };
          l1.__ladderTip = lineTip;
          l2.__ladderTip = lineTip;
        }

        // 渲染当前页圆点 (最多 10 个，自适应)
        function render() {
          dotsContainer.innerHTML = '';
          updateControlsTips();

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

          // 切片当前页的 10 个圆点
          const startIdx = currentPage * PAGE_SIZE;
          const endIdx = Math.min(turnsCache.length, startIdx + PAGE_SIZE);
          const currentSlice = turnsCache.slice(startIdx, endIdx);

          currentSlice.forEach((item, localIdx) => {
            const globalIdx = startIdx + localIdx;
            const wrap = document.createElement('div');
            wrap.className = 'ladder-dot-wrap' + (globalIdx === currentActive ? ' active' : '');
            wrap.__globalIndex = globalIdx;

            const dot = document.createElement('div');
            dot.className = 'ladder-dot';
            wrap.appendChild(dot);

            wrap.__ladderTip = {
              title: `第 ${globalIdx + 1} 轮提问`,
              text: item.text || '点击快速跳转至此轮'
            };

            wrap.onclick = (e) => {
              e.stopPropagation();
              scrollToTurn(globalIdx);
            };
            dotsContainer.appendChild(wrap);
          });
        }

        // 正文滚动时：双向视口感知与自动切页吸附
        function syncScroll() {
          if (isNavigatingLock) return; // 翻页或跳转动画进行中，严禁滚动事件篡改覆盖页码！
          if (turnsCache.length === 0) return;
          const curTop = sc.scrollTop;
          let bestIdx = 0;
          for (let i = 0; i < turnsCache.length; i++) {
            if (turnsCache[i].offsetTop <= curTop + 120) {
              bestIdx = i;
            }
          }
          currentActive = bestIdx;

          // 若正文滚动跨越了分页界限，天梯自动切页！
          const expectedPage = getPageForTurn(bestIdx);
          if (expectedPage !== currentPage) {
            currentPage = expectedPage;
            render();
          } else {
            updateActiveDots();
            updateControlsTips();
          }
        }

        function update() {
          autoLoadOlderMessages(sc);
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
          // 若当前页超限，安全回弹
          const totalPages = getTotalPages();
          if (currentPage >= totalPages) {
            currentPage = Math.max(0, totalPages - 1);
          }
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
          scDebounce = setTimeout(update, 300);
        });
        scObserver.observe(sc, { childList: true, subtree: true });

        turnsCache = getTurnsData(sc);
        currentPage = getPageForTurn(currentActive);
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
        validScs.forEach(sc => {
          autoLoadOlderMessages(sc);
          mountLadderToPane(sc);
        });
      }

      scanAndMountAllPanes();

      setInterval(scanAndMountAllPanes, 1500);

      console.log('[AgyChatLadder] v3.0.0 十点分页视窗与六级天梯对偶终极版已就绪！');
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
