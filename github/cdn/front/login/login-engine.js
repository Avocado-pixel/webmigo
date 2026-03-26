/**
 * login-engine.js — Ultra-premium SaaS State Machine
 * Manejo de estados de login y OTP sin rutas fijas.
 */
(function() {
  'use strict';

  const root = document.getElementById('login-root');
  if (!root) return;

  const data = {
    logo: root.getAttribute('data-logo') || '',
    company: root.getAttribute('data-company-name') || 'SaaS',
    csrf: root.getAttribute('data-csrf') || ''
  };

  // Inyección de marca dinámica
  const brandContainer = document.getElementById('brand-container');
  if (brandContainer) {
    brandContainer.innerHTML = `
      ${data.logo ? `<img src="${data.logo}" alt="Logo" style="max-height:60px; margin-bottom:1.5rem;">` : ''}
      <h2 class="card-title">Sign in to ${data.company}</h2>
      <p class="text-secondary">Enter your credentials to access your secure panel.</p>
    `;
  }

  let state = 'credentials'; 
  let otpMethod = '';
  let tempToken = '';

  const card = root.closest('.card-md');
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');
  const btnLogin = document.getElementById('btnLogin');
  const stepCredentials = document.getElementById('stepCredentials');
  const stepOTP = document.getElementById('stepOTP');
  const otpFields = document.querySelectorAll('.otp-field');

  function showAlert(msg) {
    alertText.textContent = msg;
    alertBox.style.display = 'block';
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }

  function setLoading(active) {
    btnLogin.disabled = active;
    btnLogin.classList.toggle('loading', active);
    const originalText = state === 'credentials' ? 'Sign in' : 'Verify Code';
    btnLogin.textContent = active ? '' : originalText;
  }

  // Manejador del Formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';

    if (state === 'credentials') {
      const email = document.getElementById('inputEmail').value.trim();
      const password = document.getElementById('inputPassword').value;

      if (!email || !password) return showAlert('Please fill in all fields.');

      setLoading(true);
      try {
        const response = await fetch('/back/index.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sys_login_x1', email, password, csrf_token: data.csrf })
        });
        const res = await response.json();

        if (res.status === 'requires_2fa' || res.status === 'requires_email_otp') {
          tempToken = res.temp_token;
          otpMethod = res.status === 'requires_2fa' ? 'totp' : 'email';
          transitionToOTP();
        } else if (res.status === 'success') {
          window.location.href = './'; // Redirige al index relativo
        } else {
          showAlert(res.message || 'Access denied.');
        }
      } catch (err) {
        showAlert('Connection error. Try again.');
      } finally {
        setLoading(false);
      }

    } else {
      // Estado OTP
      const code = Array.from(otpFields).map(f => f.value).join('');
      if (code.length < 6) return showAlert('Please enter the full 6-digit code.');

      setLoading(true);
      try {
        const action = otpMethod === 'totp' ? 'api_auth_verify_login_2fa' : 'api_auth_verify_login_otp';
        const response = await fetch('/back/index.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, temp_token: tempToken, code, csrf_token: data.csrf })
        });
        const res = await response.json();

        if (res.status === 'success') {
          window.location.href = './';
        } else {
          showAlert(res.message || 'Invalid code.');
          otpFields.forEach(f => f.value = '');
          otpFields[0].focus();
        }
      } catch (err) {
        showAlert('Verification failed.');
      } finally {
        setLoading(false);
      }
    }
  });

  function transitionToOTP() {
    state = 'otp';
    stepCredentials.style.display = 'none';
    stepOTP.style.display = 'block';
    btnLogin.textContent = 'Verify Code';
    
    const title = document.getElementById('otpTitle');
    const sub = document.getElementById('otpSubtitle');
    title.textContent = otpMethod === 'totp' ? 'Authenticator App' : 'Check your Email';
    sub.textContent = 'Enter the 6-digit security code to continue.';
    
    otpFields[0].focus();
  }

  // Lógica de inputs OTP (Auto-jump)
  otpFields.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length > 1) e.target.value = e.target.value.slice(0, 1);
      if (e.target.value && index < 5) otpFields[index + 1].focus();
      if (Array.from(otpFields).every(f => f.value)) form.requestSubmit();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) otpFields[index - 1].focus();
    });
  });

  // Volver atrás
  document.getElementById('btnBackToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    state = 'credentials';
    stepOTP.style.display = 'none';
    stepCredentials.style.display = 'block';
    btnLogin.textContent = 'Sign in';
  });

})();