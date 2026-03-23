(function (window, document) {
  'use strict';

  function resolveLocale(lang) {
    if (lang === 'pt') return 'pt-PT';
    if (lang === 'es') return 'es';
    return 'en';
  }

  function safeHtml(el, html) {
    if (!el) return;
    el.innerHTML = html || '<p>Content unavailable.</p>';
  }

  function init(config) {
    var legalUrl = config.legalJsonUrl;
    var lang = resolveLocale(config.lang || 'en');
    var modalId = config.modalId || 'wmLegalModal';
    var contentId = config.contentId || 'wmLegalContent';
    var titleId = config.titleId || 'wmLegalTitle';

    var dataCache = null;

    async function getData() {
      if (dataCache) return dataCache;
      var res = await fetch(legalUrl, { credentials: 'omit' });
      if (!res.ok) throw new Error('Failed to load legal JSON');
      dataCache = await res.json();
      return dataCache;
    }

    async function openDoc(type) {
      try {
        var data = await getData();
        var loc = (data.locales && data.locales[lang]) || data.locales.en;
        var body = type === 'privacy' ? loc.privacy_policy_html : loc.terms_conditions_html;

        var titleEl = document.getElementById(titleId);
        var bodyEl = document.getElementById(contentId);
        if (titleEl) titleEl.textContent = type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
        safeHtml(bodyEl, body);

        var modalEl = document.getElementById(modalId);
        if (!modalEl || !window.bootstrap) return;
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      } catch (err) {
        var fallback = document.getElementById(contentId);
        safeHtml(fallback, '<p>Unable to load legal text right now. Please try again later.</p>');
      }
    }

    document.querySelectorAll('[data-legal-open]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openDoc(btn.getAttribute('data-legal-open'));
      });
    });
  }

  window.WebmigoLegal = { init: init };
})(window, document);
