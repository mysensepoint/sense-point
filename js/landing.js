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
  // Water Surface Simulation (Heightmap)
  // =========================================

  var canvas = document.getElementById('rippleCanvas');
  var ctx = canvas.getContext('2d');
  var cvW, cvH;

  var CELL = 5;
  var cols, rows;
  var buf1, buf2;
  var offCvs, offCtx, imgData;
  var DAMPING = 0.965;
  var SIM_STEP = 1 / 60;
  var simAccum = 0;
  var lastSimTime = 0;

  function resizeCanvas() {
    cvW = canvas.width = canvas.offsetWidth;
    cvH = canvas.height = canvas.offsetHeight;
    cols = ((cvW / CELL) | 0) + 2;
    rows = ((cvH / CELL) | 0) + 2;
    buf1 = new Float32Array(cols * rows);
    buf2 = new Float32Array(cols * rows);
    offCvs = document.createElement('canvas');
    offCvs.width = cols;
    offCvs.height = rows;
    offCtx = offCvs.getContext('2d');
    imgData = offCtx.createImageData(cols, rows);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function disturb(px, py, force, rad) {
    var gx = (px / CELL) | 0;
    var gy = (py / CELL) | 0;
    for (var dy = -rad; dy <= rad; dy++) {
      for (var dx = -rad; dx <= rad; dx++) {
        var nx = gx + dx, ny = gy + dy;
        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1) {
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d <= rad) buf1[ny * cols + nx] += force * (1 - d / rad);
        }
      }
    }
  }

  function disturbLine(x0, y0, x1, y1, force, rad) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(Math.ceil(len / (CELL * 0.5)), 1);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      disturb(x0 + dx * t, y0 + dy * t, force, rad);
    }
  }

  function propagate() {
    for (var y = 1; y < rows - 1; y++) {
      for (var x = 1; x < cols - 1; x++) {
        var i = y * cols + x;
        buf2[i] = ((buf1[i - 1] + buf1[i + 1] + buf1[i - cols] + buf1[i + cols]) * 0.5 - buf2[i]) * DAMPING;
      }
    }
    var tmp = buf1; buf1 = buf2; buf2 = tmp;
  }

  function renderWater() {
    var data = imgData.data;
    for (var y = 1; y < rows - 1; y++) {
      for (var x = 1; x < cols - 1; x++) {
        var idx = y * cols + x;
        var pi = idx << 2;
        var dhdx = buf1[idx + 1] - buf1[idx - 1];
        var dhdy = buf1[idx + cols] - buf1[idx - cols];
        var light = dhdx * 0.7 + dhdy * 0.7;
        var absL = Math.abs(light);
        if (absL < 0.03) { data[pi + 3] = 0; continue; }
        var intensity = Math.min(absL * 3, 1);
        data[pi] = 255; data[pi + 1] = 255; data[pi + 2] = 255;
        data[pi + 3] = (intensity * intensity * 0.1 * 255) | 0;
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, cvW, cvH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offCvs, 0, 0, cvW, cvH);
  }

  var trailPts = [];
  var TRAIL_LIFE = 1.0;

  function drawGlow(now) {
    if (trailPts.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var passes = [{ w: 8, a: 0.005 }, { w: 3, a: 0.012 }, { w: 1, a: 0.025 }];
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
    var dt = lastSimTime ? Math.min(now - lastSimTime, 0.05) : SIM_STEP;
    lastSimTime = now;
    simAccum += dt;
    while (simAccum >= SIM_STEP) { propagate(); simAccum -= SIM_STEP; }
    renderWater();
    while (trailPts.length && (now - trailPts[0].t) > TRAIL_LIFE) trailPts.shift();
    drawGlow(now);
    requestAnimationFrame(animateWater);
  }
  requestAnimationFrame(animateWater);

  var prevPX = -1, prevPY = -1;
  var lastDisturbTime = 0;
  var DISTURB_INTERVAL = 160;

  function onPointerMove(x, y) {
    var now = performance.now();
    var nowS = now * 0.001;
    trailPts.push({ x: x, y: y, t: nowS });
    if (prevPX >= 0 && (now - lastDisturbTime) > DISTURB_INTERVAL) {
      var dx = x - prevPX, dy = y - prevPY;
      var speed = Math.sqrt(dx * dx + dy * dy);
      var force = Math.min(speed * 0.12, 12);
      var rad = Math.min(2 + speed * 0.02, 5) | 0;
      disturbLine(prevPX, prevPY, x, y, force, rad);
      lastDisturbTime = now;
      prevPX = x; prevPY = y;
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
    disturb(e.clientX - rect.left, e.clientY - rect.top, 20, 5);
  });
})();
