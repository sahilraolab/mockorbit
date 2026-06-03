// PrepFlow — Client-side JS

// Flash message auto-dismiss
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.alert').forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.4s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 400);
    }, 4000);
  });
});

// Modal helpers — display:none prevents FOUC; opacity transition gives the fade
function openModal(id) {
  const backdrop = document.getElementById(id);
  if (!backdrop) return;
  backdrop.style.display = 'flex';
  // Allow the browser to paint the flex state before triggering opacity transition
  requestAnimationFrame(() => backdrop.classList.add('open'));
}
function closeModal(id) {
  const backdrop = document.getElementById(id);
  if (!backdrop) return;
  backdrop.classList.remove('open');
  const dur = parseFloat(getComputedStyle(backdrop).transitionDuration) * 1000 || 200;
  setTimeout(() => { if (!backdrop.classList.contains('open')) backdrop.style.display = 'none'; }, dur);
}
// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) closeModal(e.target.id);
});

// Test Interface
const testInterface = document.getElementById('testInterface');
if (testInterface) {
  let currentQ = 0;
  const questions = JSON.parse(document.getElementById('questionsData').textContent);
  const answers = {};
  const attemptId = document.getElementById('attemptId').value;
  let startTime = Date.now();
  let timerInterval;

  // Init answers from existing
  const existingAnswers = JSON.parse(document.getElementById('existingAnswers').textContent || '[]');
  existingAnswers.forEach(a => {
    if (a.selectedOption !== -1) answers[a.questionId] = a.selectedOption;
  });

  function renderQuestion(index) {
    currentQ = index;
    const q = questions[index];
    document.getElementById('qNumber').textContent = `Question ${index + 1} of ${questions.length}`;
    document.getElementById('qText').textContent = q.question;
    document.getElementById('progressFill').style.width = `${((index + 1) / questions.length) * 100}%`;

    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach((letter, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (answers[q._id] === i ? ' selected' : '');
      btn.innerHTML = `<span class="option-label">${letter}</span><span>${q.options[i]}</span>`;
      btn.addEventListener('click', () => selectOption(q._id, i));
      optionsEl.appendChild(btn);
    });

    // Update palette + answered counter
    const answeredCount = Object.keys(answers).length;
    const paletteCount = document.getElementById('paletteCount');
    if (paletteCount) paletteCount.textContent = `${answeredCount} / ${questions.length} answered`;
    document.querySelectorAll('.q-dot').forEach((dot, i) => {
      dot.classList.toggle('answered', answers[questions[i]._id] !== undefined);
      dot.classList.toggle('current', i === index);
    });

    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').disabled = index === questions.length - 1;
    document.getElementById('submitBtn').classList.toggle('hidden', index !== questions.length - 1);
  }

  async function selectOption(questionId, option) {
    answers[questionId] = option;
    renderQuestion(currentQ);

    try {
      await fetch('/test/save-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, questionId, selectedOption: option })
      });
    } catch (e) { /* silent fail */ }
  }

  document.getElementById('prevBtn')?.addEventListener('click', () => {
    if (currentQ > 0) renderQuestion(currentQ - 1);
  });

  document.getElementById('nextBtn')?.addEventListener('click', () => {
    if (currentQ < questions.length - 1) renderQuestion(currentQ + 1);
  });

  document.querySelectorAll('.q-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => renderQuestion(i));
  });

  document.getElementById('submitBtn')?.addEventListener('click', () => {
    const answered = Object.keys(answers).length;
    const unanswered = questions.length - answered;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : 'Submit test? You cannot change answers after submission.';
    if (confirm(msg)) submitTest();
  });

  async function submitTest() {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/test/submit';

    [['attemptId', attemptId], ['timeTaken', timeTaken]].forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  // Timer
  const duration = parseInt(document.getElementById('testDuration').value) * 60;
  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = duration - elapsed;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      submitTest();
      return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerEl.parentElement.className = 'timer' + (remaining <= 60 ? ' danger' : remaining <= 300 ? ' warning' : '');
  }

  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
  renderQuestion(0);
}

// ============================================================
// MOBILE NAVIGATION — Hamburger / slide-in menu
// ============================================================
(function () {
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileMenuClose');
  const overlay = document.getElementById('mobileOverlay');

  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.add('open');
    overlay.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    // Trap focus — move to first link
    const firstLink = mobileMenu.querySelector('a, button');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    mobileMenu.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    hamburger.focus();
  }

  hamburger.addEventListener('click', openMenu);
  mobileClose.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
  });

  // Close when a nav link is tapped
  mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
})();

// ============================================================
// SAMPLE QUESTION ACCORDION — event delegation, no inline onclick
// ============================================================
document.addEventListener('click', e => {
  const btn = e.target.closest('.sample-accord-btn');
  if (!btn) return;
  const body = btn.nextElementSibling;
  if (!body || !body.classList.contains('sample-accord-body')) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  body.style.display = isOpen ? 'none' : 'block';
  btn.classList.toggle('open', !isOpen);
  btn.setAttribute('aria-expanded', String(!isOpen));
});

// ============================================================
// SKIP NAV — make visible on focus
// ============================================================
const skipNav = document.querySelector('.skip-nav');
if (skipNav) {
  skipNav.addEventListener('focus', () => skipNav.classList.add('visible'));
  skipNav.addEventListener('blur', () => skipNav.classList.remove('visible'));
}

// ============================================================
// STAR PICKER — click-to-rate rating widget
// Uses picker.dataset.value as the source of truth so external
// scripts can update it without conflicting with this closure.
// ============================================================
(function () {
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  function initPicker(picker) {
    const stars = Array.from(picker.querySelectorAll('.star-btn'));
    const input = picker.querySelector('input[type="hidden"]');
    const hint  = picker.querySelector('.star-picker-hint');

    function paint() {
      const n = parseInt(picker.dataset.value) || 0;
      stars.forEach((s, i) => { s.style.color = i < n ? '#f59e0b' : '#d1d5db'; });
      if (hint) hint.textContent = ratingLabels[n] || '';
    }

    paint();

    stars.forEach((star, idx) => {
      star.addEventListener('mouseenter', () => {
        stars.forEach((s, i) => { s.style.color = i <= idx ? '#f59e0b' : '#d1d5db'; });
        if (hint) hint.textContent = ratingLabels[idx + 1] || '';
      });
      star.addEventListener('mouseleave', paint);
      star.addEventListener('click', () => {
        picker.dataset.value = idx + 1;
        input.value = idx + 1;
        paint();
      });
    });
  }

  document.querySelectorAll('.star-picker').forEach(initPicker);
})();

// Shared helper — lets inline page scripts update a star picker
// without conflicting with the app.js closure above.
function setPickerValue(picker, n) {
  if (!picker) return;
  picker.dataset.value = n;
  const inp = picker.querySelector('input[type="hidden"]');
  if (inp) inp.value = n;
  picker.querySelectorAll('.star-btn').forEach((s, i) => {
    s.style.color = i < n ? '#f59e0b' : '#d1d5db';
  });
  const hint = picker.querySelector('.star-picker-hint');
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  if (hint) hint.textContent = labels[n] || '';
}

// ============================================================
// TESTIMONIALS SLIDER — homepage auto-advancing carousel
// ============================================================
(function () {
  const slider = document.getElementById('testimonialSlider');
  if (!slider) return;

  const cards = Array.from(slider.querySelectorAll('.testimonial-card'));
  const total = cards.length;
  if (total === 0) return;

  let current = 0;
  let autoTimer;

  function perView() {
    if (window.innerWidth < 540) return 1;
    if (window.innerWidth < 900) return 2;
    return 3;
  }

  function maxIdx() { return Math.max(0, total - perView()); }

  function goTo(idx) {
    current = idx < 0 ? maxIdx() : idx > maxIdx() ? 0 : idx;
    const card = cards[current];
    slider.scrollTo({ left: card.offsetLeft - slider.offsetLeft + slider.scrollLeft - (card.offsetLeft - slider.offsetLeft - slider.scrollLeft) , behavior: 'smooth' });
    // Simpler: use offsetLeft of the card relative to slider
    let scrollTarget = 0;
    for (let i = 0; i < current; i++) {
      scrollTarget += cards[i].offsetWidth + 20; // 20 = gap
    }
    slider.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 4500);
  }
  function stopAuto() { clearInterval(autoTimer); }

  document.getElementById('sliderPrev')?.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
  document.getElementById('sliderNext')?.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);
  slider.addEventListener('touchstart', stopAuto, { passive: true });

  // Build dots
  const dotsEl = document.getElementById('sliderDots');
  if (dotsEl) {
    cards.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'slider-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Review ${i + 1}`);
      d.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); });
      dotsEl.appendChild(d);
    });
  }

  startAuto();
})();

// ============================================================
// HOMEPAGE REVIEW FILTER — exam + mock dropdowns (legacy, kept for API routes)
// ============================================================
(function () {
  const examSel  = document.getElementById('reviewExamFilter');
  const mockSel  = document.getElementById('reviewMockFilter');
  const grid     = document.getElementById('testimonialsGrid');
  const loadEl   = document.getElementById('reviewFilterLoading');
  if (!examSel || !grid) return;

  function starStr(n) {
    n = n || 5;
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function cardHtml(r) {
    return `<article class="testimonial-card">
      <div class="testimonial-stars" aria-label="${r.rating} stars">${starStr(r.rating)}</div>
      <p class="testimonial-text">"${escHtml(r.text)}"</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar" aria-hidden="true">${escHtml(r.name[0].toUpperCase())}</div>
        <div>
          <div class="testimonial-name">${escHtml(r.name)}</div>
          ${r.role ? `<div class="testimonial-role">${escHtml(r.role)}</div>` : ''}
        </div>
      </div>
    </article>`;
  }

  async function loadReviews(type, refId) {
    if (loadEl) loadEl.style.display = 'inline';
    const url = refId ? `/api/reviews?type=${type}&refId=${encodeURIComponent(refId)}` : '/api/reviews';
    try {
      const data = await fetch(url).then(r => r.json());
      const list = data.reviews || [];
      grid.innerHTML = list.length
        ? list.map(cardHtml).join('')
        : '<p style="grid-column:1/-1;text-align:center;color:var(--ink-muted);padding:40px 0;font-size:0.9rem;">No reviews yet for this selection.</p>';
    } catch (e) {
      grid.innerHTML = '';
    }
    if (loadEl) loadEl.style.display = 'none';
  }

  examSel.addEventListener('change', async function () {
    const examId = this.value;
    mockSel.style.display = 'none';
    mockSel.innerHTML = '<option value="">All Mocks for this exam</option>';
    if (!examId) { loadReviews('site', null); return; }

    loadReviews('exam', examId);

    try {
      const data = await fetch(`/api/series-by-exam?examId=${encodeURIComponent(examId)}`).then(r => r.json());
      if (data.series && data.series.length > 0) {
        data.series.forEach(s => {
          const o = document.createElement('option');
          o.value = s._id;
          o.textContent = s.title;
          mockSel.appendChild(o);
        });
        mockSel.style.display = 'block';
      }
    } catch (e) {}
  });

  mockSel.addEventListener('change', function () {
    const seriesId = this.value;
    const examId   = examSel.value;
    seriesId ? loadReviews('series', seriesId) : loadReviews('exam', examId);
  });
})();
