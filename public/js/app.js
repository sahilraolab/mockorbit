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

// Modal helpers
function openModal(id) {
  const backdrop = document.getElementById(id);
  if (backdrop) backdrop.classList.add('open');
}
function closeModal(id) {
  const backdrop = document.getElementById(id);
  if (backdrop) backdrop.classList.remove('open');
}
// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});

// OTP Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const mobileInput = document.getElementById('mobile');
  const otpSection = document.getElementById('otpSection');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const verifyBtn = document.getElementById('verifyBtn');
  const otpInput = document.getElementById('otp');
  const msgEl = document.getElementById('loginMsg');

  let canResend = false;
  let resendTimer = null;

  function showMsg(text, type = 'error') {
    msgEl.className = `alert alert-${type}`;
    msgEl.textContent = text;
    msgEl.classList.remove('hidden');
  }

  sendOtpBtn.addEventListener('click', async () => {
    const mobile = mobileInput.value.trim();
    if (!/^\d{10}$/.test(mobile)) {
      return showMsg('Enter a valid 10-digit mobile number');
    }

    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<span class="spinner"></span> Sending...';

    try {
      const res = await fetch('/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });
      const data = await res.json();

      if (data.success) {
        otpSection.classList.remove('hidden');
        mobileInput.disabled = true;
        showMsg('OTP sent successfully! Check console in dev mode.', 'success');
        startResendCountdown();
      } else {
        showMsg(data.message || 'Failed to send OTP');
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Send OTP';
      }
    } catch (e) {
      showMsg('Network error. Please try again.');
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = 'Send OTP';
    }
  });

  function startResendCountdown() {
    let secs = 30;
    sendOtpBtn.textContent = `Resend in ${secs}s`;
    resendTimer = setInterval(() => {
      secs--;
      if (secs <= 0) {
        clearInterval(resendTimer);
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Resend OTP';
        canResend = true;
      } else {
        sendOtpBtn.textContent = `Resend in ${secs}s`;
      }
    }, 1000);
  }

  verifyBtn.addEventListener('click', async () => {
    const mobile = mobileInput.value.trim();
    const otp = otpInput.value.trim();

    if (!otp || otp.length !== 6) {
      return showMsg('Enter the 6-digit OTP');
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="spinner"></span> Verifying...';

    try {
      const returnTo = document.getElementById('returnTo')?.value || '/dashboard';
      const res = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, returnTo })
      });
      const data = await res.json();

      if (data.success) {
        showMsg('Login successful! Redirecting...', 'success');
        window.location.href = data.redirect;
      } else {
        showMsg(data.message || 'Invalid OTP');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Login';
      }
    } catch (e) {
      showMsg('Network error. Please try again.');
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Login';
    }
  });

  // Auto-submit on 6 digits
  otpInput?.addEventListener('input', () => {
    if (otpInput.value.length === 6) verifyBtn.click();
  });
}

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

    // Update palette
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
// SKIP NAV — make visible on focus
// ============================================================
const skipNav = document.querySelector('.skip-nav');
if (skipNav) {
  skipNav.addEventListener('focus', () => skipNav.classList.add('visible'));
  skipNav.addEventListener('blur', () => skipNav.classList.remove('visible'));
}
