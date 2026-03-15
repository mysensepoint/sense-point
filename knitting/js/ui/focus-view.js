/**
 * Focus View — 포커스 모델 기반 시각화
 * 중앙: 선택 노드 (크게), 주변: 유사/연결 노드
 * Canvas 기반, 라디얼 배치
 * 의존: FiberAPI
 */
var FocusView = (function () {
  'use strict';

  // ── DOM refs ──
  var $canvas, $tooltip, $empty, ctx;

  // ── State ──
  var focusNodeId = null;
  var focusNode = null;     // { id, type, detail }
  var hintNodes = [];       // [{ node_id, type, detail, similarity, signals, x, y, r }]
  var phase = '';
  var density = 0;

  // ── View transform ──
  var view = { x: 0, y: 0, scale: 1 };
  var MIN_SCALE = 0.4, MAX_SCALE = 3;

  // ── Interaction ──
  var hoveredItem = null;   // node object or null
  var dragItem = null;
  var isPanning = false;
  var panStart = { x: 0, y: 0 };
  var viewStart = { x: 0, y: 0 };

  // ── Animation ──
  var animating = false;
  var animAlpha = 0;

  // ── Type colors ──
  var TYPE_COLORS = {
    fiber: '#b8956a',
    thread: '#6ba3c2',
    stitch: '#7aad5e',
    fabric: '#c26b6b'
  };

  var TONE_COLORS = {
    resonance: '#b8956a',
    friction: '#c26b6b',
    question: '#6ba3c2'
  };

  // ── CSS cache ──
  var _cs = null;
  function _css(name) {
    if (!_cs) _cs = getComputedStyle(document.documentElement);
    return _cs.getPropertyValue(name).trim() || null;
  }

  // ── Init ──

  function init() {
    $canvas = document.getElementById('focusCanvas');
    $tooltip = document.getElementById('focusTooltip');
    $empty = document.getElementById('focusEmpty');
    if (!$canvas) return;
    ctx = $canvas.getContext('2d');
    _setupInteraction();
    _setupResize();
  }

  // ── Focus change ──

  function setFocus(nodeId) {
    if (!nodeId) {
      focusNodeId = null;
      focusNode = null;
      hintNodes = [];
      _showEmpty(true);
      _render();
      return;
    }

    focusNodeId = nodeId;
    _showEmpty(false);

    FiberAPI.getNodeHints(nodeId).then(function (result) {
      var hints = result && result.hints || [];
      phase = result && result.phase || '';
      density = result && result.density || 0;

      // Build focus node
      if (hints.length > 0) {
        // Try to get focus node detail from the first hint that matches, or fetch separately
        _loadFocusNode(nodeId).then(function (node) {
          focusNode = node;
          _buildLayout(hints);
          _startAnimation();
          // Notify detail panel
          if (typeof DetailPanel !== 'undefined' && DetailPanel.show) {
            DetailPanel.show(focusNode);
          }
        });
      } else {
        _loadFocusNode(nodeId).then(function (node) {
          focusNode = node;
          hintNodes = [];
          _render();
          if (typeof DetailPanel !== 'undefined' && DetailPanel.show) {
            DetailPanel.show(focusNode);
          }
        });
      }
    }).catch(function () {
      focusNode = null;
      hintNodes = [];
      _showEmpty(true);
      _render();
    });
  }

  function _loadFocusNode(nodeId) {
    var type = _nodeType(nodeId);
    if (type === 'fiber') {
      return FiberAPI.getFiber(nodeId).then(function (d) {
        return { id: nodeId, type: 'fiber', detail: d };
      });
    }
    if (type === 'thread') {
      return FiberAPI.getThread(nodeId).then(function (d) {
        return { id: nodeId, type: 'thread', detail: d };
      });
    }
    if (type === 'fabric') {
      return FiberAPI.getFabric(nodeId).then(function (d) {
        return { id: nodeId, type: 'fabric', detail: d };
      });
    }
    return Promise.resolve({ id: nodeId, type: 'unknown', detail: {} });
  }

  function _nodeType(nodeId) {
    if (!nodeId) return 'unknown';
    var p = nodeId.substring(0, 3);
    if (p === 'fb_') return 'fiber';
    if (p === 'th_') return 'thread';
    if (p === 'st_') return 'stitch';
    if (p === 'fa_') return 'fabric';
    return 'unknown';
  }

  // ── Layout ──

  function _buildLayout(hints) {
    var W = $canvas.offsetWidth || 400;
    var H = $canvas.offsetHeight || 400;
    var cx = W / 2;
    var cy = H / 2;

    hintNodes = [];

    var count = hints.length;
    var maxRadius = Math.min(W, H) * 0.35;
    var minRadius = 80;

    for (var i = 0; i < count; i++) {
      var h = hints[i];
      var angle = (2 * Math.PI * i) / count - Math.PI / 2;
      // Higher similarity = closer to center
      var sim01 = (h.similarity || 0) / 100;
      var dist = maxRadius - sim01 * (maxRadius - minRadius);

      hintNodes.push({
        node_id: h.node_id,
        type: h.type,
        detail: h.detail,
        similarity: h.similarity,
        signals: h.signals,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        targetX: cx + Math.cos(angle) * dist,
        targetY: cy + Math.sin(angle) * dist,
        r: _nodeRadius(h)
      });
    }
  }

  function _nodeRadius(hint) {
    if (hint.type === 'fiber' && hint.detail) {
      return 12 + (hint.detail.tension || 3) * 2;
    }
    if (hint.type === 'fabric') return 22;
    return 16;
  }

  function _showEmpty(show) {
    if ($empty) $empty.style.display = show ? '' : 'none';
    if ($canvas) $canvas.style.display = show ? 'none' : '';
  }

  // ── Animation ──

  function _startAnimation() {
    animAlpha = 0;
    animating = true;
    _animFrame();
  }

  function _animFrame() {
    if (!animating) return;
    animAlpha = Math.min(1, animAlpha + 0.06);
    _render();
    if (animAlpha < 1) {
      requestAnimationFrame(_animFrame);
    } else {
      animating = false;
    }
  }

  // ── Rendering ──

  function _render() {
    if (!$canvas || !ctx) return;

    var dpr = window.devicePixelRatio || 1;
    var W = $canvas.offsetWidth;
    var H = $canvas.offsetHeight;
    if (!W || !H) return;

    $canvas.width = W * dpr;
    $canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var bg = _css('--bg') || '#faf9f7';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (!focusNode) return;

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    var cx = W / 2;
    var cy = H / 2;
    var alpha = animating ? animAlpha : 1;

    // ── Draw connection lines from center to hints ──
    ctx.globalAlpha = alpha * 0.2;
    hintNodes.forEach(function (h) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(h.x, h.y);
      ctx.strokeStyle = TYPE_COLORS[h.type] || '#aaa';
      ctx.lineWidth = 1 / view.scale;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // ── Draw hint nodes ──
    hintNodes.forEach(function (h) {
      var nodeAlpha = alpha * (0.4 + (h.similarity || 0) / 100 * 0.6);
      ctx.globalAlpha = nodeAlpha;
      _drawNode(h.x, h.y, h.r, h.type, h.detail, h === hoveredItem);
      ctx.globalAlpha = 1;

      // Label
      if (h === hoveredItem || hintNodes.length <= 5) {
        var label = _getNodeLabel(h);
        if (label.length > 15) label = label.substring(0, 15) + '...';
        ctx.globalAlpha = alpha;
        ctx.font = Math.round(10 / view.scale) + 'px Pretendard, sans-serif';
        ctx.fillStyle = _css('--text') || '#2c2c2c';
        ctx.textAlign = 'center';
        ctx.fillText(label, h.x, h.y + h.r + 14 / view.scale);
        ctx.globalAlpha = 1;
      }

      // Similarity badge
      if (h.similarity) {
        ctx.globalAlpha = alpha * 0.6;
        ctx.font = Math.round(8 / view.scale) + 'px Pretendard, sans-serif';
        ctx.fillStyle = _css('--text-muted') || '#999';
        ctx.textAlign = 'center';
        ctx.fillText(h.similarity + '%', h.x, h.y - h.r - 4 / view.scale);
        ctx.globalAlpha = 1;
      }
    });

    // ── Draw focus node (on top) ──
    var focusR = 30;
    if (focusNode.type === 'fiber' && focusNode.detail) {
      focusR = 20 + (focusNode.detail.tension || 3) * 3;
    } else if (focusNode.type === 'fabric') {
      focusR = 35;
    }
    _drawNode(cx, cy, focusR, focusNode.type, focusNode.detail, focusNode === hoveredItem, true);

    // Focus label
    var focusLabel = _getNodeLabel(focusNode);
    if (focusLabel.length > 20) focusLabel = focusLabel.substring(0, 20) + '...';
    ctx.font = 'bold ' + Math.round(12 / view.scale) + 'px Pretendard, sans-serif';
    ctx.fillStyle = _css('--text') || '#2c2c2c';
    ctx.textAlign = 'center';
    ctx.fillText(focusLabel, cx, cy + focusR + 18 / view.scale);

    // Phase indicator
    var phaseLabels = { 'casting-on': '코잡기', 'transition': '전환', 'knitting': '뜨개질' };
    if (phase) {
      ctx.font = Math.round(9 / view.scale) + 'px Pretendard, sans-serif';
      ctx.fillStyle = _css('--text-muted') || '#999';
      ctx.textAlign = 'left';
      ctx.fillText((phaseLabels[phase] || phase) + ' · ' + hintNodes.length + '개 유사', 10 / view.scale, 20 / view.scale);
    }

    ctx.restore();
  }

  function _drawNode(x, y, r, type, detail, isHovered, isFocus) {
    var color = TYPE_COLORS[type] || '#aaa';
    var accentColor = _css('--accent') || '#b8956a';

    if (type === 'fiber') {
      // Circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isFocus ? color : _hexAlpha(color, 0.3);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = (isFocus ? 3 : 2) / view.scale;
      ctx.stroke();

      // Tone ring
      if (detail) {
        var toneColor = TONE_COLORS[detail.tone] || TONE_COLORS.resonance;
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = toneColor;
        ctx.lineWidth = 2 / view.scale;
        ctx.stroke();
      }
    } else if (type === 'thread') {
      // Two connected dots
      var dx = r * 0.6;
      ctx.beginPath();
      ctx.arc(x - dx, y, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = _hexAlpha(color, isFocus ? 0.8 : 0.4);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 / view.scale;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + dx, y, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = _hexAlpha(color, isFocus ? 0.8 : 0.4);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 / view.scale;
      ctx.stroke();

      // Connecting line
      ctx.beginPath();
      ctx.moveTo(x - dx + r * 0.5, y);
      ctx.lineTo(x + dx - r * 0.5, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / view.scale;
      ctx.stroke();
    } else if (type === 'fabric') {
      // Rounded rectangle
      var hw = r * 0.9, hh = r * 0.7;
      ctx.beginPath();
      _roundRect(ctx, x - hw, y - hh, hw * 2, hh * 2, 4 / view.scale);
      ctx.fillStyle = _hexAlpha(color, isFocus ? 0.5 : 0.25);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = (isFocus ? 3 : 2) / view.scale;
      ctx.stroke();
    } else {
      // Default: circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = _hexAlpha(color, 0.3);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / view.scale;
      ctx.stroke();
    }

    // Hover ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2 / view.scale;
      ctx.stroke();
    }
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function _getNodeLabel(node) {
    if (!node || !node.detail) return node.id || '';
    var d = node.detail;
    if (node.type === 'fiber') return d.text || '';
    if (node.type === 'thread') return d.why || (d.fiber_a ? d.fiber_a.text : '') || '';
    if (node.type === 'fabric') return d.title || d.insight || '';
    return d.text || d.title || '';
  }

  function _hexAlpha(hex, alpha) {
    var m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return hex;
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + alpha + ')';
  }

  // ── Hit testing ──

  function _screenToGraph(mx, my) {
    return {
      x: (mx - view.x) / view.scale,
      y: (my - view.y) / view.scale
    };
  }

  function _hitTest(mx, my) {
    var g = _screenToGraph(mx, my);

    // Check focus node first (at center)
    if (focusNode) {
      var W = $canvas.offsetWidth || 400;
      var H = $canvas.offsetHeight || 400;
      var fcx = W / 2, fcy = H / 2;
      var fr = 30;
      if (focusNode.type === 'fiber' && focusNode.detail) fr = 20 + (focusNode.detail.tension || 3) * 3;
      var dx0 = g.x - fcx, dy0 = g.y - fcy;
      if (dx0 * dx0 + dy0 * dy0 <= (fr + 5) * (fr + 5)) return focusNode;
    }

    // Check hint nodes (reverse order for top-most first)
    for (var i = hintNodes.length - 1; i >= 0; i--) {
      var h = hintNodes[i];
      var dx = g.x - h.x, dy = g.y - h.y;
      if (dx * dx + dy * dy <= (h.r + 5) * (h.r + 5)) return h;
    }

    return null;
  }

  // ── Interaction ──

  function _setupInteraction() {
    $canvas.addEventListener('mousedown', _onMouseDown);
    $canvas.addEventListener('mousemove', _onMouseMove);
    $canvas.addEventListener('mouseup', _onMouseUp);
    $canvas.addEventListener('mouseleave', _onMouseLeave);
    $canvas.addEventListener('wheel', _onWheel, { passive: false });
    $canvas.addEventListener('dblclick', _onDblClick);
    $canvas.addEventListener('contextmenu', _onContextMenu);

    // Context menu handlers
    document.addEventListener('click', function (e) {
      var $menu = document.getElementById('focusContextMenu');
      if ($menu && !$menu.contains(e.target)) {
        $menu.classList.remove('is-visible');
      }
    });
  }

  var _contextTarget = null;

  function _onContextMenu(e) {
    var rect = $canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var hit = _hitTest(mx, my);
    if (!hit) return;

    e.preventDefault();
    _contextTarget = hit;

    var $menu = document.getElementById('focusContextMenu');
    if (!$menu) return;
    $menu.style.left = e.clientX + 'px';
    $menu.style.top = e.clientY + 'px';
    $menu.classList.add('is-visible');
  }

  function _onMouseDown(e) {
    if (e.button !== 0) return;
    var rect = $canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    var hit = _hitTest(mx, my);
    if (hit && hit !== focusNode) {
      dragItem = hit;
      $canvas.classList.add('is-panning');
      return;
    }

    isPanning = true;
    panStart.x = e.clientX; panStart.y = e.clientY;
    viewStart.x = view.x; viewStart.y = view.y;
    $canvas.classList.add('is-panning');
  }

  function _onMouseMove(e) {
    var rect = $canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    if (dragItem) {
      var g = _screenToGraph(mx, my);
      dragItem.x = g.x;
      dragItem.y = g.y;
      _render();
      return;
    }

    if (isPanning) {
      view.x = viewStart.x + (e.clientX - panStart.x);
      view.y = viewStart.y + (e.clientY - panStart.y);
      _render();
      return;
    }

    var prev = hoveredItem;
    hoveredItem = _hitTest(mx, my);
    if (hoveredItem !== prev) _render();

    if (hoveredItem) {
      var label = _getNodeLabel(hoveredItem);
      if (label.length > 60) label = label.substring(0, 60) + '...';
      var typeNames = { fiber: '올', thread: '실', stitch: '코', fabric: '편물' };
      var typeName = typeNames[hoveredItem.type] || '';
      _showTooltip('[' + typeName + '] ' + label, mx, my);
      $canvas.style.cursor = 'pointer';
    } else {
      _hideTooltip();
      $canvas.style.cursor = 'grab';
    }
  }

  function _onMouseUp(e) {
    if (dragItem) {
      var rect = $canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var hit = _hitTest(mx, my);
      if (hit && hit === dragItem) {
        // Click → change focus
        _onNodeClick(hit);
      }
      dragItem = null;
      $canvas.classList.remove('is-panning');
      return;
    }

    if (isPanning) {
      isPanning = false;
      $canvas.classList.remove('is-panning');
    }
  }

  function _onMouseLeave() {
    dragItem = null;
    isPanning = false;
    hoveredItem = null;
    _hideTooltip();
    $canvas.classList.remove('is-panning');
    _render();
  }

  function _onWheel(e) {
    e.preventDefault();
    var rect = $canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var delta = -e.deltaY * 0.001;
    var newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * (1 + delta)));
    var ratio = newScale / view.scale;
    view.x = mx - (mx - view.x) * ratio;
    view.y = my - (my - view.y) * ratio;
    view.scale = newScale;
    _render();
  }

  function _onDblClick() {
    view.x = 0; view.y = 0; view.scale = 1;
    _render();
  }

  function _onNodeClick(node) {
    if (node === focusNode) {
      // Click on focused node → show detail
      if (typeof DetailPanel !== 'undefined' && DetailPanel.show) {
        DetailPanel.show(focusNode);
      }
      return;
    }
    // Change focus to clicked node
    var nodeId = node.node_id || node.id;
    view.x = 0; view.y = 0; view.scale = 1;
    setFocus(nodeId);
  }

  // ── Context menu actions ──

  function handleContextAction(action) {
    var $menu = document.getElementById('focusContextMenu');
    if ($menu) $menu.classList.remove('is-visible');

    if (!_contextTarget) return;
    var targetId = _contextTarget.node_id || _contextTarget.id;

    if (action === 'new-thought') {
      // 새 생각: 새 올 + 자동 실 생성
      KnittingDialog.prompt({
        title: '새 생각',
        message: '이 노드에서 떠오른 생각을 적어주세요.',
        placeholder: '떠오른 생각...',
        submitLabel: '올 잡기'
      }, function (text) {
        if (!text) return;
        FiberAPI.catchFiber({
          text: text,
          source: 'thought',
          tension: 3,
          tone: 'resonance',
          born_from_id: targetId,
          born_from_type: _contextTarget.type
        }).then(function (newFiber) {
          // 자동으로 실 생성 (올+올 연결)
          if (_contextTarget.type === 'fiber') {
            FiberAPI.createThread({
              fiber_a_id: targetId,
              fiber_b_id: newFiber.id,
              why: ''
            }).then(function () {
              // 포커스 유지 (변경 안 함), refresh
              setFocus(focusNodeId);
            });
          } else {
            // 비올 노드에서 생각 → connection으로 연결
            FiberAPI.createConnection({
              node_a_id: targetId,
              node_b_id: newFiber.id,
              why: 'thought born from'
            }).then(function () {
              setFocus(focusNodeId);
            });
          }
        });
      });
    } else if (action === 'connect') {
      // 엮기: 포커스 노드와 대상 노드 연결
      if (!focusNodeId || targetId === focusNodeId) return;
      KnittingDialog.prompt({
        title: '엮기',
        message: '이 둘이 연결되는 이유를 적어주세요 (선택)',
        placeholder: '이유나 느낌...',
        submitLabel: '엮기'
      }, function (why) {
        var fType = _nodeType(focusNodeId);
        var tType = _contextTarget.type;

        // 같은 층위면 해당 연결, 다른 층위면 교차 연결
        if (fType === 'fiber' && tType === 'fiber') {
          FiberAPI.createThread({
            fiber_a_id: focusNodeId,
            fiber_b_id: targetId,
            why: why || ''
          }).then(function () { setFocus(focusNodeId); });
        } else if (fType === 'thread' && tType === 'thread') {
          FiberAPI.createStitch({
            thread_a_id: focusNodeId,
            thread_b_id: targetId,
            why: why || ''
          }).then(function () { setFocus(focusNodeId); });
        } else {
          FiberAPI.createConnection({
            node_a_id: focusNodeId,
            node_b_id: targetId,
            why: why || ''
          }).then(function () { setFocus(focusNodeId); });
        }
      });
    } else if (action === 'detail') {
      if (typeof DetailPanel !== 'undefined' && DetailPanel.show) {
        DetailPanel.show(_contextTarget);
      }
    }

    _contextTarget = null;
  }

  // ── Tooltip ──

  function _showTooltip(text, x, y) {
    if (!$tooltip) return;
    $tooltip.textContent = text;
    $tooltip.style.left = (x + 12) + 'px';
    $tooltip.style.top = (y - 8) + 'px';
    $tooltip.classList.add('is-visible');
  }

  function _hideTooltip() {
    if ($tooltip) $tooltip.classList.remove('is-visible');
  }

  // ── Resize ──

  function _setupResize() {
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        if (focusNode) {
          _buildLayout(hintNodes.map(function (h) {
            return { node_id: h.node_id, type: h.type, detail: h.detail, similarity: h.similarity, signals: h.signals };
          }));
          _render();
        }
      });
      if ($canvas && $canvas.parentElement) ro.observe($canvas.parentElement);
    }
  }

  // ── Public API ──

  return {
    init: init,
    setFocus: setFocus,
    handleContextAction: handleContextAction,
    getFocusNodeId: function () { return focusNodeId; }
  };
})();
