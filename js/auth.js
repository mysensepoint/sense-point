/**
 * SensePoint - Auth Module
 * 회원가입, 로그인, 이메일 인증 재발송
 */

(function () {
  'use strict';

  var auth = window.FB ? window.FB.auth : null;
  var db = window.FB ? window.FB.db : null;

  if (!auth) return;

  var signupForm = document.getElementById('signupForm');
  var signupFormWrap = document.getElementById('signupFormWrap');
  var loginForm = document.getElementById('loginForm');
  var errorMsg = document.getElementById('authError');
  var successMsg = document.getElementById('authSuccess');
  var verificationNotice = document.getElementById('verificationNotice');
  var resendBtn = document.getElementById('resendVerification');

  // =========================================
  // Helpers
  // =========================================

  function showError(msg) {
    if (errorMsg) {
      errorMsg.textContent = msg;
      errorMsg.classList.add('is-visible');
    }
    if (successMsg) successMsg.classList.remove('is-visible');
  }

  function showSuccess(msg) {
    if (successMsg) {
      successMsg.textContent = msg;
      successMsg.classList.add('is-visible');
    }
    if (errorMsg) errorMsg.classList.remove('is-visible');
  }

  function hideMessages() {
    if (errorMsg) errorMsg.classList.remove('is-visible');
    if (successMsg) successMsg.classList.remove('is-visible');
  }

  function translateError(code) {
    var map = {
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
      'auth/weak-password': '비밀번호는 최소 6자 이상이어야 합니다.',
      'auth/user-not-found': '등록되지 않은 이메일입니다.',
      'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
      'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
      'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/network-request-failed': '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
    };
    return map[code] || '오류가 발생했습니다. 다시 시도해주세요.';
  }

  // Redirect away if already fully authenticated
  auth.onAuthStateChanged(function (user) {
    if (user && user.emailVerified) {
      var isAuthPage =
        window.location.pathname.indexOf('login.html') !== -1 ||
        window.location.pathname.indexOf('signup.html') !== -1;
      if (isAuthPage) {
        window.location.href = 'index.html';
      }
    }
  });

  // =========================================
  // Signup
  // =========================================

  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMessages();

      var email = document.getElementById('signupEmail').value.trim();
      var password = document.getElementById('signupPassword').value;
      var passwordConfirm = document.getElementById('signupPasswordConfirm').value;
      var nickname = document.getElementById('signupNickname').value.trim();
      var recentStory = document.getElementById('signupRecentBook').value.trim();
      var favoriteStory = document.getElementById('signupFavoriteBook').value.trim();

      if (!email) {
        showError('이메일을 입력해주세요.');
        return;
      }
      if (password.length < 6) {
        showError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
      if (password !== passwordConfirm) {
        showError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!nickname) {
        showError('닉네임을 입력해주세요.');
        return;
      }

      var submitBtn = signupForm.querySelector('.auth__submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '처리 중...';

      auth
        .createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          var user = cred.user;
          return user.updateProfile({ displayName: nickname }).then(function () {
            return user;
          });
        })
        .then(function (user) {
          return user.sendEmailVerification().then(function () {
            return user;
          });
        })
        .then(function (user) {
          return db.collection('users').doc(user.uid).set({
            email: email,
            nickname: nickname,
            recentStory: recentStory,
            favoriteStory: favoriteStory,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
          });
        })
        .then(function () {
          if (signupFormWrap) signupFormWrap.style.display = 'none';
          if (verificationNotice) verificationNotice.classList.add('is-visible');
        })
        .catch(function (error) {
          showError(translateError(error.code));
          submitBtn.disabled = false;
          submitBtn.textContent = '회원가입';
        });
    });
  }

  // =========================================
  // Login
  // =========================================

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMessages();

      var email = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        showError('이메일과 비밀번호를 입력해주세요.');
        return;
      }

      var submitBtn = loginForm.querySelector('.auth__submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '로그인 중...';

      auth
        .signInWithEmailAndPassword(email, password)
        .then(function (cred) {
          var user = cred.user;

          if (!user.emailVerified) {
            showError('이메일 인증이 완료되지 않았습니다. 받은 인증 메일을 확인해주세요.');
            if (resendBtn) resendBtn.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = '로그인';
            return;
          }

          db.collection('users')
            .doc(user.uid)
            .update({ emailVerified: true })
            .catch(function () {});

          window.location.href = 'index.html';
        })
        .catch(function (error) {
          showError(translateError(error.code));
          submitBtn.disabled = false;
          submitBtn.textContent = '로그인';
        });
    });
  }

  // =========================================
  // Resend Verification Email
  // =========================================

  if (resendBtn) {
    resendBtn.addEventListener('click', function () {
      hideMessages();
      var user = auth.currentUser;

      if (!user) {
        showError('인증 메일을 재발송하려면 먼저 로그인해주세요.');
        return;
      }

      resendBtn.disabled = true;
      resendBtn.textContent = '발송 중...';

      user
        .sendEmailVerification()
        .then(function () {
          showSuccess('인증 메일이 재발송되었습니다. 이메일을 확인해주세요.');
          resendBtn.disabled = false;
          resendBtn.textContent = '인증 메일 재발송';
        })
        .catch(function (error) {
          showError(translateError(error.code));
          resendBtn.disabled = false;
          resendBtn.textContent = '인증 메일 재발송';
        });
    });
  }
})();
