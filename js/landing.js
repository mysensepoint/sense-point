/**
 * SensePoint - Landing Page
 * 배너 캐러셀(드래그+화살표) 및 물결 효과
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
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;

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

  prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
  nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

  // Drag functionality
  function getPositionX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
  }

  function dragStart(e) {
    if (e.target.closest('.landing__banner-nav')) return;
    isDragging = true;
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
    if (movedPercent < -10) {
      goToSlide(currentIndex + 1);
    } else if (movedPercent > 10) {
      goToSlide(currentIndex - 1);
    } else {
      goToSlide(currentIndex);
    }
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
    if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
  });

  // =========================================
  // Water Ripple Effect
  // =========================================

  const canvas = document.getElementById('rippleCanvas');
  const ctx = canvas.getContext('2d');

  let width, height;
  let ripples = [];
  let mouseX = 0;
  let mouseY = 0;
  let lastRippleTime = 0;

  function resizeCanvas() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Ripple {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 0;
      this.maxRadius = 120 + Math.random() * 80;
      this.opacity = 0.15;
      this.speed = 1.2 + Math.random() * 0.8;
      this.lineWidth = 1;
    }

    update() {
      this.radius += this.speed;
      this.opacity = 0.15 * (1 - this.radius / this.maxRadius);
      return this.radius < this.maxRadius;
    }

    draw(ctx) {
      if (this.opacity <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 169, 110, ${this.opacity})`;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }
  }

  function addRipple(x, y) {
    ripples.push(new Ripple(x, y));
    if (Math.random() > 0.5) {
      ripples.push(new Ripple(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30));
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    ripples = ripples.filter((r) => {
      const alive = r.update();
      r.draw(ctx);
      return alive;
    });
    requestAnimationFrame(animate);
  }

  animate();

  canvas.parentElement.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const now = Date.now();
    if (now - lastRippleTime > 80) {
      addRipple(mouseX, mouseY);
      lastRippleTime = now;
    }
  });

  canvas.parentElement.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;

    const now = Date.now();
    if (now - lastRippleTime > 80) {
      addRipple(mouseX, mouseY);
      lastRippleTime = now;
    }
  }, { passive: true });

  canvas.parentElement.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        addRipple(
          x + (Math.random() - 0.5) * 40,
          y + (Math.random() - 0.5) * 40
        );
      }, i * 100);
    }
  });
})();
