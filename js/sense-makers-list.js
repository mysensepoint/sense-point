/**
 * SensePoint - Sense Makers List Page
 * 감동의 기록 — 인터뷰 컨텐츠 목록, 감각 영역별 필터링
 */

(function () {
  'use strict';

  var contentGrid = document.getElementById('contentGrid');
  var listEmpty = document.getElementById('listEmpty');
  var categoryFilter = document.getElementById('categoryFilter');
  var currentCategory = 'all';

  var GRADIENT_PALETTES = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
    'linear-gradient(135deg, #1b2838 0%, #2d1b3d 60%, #1a0a2e 100%)',
    'linear-gradient(135deg, #0d1b2a 0%, #1b3a4b 60%, #006466 100%)',
    'linear-gradient(135deg, #2d1b3d 0%, #3d1c3e 60%, #1a0a2e 100%)',
    'linear-gradient(135deg, #1a1a1a 0%, #2a1f14 60%, #3d2914 100%)',
    'linear-gradient(135deg, #0a1628 0%, #1a2a4a 60%, #2a1a3a 100%)',
    'linear-gradient(135deg, #1a2a1a 0%, #0d1b2a 60%, #1b3a2b 100%)',
  ];

  var CATEGORY_LABELS = {
    space: 'Space',
    sound: 'Sound',
    flavor: 'Flavor',
    craft: 'Craft',
    light: 'Light',
  };

  var interviews = [
    {
      id: 'interview-1',
      category: 'space',
      guest: { name: '정하나', role: '동네 카페 사장', initial: '정' },
      title: '매일 아침, 문을 여는 마음',
      quote: '손님이 문을 열고 들어오는 그 2초 사이에 느끼는 공기, 온도, 향기 — 그게 그 사람의 하루를 바꿀 수도 있다고 생각해요. 그래서 매일 아침 문을 열기 전에 한 번 서서 느껴봅니다.',
      date: '2026.02.20',
      readTime: '12분',
      memoCount: 24,
      featured: true,
      url: 'sense-makers.html',
    },
    {
      id: 'interview-2',
      category: 'light',
      guest: { name: '오시현', role: '거리 사진작가', initial: '오' },
      title: '셔터를 누르는 그 순간에 대하여',
      quote: '지나가는 사람들의 뒷모습에도 이야기가 있어요. 피곤한 어깨, 누군가와 통화하며 짓는 미소, 우산을 기울여주는 손. 저는 그런 순간을 기록하는 사람입니다.',
      date: '2026.02.17',
      readTime: '10분',
      memoCount: 15,
      featured: false,
      url: 'sense-makers.html',
    },
    {
      id: 'interview-3',
      category: 'flavor',
      guest: { name: '김재원', role: '빵집 주인 · 제빵사', initial: '김' },
      title: '반죽을 기다리는 시간이 알려준 것',
      quote: '빵은 제가 만드는 게 아니에요. 밀가루와 물과 시간이 만드는 거죠. 저는 그저 기다려주는 겁니다. 그 기다림을 배우는 데 10년이 걸렸어요.',
      date: '2026.02.14',
      readTime: '9분',
      memoCount: 19,
      featured: false,
      url: 'sense-makers.html',
    },
    {
      id: 'interview-4',
      category: 'craft',
      guest: { name: '박소라', role: '가죽 공방 장인', initial: '박' },
      title: '손끝에서 시작되는 것들',
      quote: '기계로 찍어내면 빠르겠죠. 하지만 손으로 한 땀 한 땀 꿰맨 자리에는 시간이 쌓여요. 쓰는 사람이 그걸 모를 수도 있지만, 물건은 알고 있어요.',
      date: '2026.02.11',
      readTime: '11분',
      memoCount: 8,
      featured: false,
      url: 'sense-makers.html',
    },
    {
      id: 'interview-5',
      category: 'sound',
      guest: { name: '윤채이', role: '재즈바 피아니스트', initial: '윤' },
      title: '아무도 듣지 않는 밤의 연주',
      quote: '손님이 한 명도 없는 밤에도 치는 이유요? 그 공간이 음악을 기억하니까요. 빈 의자에도 누군가가 앉아 있었고, 다시 앉을 거잖아요.',
      date: '2026.02.08',
      readTime: '8분',
      memoCount: 12,
      featured: false,
      url: 'sense-makers.html',
    },
    {
      id: 'interview-6',
      category: 'space',
      guest: { name: '이승우', role: '시내버스 기사', initial: '이' },
      title: '출퇴근길의 작은 배려에 대하여',
      quote: '급정거 한 번이면 뒤에서 누가 넘어질 수 있어요. 출발할 때 한 박자 기다리고, 멈출 때 조금 일찍 브레이크를 밟는 거예요. 아무도 모르지만, 그게 제 일이에요.',
      date: '2026.02.05',
      readTime: '7분',
      memoCount: 31,
      featured: false,
      url: 'sense-makers.html',
    },
    {
      id: 'interview-7',
      category: 'flavor',
      guest: { name: '한소영', role: '꽃집 주인', initial: '한' },
      title: '계절을 전하는 사람',
      quote: '꽃을 고르는 분들에게 항상 물어요. "누구에게 전하시는 거예요?" 같은 장미라도 받는 사람에 따라 다르게 다듬거든요. 꽃은 말을 담는 그릇이니까.',
      date: '2026.02.02',
      readTime: '9분',
      memoCount: 17,
      featured: false,
      url: 'sense-makers.html',
    },
  ];

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function buildMemoIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  }

  function buildCardHTML(item, index) {
    var gradient = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
    var featuredClass = item.featured ? ' sm-card--featured' : '';
    var label = CATEGORY_LABELS[item.category] || item.category;

    var memoHTML = item.memoCount > 0
      ? '<span class="sm-card__memo-count">' + buildMemoIcon() + '<span>' + item.memoCount + '</span></span>'
      : '';

    return (
      '<a href="' + item.url + '" class="sm-card' + featuredClass + '" data-category="' + item.category + '">' +
        '<div class="sm-card__visual">' +
          '<div class="sm-card__gradient" style="background: ' + gradient + ';">' +
            '<span class="sm-card__visual-label">Sense Makers</span>' +
          '</div>' +
        '</div>' +
        '<div class="sm-card__body">' +
          '<span class="sm-card__category">' + escapeHtml(label) + '</span>' +
          '<div class="sm-card__guest">' +
            '<span class="sm-card__guest-avatar">' + escapeHtml(item.guest.initial) + '</span>' +
            '<div class="sm-card__guest-info">' +
              '<span class="sm-card__guest-name">' + escapeHtml(item.guest.name) + '</span>' +
              '<span class="sm-card__guest-role">' + escapeHtml(item.guest.role) + '</span>' +
            '</div>' +
          '</div>' +
          '<h3 class="sm-card__title">' + escapeHtml(item.title) + '</h3>' +
          '<p class="sm-card__excerpt">' + escapeHtml(item.quote) + '</p>' +
          '<div class="sm-card__meta">' +
            '<span>' + escapeHtml(item.date) + '</span>' +
            '<span class="sm-card__meta-divider"></span>' +
            '<span>' + escapeHtml(item.readTime) + ' 읽기</span>' +
            memoHTML +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function renderGrid(category) {
    var filtered = category === 'all'
      ? interviews
      : interviews.filter(function (a) { return a.category === category; });

    if (filtered.length === 0) {
      contentGrid.innerHTML = '';
      contentGrid.style.display = 'none';
      listEmpty.style.display = '';
      return;
    }

    listEmpty.style.display = 'none';
    contentGrid.style.display = '';

    contentGrid.innerHTML = filtered.map(function (item, i) {
      return buildCardHTML(item, i);
    }).join('');
  }

  categoryFilter.addEventListener('click', function (e) {
    var tab = e.target.closest('.sm-list__filter-tab');
    if (!tab) return;

    currentCategory = tab.dataset.category;

    categoryFilter.querySelectorAll('.sm-list__filter-tab').forEach(function (t) {
      t.classList.toggle('is-active', t === tab);
    });

    renderGrid(currentCategory);
  });

  renderGrid('all');
})();
