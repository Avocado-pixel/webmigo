/**
 * WebmigoSaaS — Elite Carbon Engine
 * Auth: Frontend UX
 */
(function() {
    'use strict';

    const rootEl = document.getElementById('login-root');
    if (!rootEl) return;
    const csrfToken = rootEl.getAttribute('data-csrf');

    let state = 'credentials';
    
    const form = document.getElementById('loginForm');
    const alertBox = document.getElementById('loginAlert');
    const btnSubmit = document.getElementById('btnLogin');
    const stepCreds = document.getElementById('stepCredentials');
    const stepOTP = document.getElementById('stepOTP');
    const mainTitle = document.getElementById('mainTitle');
    const btnBack = document.getElementById('btnBack');
    const otpFields = document.querySelectorAll('.otp-field');

    function showAlert(msg) {
        alertBox.textContent = msg;
        alertBox.style.display = 'block';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        alertBox.style.display = 'none';
        btnSubmit.innerText = "WAITING...";
        btnSubmit.disabled = true;

        if (state === 'credentials') {
            const email = document.getElementById('inputEmail').value.trim();
            const password = document.getElementById('inputPassword').value;

            try {
                const res = await fetch('/back/index.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sys_login_x1', email, password, csrf_token: csrfToken })
                });
                const data = await res.json();

                if (data.status === 'requires_2fa' || data.status === 'requires_email_otp') {
                    state = 'otp';
                    document.getElementById('tempToken').value = data.temp_token;
                    document.getElementById('otpMethod').value = data.status === 'requires_2fa' ? 'totp' : 'email';
                    stepCreds.style.display = 'none';
                    stepOTP.style.display = 'block';
                    mainTitle.innerText = "VERIFY";
                    btnSubmit.innerText = "VERIFY";
                    btnBack.style.display = 'inline';
                    setTimeout(() => otpFields[0].focus(), 100);
                } else if (data.status === 'success') {
                    window.location.href = 'index.php';
                } else {
                    showAlert(data.message || 'Login failed.');
                    btnSubmit.innerText = "SUBMIT";
                }
            } catch (err) { showAlert('Network error.'); btnSubmit.innerText = "SUBMIT"; }
            btnSubmit.disabled = false;

        } else {
            const code = Array.from(otpFields).map(f => f.value).join('');
            if (code.length !== 6) { showAlert('Enter 6 digits'); btnSubmit.innerText = "VERIFY"; btnSubmit.disabled = false; return; }

            try {
                const res = await fetch('/back/index.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: document.getElementById('otpMethod').value === 'totp' ? 'api_auth_verify_login_2fa' : 'api_auth_verify_login_otp',
                        temp_token: document.getElementById('tempToken').value, code, csrf_token: csrfToken 
                    })
                });
                const data = await res.json();
                if (data.status === 'success') window.location.href = 'index.php';
                else { showAlert(data.message || 'Invalid code.'); btnSubmit.innerText = "VERIFY"; }
            } catch (err) { showAlert('Network error.'); btnSubmit.innerText = "VERIFY"; }
            btnSubmit.disabled = false;
        }
    });

    otpFields.forEach((field, idx) => {
        field.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && idx < otpFields.length - 1) otpFields[idx + 1].focus();
            if (Array.from(otpFields).every(f => f.value.length === 1)) form.requestSubmit();
        });
        field.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) otpFields[idx - 1].focus();
        });
    });

    btnBack.addEventListener('click', (e) => {
        e.preventDefault(); state = 'credentials';
        stepOTP.style.display = 'none'; stepCreds.style.display = 'block';
        mainTitle.innerText = "LOGIN"; btnSubmit.innerText = "SUBMIT";
        btnBack.style.display = 'none'; alertBox.style.display = 'none';
    });
})();