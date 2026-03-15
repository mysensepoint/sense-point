/**
 * Source Panel — 소스 목록 UI
 * 올/실/코/편물 탭 전환, 검색, 정렬
 * 항목 클릭 → 포커스 뷰에 반영
 * 의존: FiberAPI, FocusView
 */
var SourcePanel = (function () {
  'use strict';

  // ── DOM refs ──
  var $list, $empty, $tabs, $search, $sort;

  // ── State ──
  var currentTab = 'all';   // all | fiber | thread | stitch | fabric
  var searchQuery = '';
  var sortBy = 'newest';    // newest | tension | connections

  // Data caches
  var allFibers = [];
  var allThreads = [];
  var allStitches = [];
  var allFabrics = [];

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function _timeAgo(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    var sec = Math.floor(diff / 1000);
    if (sec < 60) return '방금 전';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + '분 전';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + '시간 전';
    var day = Math.floor(hr / 24);
    if (day < 30) return day + '일 전';
    return Math.floor(day / 30) + '개월 전';
  }

  // ── Init ──

  function init() {
    $list = document.getElementById('sourceList');
    $empty = document.getElementById('sourceEmpty');
    $tabs = document.getElementById('sourceTabs');
    $search = document.getElementById('sourceSearch');
    $sort = document.getElementById('sourceSort');

    if ($tabs) {
      $tabs.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-tab]');
        if (!btn) return;
        currentTab = btn.dataset.tab;
        $tabs.querySelectorAll('[data-tab]').forEach(function (b) {
          b.classList.toggle('is-active', b.dataset.tab === currentTab);
        });
        render();
      });
    }

    if ($search) {
      var debounce = null;
      $search.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          searchQuery = $search.value.trim().toLowerCase();
          render();
        }, 150);
      });
    }

    if ($sort) {
      $sort.addEventListener('change', function () {
        sortBy = $sort.value;
        render();
      });
    }
  }

  // ── Data loading ──

  function refresh() {
    Promise.all([
      FiberAPI.listFibers(),
      FiberAPI.listThreads(),
      FiberAPI.listStitches(),
      FiberAPI.listFabrics()
    ]).then(function (results) {
      allFibers = results[0] || [];
      allThreads = results[1] || [];
      allStitches = results[2] || [];
      allFabrics = results[3] || [];
      render();
    }).catch(function () {
      allFibers = []; allThreads = []; allStitches = []; allFabrics = [];
      render();
    });
  }

  // ── Rendering ──

  function render() {
    if (!$list) return;
    $list.innerHTML = '';

    var items = _getFilteredItems();

    if (!items.length) {
      if ($empty) {
        $empty.style.display = '';
        $empty.textContent = searchQuery ? '검색 결과가 없습니다.' : '아직 데이터가 없습니다.';
      }
      return;
    }
    if ($empty) $empty.style.display = 'none';

    items.forEach(function (item) {
      $list.appendChild(_renderItem(item));
    });
  }

  function _getFilteredItems() {
    var items = [];

    if (currentTab === 'all' || currentTab === 'fiber') {
      allFibers.forEach(function (f) {
        items.push({ type: 'fiber', id: f.id, data: f, time: f.caught_at, tension: f.tension || 3 });
      });
    }
    if (currentTab === 'all' || currentTab === 'thread') {
      allThreads.forEach(function (t) {
        items.push({ type: 'thread', id: t.id, data: t, time: t.created_at, tension: 0 });
      });
    }
    if (currentTab === 'all' || currentTab === 'stitch') {
      allStitches.forEach(function (s) {
        items.push({ type: 'stitch', id: s.id, data: s, time: s.created_at, tension: 0 });
      });
    }
    if (currentTab === 'all' || currentTab === 'fabric') {
      allFabrics.forEach(function (f) {
        items.push({ type: 'fabric', id: f.id, data: f, time: f.created_at || f.updated_at, tension: 0 });
      });
    }

    // Search filter
    if (searchQuery) {
      items = items.filter(function (item) {
        var text = _getItemText(item).toLowerCase();
        return text.indexOf(searchQuery) !== -1;
      });
    }

    // Sort
    if (sortBy === 'tension') {
      items.sort(function (a, b) { return b.tension - a.tension || b.time - a.time; });
    } else {
      items.sort(function (a, b) { return b.time - a.time; });
    }

    return items;
  }

  function _getItemText(item) {
    var d = item.data;
    if (item.type === 'fiber') return d.text || '';
    if (item.type === 'thread') return (d.why || '') + ' ' + (d.fiber_a_id || '') + ' ' + (d.fiber_b_id || '');
    if (item.type === 'stitch') return d.why || '';
    if (item.type === 'fabric') return (d.title || '') + ' ' + (d.insight || '');
    return '';
  }

  function _renderItem(item) {
    var el = document.createElement('div');
    el.className = 'source-item source-item--' + item.type;
    el.dataset.nodeId = item.id;

    var typeIcons = { fiber: '○', thread: '─', stitch: '✕', fabric: '□' };
    var typeNames = { fiber: '올', thread: '실', stitch: '코', fabric: '편물' };
    var icon = typeIcons[item.type] || '·';
    var typeName = typeNames[item.type] || '';

    var text = _getDisplayText(item);
    var meta = _timeAgo(item.time);

    el.innerHTML =
      '<span class="source-item__icon" title="' + typeName + '">' + icon + '</span>' +
      '<div class="source-item__body">' +
        '<div class="source-item__text">' + esc(text) + '</div>' +
        '<div class="source-item__meta">' +
          '<span class="source-item__type">' + typeName + '</span>' +
          '<span class="source-item__time">' + meta + '</span>' +
          (item.type === 'fiber' ? '<span class="source-item__tension">' + _tensionDots(item.tension) + '</span>' : '') +
        '</div>' +
      '</div>';

    el.addEventListener('click', function () {
      // Set focus in focus view
      if (typeof FocusView !== 'undefined' && FocusView.setFocus) {
        FocusView.setFocus(item.id);
      }
      // Highlight active item
      var prev = $list.querySelector('.source-item.is-active');
      if (prev) prev.classList.remove('is-active');
      el.classList.add('is-active');
    });

    return el;
  }

  function _getDisplayText(item) {
    var d = item.data;
    if (item.type === 'fiber') {
      var t = d.text || '';
      return t.length > 60 ? t.substring(0, 60) + '...' : t;
    }
    if (item.type === 'thread') {
      if (d.why) return d.why.length > 60 ? d.why.substring(0, 60) + '...' : d.why;
      return d.fiber_a_id + ' ↔ ' + d.fiber_b_id;
    }
    if (item.type === 'stitch') {
      if (d.why) return d.why.length > 60 ? d.why.substring(0, 60) + '...' : d.why;
      return d.thread_a_id + ' ↔ ' + d.thread_b_id;
    }
    if (item.type === 'fabric') {
      var ft = d.title || d.insight || '';
      return ft.length > 60 ? ft.substring(0, 60) + '...' : ft;
    }
    return item.id;
  }

  function _tensionDots(t) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="source-item__dot' + (i <= t ? ' is-filled' : '') + '"></span>';
    }
    return out;
  }

  return {
    init: init,
    refresh: refresh,
    render: render
  };
})();
