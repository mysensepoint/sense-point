/**
 * SensePoint - Common JS
 * 헤더 메뉴 토글 및 Firebase 인증 상태 관리
 */

(function () {
  'use strict';

  var menuToggle = document.getElementById('menuToggle');
  var menuBackdrop = document.getElementById('menuBackdrop');
  var menuPanel = document.getElementById('menuPanel');
  var authBtn = document.getElementById('authBtn');

  var isMenuOpen = false;
  var currentUser = null;

  // =========================================
  // Menu
  // =========================================

  function openMenu() {
    isMenuOpen = true;
    menuToggle.classList.add('is-active');
    menuBackdrop.classList.add('is-open');
    menuPanel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isMenuOpen = false;
    menuToggle.classList.remove('is-active');
    menuBackdrop.classList.remove('is-open');
    menuPanel.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  menuToggle.addEventListener('click', toggleMenu);
  menuBackdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen) {
      closeMenu();
    }
  });

  // =========================================
  // Auth State
  // =========================================

  var auth = window.FB ? window.FB.auth : null;

  function updateAuthUI(user) {
    currentUser = user;
    if (authBtn) {
      authBtn.textContent = user && user.emailVerified ? '로그아웃' : '로그인';
    }
  }

  if (auth) {
    auth.onAuthStateChanged(updateAuthUI);
  }

  authBtn.addEventListener('click', function () {
    if (currentUser && currentUser.emailVerified) {
      if (auth) {
        auth.signOut().then(function () {
          closeMenu();
        });
      }
    } else {
      window.location.href = 'login.html';
    }
  });

  // =========================================
  // Public API
  // =========================================

  window.SensePoint = {
    openMenu: openMenu,
    closeMenu: closeMenu,
    toggleMenu: toggleMenu,
    isLoggedIn: function () {
      return currentUser !== null && currentUser.emailVerified === true;
    },
    currentUser: function () {
      return currentUser;
    },
  };
})();
