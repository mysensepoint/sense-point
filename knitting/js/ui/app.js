/**
 * Knitting UI — App Controller v2
 * 소스 패널 / 포커스 뷰 / 상세 패널 통합 초기화
 * 의존: FiberAPI, SourcePanel, FocusView, DetailPanel
 */
(function () {
  'use strict';

  // ── Init ──

  document.addEventListener('DOMContentLoaded', function () {
    // Check server availability
    FiberAPI.isAvailable().then(function (ok) {
      if (!ok) {
        console.warn('[app] 서버 연결 불가 — http://localhost:3001');
      }

      // Init panels
      SourcePanel.init();
      FocusView.init();
      DetailPanel.init();

      // Load data
      SourcePanel.refresh();

      // Setup resize handles
      _setupResize('sourcesResizeHandle', 'sourcesSidebar', 'left');
      _setupResize('detailResizeHandle', 'detailSidebar', 'right');

      // Setup sidebar toggles
      _setupToggle('sourcesToggle', 'sourcesSidebar');
      _setupToggle('detailToggle', 'detailSidebar');

      // Setup context menu
      _setupFocusContextMenu();
    });
  });

  // ── Focus context menu ──

  function _setupFocusContextMenu() {
    var $menu = document.getElementById('focusContextMenu');
    if (!$menu) return;

    $menu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-action]');
      if (!item) return;
      var action = item.dataset.action;
      if (typeof FocusView !== 'undefined' && FocusView.handleContextAction) {
        FocusView.handleContextAction(action);
      }
    });
  }

  // ── Sidebar resize ──

  function _setupResize(handleId, sidebarId, side) {
    var handle = document.getElementById(handleId);
    var sidebar = document.getElementById(sidebarId);
    if (!handle || !sidebar) return;

    var startX, startW;

    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.classList.add('is-resizing');
    });

    function onMove(e) {
      var diff = e.clientX - startX;
      if (side === 'right') diff = -diff;
      var newW = Math.max(180, Math.min(500, startW + diff));
      sidebar.style.width = newW + 'px';
      sidebar.style.flexBasis = newW + 'px';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('is-resizing');
    }
  }

  // ── Sidebar toggle ──

  function _setupToggle(btnId, sidebarId) {
    var btn = document.getElementById(btnId);
    var sidebar = document.getElementById(sidebarId);
    if (!btn || !sidebar) return;

    btn.addEventListener('click', function () {
      sidebar.classList.toggle('is-collapsed');
    });
  }

})();
