/**
 * SensePoint - Sense Makers Page
 * 메모 시스템: 포스트잇 스타일 메모 블럭, 텍스트 하이라이트,
 * 컨텍스트 메뉴, 드래그 정렬, 로그인 연동
 */

(function () {
  'use strict';

  const articleBody = document.getElementById('articleBody');
  const articleContent = document.getElementById('articleContent');
  const memoList = document.getElementById('memoList');
  const memoAddBtn = document.getElementById('memoAddBtn');
  const sidebarHeader = document.getElementById('sidebarHeader');
  const memoSidebar = document.getElementById('memoSidebar');
  const contextMenu = document.getElementById('contextMenu');
  const contextMemoBtn = document.getElementById('contextMemo');
  const memoContextMenu = document.getElementById('memoContextMenu');
  const contextDeleteBtn = document.getElementById('contextDeleteMemo');

  let memos = [];
  let selectedMemoId = null;
  let pendingSelection = null;
  let memoCounter = 0;
  let draggedMemoId = null;
  let contextTargetMemoId = null;

  var VISIBILITY = {
    PRIVATE: 'private',
    FRIENDS: 'friends',
    PUBLIC: 'public',
  };

  var VISIBILITY_LABELS = {};
  VISIBILITY_LABELS[VISIBILITY.PRIVATE] = '나만보기';
  VISIBILITY_LABELS[VISIBILITY.FRIENDS] = '친구랑 보기';
  VISIBILITY_LABELS[VISIBILITY.PUBLIC] = '다같이 보기';

  var VISIBILITY_ICONS = {};
  VISIBILITY_ICONS[VISIBILITY.PRIVATE] = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  VISIBILITY_ICONS[VISIBILITY.FRIENDS] = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  VISIBILITY_ICONS[VISIBILITY.PUBLIC] = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

  var VISIBILITY_ORDER = [VISIBILITY.PRIVATE, VISIBILITY.FRIENDS, VISIBILITY.PUBLIC];

  // =========================================
  // Auth Check
  // =========================================

  function requireAuth() {
    if (window.SensePoint && window.SensePoint.isLoggedIn()) {
      return true;
    }
    window.location.href = 'login.html';
    return false;
  }

  // =========================================
  // Memo Data Management
  // =========================================

  var SHARED_MEMO_KEY = 'sensepoint_all_memos';

  function getArticleMeta() {
    var titleEl = document.querySelector('.sense-makers__article-title');
    var bodyEl = document.getElementById('articleBody');
    return {
      articleTitle: titleEl ? titleEl.textContent.trim() : '',
      articleContent: bodyEl ? bodyEl.innerText.trim() : '',
      articleHtml: bodyEl ? bodyEl.innerHTML : ''
    };
  }

  function syncMemoToShared(memo) {
    try {
      var all = JSON.parse(localStorage.getItem(SHARED_MEMO_KEY) || '[]');
      var idx = all.findIndex(function (m) { return m.id === memo.id; });
      var meta = getArticleMeta();
      var shared = {
        id: memo.id,
        type: memo.type,
        sourceText: memo.sourceText || '',
        note: memo.note || '',
        createdAt: memo.createdAt,
        visibility: memo.visibility || 'private',
        source: 'sense-makers',
        replies: memo.replies || [],
        articleTitle: meta.articleTitle,
        articleContent: meta.articleContent,
        articleHtml: meta.articleHtml
      };
      if (idx !== -1) {
        all[idx] = shared;
      } else {
        all.push(shared);
      }
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  function removeMemoFromShared(memoId) {
    try {
      var all = JSON.parse(localStorage.getItem(SHARED_MEMO_KEY) || '[]');
      all = all.filter(function (m) { return m.id !== memoId; });
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  function generateId() {
    return `memo_${++memoCounter}_${Date.now()}`;
  }

  function formatTime(date) {
    const d = new Date(date);
    const y = String(d.getFullYear()).slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}.${m}`;
  }

  function updateSidebarState() {
    if (memos.length > 0) {
      sidebarHeader.classList.add('has-memos');
      memoSidebar.classList.remove('no-memos');
    } else {
      sidebarHeader.classList.remove('has-memos');
      memoSidebar.classList.add('no-memos');
    }
  }

  // =========================================
  // Text Highlight
  // =========================================

  function createHighlightSpan(text, memoId) {
    const span = document.createElement('span');
    span.className = 'text-highlight';
    span.textContent = text;
    span.dataset.memoId = memoId;
    span.addEventListener('click', () => selectMemo(memoId));
    return span;
  }

  function applyHighlight(memoId) {
    const memo = memos.find((m) => m.id === memoId);
    if (!memo || !memo.range) return;

    try {
      const range = restoreRange(memo.range);
      if (!range) return;

      const span = createHighlightSpan(range.toString(), memoId);
      range.deleteContents();
      range.insertNode(span);
      memo.highlightEl = span;
    } catch (e) {
      // Range restoration might fail if DOM changed
    }
  }

  function removeHighlight(memoId) {
    const highlight = articleBody.querySelector(`[data-memo-id="${memoId}"]`);
    if (highlight) {
      const text = document.createTextNode(highlight.textContent);
      highlight.parentNode.replaceChild(text, highlight);
      text.parentNode.normalize();
    }
  }

  function serializeRange(range) {
    return {
      startContainer: getNodePath(range.startContainer),
      startOffset: range.startOffset,
      endContainer: getNodePath(range.endContainer),
      endOffset: range.endOffset,
      text: range.toString(),
    };
  }

  function getNodePath(node) {
    const path = [];
    let current = node;
    while (current && current !== articleBody) {
      const parent = current.parentNode;
      if (!parent) break;
      const index = Array.from(parent.childNodes).indexOf(current);
      path.unshift(index);
      current = parent;
    }
    return path;
  }

  function restoreRange(serialized) {
    try {
      const startNode = getNodeFromPath(serialized.startContainer);
      const endNode = getNodeFromPath(serialized.endContainer);
      if (!startNode || !endNode) return null;

      const range = document.createRange();
      range.setStart(startNode, Math.min(serialized.startOffset, startNode.length || startNode.childNodes.length));
      range.setEnd(endNode, Math.min(serialized.endOffset, endNode.length || endNode.childNodes.length));
      return range;
    } catch (e) {
      return null;
    }
  }

  function getNodeFromPath(path) {
    let node = articleBody;
    for (const index of path) {
      if (!node.childNodes[index]) return null;
      node = node.childNodes[index];
    }
    return node;
  }

  function scrollToHighlight(memoId) {
    const highlight = articleBody.querySelector(`[data-memo-id="${memoId}"]`);
    if (!highlight) return;
    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // =========================================
  // Context Menu — Article text right-click
  // =========================================

  articleBody.addEventListener('contextmenu', (e) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();
    if (!selectedText || selectedText.trim().length === 0) return;

    e.preventDefault();
    pendingSelection = {
      text: selectedText,
      range: selection.getRangeAt(0).cloneRange(),
    };
    showContextMenu(contextMenu, e.clientX, e.clientY);
  });

  contextMenu.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  memoContextMenu.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  function showContextMenu(menu, x, y) {
    hideAllContextMenus();
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('is-visible');
  }

  function hideAllContextMenus() {
    contextMenu.classList.remove('is-visible');
    memoContextMenu.classList.remove('is-visible');
    contextTargetMemoId = null;
  }

  contextMemoBtn.addEventListener('click', () => {
    if (pendingSelection) {
      if (!requireAuth()) {
        hideAllContextMenus();
        return;
      }
      createMemoFromSelection(pendingSelection);
      pendingSelection = null;
    }
    hideAllContextMenus();
  });

  // =========================================
  // Context Menu — Memo block right-click (delete)
  // =========================================

  contextDeleteBtn.addEventListener('click', () => {
    if (contextTargetMemoId) {
      deleteMemo(contextTargetMemoId);
      contextTargetMemoId = null;
    }
    hideAllContextMenus();
  });

  // =========================================
  // Memo Block CRUD
  // =========================================

  function createMemoFromSelection(sel) {
    const sourceText = sel.text || sel.range.toString() || '';
    const id = generateId();
    const memo = {
      id,
      type: sourceText ? 'excerpt' : 'empty',
      sourceText: sourceText,
      note: '',
      createdAt: Date.now(),
      range: sel.range ? serializeRange(sel.range) : null,
      highlightEl: null,
      visibility: VISIBILITY.PRIVATE,
    };

    memos.push(memo);
    renderMemoBlock(memo);
    updateSidebarState();
    syncMemoToShared(memo);
    if (memo.range) {
      applyHighlight(id);
    }
    selectMemo(id);
    window.getSelection().removeAllRanges();
  }

  function createEmptyMemo() {
    if (!requireAuth()) return;

    const id = generateId();
    const memo = {
      id,
      type: 'empty',
      sourceText: '',
      note: '',
      createdAt: Date.now(),
      range: null,
      highlightEl: null,
      visibility: VISIBILITY.PRIVATE,
    };

    memos.push(memo);
    renderMemoBlock(memo);
    updateSidebarState();
    syncMemoToShared(memo);
    selectMemo(id);

    const block = memoList.querySelector(`[data-id="${id}"]`);
    if (block) {
      const textarea = block.querySelector('.memo-block__note');
      if (textarea) textarea.focus();
    }
  }

  function deleteMemo(id) {
    removeHighlight(id);
    memos = memos.filter((m) => m.id !== id);
    removeMemoFromShared(id);

    const block = memoList.querySelector(`[data-id="${id}"]`);
    if (block) {
      block.style.opacity = '0';
      block.style.transform = 'translateX(20px)';
      setTimeout(() => {
        block.remove();
        updateSidebarState();
      }, 200);
    }

    if (selectedMemoId === id) {
      selectedMemoId = null;
    }
  }

  function selectMemo(id) {
    if (selectedMemoId === id) return;

    if (selectedMemoId) {
      deselectMemo(selectedMemoId);
    }

    selectedMemoId = id;

    const block = memoList.querySelector(`[data-id="${id}"]`);
    if (block) {
      block.classList.add('is-selected');
      block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const highlight = articleBody.querySelector(`[data-memo-id="${id}"]`);
    if (highlight) {
      highlight.classList.add('is-active');
      scrollToHighlight(id);
    }
  }

  function deselectMemo(id) {
    if (!id) id = selectedMemoId;
    if (!id) return;

    const block = memoList.querySelector(`[data-id="${id}"]`);
    if (block) block.classList.remove('is-selected');

    const highlight = articleBody.querySelector(`[data-memo-id="${id}"]`);
    if (highlight) highlight.classList.remove('is-active');

    if (selectedMemoId === id) {
      selectedMemoId = null;
    }
  }

  // =========================================
  // Memo Block Rendering
  // =========================================

  function buildVisibilityDropdownHTML(currentVisibility) {
    var items = VISIBILITY_ORDER.map(function (v) {
      var activeClass = v === currentVisibility ? ' is-active' : '';
      var disabledAttr = v === VISIBILITY.FRIENDS ? ' data-disabled="true"' : '';
      return (
        '<div class="visibility-dropdown__item' + activeClass + '" data-value="' + v + '"' + disabledAttr + '>' +
        '<span class="visibility-dropdown__item-icon">' + VISIBILITY_ICONS[v] + '</span>' +
        '<span class="visibility-dropdown__item-label">' + VISIBILITY_LABELS[v] + '</span>' +
        (v === VISIBILITY.FRIENDS ? '<span class="visibility-dropdown__item-badge">준비중</span>' : '') +
        '</div>'
      );
    }).join('');
    return '<div class="visibility-dropdown">' + items + '</div>';
  }

  function renderMemoBlock(memo) {
    const block = document.createElement('div');
    block.className = 'memo-block';
    block.dataset.id = memo.id;
    block.dataset.type = memo.type;

    block.innerHTML = `
      <div class="memo-block__fold" draggable="true"></div>
      <div class="memo-block__deselect-zone"></div>
      <div class="memo-block__body">
        <textarea class="memo-block__note" placeholder="메모를 작성하세요...">${escapeHtml(memo.note)}</textarea>
      </div>
      <div class="memo-block__footer">
        <button class="memo-block__visibility" data-visibility="${memo.visibility}" title="${VISIBILITY_LABELS[memo.visibility]}">
          <span class="memo-block__visibility-icon">${VISIBILITY_ICONS[memo.visibility]}</span>
          <span class="memo-block__visibility-label">${VISIBILITY_LABELS[memo.visibility]}</span>
        </button>
        <span class="memo-block__time">${formatTime(memo.createdAt)}</span>
      </div>
    `;

    // Click to select (not on fold, deselect zone, or textarea)
    block.addEventListener('click', (e) => {
      if (e.target.closest('.memo-block__fold')) return;
      if (e.target.closest('.memo-block__deselect-zone')) return;
      if (e.target.closest('.memo-block__note')) return;
      if (selectedMemoId === memo.id) {
        scrollToHighlight(memo.id);
      } else {
        selectMemo(memo.id);
      }
    });

    // Right-click for delete context menu
    block.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(memoContextMenu, e.clientX, e.clientY);
      contextTargetMemoId = memo.id;
    });

    // Textarea
    const textarea = block.querySelector('.memo-block__note');
    textarea.addEventListener('input', () => {
      memo.note = textarea.value;
      syncMemoToShared(memo);
    });
    textarea.addEventListener('focus', () => selectMemo(memo.id));
    textarea.addEventListener('click', (e) => e.stopPropagation());

    // Visibility toggle
    const visBtn = block.querySelector('.memo-block__visibility');
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVisibilityDropdown(memo, block);
    });

    // Deselect zone
    const deselectZone = block.querySelector('.memo-block__deselect-zone');
    deselectZone.addEventListener('click', (e) => {
      e.stopPropagation();
      deselectMemo(memo.id);
    });

    // Fold — click toggles select, drag reorders
    const fold = block.querySelector('.memo-block__fold');

    fold.addEventListener('click', (e) => {
      e.stopPropagation();
      if (block.classList.contains('is-selected')) {
        deselectMemo(memo.id);
      } else {
        selectMemo(memo.id);
      }
    });

    fold.addEventListener('dragstart', (e) => {
      draggedMemoId = memo.id;
      block.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', memo.id);
      setTimeout(() => {
        block.style.opacity = '0.4';
      }, 0);
    });

    fold.addEventListener('dragend', () => {
      block.classList.remove('is-dragging');
      block.style.opacity = '';
      draggedMemoId = null;
      memoList.querySelectorAll('.memo-block--drag-over').forEach((el) => {
        el.classList.remove('memo-block--drag-over');
      });
    });

    memoList.appendChild(block);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =========================================
  // Visibility Dropdown
  // =========================================

  function toggleVisibilityDropdown(memo, block) {
    var existing = block.querySelector('.visibility-dropdown');
    if (existing) {
      existing.remove();
      return;
    }
    closeAllVisibilityDropdowns();

    var visBtn = block.querySelector('.memo-block__visibility');
    var dropdownHTML = buildVisibilityDropdownHTML(memo.visibility);
    visBtn.insertAdjacentHTML('afterend', dropdownHTML);

    var dropdown = block.querySelector('.visibility-dropdown');
    var items = dropdown.querySelectorAll('.visibility-dropdown__item');
    items.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        if (item.dataset.disabled === 'true') return;
        var newVal = item.dataset.value;
        memo.visibility = newVal;
        updateVisibilityUI(block, newVal);
        syncMemoToShared(memo);
        dropdown.remove();
      });
    });

    requestAnimationFrame(function () {
      dropdown.classList.add('is-open');
    });
  }

  function updateVisibilityUI(block, visibility) {
    var btn = block.querySelector('.memo-block__visibility');
    btn.dataset.visibility = visibility;
    btn.title = VISIBILITY_LABELS[visibility];
    btn.querySelector('.memo-block__visibility-icon').innerHTML = VISIBILITY_ICONS[visibility];
    btn.querySelector('.memo-block__visibility-label').textContent = VISIBILITY_LABELS[visibility];
  }

  function closeAllVisibilityDropdowns() {
    document.querySelectorAll('.visibility-dropdown').forEach(function (d) {
      d.remove();
    });
  }

  // =========================================
  // Drag and Drop Reorder
  // =========================================

  memoList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(e.clientY);
    const draggable = memoList.querySelector(`[data-id="${draggedMemoId}"]`);
    if (!draggable) return;

    memoList.querySelectorAll('.memo-block--drag-over').forEach((el) => {
      el.classList.remove('memo-block--drag-over');
    });

    if (afterElement == null) {
      memoList.appendChild(draggable);
    } else {
      afterElement.classList.add('memo-block--drag-over');
      memoList.insertBefore(draggable, afterElement);
    }
  });

  memoList.addEventListener('drop', (e) => {
    e.preventDefault();
    const blocks = memoList.querySelectorAll('.memo-block');
    const newOrder = [];
    blocks.forEach((block) => {
      const memo = memos.find((m) => m.id === block.dataset.id);
      if (memo) newOrder.push(memo);
    });
    memos = newOrder;

    memoList.querySelectorAll('.memo-block--drag-over').forEach((el) => {
      el.classList.remove('memo-block--drag-over');
    });
  });

  function getDragAfterElement(y) {
    const elements = [...memoList.querySelectorAll('.memo-block:not(.is-dragging)')];

    return elements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  // =========================================
  // Add Memo Button
  // =========================================

  memoAddBtn.addEventListener('click', () => {
    createEmptyMemo();
  });

  // =========================================
  // Global Click — Deselect & Hide Menus
  // =========================================

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && !memoContextMenu.contains(e.target)) {
      hideAllContextMenus();
    }

    if (!e.target.closest('.visibility-dropdown') && !e.target.closest('.memo-block__visibility')) {
      closeAllVisibilityDropdowns();
    }

    if (
      selectedMemoId &&
      !e.target.closest('.sense-makers__sidebar') &&
      !e.target.closest('.context-menu') &&
      !e.target.closest('.text-highlight')
    ) {
      deselectMemo();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAllContextMenus();
      if (selectedMemoId) deselectMemo();
    }
  });

  // =========================================
  // 담벼락 (Wall)
  // =========================================

  var wallPreviewCard = document.getElementById('wallPreviewCard');
  var wallPreviewEmpty = document.getElementById('wallPreviewEmpty');
  var sidebarMemoView = document.getElementById('sidebarMemoView');
  var sidebarWallView = document.getElementById('sidebarWallView');
  var wallList = document.getElementById('wallList');
  var wallListEmpty = document.getElementById('wallListEmpty');
  var wallBackBtn = document.getElementById('wallBackBtn');
  var isWallMode = false;
  var wallFilter = VISIBILITY.FRIENDS;

  var sampleWallMemos = [
    {
      id: 'wall_1',
      author: '독서하는곰',
      avatarInitial: '곰',
      note: '감각의 교차점이라는 표현이 정말 와닿았어요. 요즘 음악을 들으면서 글을 쓰는데, 확실히 다른 결과물이 나오는 것 같습니다.',
      sourceText: '감각은 서로 교차하고 융합하며, 그 과정에서 예상치 못한 통찰이 탄생합니다.',
      createdAt: Date.now() - 3600000 * 2,
      visibility: VISIBILITY.PUBLIC,
      replies: [
        { id: 'r1', author: '나', avatarInitial: '나', note: '저도 비슷한 경험이 있어요. 재즈 틀어놓고 글 쓰면 문장이 달라지더라고요.', createdAt: Date.now() - 3600000 },
      ],
    },
    {
      id: 'wall_2',
      author: '센스헌터',
      avatarInitial: '센',
      note: '칸딘스키의 공감각 이야기는 항상 흥미롭네요. 색에서 소리를 듣는다는 건 어떤 느낌일까.',
      sourceText: '음악가 바실리 칸딘스키는 색채에서 소리를 들었고',
      createdAt: Date.now() - 3600000 * 8,
      visibility: VISIBILITY.PUBLIC,
      replies: [],
    },
    {
      id: 'wall_3',
      author: '일상관찰자',
      avatarInitial: '관',
      note: '매일 출근길에 이어폰을 빼고 걸어보기로 했습니다. 의식적인 주의라는 게 생각보다 어렵지만 확실히 다른 세상이 보여요.',
      sourceText: '',
      createdAt: Date.now() - 86400000,
      visibility: VISIBILITY.PUBLIC,
      replies: [],
    },
    {
      id: 'wall_4',
      author: '감성여행자',
      avatarInitial: '감',
      note: '와비사비 미학 부분이 인상적이네요. 불완전함을 수용하는 태도가 오히려 풍요로움을 만든다는 게 참 역설적이에요.',
      sourceText: '일본의 와비사비 미학은 불완전함 속에서 아름다움을 찾습니다.',
      createdAt: Date.now() - 86400000 * 3,
      visibility: VISIBILITY.FRIENDS,
      replies: [],
    },
    {
      id: 'wall_5',
      author: '커피러버',
      avatarInitial: '커',
      note: '아침마다 커피 내리면서 향을 음미하는 습관이 있는데, 이게 감각 훈련이었다니! 앞으로 더 의식적으로 해봐야겠어요.',
      sourceText: '매일 마시는 커피의 향을 의식적으로 음미하거나',
      createdAt: Date.now() - 86400000 * 2,
      visibility: VISIBILITY.FRIENDS,
      replies: [],
    },
  ];

  var replyCounter = 0;

  function addReplyToWallMemo(wallMemoId, noteText) {
    var memo = sampleWallMemos.find(function (m) { return m.id === wallMemoId; });
    if (!memo) return null;

    var reply = {
      id: 'reply_' + (++replyCounter) + '_' + Date.now(),
      author: '나',
      avatarInitial: '나',
      note: noteText,
      createdAt: Date.now(),
    };
    memo.replies.push(reply);

    syncWallReplyToShared(memo, reply);
    return reply;
  }

  function syncWallReplyToShared(wallMemo, reply) {
    try {
      var meta = getArticleMeta();
      var all = JSON.parse(localStorage.getItem(SHARED_MEMO_KEY) || '[]');
      var sharedReply = {
        id: 'sm_reply_' + reply.id,
        type: 'reply',
        sourceText: wallMemo.note || '',
        note: reply.note,
        createdAt: reply.createdAt,
        visibility: 'private',
        source: 'sense-makers',
        originalAuthor: wallMemo.author || '',
        articleTitle: meta.articleTitle,
        articleContent: meta.articleContent,
        articleHtml: meta.articleHtml,
        replies: []
      };
      all.push(sharedReply);
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  function getFilteredWallMemos(filter) {
    var filtered;
    if (filter === VISIBILITY.FRIENDS) {
      filtered = sampleWallMemos.filter(function (m) {
        return m.visibility === VISIBILITY.FRIENDS || m.visibility === VISIBILITY.PUBLIC;
      });
    } else {
      filtered = sampleWallMemos.filter(function (m) {
        return m.visibility === VISIBILITY.PUBLIC;
      });
    }
    filtered.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return filtered;
  }

  function buildWallCardHTML(m, opts) {
    opts = opts || {};
    var isSidebar = opts.sidebar === true;
    var hasSource = m.sourceText ? ' data-has-source="true"' : '';
    var sourceAttr = m.sourceText
      ? ' data-source-text="' + escapeHtml(m.sourceText).replace(/"/g, '&quot;') + '"'
      : '';
    var excerptHTML = m.sourceText
      ? '<div class="wall-card__excerpt">' + escapeHtml(m.sourceText) + '</div>'
      : '';

    var repliesHTML = '';
    var replyActionHTML = '';

    if (isSidebar) {
      var replies = m.replies || [];
      if (replies.length > 0) {
        var replyItems = replies.map(function (r) {
          return (
            '<div class="wall-reply">' +
              '<div class="wall-reply__header">' +
                '<span class="wall-reply__avatar">' + escapeHtml(r.avatarInitial) + '</span>' +
                '<span class="wall-reply__author">' + escapeHtml(r.author) + '</span>' +
                '<span class="wall-reply__time">' + formatTime(r.createdAt) + '</span>' +
              '</div>' +
              '<p class="wall-reply__note">' + escapeHtml(r.note) + '</p>' +
            '</div>'
          );
        }).join('');
        repliesHTML = '<div class="wall-card__replies">' + replyItems + '</div>';
      }

      replyActionHTML =
        '<div class="wall-card__reply-action" data-wall-id="' + m.id + '">' +
          '<button class="wall-card__reply-btn">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
            '<span>메모에 메모하기</span>' +
          '</button>' +
          '<div class="wall-card__reply-form" style="display:none">' +
            '<textarea class="wall-card__reply-input" placeholder="이 메모에 대한 생각을 남겨보세요..." rows="2"></textarea>' +
            '<div class="wall-card__reply-form-actions">' +
              '<button class="wall-card__reply-cancel">취소</button>' +
              '<button class="wall-card__reply-submit">등록</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    return (
      '<div class="wall-card"' + hasSource + sourceAttr + ' data-wall-id="' + m.id + '">' +
        '<div class="wall-card__header">' +
          '<span class="wall-card__avatar">' + escapeHtml(m.avatarInitial) + '</span>' +
          '<span class="wall-card__author">' + escapeHtml(m.author) + '</span>' +
          '<span class="wall-card__time">' + formatTime(m.createdAt) + '</span>' +
        '</div>' +
        excerptHTML +
        '<p class="wall-card__note">' + escapeHtml(m.note) + '</p>' +
        repliesHTML +
        replyActionHTML +
      '</div>'
    );
  }

  function findTextInArticle(searchText) {
    if (!searchText || !articleBody) return null;

    var treeWalker = document.createTreeWalker(
      articleBody,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    var fullText = '';
    var textNodes = [];
    var node;
    while ((node = treeWalker.nextNode())) {
      textNodes.push({ node: node, start: fullText.length });
      fullText += node.textContent;
    }

    var idx = fullText.indexOf(searchText);
    if (idx === -1) return null;

    var startInfo = null;
    var endInfo = null;
    var endIdx = idx + searchText.length;

    for (var i = 0; i < textNodes.length; i++) {
      var tn = textNodes[i];
      var tnEnd = tn.start + tn.node.textContent.length;
      if (!startInfo && idx < tnEnd) {
        startInfo = { node: tn.node, offset: idx - tn.start };
      }
      if (!endInfo && endIdx <= tnEnd) {
        endInfo = { node: tn.node, offset: endIdx - tn.start };
        break;
      }
    }

    if (!startInfo || !endInfo) return null;

    var range = document.createRange();
    range.setStart(startInfo.node, startInfo.offset);
    range.setEnd(endInfo.node, endInfo.offset);
    return range;
  }

  function scrollToWallSource(sourceText) {
    var existing = articleBody.querySelector('.wall-temp-highlight');
    if (existing) {
      var txt = document.createTextNode(existing.textContent);
      existing.parentNode.replaceChild(txt, existing);
      txt.parentNode.normalize();
    }

    var range = findTextInArticle(sourceText);
    if (!range) return;

    var span = document.createElement('span');
    span.className = 'wall-temp-highlight';
    range.surroundContents(span);

    span.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function () {
      span.classList.add('is-fading');
    }, 1800);

    setTimeout(function () {
      if (span.parentNode) {
        var t = document.createTextNode(span.textContent);
        span.parentNode.replaceChild(t, span);
        t.parentNode.normalize();
      }
    }, 2800);
  }

  function renderWallPreview() {
    var filtered = getFilteredWallMemos(wallFilter);

    if (filtered.length === 0) {
      wallPreviewCard.innerHTML = '';
      wallPreviewCard.style.display = 'none';
      wallPreviewEmpty.style.display = '';
      return;
    }

    wallPreviewEmpty.style.display = 'none';
    wallPreviewCard.style.display = '';

    var latest = filtered[0];
    var countText = filtered.length > 1
      ? '<span class="wall-preview__count">' + filtered.length + '개의 메모 모두 보기</span>'
      : '';

    wallPreviewCard.innerHTML = buildWallCardHTML(latest) + countText;
  }

  function renderWallSidebar() {
    var filtered = getFilteredWallMemos(wallFilter);

    if (filtered.length === 0) {
      wallList.innerHTML = '';
      wallListEmpty.style.display = '';
      return;
    }

    wallListEmpty.style.display = 'none';
    wallList.innerHTML = filtered.map(function (m) {
      return buildWallCardHTML(m, { sidebar: true });
    }).join('');

    bindWallCardEvents();
  }

  function bindWallCardEvents() {
    wallList.querySelectorAll('.wall-card[data-has-source]').forEach(function (card) {
      var excerptEl = card.querySelector('.wall-card__excerpt');
      if (excerptEl) {
        excerptEl.style.cursor = 'pointer';
        excerptEl.addEventListener('click', function (e) {
          e.stopPropagation();
          scrollToWallSource(card.dataset.sourceText);
        });
      }
    });

    wallList.querySelectorAll('.wall-card__reply-action').forEach(function (action) {
      var wallId = action.dataset.wallId;
      var btn = action.querySelector('.wall-card__reply-btn');
      var form = action.querySelector('.wall-card__reply-form');
      var input = action.querySelector('.wall-card__reply-input');
      var cancelBtn = action.querySelector('.wall-card__reply-cancel');
      var submitBtn = action.querySelector('.wall-card__reply-submit');

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        btn.style.display = 'none';
        form.style.display = '';
        input.focus();
      });

      cancelBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        input.value = '';
        form.style.display = 'none';
        btn.style.display = '';
      });

      submitBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var text = input.value.trim();
        if (!text) return;

        addReplyToWallMemo(wallId, text);
        renderWallSidebar();
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitBtn.click();
        }
        if (e.key === 'Escape') {
          cancelBtn.click();
        }
      });

      input.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    });
  }

  function openWallMode() {
    isWallMode = true;
    sidebarMemoView.style.display = 'none';
    sidebarWallView.classList.add('is-active');
    memoSidebar.classList.add('wall-mode');
    renderWallSidebar();
  }

  function closeWallMode() {
    isWallMode = false;
    sidebarWallView.classList.remove('is-active');
    sidebarMemoView.style.display = '';
    memoSidebar.classList.remove('wall-mode');
  }

  function setWallFilter(filter) {
    wallFilter = filter;

    document.querySelectorAll('.wall-preview__filter-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.filter === filter);
    });
    document.querySelectorAll('.sidebar-wall-view__filter-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.filter === filter);
    });

    renderWallPreview();
    if (isWallMode) renderWallSidebar();
  }

  // 하단 프리뷰 카드 클릭 → 담벼락 모드 열기
  wallPreviewCard.addEventListener('click', function () {
    openWallMode();
  });

  // 사이드바 뒤로가기
  wallBackBtn.addEventListener('click', function () {
    closeWallMode();
  });

  // 하단 필터 탭
  document.querySelectorAll('.wall-preview__filter-tab').forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.stopPropagation();
      setWallFilter(tab.dataset.filter);
    });
  });

  // 사이드바 필터 탭
  document.querySelectorAll('.sidebar-wall-view__filter-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      setWallFilter(tab.dataset.filter);
    });
  });

  // =========================================
  // Square → 플로팅 메모 패널
  // =========================================

  (function initSquareFloating() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'square') return;

    var floatingEl = document.getElementById('squareFloating');
    var cardEl = document.getElementById('squareFloatingCard');
    if (!floatingEl || !cardEl) return;

    var encoded = params.get('memo');
    if (!encoded) return;

    var memoData;
    try {
      var json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
      memoData = JSON.parse(json);
    } catch (e) { return; }

    floatingEl.style.display = '';

    // ---- 접기 / 펼치기 ----
    var toggleBtn = document.getElementById('squareFloatingToggle');
    toggleBtn.addEventListener('click', function () {
      floatingEl.classList.toggle('is-collapsed');
    });

    // ---- 드래그 이동 ----
    (function initDrag() {
      var handle = document.getElementById('squareFloatingDragHandle');
      var isDragging = false;
      var offsetX = 0;
      var offsetY = 0;

      handle.addEventListener('mousedown', function (e) {
        isDragging = true;
        var rect = floatingEl.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        floatingEl.classList.add('is-dragging');
        e.preventDefault();
      });

      document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        var x = e.clientX - offsetX;
        var y = e.clientY - offsetY;

        var maxX = window.innerWidth - floatingEl.offsetWidth;
        var maxY = window.innerHeight - 40;
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        floatingEl.style.left = x + 'px';
        floatingEl.style.top = y + 'px';
      });

      document.addEventListener('mouseup', function () {
        if (!isDragging) return;
        isDragging = false;
        floatingEl.classList.remove('is-dragging');
      });
    })();

    var REPLY_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    var sourceHTML = memoData.sourceText
      ? '<div class="square-floating__source">' + escapeHtml(memoData.sourceText) + '</div>'
      : '';

    var myReplies = (memoData.replies || []).filter(function (r) { return r.author === '나'; });
    var repliesHTML = '';
    if (myReplies.length > 0) {
      var items = myReplies.map(function (r) {
        return (
          '<div class="square-floating__reply">' +
            '<div class="square-floating__reply-header">' +
              '<span class="square-floating__reply-avatar">' + escapeHtml(r.avatarInitial) + '</span>' +
              '<span class="square-floating__reply-author">' + escapeHtml(r.author) + '</span>' +
            '</div>' +
            '<p class="square-floating__reply-note">' + escapeHtml(r.note) + '</p>' +
          '</div>'
        );
      }).join('');
      repliesHTML = '<div class="square-floating__replies">' + items + '</div>';
    }

    cardEl.innerHTML =
      '<div class="square-floating__card-header">' +
        '<span class="square-floating__avatar">' + escapeHtml(memoData.avatarInitial) + '</span>' +
        '<span class="square-floating__author">' + escapeHtml(memoData.author) + '</span>' +
      '</div>' +
      sourceHTML +
      '<p class="square-floating__note">' + escapeHtml(memoData.note) + '</p>' +
      repliesHTML +
      '<div class="square-floating__reply-action">' +
        '<button class="square-floating__reply-btn">' +
          REPLY_ICON +
          '<span>메모에 메모하기</span>' +
        '</button>' +
        '<div class="square-floating__reply-form" style="display:none">' +
          '<textarea class="square-floating__reply-input" placeholder="이 메모에 대한 생각을 남겨보세요..." rows="2"></textarea>' +
          '<div class="square-floating__reply-form-actions">' +
            '<button class="square-floating__reply-cancel">취소</button>' +
            '<button class="square-floating__reply-submit">등록</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var replyBtn = cardEl.querySelector('.square-floating__reply-btn');
    var replyForm = cardEl.querySelector('.square-floating__reply-form');
    var replyInput = cardEl.querySelector('.square-floating__reply-input');
    var cancelBtn = cardEl.querySelector('.square-floating__reply-cancel');
    var submitBtn = cardEl.querySelector('.square-floating__reply-submit');

    replyBtn.addEventListener('click', function () {
      replyBtn.style.display = 'none';
      replyForm.style.display = '';
      replyInput.focus();
    });

    cancelBtn.addEventListener('click', function () {
      replyInput.value = '';
      replyForm.style.display = 'none';
      replyBtn.style.display = '';
    });

    submitBtn.addEventListener('click', function () {
      var text = replyInput.value.trim();
      if (!text) return;

      var replyEl = document.createElement('div');
      replyEl.className = 'square-floating__reply';
      replyEl.innerHTML =
        '<div class="square-floating__reply-header">' +
          '<span class="square-floating__reply-avatar">나</span>' +
          '<span class="square-floating__reply-author">나</span>' +
        '</div>' +
        '<p class="square-floating__reply-note">' + escapeHtml(text) + '</p>';

      var repliesContainer = cardEl.querySelector('.square-floating__replies');
      if (!repliesContainer) {
        repliesContainer = document.createElement('div');
        repliesContainer.className = 'square-floating__replies';
        cardEl.querySelector('.square-floating__reply-action').before(repliesContainer);
      }
      repliesContainer.appendChild(replyEl);

      try {
        var meta = getArticleMeta();
        var all = JSON.parse(localStorage.getItem(SHARED_MEMO_KEY) || '[]');
        all.push({
          id: 'sm_float_reply_' + Date.now(),
          type: 'reply',
          sourceText: memoData.note || '',
          note: text,
          createdAt: Date.now(),
          visibility: 'private',
          source: 'sense-makers',
          originalAuthor: memoData.author || '',
          articleTitle: meta.articleTitle || memoData.articleTitle || '',
          articleContent: meta.articleContent,
          articleHtml: meta.articleHtml,
          replies: []
        });
        localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
      } catch (e) { /* noop */ }

      replyInput.value = '';
      replyForm.style.display = 'none';
      replyBtn.style.display = '';
    });

    replyInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitBtn.click();
      }
      if (e.key === 'Escape') cancelBtn.click();
    });

    if (memoData.sourceText) {
      setTimeout(function () {
        highlightSquareSource(memoData.sourceText);
      }, 300);
    }

    function highlightSquareSource(searchText) {
      var range = findTextInArticle(searchText);
      if (!range) return;

      var span = document.createElement('span');
      span.className = 'square-source-highlight';
      try {
        range.surroundContents(span);
      } catch (e) {
        return;
      }
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  })();

  // =========================================
  // Initialize
  // =========================================

  updateSidebarState();
  setWallFilter(VISIBILITY.FRIENDS);
})();
