/**
 * SensePoint - Landing Page
 * 배너 캐러셀(드래그+화살표+터치스와이프+자동슬라이드) 및 물결 효과
 */

(function () {
  'use strict';

  // =========================================
  // Banner Carousel
  // =========================================

  const carousel = document.getElementById('bannerCarousel');
  const track = document.getElementById('bannerTrack');
  const prevBtn = document.getElementById('bannerPrev');
  const nextBtn = document.getElementById('bannerNext');
  const currentDisplay = document.getElementById('bannerCurrent');
  const totalDisplay = document.getElementById('bannerTotal');

  const slides = track.querySelectorAll('.landing__banner-slide');
  const totalSlides = slides.length;
  let currentIndex = 0;
  let isDragging = false;
  let isTouchInteraction = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;

  const TOUCH_SWIPE_THRESHOLD = 50;
  const AUTO_SLIDE_INTERVAL = 5000;
  let autoSlideTimer = null;

  totalDisplay.textContent = String(totalSlides).padStart(2, '0');

  function goToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;
    currentTranslate = -currentIndex * 100;
    prevTranslate = currentTranslate;
    track.style.transform = `translateX(${currentTranslate}%)`;
    currentDisplay.textContent = String(currentIndex + 1).padStart(2, '0');
    track.classList.remove('is-dragging');
  }

  // --- Auto-slide ---

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(function () {
      goToSlide(currentIndex + 1);
    }, AUTO_SLIDE_INTERVAL);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopAutoSlide();
    } else {
      startAutoSlide();
    }
  });

  prevBtn.addEventListener('click', function () {
    goToSlide(currentIndex - 1);
    resetAutoSlide();
  });
  nextBtn.addEventListener('click', function () {
    goToSlide(currentIndex + 1);
    resetAutoSlide();
  });

  // --- Drag & Touch Swipe ---

  function getPositionX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
  }

  function dragStart(e) {
    if (e.target.closest('.landing__banner-nav')) return;
    isDragging = true;
    isTouchInteraction = e.type === 'touchstart';
    startX = getPositionX(e);
    track.classList.add('is-dragging');
    carousel.classList.add('is-dragging');
  }

  function dragMove(e) {
    if (!isDragging) return;
    const currentX = getPositionX(e);
    const diff = currentX - startX;
    const carouselWidth = carousel.offsetWidth;
    const percentMoved = (diff / carouselWidth) * 100;
    currentTranslate = prevTranslate + percentMoved;
    track.style.transform = `translateX(${currentTranslate}%)`;
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    carousel.classList.remove('is-dragging');

    const movedPercent = currentTranslate - prevTranslate;
    const carouselWidth = carousel.offsetWidth;
    const movedPx = (movedPercent / 100) * carouselWidth;
    const threshold = isTouchInteraction ? TOUCH_SWIPE_THRESHOLD : carouselWidth * 0.1;

    if (movedPx < -threshold) {
      goToSlide(currentIndex + 1);
    } else if (movedPx > threshold) {
      goToSlide(currentIndex - 1);
    } else {
      goToSlide(currentIndex);
    }

    resetAutoSlide();
  }

  carousel.addEventListener('mousedown', dragStart);
  carousel.addEventListener('mousemove', dragMove);
  carousel.addEventListener('mouseup', dragEnd);
  carousel.addEventListener('mouseleave', dragEnd);
  carousel.addEventListener('touchstart', dragStart, { passive: true });
  carousel.addEventListener('touchmove', dragMove, { passive: true });
  carousel.addEventListener('touchend', dragEnd);

  carousel.addEventListener('dragstart', (e) => e.preventDefault());

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      goToSlide(currentIndex - 1);
      resetAutoSlide();
    }
    if (e.key === 'ArrowRight') {
      goToSlide(currentIndex + 1);
      resetAutoSlide();
    }
  });

  startAutoSlide();

  // =========================================
  // Water Surface Trail Effect
  // =========================================

  const canvas = document.getElementById('rippleCanvas');
  const ctx = canvas.getContext('2d');
  let cvW, cvH;

  function resizeCanvas() {
    cvW = canvas.width = canvas.offsetWidth;
    cvH = canvas.height = canvas.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const TRAIL_LIFE = 1.8;
  const SPAWN_GAP = 40;
  const MAX_WAVES = 100;
  const trailPts = [];
  const waves = [];
  let prevPX = -1, prevPY = -1, prevPT = 0, lastSpawn = 0;

  class TrailWave {
    constructor(x, y, angle, speed) {
      this.x = x;
      this.y = y;
      this.cos = Math.cos(angle);
      this.sin = Math.sin(angle);
      this.born = performance.now() * 0.001;
      var sf = Math.min(speed / 500, 1);
      this.life = 1.2 + sf * 0.8 + Math.random() * 0.4;
      this.maxSp = 20 + sf * 80;
      this.ecc = 0.3 + sf * 0.15;
      this.amp = 1.5 + sf * 5;
      this.a0 = 0.04 + sf * 0.1;
      this.nr = 2 + (sf * 2 | 0);
      this.ph = Math.random() * Math.PI * 2;
      this.gr = 45 + sf * 85;
    }
  }

  class SplashWave {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.born = performance.now() * 0.001;
      this.life = 2.2 + Math.random() * 0.5;
      this.maxSp = 100 + Math.random() * 60;
      this.amp = 4 + Math.random() * 3;
      this.a0 = 0.15;
      this.nr = 4;
      this.ph = Math.random() * Math.PI * 2;
      this.gr = 90;
    }
  }

  function drawTrailWave(w, now) {
    var age = now - w.born;
    if (age > w.life) return false;
    var t = age / w.life;
    var fade = Math.pow(1 - t, 0.65);
    var alpha = w.a0 * fade;
    if (alpha < 0.003) return true;
    var spread = Math.min(age * w.gr, w.maxSp);
    var c = w.cos, s = w.sin;
    for (var r = 0; r < w.nr; r++) {
      var rs = spread * (r + 1) / w.nr;
      var ra = alpha * (1 - r * 0.22);
      if (ra < 0.003 || rs < 1.5) continue;
      ctx.beginPath();
      for (var i = 0; i <= 28; i++) {
        var a = i / 28 * Math.PI * 2;
        var ex = Math.cos(a) * rs * w.ecc;
        var ey = Math.sin(a) * rs;
        var rx = ex * c - ey * s;
        var ry = ex * s + ey * c;
        var d = Math.sin(a * 4 + w.ph + age * 3.5) * w.amp * fade;
        var px = w.x + rx + Math.cos(a) * d;
        var py = w.y + ry + Math.sin(a) * d;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(200,169,110,' + ra + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    return true;
  }

  function drawSplashWave(w, now) {
    var age = now - w.born;
    if (age > w.life) return false;
    var t = age / w.life;
    var fade = Math.pow(1 - t, 0.5);
    var alpha = w.a0 * fade;
    if (alpha < 0.003) return true;
    var spread = Math.min(age * w.gr, w.maxSp);
    for (var r = 0; r < w.nr; r++) {
      var rad = spread * (r + 1) / w.nr;
      var ra = alpha * (1 - r * 0.18);
      if (ra < 0.003 || rad < 2) continue;
      ctx.beginPath();
      for (var i = 0; i <= 48; i++) {
        var a = i / 48 * Math.PI * 2;
        var d = Math.sin(a * 6 + w.ph + age * 3) * w.amp * fade;
        var R = rad + d;
        var px = w.x + Math.cos(a) * R;
        var py = w.y + Math.sin(a) * R;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(200,169,110,' + ra + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return true;
  }

  function drawGlow(now) {
    if (trailPts.length < 2) return;
    var passes = [
      { w: 14, a: 0.008 },
      { w: 6, a: 0.02 },
      { w: 2, a: 0.045 }
    ];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var p = 0; p < passes.length; p++) {
      ctx.lineWidth = passes[p].w;
      for (var i = 1; i < trailPts.length; i++) {
        var age = Math.max(now - trailPts[i - 1].t, now - trailPts[i].t);
        if (age > TRAIL_LIFE) continue;
        var fade = Math.pow(1 - age / TRAIL_LIFE, 1.5);
        var a = passes[p].a * fade;
        if (a < 0.002) continue;
        ctx.beginPath();
        ctx.moveTo(trailPts[i - 1].x, trailPts[i - 1].y);
        ctx.lineTo(trailPts[i].x, trailPts[i].y);
        ctx.strokeStyle = 'rgba(200,169,110,' + a + ')';
        ctx.stroke();
      }
    }
  }

  function animateWater(ts) {
    var now = ts * 0.001;
    ctx.clearRect(0, 0, cvW, cvH);
    while (trailPts.length && (now - trailPts[0].t) > TRAIL_LIFE) {
      trailPts.shift();
    }
    drawGlow(now);
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      var alive = w instanceof SplashWave
        ? drawSplashWave(w, now)
        : drawTrailWave(w, now);
      if (!alive) waves.splice(i, 1);
    }
    requestAnimationFrame(animateWater);
  }
  requestAnimationFrame(animateWater);

  function onPointerMove(x, y) {
    var now = performance.now();
    var nowS = now * 0.001;
    if (prevPX < 0) {
      prevPX = x; prevPY = y; prevPT = now;
      return;
    }
    var dx = x - prevPX, dy = y - prevPY;
    var dt = Math.max(now - prevPT, 1) * 0.001;
    var speed = Math.min(Math.sqrt(dx * dx + dy * dy) / dt, 2000);
    var angle = Math.atan2(dy, dx);
    trailPts.push({ x: x, y: y, t: nowS });
    if ((now - lastSpawn) > SPAWN_GAP && speed > 20 && waves.length < MAX_WAVES) {
      waves.push(new TrailWave(x, y, angle, speed));
      lastSpawn = now;
    }
    prevPX = x; prevPY = y; prevPT = now;
  }

  function resetPointer() { prevPX = -1; prevPY = -1; }

  canvas.parentElement.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    onPointerMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.parentElement.addEventListener('touchmove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    onPointerMove(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: true });

  canvas.parentElement.addEventListener('mouseleave', resetPointer);
  canvas.parentElement.addEventListener('touchend', resetPointer);

  canvas.parentElement.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    waves.push(new SplashWave(e.clientX - rect.left, e.clientY - rect.top));
  });
})();
