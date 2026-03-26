(function() {
    'use strict';

    // ==========================================
    // 1. LÓGICA DE TEMAS (Diseño Original)
    // ==========================================
    const themes = [
        { background: "#1A1A2E", color: "#FFFFFF", primaryColor: "#0F3460" },
        { background: "#461220", color: "#FFFFFF", primaryColor: "#E94560" },
        { background: "#192A51", color: "#FFFFFF", primaryColor: "#967AA1" },
        { background: "#F7B267", color: "#000000", primaryColor: "#F4845F" },
        { background: "#F25F5C", color: "#000000", primaryColor: "#642B36" },
        { background: "#231F20", color: "#FFF", primaryColor: "#BB4430" }
    ];

    const setTheme = (theme) => {
        const root = document.querySelector(":root");
        root.style.setProperty("--background", theme.background);
        root.style.setProperty("--color", theme.color);
        root.style.setProperty("--primary-color", theme.primaryColor);
    };

    const displayThemeButtons = () => {
        const btnContainer = document.querySelector(".theme-btn-container");
        if(!btnContainer) return;
        themes.forEach((theme) => {
            const div = document.createElement("div");
            div.className = "theme-btn";
            div.style.cssText = `background: ${theme.background}; width: 25px; height: 25px`;
            btnContainer.appendChild(div);
            div.addEventListener("click", () => setTheme(theme));
        });
    };
    displayThemeButtons();

    // ==========================================
    // 2. LÓGICA DE LOGIN SAAS (Dual-OTP)
    // ==========================================
    const rootEl = document.getElementById('login-root');
    if (!rootEl) return;
    const csrfToken = rootEl.getAttribute('data-csrf');

    let state = 'credentials';
    const form = document.getElementById('loginForm');
    const alertBox = document.getElementById('loginAlert');
    const alertText = document.getElementById('loginAlertText');
    const btnSubmit = document.getElementById('btnLogin');
    const stepCreds = document.getElementById('stepCredentials');
    const stepOTP = document.getElementById('stepOTP');
    const mainTitle = document.getElementById('mainTitle');
    const btnBack = document.getElementById('btnBack');
    const btnForgot = document.getElementById('btnForgot');
    const otpFields = document.querySelectorAll('.otp-field');

    function showAlert(msg) {
        alertText.textContent = msg;
        alertBox.style.display = 'block';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        alertBox.style.display = 'none';
        btnSubmit.innerText = "WAIT...";
        btnSubmit.disabled = true;

        if (state === 'credentials') {
            const email = document.getElementById('inputEmail').value.trim();
            const password = document.getElementById('inputPassword').value;

            if (!email || !password) {
                showAlert('Complete all fields');
                btnSubmit.innerText = "SUBMIT";
                btnSubmit.disabled = false;
                return;
            }

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
                    
                    // Cambiar UI al paso OTP
                    stepCreds.style.display = 'none';
                    stepOTP.style.display = 'block';
                    mainTitle.innerText = "VERIFY";
                    btnSubmit.innerText = "VERIFY CODE";
                    btnBack.style.display = 'inline';
                    btnForgot.style.display = 'none';
                    otpFields[0].focus();

                } else if (data.status === 'success') {
                    window.location.href = 'index.php';
                } else {
                    showAlert(data.message || 'Login failed.');
                    btnSubmit.innerText = "SUBMIT";
                }
            } catch (err) {
                showAlert('Network error.');
                btnSubmit.innerText = "SUBMIT";
            }
            btnSubmit.disabled = false;

        } else {
            // Validar OTP
            const code = Array.from(otpFields).map(f => f.value).join('');
            if (code.length !== 6) {
                showAlert('Enter 6 digits');
                btnSubmit.innerText = "VERIFY CODE";
                btnSubmit.disabled = false;
                return;
            }

            const method = document.getElementById('otpMethod').value;
            const tempToken = document.getElementById('tempToken').value;

            try {
                const res = await fetch('/back/index.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: method === 'totp' ? 'api_auth_verify_login_2fa' : 'api_auth_verify_login_otp',
                        temp_token: tempToken, 
                        code, 
                        csrf_token: csrfToken 
                    })
                });
                const data = await res.json();

                if (data.status === 'success') {
                    window.location.href = 'index.php';
                } else {
                    showAlert(data.message || 'Invalid code.');
                    btnSubmit.innerText = "VERIFY CODE";
                    otpFields.forEach(f => f.value = '');
                    otpFields[0].focus();
                }
            } catch (err) {
                showAlert('Network error.');
                btnSubmit.innerText = "VERIFY CODE";
            }
            btnSubmit.disabled = false;
        }
    });

    // UX de los campos OTP (saltar al siguiente)
    otpFields.forEach((field, idx) => {
        field.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && idx < otpFields.length - 1) {
                otpFields[idx + 1].focus();
            }
            if (Array.from(otpFields).every(f => f.value.length === 1)) {
                form.requestSubmit();
            }
        });
        field.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && idx > 0) {
                otpFields[idx - 1].focus();
            }
        });
    });

    // Botón de regreso
    btnBack.addEventListener('click', function(e) {
        e.preventDefault();
        state = 'credentials';
        stepOTP.style.display = 'none';
        stepCreds.style.display = 'block';
        mainTitle.innerText = "LOGIN";
        btnSubmit.innerText = "SUBMIT";
        btnBack.style.display = 'none';
        btnForgot.style.display = 'inline';
        alertBox.style.display = 'none';
    });

})();