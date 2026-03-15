/**
 * SensePoint — 뜨개질 (Knitting)
 * 노트 간 서사적 연결을 만드는 시스템
 *
 * 직접 뜨개질: 사용자가 실(Thread)을 만들고 노트를 순서대로 꿴다
 * 실마리 시스템: 텍스트에 실마리(Clue)를 심으면 시스템이 자동으로 실을 제안
 */

(function () {
  'use strict';

  var THREAD_KEY = 'sensepoint_threads';
  var CLUE_KEY = 'sensepoint_clues';
  var NOTE_KEY = 'sensepoint_notes';
  var TEST_FLAG = 'sensepoint_knitting_test_loaded';

  var THREAD_COLORS = [
    '#c8a96e', '#7db8d4', '#8fc06a', '#d4a07d', '#a07dd4',
    '#d47d7d', '#7dd4c8', '#d4c87d', '#7d8fd4', '#c87dd4'
  ];

  var threads = [];
  var clues = [];
  var notes = [];
  var activeThreadId = null;
  var activeStitchIdx = 0;

  // ── Storage ────────────────────────────────

  function load(key) {
    try { var d = localStorage.getItem(key); return d ? JSON.parse(d) : []; }
    catch (e) { return []; }
  }
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  // ── Utility ────────────────────────────────

  function uid(pfx) {
    return (pfx || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function trunc(t, n) { return !t ? '' : t.length > n ? t.substring(0, n) + '…' : t; }
  function fmtDate(ts) {
    var d = new Date(ts);
    return String(d.getFullYear()).slice(2) + '.' +
      String(d.getMonth() + 1).padStart(2, '0') + '.' +
      String(d.getDate()).padStart(2, '0');
  }
  function noteText(n) {
    if (!n) return '';
    if (n.type === 'blank') return n.content || '';
    if (n.answers) return Object.values(n.answers).filter(Boolean).join('\n\n');
    return '';
  }
  function randColor() { return THREAD_COLORS[Math.floor(Math.random() * THREAD_COLORS.length)]; }

  // ── Thread CRUD ────────────────────────────

  function createThread(title, desc) {
    var t = {
      id: uid('th'), title: title || '새 실', description: desc || '',
      color: randColor(), origin: 'manual', stitches: [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
    threads.unshift(t);
    save(THREAD_KEY, threads);
    return t;
  }

  function updateThread(id, upd) {
    var t = threads.find(function (x) { return x.id === id; });
    if (!t) return;
    Object.keys(upd).forEach(function (k) { t[k] = upd[k]; });
    t.updatedAt = Date.now();
    save(THREAD_KEY, threads);
    return t;
  }

  function deleteThread(id) {
    threads = threads.filter(function (x) { return x.id !== id; });
    save(THREAD_KEY, threads);
    if (activeThreadId === id) { activeThreadId = null; hideThreadView(); }
  }

  function markEdited(t) {
    if (t && t.origin === 'auto') t.origin = 'edited';
  }

  function addStitch(thId, noteId, excerpt, persp) {
    var t = threads.find(function (x) { return x.id === thId; });
    if (!t) return;
    markEdited(t);
    var n = notes.find(function (x) { return x.id === noteId; });
    var s = {
      id: uid('st'), noteId: noteId, noteTitle: n ? n.title : '',
      excerpt: excerpt || '', perspective: persp || '', order: t.stitches.length
    };
    t.stitches.push(s);
    t.updatedAt = Date.now();
    save(THREAD_KEY, threads);
    return s;
  }

  function removeStitch(thId, stId) {
    var t = threads.find(function (x) { return x.id === thId; });
    if (!t) return;
    markEdited(t);
    t.stitches = t.stitches.filter(function (s) { return s.id !== stId; });
    t.stitches.forEach(function (s, i) { s.order = i; });
    t.updatedAt = Date.now();
    save(THREAD_KEY, threads);
  }

  function setPerspective(thId, stId, text) {
    var t = threads.find(function (x) { return x.id === thId; });
    if (!t) return;
    markEdited(t);
    var s = t.stitches.find(function (x) { return x.id === stId; });
    if (s) { s.perspective = text; t.updatedAt = Date.now(); save(THREAD_KEY, threads); }
  }

  function moveStitch(thId, stId, dir) {
    var t = threads.find(function (x) { return x.id === thId; });
    if (!t) return;
    var idx = t.stitches.findIndex(function (s) { return s.id === stId; });
    if (idx === -1) return;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= t.stitches.length) return;
    markEdited(t);
    var tmp = t.stitches[idx];
    t.stitches[idx] = t.stitches[newIdx];
    t.stitches[newIdx] = tmp;
    t.stitches.forEach(function (s, i) { s.order = i; });
    t.updatedAt = Date.now();
    save(THREAD_KEY, threads);
    return t;
  }

  // ── Clue CRUD ──────────────────────────────

  function createClue(noteId, text, name) {
    var n = notes.find(function (x) { return x.id === noteId; });
    var c = {
      id: uid('cl'), noteId: noteId, noteTitle: n ? n.title : '',
      text: text, clueName: name, createdAt: Date.now()
    };
    clues.push(c);
    save(CLUE_KEY, clues);
    return c;
  }

  function getClueGroups() {
    var g = {};
    clues.forEach(function (c) {
      if (!g[c.clueName]) g[c.clueName] = [];
      g[c.clueName].push(c);
    });
    return g;
  }

  // ── Auto-Suggestion (실마리 기반) ────────────

  function getClueSuggestions() {
    var groups = getClueGroups();
    var out = [];
    Object.keys(groups).forEach(function (name) {
      var gr = groups[name];
      var ids = []; var seen = {};
      gr.forEach(function (c) { if (!seen[c.noteId]) { seen[c.noteId] = true; ids.push(c.noteId); } });
      if (ids.length < 2) return;
      var exists = threads.some(function (t) { return t.title === name; });
      out.push({ type: 'clue', clueName: name, noteIds: ids, clueCount: gr.length, noteCount: ids.length, exists: exists, clues: gr });
    });
    out.sort(function (a, b) { return b.noteCount - a.noteCount; });
    return out;
  }

  function threadFromClueSuggestion(sug) {
    var t = createThread(sug.clueName, sug.clueName + ' — ' + sug.noteCount + '개 노트를 관통하는 실마리');
    t.origin = 'auto';
    sug.noteIds.forEach(function (nid) {
      var related = sug.clues.filter(function (c) { return c.noteId === nid; });
      var exc = related.map(function (c) { return c.text; }).join(' / ');
      addStitch(t.id, nid, exc, '');
    });
    save(THREAD_KEY, threads);
    return t;
  }

  // ── 3단계: 키워드 자동 분석 엔진 ────────────

  var STOPWORDS = [
    '은','는','이','가','을','를','의','에','에서','도','로','으로','와','과',
    '하고','그리고','하지만','그러나','또는','또한','그래서','그런데','그리하여',
    '것','수','등','때','중','더','만','못','안','잘','왜','어떻게','무엇',
    '있다','없다','되다','하다','이다','아니다','있는','없는','되는','하는',
    '그','이','저','우리','그것','자신','모든','각','다른','같은','그런',
    '위','아래','안','밖','사이','대한','통해','위한','대해','관한',
    '및','즉','곧','바로','매우','정말','아주','가장','너무','다시',
    '위에','아래에','속에','밖에','사이에','앞에','뒤에','옆에',
    '했다','된다','한다','있었다','없었다','이었다','였다','됐다',
    '그것은','그것이','이것은','이것이','그래서','따라서','결국',
    '것이다','것이','않는','않은','않다','했던','되었다','하였다',
    '라는','라고','라며','라면','이라','라는','같이','처럼','만큼',
    '수도','때문에','에도','에서는','로부터','까지','부터','에게',
    '하나','둘','세','네','다섯','이상','이하','이후','이전',
    '했을','될','할','된','한','하는','있는','없는','되는'
  ];

  var KO_SUFFIXES = /(?:에서의|으로의|에서도|으로도|에서는|으로는|에게는|이라는|이라고|이라며|이라면|으로서|으로써|이지만|이었던|하였다|되었다|에서|으로|부터|까지|에게|한테|보다|조차|마저|밖에|만이|이나|이든|이면|이니|하여|해서|하면|하니|하고|이고|이며|이라|주의|들은|들이|들을|들의|들|적|화|성|론|학|은|는|이|가|을|를|의|도|로|에|와|과|나)$/;

  function extractKeywords(text) {
    if (!text) return {};
    var words = text.split(/[\s.,!?;:'"''""()\[\]{}<>\/\\|@#$%^&*=+~`\-_…·\n\r—→←↓↑│├└┌┐─┤┘┬┴]+/);
    var freq = {};
    words.forEach(function (w) {
      w = w.trim().replace(/^[>*#\d.]+/, '');
      if (w.length < 2) return;
      var lower = w.toLowerCase();
      if (STOPWORDS.indexOf(lower) !== -1) return;
      if (STOPWORDS.indexOf(w) !== -1) return;
      if (/^\d+$/.test(w)) return;
      var stem = w.replace(KO_SUFFIXES, '');
      if (stem.length < 2) stem = w;
      if (STOPWORDS.indexOf(stem) !== -1) return;
      freq[stem] = (freq[stem] || 0) + 1;
    });
    return freq;
  }

  function getKeywordSuggestions() {
    if (notes.length < 2) return [];

    var noteKw = {};
    var docFreq = {};
    var N = notes.length;

    notes.forEach(function (n) {
      var text = (n.title || '') + ' ' + (n.title || '') + ' ' + noteText(n);
      var kw = extractKeywords(text);
      noteKw[n.id] = kw;
      var seen = {};
      Object.keys(kw).forEach(function (w) {
        if (!seen[w]) { seen[w] = true; docFreq[w] = (docFreq[w] || 0) + 1; }
      });
    });

    var MAX_DF_RATIO = 0.4;
    var MIN_IDF = 0.8;
    var MIN_PAIR_KW = 4;
    var MAX_CLUSTER_SIZE = 5;
    var MIN_MERGE_OVERLAP = 3;

    var pairScores = {};

    Object.keys(docFreq).forEach(function (kw) {
      var df = docFreq[kw];
      if (df < 2 || df > N * MAX_DF_RATIO) return;
      var idf = Math.log(N / df);
      if (idf < MIN_IDF) return;

      var containing = [];
      notes.forEach(function (n) {
        if (noteKw[n.id] && noteKw[n.id][kw]) {
          containing.push({ id: n.id, tf: noteKw[n.id][kw] });
        }
      });

      for (var i = 0; i < containing.length; i++) {
        for (var j = i + 1; j < containing.length; j++) {
          var a = containing[i].id, b = containing[j].id;
          var key = a < b ? a + '|' + b : b + '|' + a;
          if (!pairScores[key]) pairScores[key] = { a: a, b: b, keywords: [], score: 0 };
          pairScores[key].keywords.push(kw);
          pairScores[key].score += idf * (containing[i].tf + containing[j].tf);
        }
      }
    });

    var pairs = Object.values(pairScores)
      .filter(function (p) { return p.keywords.length >= MIN_PAIR_KW; })
      .sort(function (a, b) { return b.score - a.score; });

    var clusters = [];
    var noteAssigned = {};

    pairs.forEach(function (p) {
      if (noteAssigned[p.a] >= 2 && noteAssigned[p.b] >= 2) return;

      var merged = false;
      for (var ci = 0; ci < clusters.length; ci++) {
        var cl = clusters[ci];
        if (cl.noteIds.length >= MAX_CLUSTER_SIZE) continue;
        var overlap = p.keywords.filter(function (kw) { return cl.keywords.indexOf(kw) !== -1; });
        if (overlap.length >= MIN_MERGE_OVERLAP) {
          var aIn = cl.noteIds.indexOf(p.a) !== -1;
          var bIn = cl.noteIds.indexOf(p.b) !== -1;
          if (!aIn && cl.noteIds.length < MAX_CLUSTER_SIZE) {
            cl.noteIds.push(p.a);
            noteAssigned[p.a] = (noteAssigned[p.a] || 0) + 1;
          }
          if (!bIn && cl.noteIds.length < MAX_CLUSTER_SIZE) {
            cl.noteIds.push(p.b);
            noteAssigned[p.b] = (noteAssigned[p.b] || 0) + 1;
          }
          p.keywords.forEach(function (kw) { if (cl.keywords.indexOf(kw) === -1) cl.keywords.push(kw); });
          cl.score += p.score * 0.3;
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({
          noteIds: [p.a, p.b],
          keywords: p.keywords.slice(),
          score: p.score
        });
        noteAssigned[p.a] = (noteAssigned[p.a] || 0) + 1;
        noteAssigned[p.b] = (noteAssigned[p.b] || 0) + 1;
      }
    });

    clusters.sort(function (a, b) { return b.score - a.score; });

    return clusters.slice(0, 8).map(function (cl) {
      cl.keywords.sort(function (a, b) { return (docFreq[b] || 0) - (docFreq[a] || 0); });
      var topKw = cl.keywords.slice(0, 5);
      var label = topKw.join(' · ');

      var exists = threads.some(function (t) {
        var tNotes = t.stitches.map(function (s) { return s.noteId; }).sort().join(',');
        var cNotes = cl.noteIds.slice().sort().join(',');
        return tNotes === cNotes;
      });

      return {
        type: 'keyword',
        label: label,
        keywords: topKw,
        noteIds: cl.noteIds,
        noteCount: cl.noteIds.length,
        keywordCount: cl.keywords.length,
        score: cl.score,
        exists: exists
      };
    });
  }

  function threadFromKeywordSuggestion(sug) {
    var t = createThread(
      sug.label,
      '키워드 분석으로 발견: ' + sug.keywords.join(', ')
    );
    t.origin = 'auto';
    sug.noteIds.forEach(function (nid) {
      addStitch(t.id, nid, sug.keywords.join(', '), '');
    });
    save(THREAD_KEY, threads);
    return t;
  }

  function getAllSuggestions() {
    var clue = getClueSuggestions().filter(function (s) { return !s.exists; });
    var kw = getKeywordSuggestions().filter(function (s) { return !s.exists; });
    return { clue: clue, keyword: kw };
  }

  // ── DOM refs (set in init) ─────────────────

  var $panel, $threadList, $suggestList, $emptyMsg;
  var $thView, $thTitle, $thDesc, $thStitches, $thClose;
  var $clueDialog, $clueInput, $clueExisting, $clueSave, $clueCancel;
  var $newDialog, $newTitle, $newDesc, $newSave, $newCancel;
  var $addDialog, $addList, $addCancel;

  // ── Render: Thread List ────────────────────

  function renderPanel() { renderThreadList(); renderSuggestions(); }

  function renderThreadList() {
    if (!$threadList) return;
    $threadList.innerHTML = '';
    $emptyMsg.style.display = threads.length ? 'none' : '';

    threads.forEach(function (t) {
      var el = document.createElement('div');
      el.className = 'knit-card';
      var badge = t.origin === 'auto'
        ? '<span class="knit-card__badge knit-card__badge--auto">자동</span>'
        : t.origin === 'edited'
          ? '<span class="knit-card__badge knit-card__badge--edit">수정됨</span>'
          : '';
      var dots = t.stitches.map(function (s) {
        return '<span class="knit-card__dot" style="background:' + t.color + '" title="' + esc(s.noteTitle) + '"></span>';
      }).join('<span class="knit-card__line" style="background:' + t.color + '"></span>');

      el.innerHTML =
        '<div class="knit-card__bar" style="background:' + t.color + '"></div>' +
        '<div class="knit-card__body">' +
          '<div class="knit-card__head">' +
            '<span class="knit-card__title">' + esc(t.title) + '</span>' + badge +
          '</div>' +
          '<div class="knit-card__meta">' + t.stitches.length + '코 · ' + fmtDate(t.updatedAt) + '</div>' +
          (t.description ? '<div class="knit-card__desc">' + esc(trunc(t.description, 60)) + '</div>' : '') +
          (dots ? '<div class="knit-card__dots">' + dots + '</div>' : '') +
        '</div>' +
        '<div class="knit-card__acts">' +
          '<button data-act="edit" title="편집">✎</button>' +
          '<button data-act="del" title="삭제">✕</button>' +
        '</div>';

      el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-act]');
        if (!a) { viewThread(t.id); return; }
        if (a.dataset.act === 'edit') editThread(t.id);
        if (a.dataset.act === 'del' && confirm('"' + t.title + '" 실을 삭제할까요?')) {
          deleteThread(t.id); renderPanel();
        }
      });
      $threadList.appendChild(el);
    });
  }

  function renderSuggestions() {
    if (!$suggestList) return;
    $suggestList.innerHTML = '';

    var all = getAllSuggestions();
    var total = all.clue.length + all.keyword.length;
    if (!total) { $suggestList.style.display = 'none'; return; }
    $suggestList.style.display = '';

    var hdr = document.createElement('div');
    hdr.className = 'knit-sug__hdr';
    hdr.innerHTML = '<span>🧶 자동 뜨개질 제안</span><span class="knit-sug__cnt">' + total + '</span>';
    $suggestList.appendChild(hdr);

    if (all.clue.length) {
      var clueLabel = document.createElement('div');
      clueLabel.className = 'knit-sug__section';
      clueLabel.textContent = '실마리 기반';
      $suggestList.appendChild(clueLabel);
    }

    all.clue.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'knit-sug';
      var names = s.noteIds.map(function (id) {
        var n = notes.find(function (x) { return x.id === id; });
        return n ? n.title : '?';
      });
      el.innerHTML =
        '<div class="knit-sug__name">"' + esc(s.clueName) + '"</div>' +
        '<div class="knit-sug__path">' + names.map(function (nm) {
          return '<span>' + esc(trunc(nm, 12)) + '</span>';
        }).join('<span class="knit-sug__arrow">→</span>') + '</div>' +
        '<div class="knit-sug__meta">' + s.noteCount + '개 노트 · ' + s.clueCount + '개 실마리</div>' +
        '<button class="knit-sug__btn">실로 엮기</button>';

      el.querySelector('.knit-sug__btn').addEventListener('click', function (e) {
        e.stopPropagation();
        var nt = threadFromClueSuggestion(s);
        renderPanel(); viewThread(nt.id);
      });
      $suggestList.appendChild(el);
    });

    if (all.keyword.length) {
      var kwLabel = document.createElement('div');
      kwLabel.className = 'knit-sug__section';
      kwLabel.textContent = '키워드 분석';
      $suggestList.appendChild(kwLabel);
    }

    all.keyword.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'knit-sug knit-sug--kw';
      var names = s.noteIds.map(function (id) {
        var n = notes.find(function (x) { return x.id === id; });
        return n ? n.title : '?';
      });
      el.innerHTML =
        '<div class="knit-sug__kwlabel">' + s.keywords.map(function (k) {
          return '<span class="knit-sug__kwtag">' + esc(k) + '</span>';
        }).join('') + '</div>' +
        '<div class="knit-sug__path">' + names.map(function (nm) {
          return '<span>' + esc(trunc(nm, 12)) + '</span>';
        }).join('<span class="knit-sug__arrow">→</span>') + '</div>' +
        '<div class="knit-sug__meta">' + s.noteCount + '개 노트 · ' + s.keywordCount + '개 공유 키워드</div>' +
        '<button class="knit-sug__btn">실로 엮기</button>';

      el.querySelector('.knit-sug__btn').addEventListener('click', function (e) {
        e.stopPropagation();
        var nt = threadFromKeywordSuggestion(s);
        renderPanel(); viewThread(nt.id);
      });
      $suggestList.appendChild(el);
    });
  }

  // ── Thread View (left 75%) ─────────────────

  function viewThread(id) {
    var t = threads.find(function (x) { return x.id === id; });
    if (!t) return;
    activeThreadId = id;
    activeStitchIdx = 0;
    showThreadView(t);
  }

  function showThreadView(t) {
    if (!$thView) return;
    var toolbar = document.querySelector('.my-note__toolbar');
    var blank = document.getElementById('blankNote');
    var tmpl = document.getElementById('templateNote');
    var preview = document.getElementById('notePreview');
    if (toolbar) toolbar.style.display = 'none';
    if (blank) blank.style.display = 'none';
    if (tmpl) tmpl.style.display = 'none';
    if (preview) preview.style.display = 'none';
    $thView.style.display = 'flex';
    renderThreadViewContent(t);
  }

  function hideThreadView() {
    if ($thView) $thView.style.display = 'none';
    activeThreadId = null;
    var toolbar = document.querySelector('.my-note__toolbar');
    var blank = document.getElementById('blankNote');
    if (toolbar) toolbar.style.display = '';
    if (blank) { blank.style.display = ''; blank.classList.add('is-active'); }
  }

  function renderThreadViewContent(t) {
    if (!t) return;
    $thTitle.textContent = t.title;
    $thTitle.style.borderLeftColor = t.color;

    var descHtml = t.description || '';
    var originTag = '';
    if (t.origin === 'auto') originTag = '<span class="knit-view__origin knit-view__origin--auto">자동 생성</span>';
    else if (t.origin === 'edited') originTag = '<span class="knit-view__origin knit-view__origin--edited">이어 뜨개질</span>';
    $thDesc.innerHTML = originTag + esc(descHtml);

    var html = '';
    t.stitches.forEach(function (s, idx) {
      var isAct = idx === activeStitchIdx;
      var n = notes.find(function (x) { return x.id === s.noteId; });
      var preview = isAct && n ? esc(trunc(noteText(n), 300)) : '';

      html += '<div class="knit-st' + (isAct ? ' is-active' : '') + '" data-idx="' + idx + '">' +
        '<div class="knit-st__num" style="background:' + t.color + '">' + (idx + 1) + '</div>' +
        '<div class="knit-st__body">' +
          '<div class="knit-st__ntitle">' + esc(s.noteTitle || '제목 없음') + '</div>' +
          (s.excerpt ? '<div class="knit-st__exc">"' + esc(trunc(s.excerpt, 120)) + '"</div>' : '') +
          '<textarea class="knit-st__persp" placeholder="이 노트가 이 실에서 보여주는 면은…" ' +
            'data-th="' + t.id + '" data-st="' + s.id + '">' + esc(s.perspective) + '</textarea>' +
          (preview ? '<div class="knit-st__preview">' + preview + '</div>' : '') +
          '<div class="knit-st__controls">' +
            '<button class="knit-st__move" data-th="' + t.id + '" data-st="' + s.id + '" data-dir="-1" title="위로"' +
              (idx === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button class="knit-st__move" data-th="' + t.id + '" data-st="' + s.id + '" data-dir="1" title="아래로"' +
              (idx === t.stitches.length - 1 ? ' disabled' : '') + '>▼</button>' +
            '<button class="knit-st__rm" data-th="' + t.id + '" data-st="' + s.id + '">✕</button>' +
          '</div>' +
        '</div>' +
      '</div>';
      if (idx < t.stitches.length - 1) {
        html += '<div class="knit-st__wire" style="border-color:' + t.color + '"></div>';
      }
    });

    html += '<button class="knit-add-st" data-th="' + t.id + '">+ 노트 추가</button>';
    $thStitches.innerHTML = html;

    $thStitches.querySelectorAll('.knit-st').forEach(function (el) {
      el.addEventListener('click', function () {
        activeStitchIdx = parseInt(el.dataset.idx);
        renderThreadViewContent(t);
      });
    });

    $thStitches.querySelectorAll('.knit-st__persp').forEach(function (el) {
      el.addEventListener('input', function () { setPerspective(el.dataset.th, el.dataset.st, el.value); });
      el.addEventListener('click', function (e) { e.stopPropagation(); });
    });

    $thStitches.querySelectorAll('.knit-st__move').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var dir = parseInt(el.dataset.dir);
        moveStitch(el.dataset.th, el.dataset.st, dir);
        t = threads.find(function (x) { return x.id === activeThreadId; });
        if (t) {
          activeStitchIdx = Math.max(0, Math.min(activeStitchIdx + dir, t.stitches.length - 1));
          renderThreadViewContent(t);
        }
        renderPanel();
      });
    });

    $thStitches.querySelectorAll('.knit-st__rm').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        removeStitch(el.dataset.th, el.dataset.st);
        t = threads.find(function (x) { return x.id === activeThreadId; });
        if (t) { activeStitchIdx = Math.min(activeStitchIdx, Math.max(0, t.stitches.length - 1)); renderThreadViewContent(t); }
        renderPanel();
      });
    });

    var addBtn = $thStitches.querySelector('.knit-add-st');
    if (addBtn) addBtn.addEventListener('click', function () { showAddDialog(t.id); });
  }

  // ── Dialogs ────────────────────────────────

  function showNewDialog(editId) {
    $newDialog.style.display = 'flex';
    $newDialog.dataset.editId = editId || '';
    if (editId) {
      var t = threads.find(function (x) { return x.id === editId; });
      $newTitle.value = t ? t.title : '';
      $newDesc.value = t ? t.description : '';
    } else {
      $newTitle.value = '';
      $newDesc.value = '';
    }
    $newTitle.focus();
  }

  function showAddDialog(thId) {
    $addDialog.style.display = 'flex';
    $addDialog.dataset.thId = thId;
    $addList.innerHTML = '';
    var t = threads.find(function (x) { return x.id === thId; });
    var existing = t ? t.stitches.map(function (s) { return s.noteId; }) : [];

    notes.forEach(function (n) {
      var has = existing.indexOf(n.id) !== -1;
      var el = document.createElement('div');
      el.className = 'knit-nopt' + (has ? ' is-dis' : '');
      el.innerHTML =
        '<div class="knit-nopt__title">' + esc(n.title || '제목 없음') + '</div>' +
        '<div class="knit-nopt__prev">' + esc(trunc(noteText(n), 80)) + '</div>' +
        (has ? '<span class="knit-nopt__tag">추가됨</span>' : '');
      if (!has) {
        el.addEventListener('click', function () {
          addStitch(thId, n.id, '', '');
          t = threads.find(function (x) { return x.id === thId; });
          if (t) renderThreadViewContent(t);
          renderPanel();
          $addDialog.style.display = 'none';
        });
      }
      $addList.appendChild(el);
    });
  }

  function showClueDialogFn(noteId, text) {
    $clueDialog.style.display = 'flex';
    $clueDialog.dataset.noteId = noteId;
    $clueDialog.dataset.text = text;
    $clueInput.value = '';
    $clueExisting.innerHTML = '';
    var names = Object.keys(getClueGroups());
    names.forEach(function (nm) {
      var b = document.createElement('button');
      b.className = 'knit-clue-tag';
      b.textContent = nm;
      b.addEventListener('click', function () { $clueInput.value = nm; });
      $clueExisting.appendChild(b);
    });
    $clueInput.focus();
  }

  function editThread(id) { showNewDialog(id); }

  // ── Context Menu ───────────────────────────

  function setupContextMenu() {
    var menu = document.getElementById('contextMenu');
    if (!menu) return;

    var item = document.createElement('div');
    item.className = 'context-menu__item';
    item.id = 'contextClue';
    item.innerHTML =
      '<span class="context-menu__item-icon">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' +
        '</svg>' +
      '</span>실마리로 지정';
    menu.appendChild(item);

    item.addEventListener('click', function () {
      var sel = window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (!text) return;
      var card = document.querySelector('.note-card.is-active');
      var noteId = card ? card.dataset.id : null;
      if (!noteId) return;
      showClueDialogFn(noteId, text);
      menu.classList.remove('is-visible');
    });
  }

  // ── Tab Switch ─────────────────────────────

  function setupTab() {
    var tab = document.getElementById('tabKnitting');
    if (!tab) return;
    tab.addEventListener('click', function () {
      document.querySelectorAll('.my-note__sidebar-tab').forEach(function (t) { t.classList.remove('is-active'); });
      document.querySelectorAll('.my-note__panel').forEach(function (p) { p.classList.remove('is-active'); });
      tab.classList.add('is-active');
      $panel.classList.add('is-active');
      notes = load(NOTE_KEY);
      renderPanel();
    });
  }

  // ── Test Data ──────────────────────────────

  var TEST_FILES = [
    '2월의 첫 월요일.md', '비 오는 오후.md', '퇴근길에 든 생각.md',
    '잠이 오지 않는 밤.md', '오래간만에 만난 친구.md', '혼자 보낸 일요일.md',
    '새로운 시작.md', '오늘 화가 났다.md', '감사한 하루.md',
    '정리되지 않는 생각들.md', '봄이 오려나.md', '아침 루틴이 바뀌었다.md',
    '요즘 드는 고민.md', '체력이 바닥이다.md', '내가 좋아하는 것들.md',
    '일과 삶 사이.md', '에너지의 패턴.md', '계획대로 되지 않는 하루.md',
    '작은 성취.md', '앞이 안 보일 때.md', '습관의 힘.md',
    '집이라는 공간.md', '화면에서 눈을 떼고.md', '나만의 시간.md',
    '이번 달을 돌아보며.md',
    '어떤 글에서 본 문장.md', '팟캐스트에서 들은 이야기.md', '영화를 보고 나서.md',
    '책에서 밑줄 친 부분.md', '친구가 한 말.md', '뉴스를 보다가.md',
    '전시를 다녀와서.md', '오래된 일기를 꺼내 읽다.md', 'SNS에서 멈춘 글.md',
    '음악이 불러온 기억.md', '다큐멘터리를 보고.md', '선배가 해준 말.md',
    '카페에서 엿들은 대화.md', '어제 쓴 글을 다시 읽으며.md', '산책 중 떠오른 생각.md',
    '좋은 질문 하나.md', '사진을 정리하다가.md', '요리하면서 떠오른 것.md',
    '아이가 한 말.md', '강연에서 메모한 것.md', '지하철에서 본 풍경.md',
    '편지를 쓰다가.md', '계절이 바뀌는 순간.md', '오래된 노래 한 곡.md',
    '실패에 대해 다시 생각하다.md'
  ];

  async function loadTestData() {
    if (localStorage.getItem(TEST_FLAG) === 'true') return;
    var existing = load(NOTE_KEY);
    var count = 0;

    for (var i = 0; i < TEST_FILES.length; i++) {
      try {
        var res = await fetch('example_knitting/' + encodeURIComponent(TEST_FILES[i]));
        if (!res.ok) continue;
        var raw = await res.text();
        var tm = raw.match(/^#\s+(.+)$/m);
        var title = tm ? tm[1].trim() : TEST_FILES[i].replace('.md', '');
        var content = raw.replace(/^---[\s\S]*?---\s*/, '').trim();

        existing.push({
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + '_' + i,
          type: 'blank', title: title, content: content, htmlContent: '',
          createdAt: Date.now() - (TEST_FILES.length - i) * 60000,
          updatedAt: Date.now() - (TEST_FILES.length - i) * 60000
        });
        count++;
      } catch (e) { /* skip */ }
    }

    if (count > 0) {
      save(NOTE_KEY, existing);
      localStorage.setItem(TEST_FLAG, 'true');
      notes = existing;
      seedClues();
      window.location.reload();
    }
  }

  function seedClues() {
    var seeds = [
      { kw: '기록의 힘', t: '습관의 힘', tx: '돌아보니 이 짧은 기록 덕분에 하루를 그냥 흘려보내지 않게 됐다' },
      { kw: '기록의 힘', t: '이번 달을 돌아보며', tx: '내 시간이 어디에 쓰였는지, 내 마음이 어디를 향했는지' },
      { kw: '기록의 힘', t: '어제 쓴 글을 다시 읽으며', tx: '기록의 가치가 여기에도 있다. 순간의 감정을 붙잡아두면 나중에 거리를 두고 볼 수 있다' },
      { kw: '기록의 힘', t: '오래된 일기를 꺼내 읽다', tx: '질문은 같은데 톤이 다르다' },
      { kw: '나를 아는 일', t: '팟캐스트에서 들은 이야기', tx: '자존감이 낮은 게 아니라 자기 관찰이 부족한 겁니다' },
      { kw: '나를 아는 일', t: '에너지의 패턴', tx: '결국 나를 아는 게 효율과도 연결된다' },
      { kw: '나를 아는 일', t: '내가 좋아하는 것들', tx: '이런 걸 아는 것 자체가 나를 아는 거겠지' },
      { kw: '나를 아는 일', t: '카페에서 엿들은 대화', tx: '간극이 아니라 폭이라고 보면' },
      { kw: '불안과 성장', t: '잠이 오지 않는 밤', tx: '팀장님이 한 마디 했는데, 그 말이 머릿속에서 계속 반복된다' },
      { kw: '불안과 성장', t: '앞이 안 보일 때', tx: '답을 못 찾더라도 질문을 품고 있는 것 자체가 의미 있다고 믿고 싶다' },
      { kw: '불안과 성장', t: '실패에 대해 다시 생각하다', tx: '감정적으로는 아프지만 정보적으로는 가치가 있다' },
      { kw: '불안과 성장', t: '선배가 해준 말', tx: '비교 대상을 바꿔. 남이 아니라 한 달 전의 나랑 비교해봐' },
      { kw: '속도와 멈춤', t: '산책 중 떠오른 생각', tx: '느리게 걸으면 그동안 못 봤던 것들이 보인다' },
      { kw: '속도와 멈춤', t: '화면에서 눈을 떼고', tx: '현실의 감각이 둔해진다' },
      { kw: '속도와 멈춤', t: '전시를 다녀와서', tx: '매일 보는 것을 처음 보는 것처럼 바라보는 연습을 합니다' },
      { kw: '속도와 멈춤', t: '나만의 시간', tx: '이 시간이 존재한다는 것 자체가 중요하다' },
      { kw: '관계 속의 나', t: '오래간만에 만난 친구', tx: '친구에게는 잘 될 거야라고 말하면서 정작 나한테는 그 말을 못 해주고 있었다' },
      { kw: '관계 속의 나', t: '친구가 한 말', tx: '너한테도 좀 다정해봐' },
      { kw: '관계 속의 나', t: '편지를 쓰다가', tx: '빠른 소통에 익숙해지면 깊은 말을 하기 어려워진다' },
      { kw: '일상의 감정', t: '오늘 화가 났다', tx: '화는 내가 중요하게 여기는 것이 무시당했다는 신호다' },
      { kw: '일상의 감정', t: '비 오는 오후', tx: '하고 싶은 말은 있었는데 타이밍을 놓쳤다' },
      { kw: '일상의 감정', t: '감사한 하루', tx: '당연한 것들이 당연하지 않다는 걸 알면서도 평소에는 잊고 산다' },
      { kw: '습관과 변화', t: '아침 루틴이 바뀌었다', tx: '작은 변화인데 효과가 크다. 습관이란 게 정말 그렇다' },
      { kw: '습관과 변화', t: '책에서 밑줄 친 부분', tx: '우리는 자신이 반복하는 것의 총합이다' },
      { kw: '습관과 변화', t: '계절이 바뀌는 순간', tx: '기록은 변화를 볼 수 있게 해주는 도구다' },
      { kw: '시간과 기억', t: '음악이 불러온 기억', tx: '기억은 머리가 아니라 감각에 저장되는 건가 보다' },
      { kw: '시간과 기억', t: '사진을 정리하다가', tx: '이 순간도 나중에 돌아보면 좋았던 시간이 될까' },
      { kw: '시간과 기억', t: '오래된 노래 한 곡', tx: '아무것도 아닌 하루들이 쌓여서 지금의 나를 만들었다' }
    ];

    seeds.forEach(function (s) {
      var n = notes.find(function (x) { return x.title === s.t; });
      if (n) createClue(n.id, s.tx, s.kw);
    });
  }

  // ── Init ───────────────────────────────────

  function init() {
    $panel = document.getElementById('panelKnitting');
    $threadList = document.getElementById('threadsList');
    $suggestList = document.getElementById('suggestedList');
    $emptyMsg = document.getElementById('threadEmptyMsg');
    $thView = document.getElementById('threadView');
    $thTitle = document.getElementById('threadViewTitle');
    $thDesc = document.getElementById('threadViewDesc');
    $thStitches = document.getElementById('threadViewStitches');
    $thClose = document.getElementById('threadViewClose');
    $clueDialog = document.getElementById('clueDialog');
    $clueInput = document.getElementById('clueInput');
    $clueExisting = document.getElementById('clueExisting');
    $clueSave = document.getElementById('clueSave');
    $clueCancel = document.getElementById('clueCancel');
    $newDialog = document.getElementById('newThreadDialog');
    $newTitle = document.getElementById('newThreadTitleInput');
    $newDesc = document.getElementById('newThreadDescInput');
    $newSave = document.getElementById('newThreadSave');
    $newCancel = document.getElementById('newThreadCancel');
    $addDialog = document.getElementById('addNoteDialog');
    $addList = document.getElementById('addNoteList');
    $addCancel = document.getElementById('addNoteCancel');

    if (!$panel) return;

    threads = load(THREAD_KEY);
    clues = load(CLUE_KEY);
    notes = load(NOTE_KEY);

    setupTab();
    setupContextMenu();

    var newBtn = document.getElementById('newThreadBtn');
    if (newBtn) newBtn.addEventListener('click', function () { showNewDialog(); });

    if ($newSave) $newSave.addEventListener('click', function () {
      var title = $newTitle.value.trim();
      if (!title) return;
      var desc = $newDesc.value.trim();
      var eid = $newDialog.dataset.editId;
      if (eid) {
        updateThread(eid, { title: title, description: desc });
        var t = threads.find(function (x) { return x.id === eid; });
        if (activeThreadId === eid && t) renderThreadViewContent(t);
      } else {
        var nt = createThread(title, desc);
        viewThread(nt.id);
      }
      $newDialog.style.display = 'none';
      renderPanel();
    });
    if ($newCancel) $newCancel.addEventListener('click', function () { $newDialog.style.display = 'none'; });

    if ($addCancel) $addCancel.addEventListener('click', function () { $addDialog.style.display = 'none'; });

    if ($clueSave) $clueSave.addEventListener('click', function () {
      var name = $clueInput.value.trim();
      if (!name) return;
      createClue($clueDialog.dataset.noteId, $clueDialog.dataset.text, name);
      $clueDialog.style.display = 'none';
      notes = load(NOTE_KEY);
      renderPanel();
    });
    if ($clueCancel) $clueCancel.addEventListener('click', function () { $clueDialog.style.display = 'none'; });

    if ($thClose) $thClose.addEventListener('click', hideThreadView);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($newDialog) $newDialog.style.display = 'none';
        if ($addDialog) $addDialog.style.display = 'none';
        if ($clueDialog) $clueDialog.style.display = 'none';
      }
    });

    var testBtn = document.getElementById('loadTestDataBtn');
    if (testBtn) {
      if (localStorage.getItem(TEST_FLAG) === 'true') {
        testBtn.textContent = '✓ 테스트 데이터 로드됨';
        testBtn.disabled = true;
        testBtn.classList.add('is-loaded');
      } else {
        testBtn.addEventListener('click', function () {
          testBtn.textContent = '로딩 중…';
          testBtn.disabled = true;
          loadTestData().catch(function () {
            testBtn.textContent = '로드 실패 (웹서버 필요)';
            testBtn.disabled = false;
          });
        });
      }
    }

    renderPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
