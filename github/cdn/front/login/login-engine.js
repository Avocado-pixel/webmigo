// login-engine.js — Ultra-premium SaaS Login State Machine
// Author: WebmigoSaaS Frontend UX
//


(function() {
  'use strict';

  // Branding injection
  const root = document.getElementById('login-root');
  if (!root) return;
  const logo = root.getAttribute('data-logo') || '';
  const company = root.getAttribute('data-company-name') || 'Company';
  const csrf = root.getAttribute('data-csrf') || '';

  // Inject logo and company name
  const brandContainer = document.getElementById('brand-container');
  if (brandContainer) {
    brandContainer.innerHTML =
      (logo ? `<img src="${logo}" alt="Logo" style="max-width:72px;max-height:72px;margin-bottom:0.5rem;">` : '') +
      `<h2 class="card-title">Sign in to ${company}&nbsp;</h2>` +
      `<p class="text-secondary">Enter your credentials to access the panel.</p>`;
  }

  // State
  let state = 'credentials'; // or 'otp'
  let otpMethod = '';
  let tempToken = '';

  // Elements
  const card = root.closest('.card-md');
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');
  const btnLogin = document.getElementById('btnLogin');
  const stepCredentials = document.getElementById('stepCredentials');
  const stepOTP = document.getElementById('stepOTP');
  const otpFields = stepOTP ? stepOTP.querySelectorAll('.otp-field') : [];
  const inputOTPCode = document.getElementById('inputOTPCode');
  const otpTitle = document.getElementById('otpTitle');
  const otpSubtitle = document.getElementById('otpSubtitle');
  const btnBackToLogin = document.getElementById('btnBackToLogin');
  const inputEmail = document.getElementById('inputEmail');
  const inputPassword = document.getElementById('inputPassword');
  const tempTokenInput = document.getElementById('tempToken');
  const otpMethodInput = document.getElementById('otpMethod');

  // Helper: Show alert
  function showAlert(msg) {
    if (!alertBox || !alertText) return;
    alertText.textContent = msg;
    alertBox.style.display = '';
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth; // force reflow
      card.classList.add('shake');
    }
  }
  function hideAlert() {
    if (alertBox) alertBox.style.display = 'none';
  }

  // Helper: Button loading state
  function setLoading(loading) {
    if (!btnLogin) return;
    if (loading) {
      btnLogin.classList.add('loading');
      btnLogin.disabled = true;
    } else {
      btnLogin.classList.remove('loading');
      btnLogin.disabled = false;
    }
  }

  // Step transition animation
  function animateStepTransition() {
    if (!card) return;
    card.classList.add('animating');
    setTimeout(() => card.classList.remove('animating'), 400);
  }

  // Credentials step submit
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      hideAlert();
      if (state === 'credentials') {
        // Validate
        const email = inputEmail.value.trim();
        const password = inputPassword.value;
        if (!email || !password) {
          showAlert('Please enter both email and password.');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/back/index.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sys_login_x1',
              email,
              password,
              csrf_token: csrf
            })
          });
          const data = await res.json();
          if (data.status === 'requires_2fa' || data.status === 'requires_email_otp') {
            tempToken = data.temp_token;
            otpMethod = data.status === 'requires_2fa' ? 'totp' : 'email';
            tempTokenInput.value = tempToken;
            otpMethodInput.value = otpMethod;
            showOTP();
          } else if (data.status === 'success') {
            window.location.href = 'index.php';
          } else {
            showAlert(data.message || 'Login failed.');
          }
        } catch (err) {
          showAlert('Network error. Please try again.');
        } finally {
          setLoading(false);
        }
      } else if (state === 'otp') {
        // OTP step
        const code = Array.from(otpFields).map(f => f.value).join('');
        if (code.length !== 6) {
          showAlert('Enter the 6-digit code.');
          return;
        }
        setLoading(true);
        try {
          const res = await fetch('/back/index.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: otpMethod === 'totp' ? 'api_auth_verify_login_2fa' : 'api_auth_verify_login_otp',
              temp_token: tempToken,
              code,
              csrf_token: csrf
            })
          });
          const data = await res.json();
          if (data.status === 'success') {
            window.location.href = 'index.php';
          } else {
            showAlert(data.message || 'Invalid code.');
          }
        } catch (err) {
          showAlert('Network error. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    });
  }

  // OTP UI logic
  function showOTP() {
    state = 'otp';
    animateStepTransition();
    if (stepCredentials) stepCredentials.style.display = 'none';
    if (stepOTP) stepOTP.style.display = '';
    // Update OTP UI
    if (otpTitle) otpTitle.textContent = otpMethod === 'totp' ? 'Enter Authenticator Code' : 'Enter Email Code';
    if (otpSubtitle) otpSubtitle.textContent = otpMethod === 'totp'
      ? 'Open your authenticator app and enter the 6-digit code.'
      : 'Check your email for a 6-digit code.';
    // Reset fields
    otpFields.forEach(f => { f.value = ''; f.classList.remove('filled'); });
    if (otpFields[0]) otpFields[0].focus();
  }

  // OTP input UX
  otpFields.forEach((field, idx) => {
    field.addEventListener('input', function(e) {
      const val = field.value.replace(/[^0-9]/g, '');
      field.value = val;
      field.classList.toggle('filled', !!val);
      if (val && idx < otpFields.length - 1) {
        otpFields[idx + 1].focus();
      }
      // Auto-submit if last digit
      if (otpFields.every(f => f.value.length === 1)) {
        setTimeout(() => form.requestSubmit(), 120);
      }
    });
    field.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !field.value && idx > 0) {
        otpFields[idx - 1].focus();
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        otpFields[idx - 1].focus();
      }
      if (e.key === 'ArrowRight' && idx < otpFields.length - 1) {
        otpFields[idx + 1].focus();
      }
    });
    field.addEventListener('focus', function() {
      field.select();
    });
  });

  // Back to login
  if (btnBackToLogin) {
    btnBackToLogin.addEventListener('click', function(e) {
      e.preventDefault();
      state = 'credentials';
      animateStepTransition();
      if (stepCredentials) stepCredentials.style.display = '';
      if (stepOTP) stepOTP.style.display = 'none';
      hideAlert();
      if (inputPassword) inputPassword.value = '';
      if (inputEmail) inputEmail.focus();
    });
  }

  // Autofocus email on load
  if (inputEmail) setTimeout(() => inputEmail.focus(), 120);

})();
