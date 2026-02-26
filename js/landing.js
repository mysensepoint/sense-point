/**
 * SensePoint - Landing Page
 * 배너 캐러셀(화살표 버튼) 및 물결 효과
 */

(function () {
  'use strict';

  // =========================================
  // Banner Carousel (Arrow Buttons Only)
  // =========================================

  const track = document.getElementById('bannerTrack');
  const prevBtn = document.getElementById('bannerPrev');
  const nextBtn = document.getElementById('bannerNext');
  const currentDisplay = document.getElementById('bannerCurrent');
  const totalDisplay = document.getElementById('bannerTotal');

  const slides = track.querySelectorAll('.landing__banner-slide');
  const totalSlides = slides.length;
  let currentIndex = 0;

  totalDisplay.textContent = String(totalSlides).padStart(2, '0');

  function goToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;
    track.style.transform = `translateX(${-currentIndex * 100}%)`;
    currentDisplay.textContent = String(currentIndex + 1).padStart(2, '0');
  }

  prevBtn.addEventListener('click', function () {
    goToSlide(currentIndex - 1);
  });
  nextBtn.addEventListener('click', function () {
    goToSlide(currentIndex + 1);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
  });

  // =========================================
  // Water Drop Effect
  // =========================================

  var canvas = document.getElementById('rippleCanvas');
  var ctx = canvas.getContext('2d');
  var cvW, cvH;

  function resizeCanvas() {
    cvW = canvas.width = canvas.offsetWidth;
    cvH = canvas.height = canvas.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  var drops = [];
  var DROP_SPEED = 80;
  var DROP_MAX = 120;

  var trailPts = [];
  var TRAIL_LIFE = 1.0;

  function drawGlow(now) {
    if (trailPts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var passes = [{ w: 6, a: 0.004 }, { w: 2.5, a: 0.01 }, { w: 1, a: 0.02 }];
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
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
        ctx.stroke();
      }
    }
  }

  function animateWater(ts) {
    var now = ts * 0.001;
    ctx.clearRect(0, 0, cvW, cvH);

    while (trailPts.length && (now - trailPts[0].t) > TRAIL_LIFE) trailPts.shift();
    drawGlow(now);

    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      var age = now - d.t;
      var r = age * d.spd;
      if (r > d.max) { drops.splice(i, 1); continue; }
      var p = r / d.max;
      var alpha = 0.08 * (1 - p) * (1 - p);
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.lineWidth = 1.5 * (1 - p * 0.6);
      ctx.stroke();
    }

    requestAnimationFrame(animateWater);
  }
  requestAnimationFrame(animateWater);

  var prevPX = -1, prevPY = -1;
  var lastDropTime = 0;
  var DROP_INTERVAL = 300;

  function addDrop(x, y, big) {
    var now = performance.now() * 0.001;
    drops.push({
      x: x, y: y, t: now,
      spd: big ? 100 : DROP_SPEED,
      max: big ? 160 : DROP_MAX
    });
  }

  function onPointerMove(x, y) {
    var now = performance.now();
    var nowS = now * 0.001;
    trailPts.push({ x: x, y: y, t: nowS });
    if (prevPX >= 0 && (now - lastDropTime) > DROP_INTERVAL) {
      var dx = x - prevPX, dy = y - prevPY;
      if (dx * dx + dy * dy > 900) {
        addDrop(x, y, false);
        lastDropTime = now;
        prevPX = x; prevPY = y;
      }
    } else if (prevPX < 0) {
      prevPX = x; prevPY = y;
    }
  }

  function resetPointer() { prevPX = -1; prevPY = -1; }

  canvas.parentElement.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    onPointerMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.parentElement.addEventListener('touchmove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var t = e.touches[0];
    onPointerMove(t.clientX - rect.left, t.clientY - rect.top);
  }, { passive: true });

  canvas.parentElement.addEventListener('mouseleave', resetPointer);
  canvas.parentElement.addEventListener('touchend', resetPointer);

  canvas.parentElement.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    addDrop(e.clientX - rect.left, e.clientY - rect.top, true);
  });
})();
