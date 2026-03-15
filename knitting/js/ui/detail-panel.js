/**
 * Detail Panel — 상세 정보 패널 (오른쪽)
 * 포커스/선택 노드의 상세 정보 표시
 * 의존: FiberAPI
 */
var DetailPanel = (function () {
  'use strict';

  var $panel;
  var currentNode = null;

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

  function init() {
    $panel = document.getElementById('detailContent');
  }

  function show(node) {
    if (!$panel) return;
    currentNode = node;
    $panel.innerHTML = '';

    if (!node || !node.detail) {
      $panel.innerHTML = '<p class="detail-empty">노드를 선택하면 상세 정보가 표시됩니다.</p>';
      return;
    }

    var d = node.detail;
    var type = node.type;
    var typeNames = { fiber: '올', thread: '실', stitch: '코', fabric: '편물' };

    // Type badge
    var header = document.createElement('div');
    header.className = 'detail-header';
    header.innerHTML = '<span class="detail-type detail-type--' + type + '">' + (typeNames[type] || type) + '</span>';
    $panel.appendChild(header);

    if (type === 'fiber') {
      _renderFiberDetail(d);
    } else if (type === 'thread') {
      _renderThreadDetail(d);
    } else if (type === 'stitch') {
      _renderStitchDetail(d);
    } else if (type === 'fabric') {
      _renderFabricDetail(d);
    }

    // Node ID (subtle, for debugging)
    var idDiv = document.createElement('div');
    idDiv.className = 'detail-id';
    idDiv.textContent = node.id || (node.node_id || '');
    $panel.appendChild(idDiv);

    // Similarity signals (if hint node)
    if (node.signals) {
      var sigDiv = document.createElement('div');
      sigDiv.className = 'detail-signals';
      sigDiv.innerHTML =
        '<div class="detail-label">유사도 신호</div>' +
        '<div class="detail-signal"><span>임베딩</span><span>' + node.signals.embedding + '%</span></div>' +
        '<div class="detail-signal"><span>그래프</span><span>' + node.signals.graph + '%</span></div>' +
        (node.signals.tone ? '<div class="detail-signal"><span>결 대비</span><span>' + node.signals.tone + '%</span></div>' : '');
      $panel.appendChild(sigDiv);
    }
  }

  function _renderFiberDetail(d) {
    // Text
    var textDiv = document.createElement('div');
    textDiv.className = 'detail-text';
    textDiv.textContent = d.text || '';
    $panel.appendChild(textDiv);

    // Tension (editable)
    var tensionDiv = document.createElement('div');
    tensionDiv.className = 'detail-section';
    tensionDiv.innerHTML = '<div class="detail-label">장력</div>';
    var dotsDiv = document.createElement('div');
    dotsDiv.className = 'tension-dots tension-dots--inline';
    for (var i = 1; i <= 5; i++) {
      var dot = document.createElement('span');
      dot.className = 'tension-dot' + (i <= (d.tension || 3) ? ' is-active' : '');
      dot.dataset.t = i;
      dot.textContent = i;
      dotsDiv.appendChild(dot);
    }
    dotsDiv.addEventListener('click', function (e) {
      var dd = e.target.closest('.tension-dot');
      if (!dd) return;
      var t = parseInt(dd.dataset.t);
      FiberAPI.updateFiber(d.id, { tension: t }).then(function (updated) {
        d.tension = updated.tension;
        dotsDiv.querySelectorAll('.tension-dot').forEach(function (dot2) {
          dot2.classList.toggle('is-active', parseInt(dot2.dataset.t) <= t);
        });
      });
    });
    tensionDiv.appendChild(dotsDiv);
    $panel.appendChild(tensionDiv);

    // Tone (editable)
    var toneDiv = document.createElement('div');
    toneDiv.className = 'detail-section';
    toneDiv.innerHTML = '<div class="detail-label">결</div>';
    var toneSelector = document.createElement('div');
    toneSelector.className = 'tone-selector tone-selector--inline';
    [
      { key: 'resonance', label: '공명' },
      { key: 'friction', label: '마찰' },
      { key: 'question', label: '물음' }
    ].forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'tone-btn tone-btn--' + opt.key + ((d.tone || 'resonance') === opt.key ? ' is-active' : '');
      btn.dataset.tone = opt.key;
      btn.textContent = opt.label;
      toneSelector.appendChild(btn);
    });
    toneSelector.addEventListener('click', function (e) {
      var btn = e.target.closest('.tone-btn');
      if (!btn) return;
      var newTone = btn.dataset.tone;
      FiberAPI.updateFiber(d.id, { tone: newTone }).then(function (updated) {
        d.tone = updated.tone;
        toneSelector.querySelectorAll('.tone-btn').forEach(function (b) {
          b.classList.toggle('is-active', b.dataset.tone === newTone);
        });
      });
    });
    toneDiv.appendChild(toneSelector);
    $panel.appendChild(toneDiv);

    // Source
    if (d.source_title || d.source_id) {
      var srcDiv = document.createElement('div');
      srcDiv.className = 'detail-section';
      srcDiv.innerHTML = '<div class="detail-label">출처</div><div class="detail-value">' + esc(d.source_title || d.source || '') + '</div>';
      $panel.appendChild(srcDiv);
    }

    // Born from
    if (d.born_from_id) {
      var bornDiv = document.createElement('div');
      bornDiv.className = 'detail-section';
      bornDiv.innerHTML = '<div class="detail-label">탄생</div>';
      var bornLink = document.createElement('a');
      bornLink.href = '#';
      bornLink.className = 'detail-link';
      bornLink.textContent = d.born_from_id + ' (' + (d.born_from_type || '') + ')';
      bornLink.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof FocusView !== 'undefined') FocusView.setFocus(d.born_from_id);
      });
      bornDiv.appendChild(bornLink);
      $panel.appendChild(bornDiv);
    }

    // Time
    var timeDiv = document.createElement('div');
    timeDiv.className = 'detail-section';
    timeDiv.innerHTML = '<div class="detail-label">잡은 시간</div><div class="detail-value">' + _timeAgo(d.caught_at) + '</div>';
    $panel.appendChild(timeDiv);

    // Connected threads
    _loadConnectedThreads(d.id);

    // Delete
    _addDeleteButton('올', function () {
      FiberAPI.deleteFiber(d.id).then(function () {
        if (typeof SourcePanel !== 'undefined') SourcePanel.refresh();
        if (typeof FocusView !== 'undefined') FocusView.setFocus(null);
        show(null);
      });
    });
  }

  function _renderThreadDetail(d) {
    // Why
    if (d.why) {
      var whyDiv = document.createElement('div');
      whyDiv.className = 'detail-text';
      whyDiv.textContent = d.why;
      $panel.appendChild(whyDiv);
    }

    // Connected fibers
    if (d.fiber_a) {
      _addNodeLink('올 A', d.fiber_a.id, d.fiber_a.text);
    }
    if (d.fiber_b) {
      _addNodeLink('올 B', d.fiber_b.id, d.fiber_b.text);
    }

    // Time
    var timeDiv = document.createElement('div');
    timeDiv.className = 'detail-section';
    timeDiv.innerHTML = '<div class="detail-label">생성</div><div class="detail-value">' + _timeAgo(d.created_at) + '</div>';
    $panel.appendChild(timeDiv);

    _addDeleteButton('실', function () {
      FiberAPI.deleteThread(d.id).then(function () {
        if (typeof SourcePanel !== 'undefined') SourcePanel.refresh();
        if (typeof FocusView !== 'undefined') FocusView.setFocus(null);
        show(null);
      });
    });
  }

  function _renderStitchDetail(d) {
    if (d.why) {
      var whyDiv = document.createElement('div');
      whyDiv.className = 'detail-text';
      whyDiv.textContent = d.why;
      $panel.appendChild(whyDiv);
    }

    _addNodeLink('실 A', d.thread_a_id);
    _addNodeLink('실 B', d.thread_b_id);

    var timeDiv = document.createElement('div');
    timeDiv.className = 'detail-section';
    timeDiv.innerHTML = '<div class="detail-label">생성</div><div class="detail-value">' + _timeAgo(d.created_at) + '</div>';
    $panel.appendChild(timeDiv);

    _addDeleteButton('코', function () {
      FiberAPI.deleteStitch(d.id).then(function () {
        if (typeof SourcePanel !== 'undefined') SourcePanel.refresh();
        if (typeof FocusView !== 'undefined') FocusView.setFocus(null);
        show(null);
      });
    });
  }

  function _renderFabricDetail(d) {
    if (d.title) {
      var titleDiv = document.createElement('div');
      titleDiv.className = 'detail-text detail-text--title';
      titleDiv.textContent = d.title;
      $panel.appendChild(titleDiv);
    }

    // Insight (editable)
    var insightSection = document.createElement('div');
    insightSection.className = 'detail-section';
    insightSection.innerHTML = '<div class="detail-label">통찰</div>';
    var insightInput = document.createElement('textarea');
    insightInput.className = 'detail-textarea';
    insightInput.rows = 3;
    insightInput.value = d.insight || '';
    insightInput.placeholder = '이 편물에 대한 통찰...';
    insightSection.appendChild(insightInput);

    var saveBtn = document.createElement('button');
    saveBtn.className = 'detail-save-btn';
    saveBtn.textContent = '저장';
    saveBtn.addEventListener('click', function () {
      FiberAPI.updateFabric(d.id, { insight: insightInput.value.trim() }).then(function () {
        saveBtn.textContent = '저장됨';
        setTimeout(function () { saveBtn.textContent = '저장'; }, 1000);
      });
    });
    insightSection.appendChild(saveBtn);
    $panel.appendChild(insightSection);

    // Stitch count
    if (d.stitch_ids && d.stitch_ids.length) {
      var countDiv = document.createElement('div');
      countDiv.className = 'detail-section';
      countDiv.innerHTML = '<div class="detail-label">포함된 코</div><div class="detail-value">' + d.stitch_ids.length + '개</div>';
      $panel.appendChild(countDiv);
    }

    var timeDiv = document.createElement('div');
    timeDiv.className = 'detail-section';
    timeDiv.innerHTML = '<div class="detail-label">생성</div><div class="detail-value">' + _timeAgo(d.created_at) + '</div>';
    $panel.appendChild(timeDiv);

    _addDeleteButton('편물', function () {
      FiberAPI.deleteFabric(d.id).then(function () {
        if (typeof SourcePanel !== 'undefined') SourcePanel.refresh();
        if (typeof FocusView !== 'undefined') FocusView.setFocus(null);
        show(null);
      });
    });
  }

  // ── Helpers ──

  function _addNodeLink(label, nodeId, text) {
    var div = document.createElement('div');
    div.className = 'detail-section';
    div.innerHTML = '<div class="detail-label">' + esc(label) + '</div>';
    var link = document.createElement('a');
    link.href = '#';
    link.className = 'detail-link';
    link.textContent = text ? (text.length > 40 ? text.substring(0, 40) + '...' : text) : nodeId;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof FocusView !== 'undefined') FocusView.setFocus(nodeId);
    });
    div.appendChild(link);
    $panel.appendChild(div);
  }

  function _loadConnectedThreads(fiberId) {
    FiberAPI.listThreads(fiberId).then(function (threads) {
      if (!threads || !threads.length) return;
      var section = document.createElement('div');
      section.className = 'detail-section';
      section.innerHTML = '<div class="detail-label">연결된 실 (' + threads.length + ')</div>';
      threads.forEach(function (t) {
        var link = document.createElement('a');
        link.href = '#';
        link.className = 'detail-link detail-link--block';
        var otherFiberId = t.fiber_a_id === fiberId ? t.fiber_b_id : t.fiber_a_id;
        link.textContent = (t.why || otherFiberId);
        if (link.textContent.length > 40) link.textContent = link.textContent.substring(0, 40) + '...';
        link.addEventListener('click', function (e) {
          e.preventDefault();
          if (typeof FocusView !== 'undefined') FocusView.setFocus(t.id);
        });
        section.appendChild(link);
      });
      $panel.appendChild(section);
    });
  }

  function _addDeleteButton(typeName, onDelete) {
    var btn = document.createElement('button');
    btn.className = 'detail-delete-btn';
    btn.textContent = typeName + ' 삭제';
    btn.addEventListener('click', function () {
      if (typeof KnittingDialog !== 'undefined') {
        KnittingDialog.confirm({
          message: '이 ' + typeName + '을(를) 삭제할까요?',
          confirmLabel: '삭제',
          danger: true
        }, onDelete);
      } else {
        if (confirm('이 ' + typeName + '을(를) 삭제할까요?')) onDelete();
      }
    });
    $panel.appendChild(btn);
  }

  return {
    init: init,
    show: show
  };
})();
