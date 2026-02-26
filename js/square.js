/**
 * SensePoint - Square Page
 * 다른 사람의 메모를 보는 커뮤니티 공간
 * 필터(모두/친구/특정 친구), 작성자 사이드바, 메모에 메모하기
 */

(function () {
  'use strict';

  var feedList = document.getElementById('feedList');
  var feedEmpty = document.getElementById('feedEmpty');
  var sidebarDefault = document.getElementById('sidebarDefault');
  var sidebarAuthor = document.getElementById('sidebarAuthor');
  var sidebarAuthorAvatar = document.getElementById('sidebarAuthorAvatar');
  var sidebarAuthorName = document.getElementById('sidebarAuthorName');
  var sidebarAuthorCount = document.getElementById('sidebarAuthorCount');
  var sidebarAuthorList = document.getElementById('sidebarAuthorList');
  var sidebarBackBtn = document.getElementById('sidebarBackBtn');

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
  VISIBILITY_ICONS[VISIBILITY.FRIENDS] = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  VISIBILITY_ICONS[VISIBILITY.PUBLIC] = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

  var REPLY_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ARTICLE_ICON_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>';

  var MY_AUTHOR = '나';

  var VISIT_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  var FRIEND_ADD_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
  var FRIEND_CHECK_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>';

  var SHARED_MEMO_KEY = 'sensepoint_all_memos';

  var currentFilter = 'all';
  var currentFriendFilter = null;
  var selectedAuthor = null;
  var selectedCardId = null;
  var replyCounter = 0;

  // =========================================
  // Sample Data
  // =========================================

  var sampleMemos = [
    {
      id: 'sq_1',
      author: '독서하는곰',
      avatarInitial: '곰',
      isFriend: true,
      note: '감각의 교차점이라는 표현이 정말 와닿았어요. 요즘 음악을 들으면서 글을 쓰는데, 확실히 다른 결과물이 나오는 것 같습니다.',
      sourceText: '감각은 서로 교차하고 융합하며, 그 과정에서 예상치 못한 통찰이 탄생합니다.',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 1800000,
      visibility: VISIBILITY.PUBLIC,
      replies: [
        { id: 'r1', author: '센스헌터', avatarInitial: '센', note: '저도 비슷한 경험! 재즈 틀어놓고 글 쓰면 문장이 달라지더라고요.', createdAt: Date.now() - 900000 },
      ],
    },
    {
      id: 'sq_2',
      author: '센스헌터',
      avatarInitial: '센',
      isFriend: true,
      note: '칸딘스키의 공감각 이야기는 항상 흥미롭네요. 색에서 소리를 듣는다는 건 어떤 느낌일까. 한번 추상미술 전시회에서 음악을 같이 들으면서 그림을 보는 체험이 있었는데, 조금 이해할 수 있었어요.',
      sourceText: '음악가 바실리 칸딘스키는 색채에서 소리를 들었고',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 3600000 * 3,
      visibility: VISIBILITY.PUBLIC,
      replies: [],
    },
    {
      id: 'sq_3',
      author: '일상관찰자',
      avatarInitial: '관',
      isFriend: false,
      note: '매일 출근길에 이어폰을 빼고 걸어보기로 했습니다. 의식적인 주의라는 게 생각보다 어렵지만 확실히 다른 세상이 보여요. 새소리가 이렇게 많았나 싶기도 하고.',
      sourceText: '',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 3600000 * 8,
      visibility: VISIBILITY.PUBLIC,
      replies: [],
    },
    {
      id: 'sq_4',
      author: '감성여행자',
      avatarInitial: '감',
      isFriend: false,
      note: '와비사비 미학 부분이 인상적이네요. 불완전함을 수용하는 태도가 오히려 풍요로움을 만든다는 게 참 역설적이에요.',
      sourceText: '일본의 와비사비 미학은 불완전함 속에서 아름다움을 찾습니다.',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 86400000,
      visibility: VISIBILITY.PUBLIC,
      replies: [
        { id: 'r2', author: '독서하는곰', avatarInitial: '곰', note: '킨츠기(금장)가 떠오르는 이야기네요. 깨진 것을 금으로 잇는 예술.', createdAt: Date.now() - 86400000 + 3600000 },
        { id: 'r3', author: '커피러버', avatarInitial: '커', note: '완벽하지 않아도 괜찮다는 메시지가 좋아요.', createdAt: Date.now() - 86400000 + 7200000 },
      ],
    },
    {
      id: 'sq_5',
      author: '커피러버',
      avatarInitial: '커',
      isFriend: true,
      note: '아침마다 커피 내리면서 향을 음미하는 습관이 있는데, 이게 감각 훈련이었다니! 앞으로 더 의식적으로 해봐야겠어요.',
      sourceText: '매일 마시는 커피의 향을 의식적으로 음미하거나',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 86400000 * 2,
      visibility: VISIBILITY.FRIENDS,
      replies: [],
    },
    {
      id: 'sq_6',
      author: '독서하는곰',
      avatarInitial: '곰',
      isFriend: true,
      note: '기록이 순간적인 감각을 영구적인 통찰로 변환한다는 문장이 마음에 남습니다. 메모하는 습관의 중요성을 다시 한번 느꼈어요.',
      sourceText: '기록은 순간적인 감각을 영구적인 통찰로 변환하는 마법 같은 도구입니다.',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 86400000 * 3,
      visibility: VISIBILITY.PUBLIC,
      replies: [],
    },
    {
      id: 'sq_7',
      author: '센스헌터',
      avatarInitial: '센',
      isFriend: true,
      note: '잡스의 캘리그래피 이야기, 아무도 몰랐던 감각적 교양이 결국 혁신으로 이어졌다는 건 참 흥미로워요.',
      sourceText: '애플의 스티브 잡스는 캘리그래피 수업에서 얻은 시각적 감각을 컴퓨터 타이포그래피에 적용했습니다.',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 86400000 * 4,
      visibility: VISIBILITY.FRIENDS,
      replies: [],
    },
    {
      id: 'sq_8',
      author: '일상관찰자',
      avatarInitial: '관',
      isFriend: false,
      note: '다양한 감각 정보를 동시에 처리할 때 창의적 영역이 활성화된다는 연구 결과, 멀티태스킹과는 다른 이야기일까요? 감각의 멀티태스킹이라고 해야 하나.',
      sourceText: '다양한 감각 정보를 동시에 처리할 때 뇌의 창의적 영역이 더 활발하게 활성화됩니다.',
      articleTitle: '감각의 교차점에서 발견하는 창의성',
      createdAt: Date.now() - 86400000 * 5,
      visibility: VISIBILITY.PUBLIC,
      replies: [
        { id: 'r4', author: '감성여행자', avatarInitial: '감', note: '감각의 멀티태스킹, 좋은 표현이네요! 주의력 분산이 아니라 감각 통합이라는 점에서 다른 것 같아요.', createdAt: Date.now() - 86400000 * 5 + 7200000 },
      ],
    },
  ];

  // =========================================
  // Utility
  // =========================================

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    var now = Date.now();
    var diff = now - timestamp;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return minutes + '분 전';
    if (hours < 24) return hours + '시간 전';
    if (days < 7) return days + '일 전';

    var d = new Date(timestamp);
    var y = String(d.getFullYear()).slice(2);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  function formatTimeShort(timestamp) {
    var d = new Date(timestamp);
    var y = String(d.getFullYear()).slice(2);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    return y + '.' + m;
  }

  // =========================================
  // Filter Logic
  // =========================================

  function getFilteredMemos() {
    var filtered;

    if (currentFilter === 'friends') {
      filtered = sampleMemos.filter(function (m) {
        return m.isFriend && (m.visibility === VISIBILITY.FRIENDS || m.visibility === VISIBILITY.PUBLIC);
      });
    } else {
      filtered = sampleMemos.filter(function (m) {
        return m.visibility === VISIBILITY.PUBLIC;
      });
    }

    if (currentFriendFilter) {
      filtered = filtered.filter(function (m) {
        return m.author === currentFriendFilter;
      });
    }

    filtered.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return filtered;
  }

  function getAuthorMemos(authorName) {
    return sampleMemos
      .filter(function (m) {
        if (currentFilter === 'friends') {
          return m.author === authorName && (m.visibility === VISIBILITY.FRIENDS || m.visibility === VISIBILITY.PUBLIC);
        }
        return m.author === authorName && m.visibility === VISIBILITY.PUBLIC;
      })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
  }

  function getAuthorInfo(authorName) {
    var memo = sampleMemos.find(function (m) { return m.author === authorName; });
    return memo ? { author: memo.author, avatarInitial: memo.avatarInitial } : null;
  }

  // =========================================
  // Feed Rendering
  // =========================================

  function buildFeedCardHTML(memo) {
    var sourceHTML = memo.sourceText
      ? '<div class="feed-card__source">' + escapeHtml(memo.sourceText) + '</div>'
      : '';

    var visIcon = VISIBILITY_ICONS[memo.visibility] || '';
    var visLabel = VISIBILITY_LABELS[memo.visibility] || '';

    var repliesHTML = '';
    var myReplies = (memo.replies || []).filter(function (r) { return r.author === MY_AUTHOR; });
    if (myReplies.length > 0) {
      var replyItems = myReplies.map(function (r) {
        return (
          '<div class="feed-reply">' +
            '<div class="feed-reply__header">' +
              '<span class="feed-reply__avatar">' + escapeHtml(r.avatarInitial) + '</span>' +
              '<span class="feed-reply__author">' + escapeHtml(r.author) + '</span>' +
              '<span class="feed-reply__time">' + formatTime(r.createdAt) + '</span>' +
            '</div>' +
            '<p class="feed-reply__note">' + escapeHtml(r.note) + '</p>' +
          '</div>'
        );
      }).join('');
      repliesHTML = '<div class="feed-card__replies">' + replyItems + '</div>';
    }

    var replyActionHTML =
      '<div class="feed-card__reply-action" data-memo-id="' + memo.id + '">' +
        '<button class="feed-card__reply-btn">' +
          REPLY_ICON_SVG +
          '<span>메모에 메모하기</span>' +
        '</button>' +
        '<div class="feed-card__reply-form" style="display:none">' +
          '<textarea class="feed-card__reply-input" placeholder="이 메모에 대한 생각을 남겨보세요..." rows="2"></textarea>' +
          '<div class="feed-card__reply-form-actions">' +
            '<button class="feed-card__reply-cancel">취소</button>' +
            '<button class="feed-card__reply-submit">등록</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    return (
      '<div class="feed-card" data-memo-id="' + memo.id + '" data-author="' + escapeHtml(memo.author) + '">' +
        '<div class="feed-card__header">' +
          '<span class="feed-card__avatar">' + escapeHtml(memo.avatarInitial) + '</span>' +
          '<div class="feed-card__author-info">' +
            '<span class="feed-card__author">' + escapeHtml(memo.author) + '</span>' +
            '<div class="feed-card__meta">' +
              '<span>' + formatTime(memo.createdAt) + '</span>' +
              (memo.articleTitle
                ? '<span class="feed-card__meta-divider"></span><span>' + escapeHtml(memo.articleTitle) + '</span>'
                : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        sourceHTML +
        '<p class="feed-card__note">' + escapeHtml(memo.note) + '</p>' +
        '<span class="feed-card__visibility">' +
          '<span class="feed-card__visibility-icon">' + visIcon + '</span>' +
          visLabel +
        '</span>' +
        (memo.articleTitle
          ? '<a class="feed-card__visit" href="#" data-visit data-memo-id="' + memo.id + '">' +
              VISIT_ICON_SVG +
              '<span>이 컨텐츠 다녀오기</span>' +
            '</a>'
          : '') +
        repliesHTML +
        replyActionHTML +
      '</div>'
    );
  }

  function renderFeed() {
    var filtered = getFilteredMemos();

    if (filtered.length === 0) {
      feedList.innerHTML = '';
      feedEmpty.style.display = '';
      return;
    }

    feedEmpty.style.display = 'none';
    feedList.innerHTML = filtered.map(buildFeedCardHTML).join('');
    bindFeedCardEvents();
    highlightSelectedCard();
  }

  function highlightSelectedCard() {
    feedList.querySelectorAll('.feed-card').forEach(function (card) {
      card.classList.toggle('is-selected', card.dataset.memoId === selectedCardId);
    });
  }

  function bindFeedCardEvents() {
    feedList.querySelectorAll('.feed-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.feed-card__reply-action')) return;
        if (e.target.closest('.feed-card__visit')) return;

        var authorName = card.dataset.author;
        var memoId = card.dataset.memoId;
        selectedCardId = memoId;
        highlightSelectedCard();
        showAuthorSidebar(authorName);
      });
    });

    feedList.querySelectorAll('.feed-card__reply-action').forEach(function (action) {
      bindReplyAction(action, 'feed');
    });
  }

  // =========================================
  // Author Sidebar
  // =========================================

  var sidebarFriendBar = document.getElementById('sidebarFriendBar');

  function isAuthorFriend(authorName) {
    var memo = sampleMemos.find(function (m) { return m.author === authorName; });
    return memo ? memo.isFriend : false;
  }

  function toggleFriend(authorName) {
    var nowFriend = !isAuthorFriend(authorName);
    sampleMemos.forEach(function (m) {
      if (m.author === authorName) m.isFriend = nowFriend;
    });
    renderFriendBar(authorName);
    renderFeed();
    if (selectedAuthor) {
      renderAuthorMemos(selectedAuthor);
    }
  }

  function renderFriendBar(authorName) {
    if (!sidebarFriendBar) return;
    var isFriend = isAuthorFriend(authorName);

    if (isFriend) {
      sidebarFriendBar.innerHTML =
        '<button class="square__sidebar-friend-btn is-friend" id="friendToggleBtn">' +
          FRIEND_CHECK_ICON_SVG +
          '<span>친구</span>' +
        '</button>';
    } else {
      sidebarFriendBar.innerHTML =
        '<button class="square__sidebar-friend-btn" id="friendToggleBtn">' +
          FRIEND_ADD_ICON_SVG +
          '<span>친구하기</span>' +
        '</button>';
    }

    document.getElementById('friendToggleBtn').addEventListener('click', function () {
      toggleFriend(authorName);
    });
  }

  function showAuthorSidebar(authorName) {
    var info = getAuthorInfo(authorName);
    if (!info) return;

    selectedAuthor = authorName;
    sidebarDefault.style.display = 'none';
    sidebarAuthor.style.display = '';

    sidebarAuthorAvatar.textContent = info.avatarInitial;
    sidebarAuthorName.textContent = info.author;

    renderFriendBar(authorName);
    renderAuthorMemos(authorName);
  }

  function hideAuthorSidebar() {
    selectedAuthor = null;
    selectedCardId = null;
    sidebarAuthor.style.display = 'none';
    sidebarDefault.style.display = '';
    highlightSelectedCard();
  }

  function renderAuthorMemos(authorName) {
    var memos = getAuthorMemos(authorName);
    sidebarAuthorCount.textContent = memos.length + '개 메모';

    if (memos.length === 0) {
      sidebarAuthorList.innerHTML = '<p class="square__sidebar-author-empty">공개된 메모가 없습니다.</p>';
      return;
    }

    sidebarAuthorList.innerHTML = memos.map(buildSidebarCardHTML).join('');
    bindSidebarCardEvents();
  }

  function buildSidebarCardHTML(memo) {
    var sourceHTML = memo.sourceText
      ? '<div class="sidebar-card__source">' + escapeHtml(memo.sourceText) + '</div>'
      : '';

    var visIcon = VISIBILITY_ICONS[memo.visibility] || '';
    var visLabel = VISIBILITY_LABELS[memo.visibility] || '';

    var articleRefHTML = memo.articleTitle
      ? '<div class="sidebar-card__article-ref">' + ARTICLE_ICON_SVG + ' ' + escapeHtml(memo.articleTitle) + '</div>'
      : '';

    var repliesHTML = '';
    var myReplies = (memo.replies || []).filter(function (r) { return r.author === MY_AUTHOR; });
    if (myReplies.length > 0) {
      var replyItems = myReplies.map(function (r) {
        return (
          '<div class="sidebar-reply">' +
            '<div class="sidebar-reply__header">' +
              '<span class="sidebar-reply__avatar">' + escapeHtml(r.avatarInitial) + '</span>' +
              '<span class="sidebar-reply__author">' + escapeHtml(r.author) + '</span>' +
              '<span class="sidebar-reply__time">' + formatTime(r.createdAt) + '</span>' +
            '</div>' +
            '<p class="sidebar-reply__note">' + escapeHtml(r.note) + '</p>' +
          '</div>'
        );
      }).join('');
      repliesHTML = '<div class="sidebar-card__replies">' + replyItems + '</div>';
    }

    var replyActionHTML =
      '<div class="sidebar-card__reply-action" data-memo-id="' + memo.id + '">' +
        '<button class="sidebar-card__reply-btn">' +
          REPLY_ICON_SVG +
          '<span>메모에 메모하기</span>' +
        '</button>' +
        '<div class="sidebar-card__reply-form" style="display:none">' +
          '<textarea class="sidebar-card__reply-input" placeholder="이 메모에 대한 생각을 남겨보세요..." rows="2"></textarea>' +
          '<div class="sidebar-card__reply-form-actions">' +
            '<button class="sidebar-card__reply-cancel">취소</button>' +
            '<button class="sidebar-card__reply-submit">등록</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    return (
      '<div class="sidebar-card" data-memo-id="' + memo.id + '">' +
        '<div class="sidebar-card__time">' +
          '<span class="sidebar-card__time-text">' + formatTime(memo.createdAt) + '</span>' +
          '<span class="sidebar-card__visibility">' +
            '<span class="sidebar-card__visibility-icon">' + visIcon + '</span>' +
            visLabel +
          '</span>' +
        '</div>' +
        sourceHTML +
        '<p class="sidebar-card__note">' + escapeHtml(memo.note) + '</p>' +
        articleRefHTML +
        (memo.articleTitle
          ? '<a class="sidebar-card__visit" href="#" data-visit data-memo-id="' + memo.id + '">' +
              VISIT_ICON_SVG +
              '<span>이 컨텐츠 다녀오기</span>' +
            '</a>'
          : '') +
        repliesHTML +
        replyActionHTML +
      '</div>'
    );
  }

  function bindSidebarCardEvents() {
    sidebarAuthorList.querySelectorAll('.sidebar-card__reply-action').forEach(function (action) {
      bindReplyAction(action, 'sidebar');
    });
  }

  // =========================================
  // Reply System (메모에 메모하기) — shared
  // =========================================

  function bindReplyAction(actionEl, context) {
    var memoId = actionEl.dataset.memoId;
    var prefix = context === 'feed' ? 'feed-card' : 'sidebar-card';
    var btn = actionEl.querySelector('.' + prefix + '__reply-btn');
    var form = actionEl.querySelector('.' + prefix + '__reply-form');
    var input = actionEl.querySelector('.' + prefix + '__reply-input');
    var cancelBtn = actionEl.querySelector('.' + prefix + '__reply-cancel');
    var submitBtn = actionEl.querySelector('.' + prefix + '__reply-submit');

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

      addReply(memoId, text);
      renderFeed();
      if (selectedAuthor) {
        renderAuthorMemos(selectedAuthor);
      }
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

  function addReply(memoId, noteText) {
    var memo = sampleMemos.find(function (m) { return m.id === memoId; });
    if (!memo) return;

    var reply = {
      id: 'reply_' + (++replyCounter) + '_' + Date.now(),
      author: '나',
      avatarInitial: '나',
      note: noteText,
      createdAt: Date.now(),
    };
    memo.replies.push(reply);

    syncReplyToShared(memo, reply);
  }

  function syncReplyToShared(originalMemo, reply) {
    try {
      var all = JSON.parse(localStorage.getItem(SHARED_MEMO_KEY) || '[]');
      var sharedMemo = {
        id: 'sq_reply_' + reply.id,
        type: 'reply',
        sourceText: originalMemo.note || '',
        note: reply.note,
        createdAt: reply.createdAt,
        visibility: 'private',
        source: 'square',
        originalAuthor: originalMemo.author || '',
        articleTitle: originalMemo.articleTitle || '',
        replies: []
      };
      all.push(sharedMemo);
      localStorage.setItem(SHARED_MEMO_KEY, JSON.stringify(all));
    } catch (e) { /* noop */ }
  }

  // =========================================
  // Friend Filter (특정 친구 메모 보기)
  // =========================================

  function setFriendFilter(authorName) {
    currentFriendFilter = authorName;
    renderFriendChip();
    renderFeed();
  }

  function clearFriendFilter() {
    currentFriendFilter = null;
    renderFriendChip();
    renderFeed();
  }

  function renderFriendChip() {
    var container = document.querySelector('.square__friend-filter');
    if (!container) return;

    if (!currentFriendFilter) {
      container.classList.remove('is-visible');
      container.innerHTML = '';
      return;
    }

    var info = getAuthorInfo(currentFriendFilter);
    if (!info) return;

    container.classList.add('is-visible');
    container.innerHTML =
      '<span class="square__friend-chip">' +
        '<span class="square__friend-chip-avatar">' + escapeHtml(info.avatarInitial) + '</span>' +
        escapeHtml(info.author) +
        '<button class="square__friend-chip-remove" title="필터 해제">&times;</button>' +
      '</span>';

    container.querySelector('.square__friend-chip-remove').addEventListener('click', function () {
      clearFriendFilter();
    });
  }

  // =========================================
  // Filter Tabs
  // =========================================

  var filterTabs = document.querySelectorAll('.square__filter-tab');
  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      currentFilter = tab.dataset.filter;
      filterTabs.forEach(function (t) {
        t.classList.toggle('is-active', t.dataset.filter === currentFilter);
      });
      currentFriendFilter = null;
      renderFriendChip();
      renderFeed();
      if (selectedAuthor) {
        renderAuthorMemos(selectedAuthor);
      }
    });
  });

  // =========================================
  // Sidebar Back
  // =========================================

  sidebarBackBtn.addEventListener('click', function () {
    hideAuthorSidebar();
  });

  // =========================================
  // Friend Filter — inject container into DOM
  // =========================================

  (function initFriendFilter() {
    var feedHeader = document.querySelector('.square__feed-header');
    if (!feedHeader) return;

    var div = document.createElement('div');
    div.className = 'square__friend-filter';
    feedHeader.appendChild(div);
  })();

  // =========================================
  // Visit Link — sessionStorage에 메모 데이터 저장
  // =========================================

  document.addEventListener('click', function (e) {
    var visitLink = e.target.closest('[data-visit]');
    if (!visitLink) return;

    e.preventDefault();

    var memoId = visitLink.dataset.memoId;
    var memo = sampleMemos.find(function (m) { return m.id === memoId; });
    if (!memo) return;

    var payload = JSON.stringify({
      id: memo.id,
      author: memo.author,
      avatarInitial: memo.avatarInitial,
      note: memo.note,
      sourceText: memo.sourceText || '',
      articleTitle: memo.articleTitle || '',
      createdAt: memo.createdAt,
      visibility: memo.visibility,
      replies: (memo.replies || []).filter(function (r) { return r.author === MY_AUTHOR; }),
    });

    var encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(payload))));
    window.location.href = 'sense-makers.html?from=square&memo=' + encoded;
  });

  // =========================================
  // Initialize
  // =========================================

  renderFeed();
})();
