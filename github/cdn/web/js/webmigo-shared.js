(function () {
    'use strict';

    var legalDictCache = new Map();

    function normalizeLocale(lang) {
        if (typeof lang !== 'string' || lang.length === 0) {
            return 'en';
        }
        var shortLang = lang.toLowerCase().slice(0, 2);
        return shortLang === 'pt' ? 'pt-PT' : shortLang;
    }

    function getTermsLocale(data, preferredLocale) {
        if (data.terms_of_service && data.terms_of_service[preferredLocale]) {
            return preferredLocale;
        }
        if (data.terms_of_service && data.terms_of_service.en) {
            return 'en';
        }
        var keys = Object.keys(data.terms_of_service || {});
        return keys.length > 0 ? keys[0] : 'en';
    }

    async function fetchLegalDictionary(legalUrl) {
        if (typeof legalUrl !== 'string' || legalUrl.length === 0) {
            throw new Error('Missing legal URL');
        }

        if (legalDictCache.has(legalUrl)) {
            return legalDictCache.get(legalUrl);
        }

        var requestPromise = (async function () {
            var response = await fetch(legalUrl, { cache: 'force-cache' });
            if (!response.ok) {
                throw new Error('Legal i18n fetch failed: ' + response.status);
            }

            var data = await response.json();
            if (!data || typeof data !== 'object' || !data.locales || !data.terms_of_service) {
                throw new Error('Invalid legal i18n payload');
            }

            return data;
        })();

        legalDictCache.set(legalUrl, requestPromise);

        try {
            return await requestPromise;
        } catch (err) {
            legalDictCache.delete(legalUrl);
            throw err;
        }
    }

    async function getLegalHtml(options) {
        var opts = options || {};
        var docType = opts.docType === 'privacy' ? 'privacy' : 'terms';
        var privacyFallback = typeof opts.privacyFallback === 'string' ? opts.privacyFallback : 'Contenido no disponible.';
        var termsFallback = typeof opts.termsFallback === 'string' ? opts.termsFallback : 'Contenido no disponible.';

        var data = await fetchLegalDictionary(opts.legalUrl);

        var locale = normalizeLocale(opts.lang);
        if (!data.locales[locale]) {
            locale = 'en';
        }

        if (docType === 'privacy') {
            var privacyHtml = data.locales[locale] && data.locales[locale].privacy_policy_html;
            return privacyHtml || privacyFallback;
        }

        var termsLocale = getTermsLocale(data, locale);
        var termsHtml = data.terms_of_service[termsLocale] && data.terms_of_service[termsLocale].terms_conditions_html;
        return termsHtml || termsFallback;
    }

    function clearLegalCache() {
        legalDictCache.clear();
    }

    function toPositiveInt(value) {
        var normalized = Number.parseInt(value, 10);
        return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
    }

    function normalizeBookingLang(lang) {
        if (typeof lang !== 'string' || lang.length === 0) {
            return 'en';
        }
        var shortLang = lang.toLowerCase().slice(0, 2);
        return shortLang === 'es' || shortLang === 'pt' || shortLang === 'en' ? shortLang : 'en';
    }

    function normalizeDateInput(value) {
        if (typeof value !== 'string') {
            return '';
        }
        var trimmed = value.trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
    }

    function normalizeTimeInput(value) {
        if (typeof value !== 'string') {
            return '';
        }
        var trimmed = value.trim();
        return /^\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? trimmed : '';
    }

    function sanitizeServiceIds(serviceIds) {
        if (!Array.isArray(serviceIds)) {
            return [];
        }

        var clean = [];
        var seen = new Set();

        for (var i = 0; i < serviceIds.length; i += 1) {
            var idNum = toPositiveInt(serviceIds[i]);
            if (idNum < 1) {
                continue;
            }

            var idStr = String(idNum);
            if (!seen.has(idStr)) {
                seen.add(idStr);
                clean.push(idStr);
            }
        }

        return clean;
    }

    function normalizeAosInitOptions(options) {
        var normalized = { duration: 600, once: true };
        if (!options || typeof options !== 'object') {
            return normalized;
        }

        if (typeof options.duration === 'number' && options.duration > 0) {
            normalized.duration = options.duration;
        }
        if (typeof options.once === 'boolean') {
            normalized.once = options.once;
        }
        if (typeof options.easing === 'string' && options.easing.length > 0) {
            normalized.easing = options.easing;
        }

        return normalized;
    }

    function normalizeBookingConfig(options) {
        var opts = options || {};
        var stepTitles = opts.stepTitles || {};
        var errors = opts.errors || {};

        return {
            defaultBranchId: toPositiveInt(opts.defaultBranchId),
            csrfToken: typeof opts.csrfToken === 'string' ? opts.csrfToken : '',
            companyId: toPositiveInt(opts.companyId),
            lang: normalizeBookingLang(opts.lang),
            translations: opts.translations && typeof opts.translations === 'object' ? opts.translations : {},
            stepTitles: {
                step1: typeof stepTitles.step1 === 'string' ? stepTitles.step1 : 'SERVICIOS',
                step2: typeof stepTitles.step2 === 'string' ? stepTitles.step2 : 'AGENDAR',
                step3: typeof stepTitles.step3 === 'string' ? stepTitles.step3 : 'DATOS'
            },
            errors: {
                system: typeof errors.system === 'string' ? errors.system : 'Ocurrio un error inesperado.',
                network: typeof errors.network === 'string' ? errors.network : 'Error de conexion.'
            },
            aosInitOptions: normalizeAosInitOptions(opts.aosInitOptions)
        };
    }

    function resetBookingAfterSuccess(state) {
        state.step = 1;
        state.selectedServices = [];
        state.selectedBarber = null;
        state.bookingDate = '';
        state.selectedTime = '';
        state.submitSuccess = false;
        state.clientName = '';
        state.clientPhone = '';
        state.clientEmail = '';
    }

    function buildBookingPayload(form, config) {
        var payload = {
            action: 'sys_book_x9',
            csrf_token: config.csrfToken,
            company_id: config.companyId,
            lang: config.lang
        };

        var formData = new FormData(form);
        formData.forEach(function (value, key) {
            if (key === 'service_ids[]') {
                if (!Array.isArray(payload.service_ids)) {
                    payload.service_ids = [];
                }
                payload.service_ids.push(value);
                return;
            }

            if (key === 'action' || key === 'csrf_token' || key === 'company_id' || key === 'lang') {
                return;
            }

            payload[key] = value;
        });

        payload.service_ids = sanitizeServiceIds(payload.service_ids);
        payload.branch_id = toPositiveInt(payload.branch_id);
        payload.barber_id = toPositiveInt(payload.barber_id);
        payload.start_date = normalizeDateInput(payload.start_date);
        payload.start_time = normalizeTimeInput(payload.start_time);
        payload.client_name = typeof payload.client_name === 'string' ? payload.client_name.trim() : '';
        payload.client_phone = typeof payload.client_phone === 'string' ? payload.client_phone.trim() : '';
        payload.client_email = typeof payload.client_email === 'string' ? payload.client_email.trim() : '';

        return payload;
    }

    function hasBookingMinimumData(payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        if (toPositiveInt(payload.company_id) < 1 || toPositiveInt(payload.branch_id) < 1 || toPositiveInt(payload.barber_id) < 1) {
            return false;
        }
        if (!Array.isArray(payload.service_ids) || payload.service_ids.length === 0) {
            return false;
        }
        if (!payload.start_date || !payload.start_time) {
            return false;
        }
        if (!payload.client_name || !payload.client_phone || !payload.client_email) {
            return false;
        }

        return true;
    }

    async function postJson(url, payload) {
        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    }

    function createBookingSystem(options) {
        var config = normalizeBookingConfig(options);

        return {
            openWizard: false,
            step: 1,
            branchId: config.defaultBranchId,
            selectedServices: [],
            selectedBarber: null,
            bookingDate: '',
            selectedTime: '',
            clientName: '',
            clientPhone: '',
            clientEmail: '',
            availableSlots: [],
            loadingSlots: false,
            isSubmitting: false,
            submitSuccess: false,
            submitError: '',
            minDate: new Date().toISOString().split('T')[0],
            lang: config.lang,
            t: config.translations,

            async initApp() {
                var aosOptions = Object.assign({}, config.aosInitOptions);
                setTimeout(function () {
                    if (typeof AOS !== 'undefined') {
                        AOS.init(aosOptions);
                    }
                }, 100);
            },

            get stepTitle() {
                if (this.step === 1) {
                    return config.stepTitles.step1;
                }
                if (this.step === 2) {
                    return config.stepTitles.step2;
                }
                if (this.step === 3) {
                    return config.stepTitles.step3;
                }
                return config.stepTitles.step1;
            },

            get canProceed() {
                if (this.step === 1) {
                    return sanitizeServiceIds(this.selectedServices).length > 0 && toPositiveInt(this.branchId) > 0;
                }
                if (this.step === 2) {
                    return toPositiveInt(this.selectedBarber) > 0
                        && normalizeDateInput(this.bookingDate) !== ''
                        && normalizeTimeInput(this.selectedTime) !== '';
                }
                return true;
            },

            get canSubmit() {
                return this.clientName.trim() !== '' && this.clientPhone.trim() !== '' && this.clientEmail.trim() !== '';
            },

            selectServiceAndBook(id) {
                var idNum = toPositiveInt(id);
                if (idNum < 1) {
                    return;
                }

                var idStr = String(idNum);
                if (!this.selectedServices.includes(idStr)) {
                    this.selectedServices.push(idStr);
                }

                this.step = 1;
                this.openWizard = true;
            },

            closeModal() {
                if (this.submitSuccess) {
                    resetBookingAfterSuccess(this);
                }
                this.openWizard = false;
            },

            async checkSlots() {
                var date = normalizeDateInput(this.bookingDate);
                var barberId = toPositiveInt(this.selectedBarber);
                var branchId = toPositiveInt(this.branchId);
                var serviceIds = sanitizeServiceIds(this.selectedServices);

                this.selectedServices = serviceIds;

                if (!date || barberId < 1 || serviceIds.length === 0 || branchId < 1 || config.companyId < 1) {
                    return;
                }

                this.loadingSlots = true;
                this.availableSlots = [];
                this.selectedTime = '';

                try {
                    var data = await postJson('/back/index.php', {
                        action: 'api_booking_get_slots',
                        csrf_token: config.csrfToken,
                        date: date,
                        barber_id: barberId,
                        company_id: config.companyId,
                        branch_id: branchId,
                        service_ids: serviceIds
                    });

                    if (data.status === 'success' && Array.isArray(data.slots)) {
                        this.availableSlots = data.slots;
                    }
                } catch (err) {
                    // Intentionally silent to preserve existing UX behavior.
                } finally {
                    this.loadingSlots = false;
                }
            },

            async submitBooking() {
                this.isSubmitting = true;
                this.submitError = '';

                try {
                    if (!this.$refs || !this.$refs.bookingForm) {
                        this.submitError = config.errors.system;
                        return;
                    }

                    var payload = buildBookingPayload(this.$refs.bookingForm, config);
                    if (!hasBookingMinimumData(payload)) {
                        this.submitError = config.errors.system;
                        return;
                    }

                    var data = await postJson('/back/index.php', payload);
                    if (data.status === 'success') {
                        this.submitSuccess = true;
                    } else {
                        this.submitError = data.message || config.errors.system;
                    }
                } catch (err) {
                    this.submitError = config.errors.network;
                } finally {
                    this.isSubmitting = false;
                }
            }
        };
    }

    function normalizeLegalUiConfig(options) {
        var opts = options || {};

        return {
            legalUrl: typeof opts.legalUrl === 'string' ? opts.legalUrl : '',
            privacyTitle: typeof opts.privacyTitle === 'string' ? opts.privacyTitle : 'Privacy',
            termsTitle: typeof opts.termsTitle === 'string' ? opts.termsTitle : 'Terms',
            loadingHtml: typeof opts.loadingHtml === 'string'
                ? opts.loadingHtml
                : '<div class="text-center p-10"><i class="bi bi-arrow-repeat animate-spin text-4xl" aria-hidden="true"></i></div>',
            errorHtml: typeof opts.errorHtml === 'string'
                ? opts.errorHtml
                : '<div class="p-4 bg-red-50 text-red-600 font-bold rounded border border-red-200">Connection error.</div>',
            privacyFallback: typeof opts.privacyFallback === 'string' ? opts.privacyFallback : 'Contenido no disponible.',
            termsFallback: typeof opts.termsFallback === 'string' ? opts.termsFallback : 'Contenido no disponible.',
            cookieOverlayId: typeof opts.cookieOverlayId === 'string' && opts.cookieOverlayId.length > 0
                ? opts.cookieOverlayId
                : 'wm-cookie-overlay',
            errorLogLabel: typeof opts.errorLogLabel === 'string' && opts.errorLogLabel.length > 0
                ? opts.errorLogLabel
                : 'Error Legal:'
        };
    }

    function createTemplateBookingSystem(options) {
        var opts = options || {};
        var bookingConfig = opts.booking && typeof opts.booking === 'object' ? opts.booking : {};
        var legalConfig = normalizeLegalUiConfig(opts.legal);
        var bookingSystem = createBookingSystem(bookingConfig);

        return Object.assign(bookingSystem, {
            openLegal: false,
            legalTitle: '',
            legalContent: '',

            async loadLegal(docType) {
                var normalizedDocType = docType === 'privacy' ? 'privacy' : 'terms';
                this.openLegal = true;
                this.legalTitle = normalizedDocType === 'privacy' ? legalConfig.privacyTitle : legalConfig.termsTitle;
                this.legalContent = legalConfig.loadingHtml;

                try {
                    this.legalContent = await getLegalHtml({
                        legalUrl: legalConfig.legalUrl,
                        lang: this.lang,
                        docType: normalizedDocType,
                        privacyFallback: legalConfig.privacyFallback,
                        termsFallback: legalConfig.termsFallback
                    });
                } catch (err) {
                    console.error(legalConfig.errorLogLabel, err);
                    this.legalContent = legalConfig.errorHtml;
                }
            },

            closeLegal() {
                this.openLegal = false;
                if (!document.getElementById(legalConfig.cookieOverlayId)) {
                    document.body.style.overflow = 'auto';
                }
            }
        });
    }

    window.WebmigoShared = Object.assign(window.WebmigoShared || {}, {
        getLegalHtml: getLegalHtml,
        clearLegalCache: clearLegalCache,
        createBookingSystem: createBookingSystem,
        createTemplateBookingSystem: createTemplateBookingSystem
    });
})();
