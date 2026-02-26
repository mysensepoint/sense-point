/**
 * SensePoint - My Note
 * Smart Memo Hub: 검색, 멀티뷰, 핀, 컬러태그, 정렬
 */

(function () {
  'use strict';

  // =========================================
  // State
  // =========================================

  var notes = [];
  var memos = [];
  var currentNoteId = null;
  var currentType = 'blank';
  var selectedMemoId = null;
  var pendingSelection = null;
  var memoCounter = 0;
  var draggedMemoId = null;
  var contextTargetMemoId = null;

  var STORAGE_KEY = 'sensepoint_notes';
  var SHARED_MEMO_KEY = 'sensepoint_all_memos';

  // Smart Memo Hub state
  var currentFilter = 'all';
  var currentView = 'stream';
  var currentSort = 'newest';
  var currentTagFilter = 'all';
  var searchQuery = '';
  var searchDebounceTimer = null;
  var pinnedCollapsed = false;
  var collapsedGroups = {};

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

  var COLOR_TAGS = ['coral', 'blue', 'green', 'purple', 'orange'];

  var COLOR_TAG_CSS = {
    coral: 'var(--color-tag-coral)',
    blue: 'var(--color-tag-blue)',
    green: 'var(--color-tag-green)',
    purple: 'var(--color-tag-purple)',
    orange: 'var(--color-tag-orange)',
  };

  var SOURCE_LABELS = {
    'my-note': 'My Note',
    'sense-makers': 'Sense Makers',
    'square': 'Square'
  };

  var SORT_LABELS = {
    newest: '최신순',
    oldest: '오래된순',
    updated: '최근 수정순'
  };

  var FILTER_LABELS = {
    'all': '전체',
    'my-note': 'My Note',
    'sense-makers': 'Sense Makers',
    'square': 'Square'
  };

  // =========================================
  // DOM References
  // =========================================

  var noteTypeSwitch = document.getElementById('noteTypeSwitch');
  var typeBtns = noteTypeSwitch.querySelectorAll('.my-note__type-btn');
  var blankNote = document.getElementById('blankNote');
  var templateNote = document.getElementById('templateNote');
  var blankTitle = document.getElementById('blankTitle');
  var blankContent = document.getElementById('blankContent');
  var templateTitle = document.getElementById('templateTitle');
  var templateForm = document.getElementById('templateForm');
  var newNoteBtn = document.getElementById('newNoteBtn');
  var saveNoteBtn = document.getElementById('saveNoteBtn');

  var tabNotes = document.getElementById('tabNotes');
  var tabMemos = document.getElementById('tabMemos');
  var panelNotes = document.getElementById('panelNotes');
  var panelMemos = document.getElementById('panelMemos');
  var notesList = document.getElementById('notesList');
  var memosList = document.getElementById('memosList');
  var notesEmpty = document.getElementById('notesEmpty');
  var memosEmpty = document.getElementById('memosEmpty');
  var memoAddBtn = document.getElementById('memoAddBtn');

  // Search
  var memoSearch = document.getElementById('memoSearch');
  var searchToggle = document.getElementById('searchToggle');
  var searchInput = document.getElementById('searchInput');
  var searchClear = document.getElementById('searchClear');

  // View modes
  var viewModes = document.getElementById('viewModes');
  var viewBtns = viewModes.querySelectorAll('.my-note__view-btn');

  // Controls
  var sourceFilterWrapper = document.getElementById('sourceFilterWrapper');
  var sourceFilterBtn = document.getElementById('sourceFilterBtn');
  var sourceFilterLabel = document.getElementById('sourceFilterLabel');
  var sourceFilterDropdown = document.getElementById('sourceFilterDropdown');
  var sortWrapper = document.getElementById('sortWrapper');
  var sortBtn = document.getElementById('sortBtn');
  var sortLabel = document.getElementById('sortLabel');
  var sortDropdown = document.getElementById('sortDropdown');
  var tagFilterWrapper = document.getElementById('tagFilterWrapper');
  var tagFilterBtn = document.getElementById('tagFilterBtn');
  var tagFilterDropdown = document.getElementById('tagFilterDropdown');

  // Pinned section
  var pinnedSection = document.getElementById('pinnedSection');
  var pinnedHeader = document.getElementById('pinnedHeader');
  var pinnedList = document.getElementById('pinnedList');
  var pinnedCount = document.getElementById('pinnedCount');

  // Preview
  var noteBody = document.getElementById('noteBody');
  var notePreview = document.getElementById('notePreview');
  var previewBadge = document.getElementById('previewBadge');
  var previewTitle = document.getElementById('previewTitle');
  var previewBody = document.getElementById('previewBody');
  var previewClose = document.getElementById('previewClose');
  var noteToolbar = document.querySelector('.my-note__toolbar');

  // Context menus
  var contextMenu = document.getElementById('contextMenu');
  var contextMemoBtn = document.getElementById('contextMemo');
  var memoContextMenu = document.getElementById('memoContextMenu');
  var contextDeleteBtn = document.getElementById('contextDeleteMemo');
  var contextPinBtn = document.getElementById('contextPinMemo');
  var contextPinLabel = document.getElementById('contextPinLabel');
  var contextColorTag = document.getElementById('contextColorTag');

  // =========================================
  // LocalStorage Helpers
  // =========================================

  function loadNotes() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveNotesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) { /* noop */ }
  }

  function loadAllMemosFromShared() {
    try {
      var data = localStorage.getItem(SHARED_MEMO_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveMemosToShared() {
    try {
      var all = loadAllMemosFromShared();
      all = all.filter(function (m) { return m.source !== 'my-note'; });
      memos.forEach(function (m) {
        if (m.source === 'my-note') {
          all.push(m);
        }
      });
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  function syncSingleMemoToShared(memo) {
    try {
      var all = loadAllMemosFromShared();
      var idx = all.findIndex(function (m) { return m.id === memo.id; });
      if (idx !== -1) {
        all[idx] = memo;
      } else {
        all.push(memo);
      }
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  function removeMemoFromShared(memoId) {
    try {
      var all = loadAllMemosFromShared();
      all = all.filter(function (m) { return m.id !== memoId; });
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  // =========================================
  // Utility
  // =========================================

  function generateId() {
    return 'mn_' + (++memoCounter) + '_' + Date.now();
  }

  function generateNoteId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    return d.getFullYear() + '.' +
      (month < 10 ? '0' : '') + month + '.' +
      (day < 10 ? '0' : '') + day + ' ' +
      (hours < 10 ? '0' : '') + hours + ':' +
      (minutes < 10 ? '0' : '') + minutes;
  }

  function formatTimeShort(ts) {
    var d = new Date(ts);
    var y = String(d.getFullYear()).slice(2);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    return y + '.' + m;
  }

  function formatDateLabel(ts) {
    var d = new Date(ts);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    return month + '/' + day;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  // =========================================
  // Note Type Switch
  // =========================================

  function switchNoteType(type) {
    currentType = type;
    noteTypeSwitch.setAttribute('data-active', type);

    typeBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-type') === type);
    });

    if (type === 'blank') {
      blankNote.classList.add('is-active');
      templateNote.classList.remove('is-active');
    } else {
      blankNote.classList.remove('is-active');
      templateNote.classList.add('is-active');
    }
  }

  typeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchNoteType(btn.getAttribute('data-type'));
    });
  });

  // =========================================
  // Sidebar Tabs
  // =========================================

  function switchTab(tab) {
    var isNotes = tab === 'notes';

    tabNotes.classList.toggle('is-active', isNotes);
    tabMemos.classList.toggle('is-active', !isNotes);
    panelNotes.classList.toggle('is-active', isNotes);
    panelMemos.classList.toggle('is-active', !isNotes);
  }

  tabNotes.addEventListener('click', function () { switchTab('notes'); });
  tabMemos.addEventListener('click', function () { switchTab('memos'); });

  // =========================================
  // Editor: Get / Set Content
  // =========================================

  function getPlainText(el) {
    return el.innerText || el.textContent || '';
  }

  function getEditorData() {
    if (currentType === 'blank') {
      return {
        type: 'blank',
        title: blankTitle.value.trim(),
        content: getPlainText(blankContent).trim()
      };
    }

    var answers = {};
    var inputs = templateForm.querySelectorAll('.my-note__question-input');
    inputs.forEach(function (input) {
      answers['q' + input.getAttribute('data-question')] = input.value.trim();
    });

    return {
      type: 'template',
      title: templateTitle.value.trim(),
      answers: answers
    };
  }

  function setEditorData(note) {
    if (!note) return;

    switchNoteType(note.type);

    if (note.type === 'blank') {
      blankTitle.value = note.title || '';
      blankContent.textContent = note.content || '';
    } else {
      templateTitle.value = note.title || '';
      var inputs = templateForm.querySelectorAll('.my-note__question-input');
      inputs.forEach(function (input) {
        var key = 'q' + input.getAttribute('data-question');
        input.value = note.answers && note.answers[key] ? note.answers[key] : '';
      });
    }
  }

  function clearEditor() {
    blankTitle.value = '';
    blankContent.innerHTML = '';
    templateTitle.value = '';
    var inputs = templateForm.querySelectorAll('.my-note__question-input');
    inputs.forEach(function (input) {
      input.value = '';
    });
    currentNoteId = null;
  }

  // =========================================
  // Note: Create / Save / Delete / Load
  // =========================================

  function saveNote() {
    var data = getEditorData();

    if (!data.title && !data.content && !hasTemplateContent(data)) {
      return;
    }

    if (currentNoteId) {
      var idx = notes.findIndex(function (n) { return n.id === currentNoteId; });
      if (idx !== -1) {
        notes[idx] = Object.assign({}, notes[idx], data, { updatedAt: Date.now() });
      }
    } else {
      var newNote = Object.assign({}, data, {
        id: generateNoteId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      notes.unshift(newNote);
      currentNoteId = newNote.id;
    }

    saveNotesToStorage();
    renderNotesList();
    showSaveConfirm();
  }

  function hasTemplateContent(data) {
    if (data.type !== 'template' || !data.answers) return false;
    return Object.values(data.answers).some(function (v) { return v.length > 0; });
  }

  function deleteNote(id) {
    notes = notes.filter(function (n) { return n.id !== id; });
    saveNotesToStorage();

    if (currentNoteId === id) {
      clearEditor();
      switchNoteType('blank');
    }
    renderNotesList();
  }

  function loadNote(id) {
    var note = notes.find(function (n) { return n.id === id; });
    if (!note) return;
    currentNoteId = id;
    setEditorData(note);
    renderNotesList();
  }

  function showSaveConfirm() {
    saveNoteBtn.classList.add('is-saved');
    var span = saveNoteBtn.querySelector('span');
    var prevText = span.textContent;
    span.textContent = '저장됨';
    setTimeout(function () {
      saveNoteBtn.classList.remove('is-saved');
      span.textContent = prevText;
    }, 1200);
  }

  // =========================================
  // Text Highlight (contenteditable 전용)
  // =========================================

  function getNodePath(node) {
    var path = [];
    var current = node;
    while (current && current !== blankContent) {
      var parent = current.parentNode;
      if (!parent) break;
      var index = Array.from(parent.childNodes).indexOf(current);
      path.unshift(index);
      current = parent;
    }
    return path;
  }

  function getNodeFromPath(path) {
    var node = blankContent;
    for (var i = 0; i < path.length; i++) {
      if (!node.childNodes[path[i]]) return null;
      node = node.childNodes[path[i]];
    }
    return node;
  }

  function serializeRange(range) {
    return {
      startContainer: getNodePath(range.startContainer),
      startOffset: range.startOffset,
      endContainer: getNodePath(range.endContainer),
      endOffset: range.endOffset,
      text: range.toString()
    };
  }

  function restoreRange(serialized) {
    try {
      var startNode = getNodeFromPath(serialized.startContainer);
      var endNode = getNodeFromPath(serialized.endContainer);
      if (!startNode || !endNode) return null;

      var range = document.createRange();
      range.setStart(startNode, Math.min(serialized.startOffset, startNode.length || startNode.childNodes.length));
      range.setEnd(endNode, Math.min(serialized.endOffset, endNode.length || endNode.childNodes.length));
      return range;
    } catch (e) {
      return null;
    }
  }

  function createHighlightSpan(text, memoId) {
    var span = document.createElement('span');
    span.className = 'text-highlight';
    span.textContent = text;
    span.dataset.memoId = memoId;
    span.addEventListener('click', function () { selectMemo(memoId); });
    return span;
  }

  function applyHighlight(memoId) {
    var memo = memos.find(function (m) { return m.id === memoId; });
    if (!memo || !memo.range) return;

    try {
      var range = restoreRange(memo.range);
      if (!range) return;

      var span = createHighlightSpan(range.toString(), memoId);
      range.deleteContents();
      range.insertNode(span);
    } catch (e) {
      // DOM may have changed
    }
  }

  function removeHighlight(memoId) {
    var highlight = blankContent.querySelector('[data-memo-id="' + memoId + '"]');
    if (highlight) {
      var text = document.createTextNode(highlight.textContent);
      highlight.parentNode.replaceChild(text, highlight);
      text.parentNode.normalize();
    }
  }

  function scrollToHighlight(memoId) {
    var highlight = blankContent.querySelector('[data-memo-id="' + memoId + '"]');
    if (!highlight) return;

    var body = document.querySelector('.my-note__body');
    if (body) {
      var bodyRect = body.getBoundingClientRect();
      var hlRect = highlight.getBoundingClientRect();
      var targetScroll = body.scrollTop + (hlRect.top - bodyRect.top) - (bodyRect.height / 2) + (hlRect.height / 2);
      body.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else {
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    highlight.style.transition = 'background-color 0.3s';
    highlight.style.backgroundColor = 'rgba(200, 169, 110, 0.5)';
    setTimeout(function () {
      highlight.style.backgroundColor = '';
      highlight.style.transition = '';
    }, 1200);
  }

  // =========================================
  // Context Menu — Note text right-click
  // =========================================

  function isInsideNoteContent(node) {
    while (node) {
      if (node === blankContent) return true;
      if (node.classList && node.classList.contains('my-note__question-input')) return true;
      node = node.parentNode;
    }
    return false;
  }

  document.addEventListener('contextmenu', function (e) {
    if (!isInsideNoteContent(e.target)) return;

    var selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    var selectedText = selection.toString();
    if (!selectedText || selectedText.trim().length === 0) return;

    e.preventDefault();
    pendingSelection = {
      text: selectedText,
      range: selection.getRangeAt(0).cloneRange(),
      fromContentEditable: blankContent.contains(e.target)
    };
    showContextMenu(contextMenu, e.clientX, e.clientY);
  });

  contextMenu.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });

  memoContextMenu.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });

  function showContextMenu(menu, x, y) {
    hideAllContextMenus();
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('is-visible');
  }

  function hideAllContextMenus() {
    contextMenu.classList.remove('is-visible');
    memoContextMenu.classList.remove('is-visible');
    contextTargetMemoId = null;
  }

  contextMemoBtn.addEventListener('click', function () {
    if (pendingSelection) {
      createMemoFromSelection(pendingSelection);
      pendingSelection = null;
    }
    hideAllContextMenus();
  });

  // =========================================
  // Context Menu — Memo block (pin / color / delete)
  // =========================================

  contextDeleteBtn.addEventListener('click', function () {
    if (contextTargetMemoId) {
      deleteMemo(contextTargetMemoId);
      contextTargetMemoId = null;
    }
    hideAllContextMenus();
  });

  contextPinBtn.addEventListener('click', function () {
    if (contextTargetMemoId) {
      togglePinMemo(contextTargetMemoId);
      contextTargetMemoId = null;
    }
    hideAllContextMenus();
  });

  contextColorTag.addEventListener('click', function (e) {
    var dot = e.target.closest('.color-dot');
    if (!dot || !contextTargetMemoId) return;

    var color = dot.dataset.color;
    setMemoColorTag(contextTargetMemoId, color === 'none' ? null : color);
    contextTargetMemoId = null;
    hideAllContextMenus();
  });

  // =========================================
  // Memo CRUD
  // =========================================

  function getCurrentNoteSnapshot() {
    var data = getEditorData();
    return {
      noteId: currentNoteId || null,
      noteTitle: data.title || '',
      noteContent: currentType === 'blank'
        ? getPlainText(blankContent).trim()
        : Object.values(data.answers || {}).filter(Boolean).join('\n\n')
    };
  }

  function createMemoFromSelection(sel) {
    var sourceText = sel.text || sel.range.toString() || '';
    var id = generateId();
    var snap = getCurrentNoteSnapshot();
    var memo = {
      id: id,
      type: sourceText ? 'excerpt' : 'empty',
      sourceText: sourceText,
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      range: sel.fromContentEditable && sel.range ? serializeRange(sel.range) : null,
      visibility: VISIBILITY.PRIVATE,
      source: 'my-note',
      noteId: snap.noteId,
      noteTitle: snap.noteTitle,
      noteContent: snap.noteContent,
      replies: [],
      pinned: false,
      colorTag: null
    };

    memos.push(memo);
    syncSingleMemoToShared(memo);

    if (memo.range) {
      applyHighlight(id);
    }

    renderAllMemos();
    selectMemo(id);
    switchTab('memos');
    window.getSelection().removeAllRanges();
  }

  function createEmptyMemo() {
    var id = generateId();
    var snap = getCurrentNoteSnapshot();
    var memo = {
      id: id,
      type: 'empty',
      sourceText: '',
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      range: null,
      visibility: VISIBILITY.PRIVATE,
      source: 'my-note',
      noteId: snap.noteId,
      noteTitle: snap.noteTitle,
      noteContent: snap.noteContent,
      replies: [],
      pinned: false,
      colorTag: null
    };

    memos.push(memo);
    syncSingleMemoToShared(memo);
    renderAllMemos();
    selectMemo(id);

    var block = findMemoBlock(id);
    if (block) {
      var textarea = block.querySelector('.memo-block__note');
      if (textarea) textarea.focus();
    }
  }

  function findMemoBlock(id) {
    var el = memosList.querySelector('[data-id="' + id + '"]');
    if (!el) el = pinnedList.querySelector('[data-id="' + id + '"]');
    return el;
  }

  function deleteMemo(id) {
    removeHighlight(id);
    memos = memos.filter(function (m) { return m.id !== id; });
    removeMemoFromShared(id);

    var block = findMemoBlock(id);
    if (block) {
      block.style.opacity = '0';
      block.style.transform = 'translateX(20px)';
      setTimeout(function () {
        block.remove();
        updateMemoState();
      }, 200);
    }

    if (selectedMemoId === id) {
      selectedMemoId = null;
      hidePreview();
    }
  }

  function selectMemo(id) {
    if (selectedMemoId === id) return;

    if (selectedMemoId) {
      deselectMemo(selectedMemoId);
    }

    selectedMemoId = id;

    var block = findMemoBlock(id);
    if (block) {
      block.classList.add('is-selected');
      block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    var memo = memos.find(function (m) { return m.id === id; });
    if (memo) {
      showPreview(memo);
    }
  }

  function deselectMemo(id) {
    if (!id) id = selectedMemoId;
    if (!id) return;

    var block = findMemoBlock(id);
    if (block) block.classList.remove('is-selected');

    var highlight = blankContent.querySelector('[data-memo-id="' + id + '"]');
    if (highlight) highlight.classList.remove('is-active');

    hidePreview();

    if (selectedMemoId === id) {
      selectedMemoId = null;
    }
  }

  // =========================================
  // Pin System
  // =========================================

  function togglePinMemo(id) {
    var memo = memos.find(function (m) { return m.id === id; });
    if (!memo) return;
    memo.pinned = !memo.pinned;
    memo.updatedAt = Date.now();
    syncSingleMemoToShared(memo);
    renderAllMemos();
  }

  function setMemoColorTag(id, color) {
    var memo = memos.find(function (m) { return m.id === id; });
    if (!memo) return;
    memo.colorTag = color;
    memo.updatedAt = Date.now();
    syncSingleMemoToShared(memo);
    renderAllMemos();
  }

  // =========================================
  // Preview System
  // =========================================

  var previewActive = false;

  function showPreview(memo) {
    var src = memo.source || 'my-note';

    if (src === 'my-note') {
      showMyNotePreview(memo);
    } else if (src === 'sense-makers') {
      showSenseMakersPreview(memo);
    } else if (src === 'square') {
      showSquarePreview(memo);
    }
  }

  function activatePreview(source, title) {
    previewActive = true;
    previewBadge.textContent = SOURCE_LABELS[source] || source;
    previewBadge.dataset.source = source;
    previewTitle.textContent = title || '';
    notePreview.style.display = '';
    blankNote.style.display = 'none';
    templateNote.style.display = 'none';
    noteToolbar.style.display = 'none';
  }

  function hidePreview() {
    if (!previewActive) return;
    previewActive = false;
    notePreview.style.display = 'none';
    previewBody.innerHTML = '';
    noteToolbar.style.display = '';

    if (currentType === 'blank') {
      blankNote.style.display = '';
      blankNote.classList.add('is-active');
    } else {
      templateNote.style.display = '';
      templateNote.classList.add('is-active');
    }
  }

  previewClose.addEventListener('click', function () {
    if (selectedMemoId) deselectMemo(selectedMemoId);
  });

  function showMyNotePreview(memo) {
    if (memo.type === 'excerpt' && memo.noteContent) {
      activatePreview('my-note', memo.noteTitle || '내 노트');
      var html = buildHighlightedText(memo.noteContent, memo.sourceText);
      previewBody.innerHTML = html;
      scrollPreviewToHighlight();
    } else if (memo.type === 'excerpt' && memo.range) {
      var highlight = blankContent.querySelector('[data-memo-id="' + memo.id + '"]');
      if (highlight) {
        hidePreviewSilent();
        highlight.classList.add('is-active');
        scrollToHighlight(memo.id);
      }
    } else {
      activatePreview('my-note', memo.noteTitle || '메모');
      var noteText = memo.note || '(빈 메모)';
      previewBody.innerHTML = '<div class="preview-memo-card">' +
        '<p class="preview-memo-note">' + escapeHtml(noteText) + '</p>' +
        '</div>';
    }
  }

  function hidePreviewSilent() {
    previewActive = false;
    notePreview.style.display = 'none';
    previewBody.innerHTML = '';
    noteToolbar.style.display = '';
    if (currentType === 'blank') {
      blankNote.style.display = '';
      blankNote.classList.add('is-active');
    } else {
      templateNote.style.display = '';
      templateNote.classList.add('is-active');
    }
  }

  function showSenseMakersPreview(memo) {
    if (memo.type === 'reply' && memo.sourceText) {
      activatePreview('sense-makers', memo.articleTitle || '메모에 답글');
      var authorInfo = memo.originalAuthor
        ? '<div class="preview-memo-header">' +
            '<span class="preview-memo-author">' + escapeHtml(memo.originalAuthor) + '</span>' +
          '</div>'
        : '';
      previewBody.innerHTML =
        '<div class="preview-memo-card">' +
          authorInfo +
          '<p class="preview-memo-note">' + escapeHtml(memo.sourceText) + '</p>' +
        '</div>';
    } else if (memo.type === 'excerpt' && memo.articleHtml) {
      activatePreview('sense-makers', memo.articleTitle || '아티클');
      previewBody.innerHTML = highlightInHtml(memo.articleHtml, memo.sourceText);
      scrollPreviewToHighlight();
    } else if (memo.type === 'excerpt' && memo.articleContent) {
      activatePreview('sense-makers', memo.articleTitle || '아티클');
      var html = buildHighlightedText(memo.articleContent, memo.sourceText);
      previewBody.innerHTML = html;
      scrollPreviewToHighlight();
    } else {
      activatePreview('sense-makers', memo.articleTitle || '메모');
      var noteText = memo.note || '(빈 메모)';
      previewBody.innerHTML = '<div class="preview-memo-card">' +
        '<p class="preview-memo-note">' + escapeHtml(noteText) + '</p>' +
        '</div>';
    }
  }

  function showSquarePreview(memo) {
    if (memo.type === 'reply' && memo.sourceText) {
      activatePreview('square', memo.articleTitle || '메모');
      var authorInfo = memo.originalAuthor
        ? '<div class="preview-memo-header">' +
            '<span class="preview-memo-author">' + escapeHtml(memo.originalAuthor) + '</span>' +
          '</div>'
        : '';
      previewBody.innerHTML =
        '<div class="preview-memo-card">' +
          authorInfo +
          '<p class="preview-memo-note">' + escapeHtml(memo.sourceText) + '</p>' +
        '</div>';
    } else {
      activatePreview('square', '메모');
      previewBody.innerHTML = '<div class="preview-memo-card">' +
        '<p class="preview-memo-note">' + escapeHtml(memo.note || '(빈 메모)') + '</p>' +
        '</div>';
    }
  }

  function buildHighlightedText(fullText, excerpt) {
    if (!excerpt || !fullText) {
      var paragraphs = (fullText || '').split(/\n{2,}/);
      return paragraphs.map(function (p) {
        p = p.trim();
        if (!p) return '';
        return '<p>' + escapeHtml(p) + '</p>';
      }).join('');
    }

    var idx = fullText.indexOf(excerpt);
    if (idx === -1) {
      var paragraphs = fullText.split(/\n{2,}/);
      return paragraphs.map(function (p) {
        p = p.trim();
        if (!p) return '';
        return '<p>' + escapeHtml(p) + '</p>';
      }).join('');
    }

    var before = fullText.substring(0, idx);
    var match = fullText.substring(idx, idx + excerpt.length);
    var after = fullText.substring(idx + excerpt.length);

    return formatParagraphsWithHighlight(before, match, after);
  }

  function formatParagraphsWithHighlight(before, match, after) {
    var full = before + '<<<HL_START>>>' + match + '<<<HL_END>>>' + after;
    var paragraphs = full.split(/\n{2,}/);

    return paragraphs.map(function (p) {
      p = p.trim();
      if (!p) return '';
      var html = escapeHtml(p);
      html = html.replace(
        escapeHtml('<<<HL_START>>>'),
        '<mark class="preview-highlight is-active">'
      );
      html = html.replace(escapeHtml('<<<HL_END>>>'), '</mark>');
      return '<p>' + html + '</p>';
    }).join('');
  }

  function highlightInHtml(html, excerpt) {
    if (!excerpt || !html) return html || '';

    var escaped = excerpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escaped + ')', 'g');
    return html.replace(regex, '<mark class="preview-highlight is-active">$1</mark>');
  }

  function scrollPreviewToHighlight() {
    requestAnimationFrame(function () {
      var hl = previewBody.querySelector('.preview-highlight');
      if (!hl) return;

      var bodyRect = previewBody.getBoundingClientRect();
      var hlRect = hl.getBoundingClientRect();
      var target = previewBody.scrollTop + (hlRect.top - bodyRect.top) - (bodyRect.height / 2) + (hlRect.height / 2);
      previewBody.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });
  }

  // =========================================
  // Memo Block Rendering
  // =========================================

  var REPLY_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var PIN_ICON_SM = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.09 3.26L16 6l-2 2 .71 3.54L12 9.91 9.29 11.54 10 8 8 6l2.91-.74L12 2z"/></svg>';

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

  function highlightSearchText(text, query) {
    if (!query || !text) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escapeHtml(queryEscaped) + ')', 'gi');
    return escaped.replace(regex, '<span class="memo-search-highlight">$1</span>');
  }

  function renderMemoBlock(memo, container) {
    var block = document.createElement('div');
    block.className = 'memo-block';
    block.dataset.id = memo.id;
    block.dataset.type = memo.type;
    block.dataset.source = memo.source || 'my-note';

    if (memo.pinned) block.classList.add('is-pinned');
    if (memo.colorTag) block.classList.add('has-color-tag');

    var vis = memo.visibility || VISIBILITY.PRIVATE;
    var src = memo.source || 'my-note';

    var repliesHtml = buildRepliesHtml(memo.replies || []);

    var sourceBadgeHtml = '';
    if (src !== 'my-note') {
      sourceBadgeHtml = '<span class="memo-block__source-badge" data-source="' + src + '">' + (SOURCE_LABELS[src] || src) + '</span>';
    }

    var contextHtml = '';
    if (src === 'square' && (memo.originalAuthor || memo.articleTitle)) {
      var ctxParts = [];
      if (memo.originalAuthor) ctxParts.push(escapeHtml(memo.originalAuthor) + '님의 메모');
      if (memo.articleTitle) ctxParts.push(escapeHtml(memo.articleTitle));
      contextHtml = '<div class="memo-block__context">' + ctxParts.join(' · ') + '</div>';
    }

    var pinIconHtml = '<span class="memo-block__pin-icon">' + PIN_ICON_SM + '</span>';

    var colorDotHtml = '';
    if (memo.colorTag && COLOR_TAG_CSS[memo.colorTag]) {
      colorDotHtml = '<span class="memo-block__color-dot" style="background:' + COLOR_TAG_CSS[memo.colorTag] + '"></span>';
    }

    var noteDisplayHtml = searchQuery
      ? highlightSearchText(memo.note, searchQuery)
      : escapeHtml(memo.note);

    block.innerHTML =
      '<div class="memo-block__fold" draggable="true"></div>' +
      '<div class="memo-block__deselect-zone"></div>' +
      pinIconHtml +
      colorDotHtml +
      contextHtml +
      '<div class="memo-block__body">' +
        '<textarea class="memo-block__note" placeholder="메모를 작성하세요...">' + escapeHtml(memo.note) + '</textarea>' +
      '</div>' +
      repliesHtml +
      '<div class="memo-block__reply-action">' +
        '<button class="memo-block__reply-btn">' +
          REPLY_ICON +
          '<span>메모에 메모하기</span>' +
        '</button>' +
        '<div class="memo-block__reply-form" style="display:none">' +
          '<textarea class="memo-block__reply-input" placeholder="이 메모에 대한 생각을 남겨보세요..." rows="2"></textarea>' +
          '<div class="memo-block__reply-form-actions">' +
            '<button class="memo-block__reply-cancel">취소</button>' +
            '<button class="memo-block__reply-submit">등록</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="memo-block__footer">' +
        sourceBadgeHtml +
        '<button class="memo-block__visibility" data-visibility="' + vis + '" title="' + VISIBILITY_LABELS[vis] + '">' +
          '<span class="memo-block__visibility-icon">' + VISIBILITY_ICONS[vis] + '</span>' +
          '<span class="memo-block__visibility-label">' + VISIBILITY_LABELS[vis] + '</span>' +
        '</button>' +
        '<span class="memo-block__time">' + formatTimeShort(memo.createdAt) + '</span>' +
      '</div>';

    bindMemoBlockEvents(block, memo);
    (container || memosList).appendChild(block);
  }

  function buildRepliesHtml(replies) {
    if (!replies || replies.length === 0) return '';

    var items = replies.map(function (r) {
      return (
        '<div class="memo-reply">' +
          '<div class="memo-reply__header">' +
            '<span class="memo-reply__avatar">' + escapeHtml(r.avatarInitial || '나') + '</span>' +
            '<span class="memo-reply__author">' + escapeHtml(r.author || '나') + '</span>' +
            '<span class="memo-reply__time">' + formatTimeShort(r.createdAt) + '</span>' +
          '</div>' +
          '<p class="memo-reply__note">' + escapeHtml(r.note) + '</p>' +
        '</div>'
      );
    }).join('');

    return '<div class="memo-block__replies">' + items + '</div>';
  }

  function bindMemoBlockEvents(block, memo) {
    block.addEventListener('click', function (e) {
      if (e.target.closest('.memo-block__fold')) return;
      if (e.target.closest('.memo-block__deselect-zone')) return;
      if (e.target.closest('.memo-block__note')) return;
      if (e.target.closest('.memo-block__reply-action')) return;

      if (selectedMemoId === memo.id) {
        if (previewActive) {
          scrollPreviewToHighlight();
        } else {
          scrollToHighlight(memo.id);
        }
      } else {
        selectMemo(memo.id);
      }
    });

    block.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(memoContextMenu, e.clientX, e.clientY);
      contextTargetMemoId = memo.id;
      contextPinLabel.textContent = memo.pinned ? '고정 해제' : '고정';
    });

    var textarea = block.querySelector('.memo-block__note');
    textarea.addEventListener('input', function () {
      memo.note = textarea.value;
      memo.updatedAt = Date.now();
      syncSingleMemoToShared(memo);
    });
    textarea.addEventListener('focus', function () { selectMemo(memo.id); });
    textarea.addEventListener('click', function (e) { e.stopPropagation(); });

    var visBtn = block.querySelector('.memo-block__visibility');
    visBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleVisibilityDropdown(memo, block);
    });

    var deselectZone = block.querySelector('.memo-block__deselect-zone');
    deselectZone.addEventListener('click', function (e) {
      e.stopPropagation();
      deselectMemo(memo.id);
    });

    var fold = block.querySelector('.memo-block__fold');
    fold.addEventListener('click', function (e) {
      e.stopPropagation();
      if (block.classList.contains('is-selected')) {
        deselectMemo(memo.id);
      } else {
        selectMemo(memo.id);
      }
    });

    fold.addEventListener('dragstart', function (e) {
      draggedMemoId = memo.id;
      block.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', memo.id);
      setTimeout(function () {
        block.style.opacity = '0.4';
      }, 0);
    });

    fold.addEventListener('dragend', function () {
      block.classList.remove('is-dragging');
      block.style.opacity = '';
      draggedMemoId = null;
      memosList.querySelectorAll('.memo-block--drag-over').forEach(function (el) {
        el.classList.remove('memo-block--drag-over');
      });
    });

    bindReplyEvents(block, memo);
  }

  // =========================================
  // Memo Reply (메모에 메모하기)
  // =========================================

  function bindReplyEvents(block, memo) {
    var action = block.querySelector('.memo-block__reply-action');
    if (!action) return;

    var btn = action.querySelector('.memo-block__reply-btn');
    var form = action.querySelector('.memo-block__reply-form');
    var input = action.querySelector('.memo-block__reply-input');
    var cancelBtn = action.querySelector('.memo-block__reply-cancel');
    var submitBtn = action.querySelector('.memo-block__reply-submit');

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

      var reply = {
        id: 'reply_' + Date.now(),
        author: '나',
        avatarInitial: '나',
        note: text,
        createdAt: Date.now()
      };

      if (!memo.replies) memo.replies = [];
      memo.replies.push(reply);
      memo.updatedAt = Date.now();
      syncSingleMemoToShared(memo);

      var replyEl = document.createElement('div');
      replyEl.className = 'memo-reply';
      replyEl.innerHTML =
        '<div class="memo-reply__header">' +
          '<span class="memo-reply__avatar">나</span>' +
          '<span class="memo-reply__author">나</span>' +
          '<span class="memo-reply__time">' + formatTimeShort(reply.createdAt) + '</span>' +
        '</div>' +
        '<p class="memo-reply__note">' + escapeHtml(text) + '</p>';

      var repliesContainer = block.querySelector('.memo-block__replies');
      if (!repliesContainer) {
        repliesContainer = document.createElement('div');
        repliesContainer.className = 'memo-block__replies';
        action.before(repliesContainer);
      }
      repliesContainer.appendChild(replyEl);

      input.value = '';
      form.style.display = 'none';
      btn.style.display = '';
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
    var dropdownHTML = buildVisibilityDropdownHTML(memo.visibility || VISIBILITY.PRIVATE);
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
        syncSingleMemoToShared(memo);
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

  memosList.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    var afterElement = getDragAfterElement(e.clientY);
    var draggable = memosList.querySelector('[data-id="' + draggedMemoId + '"]');
    if (!draggable) return;

    memosList.querySelectorAll('.memo-block--drag-over').forEach(function (el) {
      el.classList.remove('memo-block--drag-over');
    });

    if (afterElement == null) {
      memosList.appendChild(draggable);
    } else {
      afterElement.classList.add('memo-block--drag-over');
      memosList.insertBefore(draggable, afterElement);
    }
  });

  memosList.addEventListener('drop', function (e) {
    e.preventDefault();
    var blocks = memosList.querySelectorAll('.memo-block');
    var newOrder = [];
    blocks.forEach(function (block) {
      var memo = memos.find(function (m) { return m.id === block.dataset.id; });
      if (memo) newOrder.push(memo);
    });
    var pinnedMemos = memos.filter(function (m) { return m.pinned; });
    var unpinnedNotInList = memos.filter(function (m) {
      return !m.pinned && !newOrder.find(function (n) { return n.id === m.id; });
    });
    memos = pinnedMemos.concat(newOrder).concat(unpinnedNotInList);

    memosList.querySelectorAll('.memo-block--drag-over').forEach(function (el) {
      el.classList.remove('memo-block--drag-over');
    });
  });

  function getDragAfterElement(y) {
    var elements = Array.from(memosList.querySelectorAll('.memo-block:not(.is-dragging)'));

    return elements.reduce(
      function (closest, child) {
        var box = child.getBoundingClientRect();
        var offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  // =========================================
  // Add Memo Button
  // =========================================

  memoAddBtn.addEventListener('click', function () {
    switchTab('memos');
    createEmptyMemo();
  });

  // =========================================
  // Search System
  // =========================================

  searchToggle.addEventListener('click', function () {
    var isActive = memoSearch.classList.toggle('is-active');
    if (isActive) {
      searchInput.focus();
    } else {
      searchInput.value = '';
      searchQuery = '';
      renderAllMemos();
    }
  });

  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    searchQuery = '';
    renderAllMemos();
    searchInput.focus();
  });

  searchInput.addEventListener('input', debounce(function () {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderAllMemos();
  }, 200));

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchQuery = '';
      memoSearch.classList.remove('is-active');
      renderAllMemos();
    }
  });

  // =========================================
  // View Mode Toggle
  // =========================================

  viewBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentView = btn.dataset.view;
      viewBtns.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      renderAllMemos();
    });
  });

  // =========================================
  // Controls: Source Filter
  // =========================================

  sourceFilterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    closeAllControlDropdowns();
    sourceFilterWrapper.classList.toggle('is-open');
  });

  sourceFilterDropdown.addEventListener('click', function (e) {
    var opt = e.target.closest('.my-note__control-option');
    if (!opt) return;
    e.stopPropagation();
    currentFilter = opt.dataset.source;
    sourceFilterLabel.textContent = FILTER_LABELS[currentFilter] || currentFilter;
    sourceFilterDropdown.querySelectorAll('.my-note__control-option').forEach(function (o) {
      o.classList.toggle('is-active', o.dataset.source === currentFilter);
    });
    closeAllControlDropdowns();
    renderAllMemos();
  });

  // =========================================
  // Controls: Sort
  // =========================================

  sortBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    closeAllControlDropdowns();
    sortWrapper.classList.toggle('is-open');
  });

  sortDropdown.addEventListener('click', function (e) {
    var opt = e.target.closest('.my-note__control-option');
    if (!opt) return;
    e.stopPropagation();
    currentSort = opt.dataset.sort;
    sortLabel.textContent = SORT_LABELS[currentSort] || currentSort;
    sortDropdown.querySelectorAll('.my-note__control-option').forEach(function (o) {
      o.classList.toggle('is-active', o.dataset.sort === currentSort);
    });
    closeAllControlDropdowns();
    renderAllMemos();
  });

  // =========================================
  // Controls: Tag Filter
  // =========================================

  tagFilterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    closeAllControlDropdowns();
    tagFilterWrapper.classList.toggle('is-open');
  });

  tagFilterDropdown.addEventListener('click', function (e) {
    var opt = e.target.closest('.my-note__control-option');
    if (!opt) return;
    e.stopPropagation();
    currentTagFilter = opt.dataset.tag;
    tagFilterDropdown.querySelectorAll('.my-note__control-option').forEach(function (o) {
      o.classList.toggle('is-active', o.dataset.tag === currentTagFilter);
    });
    tagFilterBtn.classList.toggle('has-filter', currentTagFilter !== 'all');
    closeAllControlDropdowns();
    renderAllMemos();
  });

  function closeAllControlDropdowns() {
    sourceFilterWrapper.classList.remove('is-open');
    sortWrapper.classList.remove('is-open');
    tagFilterWrapper.classList.remove('is-open');
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.my-note__control-wrapper')) {
      closeAllControlDropdowns();
    }
  });

  // =========================================
  // Pinned Section Toggle
  // =========================================

  pinnedHeader.addEventListener('click', function () {
    pinnedCollapsed = !pinnedCollapsed;
    pinnedSection.classList.toggle('is-collapsed', pinnedCollapsed);
  });

  // =========================================
  // Unified Memo Pipeline
  // =========================================

  function getProcessedMemos() {
    var result = memos.slice();

    // Source filter
    if (currentFilter !== 'all') {
      result = result.filter(function (m) { return (m.source || 'my-note') === currentFilter; });
    }

    // Tag filter
    if (currentTagFilter !== 'all') {
      if (currentTagFilter === 'none') {
        result = result.filter(function (m) { return !m.colorTag; });
      } else {
        result = result.filter(function (m) { return m.colorTag === currentTagFilter; });
      }
    }

    // Search filter
    if (searchQuery) {
      result = result.filter(function (m) {
        var noteText = (m.note || '').toLowerCase();
        var srcText = (m.sourceText || '').toLowerCase();
        var titleText = (m.noteTitle || m.articleTitle || '').toLowerCase();
        return noteText.indexOf(searchQuery) !== -1 ||
               srcText.indexOf(searchQuery) !== -1 ||
               titleText.indexOf(searchQuery) !== -1;
      });
    }

    // Sort
    result.sort(getSortComparator());

    return result;
  }

  function getSortComparator() {
    if (currentSort === 'oldest') {
      return function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); };
    }
    if (currentSort === 'updated') {
      return function (a, b) {
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      };
    }
    return function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); };
  }

  function getTimelineGroup(ts) {
    var now = new Date();
    var d = new Date(ts);
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var weekStart = todayStart - (now.getDay() * 86400000);
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (ts >= todayStart) return '오늘';
    if (ts >= weekStart) return '이번 주';
    if (ts >= monthStart) return '이번 달';
    return '이전';
  }

  function getSourceGroup(source) {
    return SOURCE_LABELS[source] || source || 'My Note';
  }

  function groupMemos(list, groupFn) {
    var groups = {};
    var order = [];
    list.forEach(function (memo) {
      var key = groupFn(memo);
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(memo);
    });
    return { groups: groups, order: order };
  }

  // =========================================
  // Render: All Memos (Unified)
  // =========================================

  function renderAllMemos() {
    memosList.innerHTML = '';
    pinnedList.innerHTML = '';

    var processed = getProcessedMemos();

    var pinned = processed.filter(function (m) { return m.pinned; });
    var unpinned = processed.filter(function (m) { return !m.pinned; });

    // Render pinned section
    if (pinned.length > 0) {
      pinnedSection.style.display = '';
      pinnedCount.textContent = pinned.length;
      pinned.forEach(function (memo) {
        renderMemoBlock(memo, pinnedList);
      });
    } else {
      pinnedSection.style.display = 'none';
    }

    // Render main list based on view mode
    if (currentView === 'timeline') {
      renderGroupedView(unpinned, function (memo) {
        return getTimelineGroup(memo.createdAt);
      });
    } else if (currentView === 'source') {
      renderGroupedView(unpinned, function (memo) {
        return getSourceGroup(memo.source || 'my-note');
      });
    } else {
      renderStreamView(unpinned);
    }

    updateMemoState();
    updateFilterCounts();
  }

  function renderStreamView(list) {
    var lastDateLabel = '';
    list.forEach(function (memo) {
      var dateLabel = formatDateLabel(memo.createdAt);
      if (dateLabel !== lastDateLabel) {
        var sep = document.createElement('div');
        sep.className = 'memo-date-separator';
        sep.innerHTML =
          '<span class="memo-date-separator__line"></span>' +
          '<span class="memo-date-separator__label">' + dateLabel + '</span>' +
          '<span class="memo-date-separator__line"></span>';
        memosList.appendChild(sep);
        lastDateLabel = dateLabel;
      }
      renderMemoBlock(memo, memosList);
    });
  }

  function renderGroupedView(list, groupFn) {
    var grouped = groupMemos(list, groupFn);
    var chevronSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    grouped.order.forEach(function (key) {
      var groupMemosList = grouped.groups[key];
      var groupEl = document.createElement('div');
      groupEl.className = 'memo-group';
      if (collapsedGroups[key]) groupEl.classList.add('is-collapsed');

      var header = document.createElement('div');
      header.className = 'memo-group__header';
      header.innerHTML =
        '<span class="memo-group__title">' + escapeHtml(key) + '</span>' +
        '<span class="memo-group__count">' + groupMemosList.length + '</span>' +
        '<span class="memo-group__chevron">' + chevronSvg + '</span>';

      header.addEventListener('click', function () {
        collapsedGroups[key] = !collapsedGroups[key];
        groupEl.classList.toggle('is-collapsed');
      });

      var body = document.createElement('div');
      body.className = 'memo-group__body';

      groupMemosList.forEach(function (memo) {
        renderMemoBlock(memo, body);
      });

      groupEl.appendChild(header);
      groupEl.appendChild(body);
      memosList.appendChild(groupEl);
    });
  }

  function updateMemoState() {
    var processed = getProcessedMemos();
    memosEmpty.style.display = processed.length > 0 ? 'none' : '';
  }

  function updateFilterCounts() {
    var countEls = sourceFilterDropdown.querySelectorAll('[data-count-source]');
    countEls.forEach(function (el) {
      var src = el.dataset.countSource;
      var count;
      if (src === 'all') {
        count = memos.length;
      } else {
        count = memos.filter(function (m) { return (m.source || 'my-note') === src; }).length;
      }
      el.textContent = count;
    });
  }

  // =========================================
  // Global Click — Deselect & Hide Menus
  // =========================================

  document.addEventListener('click', function (e) {
    if (!contextMenu.contains(e.target) && !memoContextMenu.contains(e.target)) {
      hideAllContextMenus();
    }

    if (!e.target.closest('.visibility-dropdown') && !e.target.closest('.memo-block__visibility')) {
      closeAllVisibilityDropdowns();
    }

    if (
      selectedMemoId &&
      !e.target.closest('.my-note__sidebar') &&
      !e.target.closest('.context-menu') &&
      !e.target.closest('.text-highlight')
    ) {
      deselectMemo();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      hideAllContextMenus();
      if (selectedMemoId) deselectMemo();
    }
  });

  // =========================================
  // Note Events
  // =========================================

  newNoteBtn.addEventListener('click', function () {
    clearEditor();
    switchNoteType('blank');
    blankTitle.focus();
  });

  saveNoteBtn.addEventListener('click', saveNote);

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNote();
    }
  });

  // =========================================
  // Render: Notes List
  // =========================================

  function getPreviewText(note) {
    if (note.type === 'blank') {
      return note.content || '';
    }
    if (note.answers) {
      var texts = Object.values(note.answers).filter(function (v) { return v; });
      return texts.join(' · ') || '';
    }
    return '';
  }

  function renderNotesList() {
    notesList.innerHTML = '';

    if (notes.length === 0) {
      notesEmpty.style.display = 'block';
      return;
    }

    notesEmpty.style.display = 'none';

    notes.forEach(function (note) {
      var card = document.createElement('div');
      card.className = 'note-card' + (note.id === currentNoteId ? ' is-active' : '');
      card.setAttribute('data-id', note.id);

      var typeLabel = note.type === 'blank' ? '무지' : '양식지';
      var typeClass = note.type === 'blank' ? 'note-card__type--blank' : 'note-card__type--template';
      var preview = getPreviewText(note);
      var title = note.title || '제목 없음';

      card.innerHTML =
        '<div class="note-card__header">' +
          '<span class="note-card__type ' + typeClass + '">' + typeLabel + '</span>' +
          '<button class="note-card__delete" data-delete="' + note.id + '" title="삭제">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"></line>' +
              '<line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="note-card__title">' + escapeHtml(title) + '</div>' +
        (preview ? '<div class="note-card__preview">' + escapeHtml(preview) + '</div>' : '') +
        '<div class="note-card__time">' + formatTime(note.updatedAt) + '</div>';

      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-delete]')) {
          e.stopPropagation();
          deleteNote(note.id);
          return;
        }
        loadNote(note.id);
      });

      notesList.appendChild(card);
    });
  }

  // =========================================
  // Init
  // =========================================

  function migrateOldMemos() {
    try {
      var oldData = localStorage.getItem('sensepoint_mynote_memos');
      if (!oldData) return;
      var oldMemos = JSON.parse(oldData);
      if (!oldMemos || oldMemos.length === 0) return;

      var all = loadAllMemosFromShared();
      var existingIds = {};
      all.forEach(function (m) { existingIds[m.id] = true; });

      oldMemos.forEach(function (m) {
        if (!existingIds[m.id]) {
          m.source = 'my-note';
          all.push(m);
        }
      });

      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
      localStorage.removeItem('sensepoint_mynote_memos');
    } catch (e) { /* noop */ }
  }

  function loadAndMergeMemos() {
    var all = loadAllMemosFromShared();
    all.forEach(function (m) {
      if (m.pinned === undefined) m.pinned = false;
      if (m.colorTag === undefined) m.colorTag = null;
      if (m.updatedAt === undefined) m.updatedAt = m.createdAt;
    });
    all.sort(function (a, b) { return a.createdAt - b.createdAt; });
    return all;
  }

  migrateOldMemos();
  notes = loadNotes();
  memos = loadAndMergeMemos();
  renderNotesList();
  renderAllMemos();

  window.addEventListener('storage', function (e) {
    if (e.key === SHARED_MEMO_KEY) {
      memos = loadAndMergeMemos();
      renderAllMemos();
    }
  });

})();
