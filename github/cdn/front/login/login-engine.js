(function() {
    'use strict';

    const root = document.getElementById('login-root');
    const data = {
        logo: root.getAttribute('data-logo'),
        company: root.getAttribute('data-company-name'),
        csrf: root.getAttribute('data-csrf')
    };

    // Temas dinámicos
    const themes = [
        { background: "#1A1A2E", color: "#FFFFFF", primaryColor: "#0F3460" },
        { background: "#461220", color: "#FFFFFF", primaryColor: "#E94560" },
        { background: "#192A51", color: "#FFFFFF", primaryColor: "#967AA1" },
        { background: "#231F20", color: "#FFFFFF", primaryColor: "#BB4430" }
    ];

    const setTheme = (t) => {
        document.documentElement.style.setProperty("--background", t.background);
        document.documentElement.style.setProperty("--color", t.color);
        document.documentElement.style.setProperty("--primary-color", t.primaryColor);
    };

    const btnContainer = document.querySelector(".theme-btn-container");
    themes.forEach(t => {
        const div = document.createElement("div");
        div.className = "theme-btn";
        div.style.background = t.primaryColor;
        div.onclick = () => setTheme(t);
        btnContainer.appendChild(div);
    });

    // Lógica de Login
    let state = 'credentials';
    const form = document.getElementById('loginForm');
    const btnSubmit = document.getElementById('btnLogin');

    form.onsubmit = async (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnSubmit.innerText = "...";

        if (state === 'credentials') {
            const email = document.getElementById('inputEmail').value;
            const password = document.getElementById('inputPassword').value;

            try {
                const res = await fetch('/back/index.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sys_login_x1', email, password, csrf_token: data.csrf })
                });
                const json = await res.json();

                if (json.status === 'requires_2fa' || json.status === 'requires_email_otp') {
                    state = 'otp';
                    document.getElementById('tempToken').value = json.temp_token;
                    document.getElementById('otpMethod').value = json.status === 'requires_2fa' ? 'totp' : 'email';
                    document.getElementById('stepCredentials').style.display = 'none';
                    document.getElementById('stepOTP').style.display = 'block';
                    document.getElementById('btnBackToLogin').style.display = 'inline';
                    btnSubmit.innerText = "VERIFY";
                } else if (json.status === 'success') {
                    window.location.href = './';
                } else {
                    alert(json.message);
                }
            } catch (err) { alert("Error de conexión"); }
        } else {
            // Lógica OTP
            const code = Array.from(document.querySelectorAll('.otp-field')).map(f => f.value).join('');
            const action = document.getElementById('otpMethod').value === 'totp' ? 'api_auth_verify_login_2fa' : 'api_auth_verify_login_otp';
            
            try {
                const res = await fetch('/back/index.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, temp_token: document.getElementById('tempToken').value, code, csrf_token: data.csrf })
                });
                const json = await res.json();
                if (json.status === 'success') window.location.href = './';
                else alert(json.message);
            } catch (err) { alert("Error"); }
        }
        btnSubmit.disabled = false;
        btnSubmit.innerText = state === 'credentials' ? "SUBMIT" : "VERIFY";
    };

    // Auto-salto de campos OTP
    const fields = document.querySelectorAll('.otp-field');
    fields.forEach((f, i) => {
        f.oninput = () => { if (f.value && fields[i+1]) fields[i+1].focus(); };
    });

})();