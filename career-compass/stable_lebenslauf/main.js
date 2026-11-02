document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.floating-nav a');
    const sections = document.querySelectorAll('main section[id]');

    function renderIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function updateActiveNav() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100; // a bit of offset
            if (scrollPosition >= sectionTop) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();
    renderIcons();

    initializeLanguageSwitcher();
    initializeContentTranslations();
    initializeCertifications();
    initializeCoverLetterForm();
});

function initializeLanguageSwitcher() {
    const languageMenu = document.querySelector('.language-menu');
    const languageButtons = document.querySelectorAll('[data-language]');
    const supportedLanguages = ['de', 'en', 'fr'];
    let activeLanguage = 'de';
    let requestId = 0;

    function getTranslation(locale, key) {
        return locale[key];
    }

    function updateLanguageMenu(locale) {
        document.documentElement.lang = activeLanguage;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const value = getTranslation(locale, element.dataset.i18n);
            if (typeof value === 'string') {
                element.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-attr]').forEach(element => {
            element.dataset.i18nAttr.split(',').forEach(attributeMapping => {
                const [attribute, key] = attributeMapping.split(':').map(part => part.trim());
                const value = getTranslation(locale, key);
                if (attribute && typeof value === 'string') {
                    element.setAttribute(attribute, value);
                }
            });
        });

        languageButtons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.language === activeLanguage));
        });
        document.dispatchEvent(new CustomEvent('languagechange', {
            detail: { language: activeLanguage, locale }
        }));
    }

    async function changeLanguage(language) {
        if (!supportedLanguages.includes(language)) {
            return;
        }

        const currentRequestId = ++requestId;
        try {
            const response = await fetch(`locales/${language}.json`, {
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const locale = await response.json();
            if (!locale || typeof locale !== 'object' || Array.isArray(locale)) {
                throw new Error('Locale data has an invalid structure');
            }

            if (currentRequestId !== requestId) {
                return;
            }

            activeLanguage = language;
            updateLanguageMenu(locale);
            try {
                window.localStorage.setItem('preferred-language', language);
            } catch (error) {
                console.warn('Language preference could not be saved.', error);
            }
        } catch (error) {
            console.error(`The ${language} locale could not be loaded.`, error);
            languageButtons.forEach(button => {
                button.setAttribute('aria-pressed', String(button.dataset.language === activeLanguage));
            });
        }
    }

    languageButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (languageMenu) {
                languageMenu.open = false;
            }
            changeLanguage(button.dataset.language);
        });
    });

    let preferredLanguage = 'de';
    try {
        const storedLanguage = window.localStorage.getItem('preferred-language');
        if (supportedLanguages.includes(storedLanguage)) {
            preferredLanguage = storedLanguage;
        }
    } catch (error) {
        console.warn('Saved language preference could not be read.', error);
    }
    changeLanguage(preferredLanguage);
}

function initializeCoverLetterForm() {
    const form = document.getElementById('cover-letter-form');
    const output = document.getElementById('cover-letter-output');
    const bodyField = document.getElementById('letter-body');
    const bodyPrint = document.getElementById('letter-body-print');
    const status = document.getElementById('letter-status');
    const printButton = document.getElementById('letter-print');
    const greetingField = form?.querySelector('[name="greeting"]');
    const closerField = form?.querySelector('[name="closer"]');
    if (!form || !output || !bodyField || !bodyPrint || !printButton || !greetingField || !closerField) {
        return;
    }

    const focusExperience = {
        technical: [
            { id: 'platform', index: 0 },
            { id: 'havi-developer', index: 0 }
        ],
        workflow: [
            { id: 'havi-consultant', index: 0 },
            { id: 'havi-consultant', index: 2 }
        ],
        data: [
            { id: 'havi-consultant', index: 1 },
            { id: 'burda-analytics', index: 1 }
        ],
        reporting: [
            { id: 'burda-analytics', index: 3 },
            { id: 'sasserath-analyst', index: 1 }
        ]
    };
    const focusExampleKeys = {
        technical: 'letter.exampleTechnical',
        workflow: 'letter.exampleWorkflow',
        data: 'letter.exampleData',
        reporting: 'letter.exampleReporting'
    };
    let activeLocale = {};
    let activeLanguage = 'de';
    let greetingCustomized = false;
    let closerCustomized = false;

    function text(key, fallback) {
        return typeof activeLocale[key] === 'string' ? activeLocale[key] : fallback;
    }

    function interpolate(template, values) {
        return template.replace(/\{(\w+)\}/g, (placeholder, key) =>
            Object.prototype.hasOwnProperty.call(values, key) ? values[key] : placeholder
        );
    }

    function punctuateSalutation(greeting) {
        return `${greeting.trim().replace(/[,.!?;:]+$/, '')},`;
    }

    function readExperience(specification) {
        const experience = document.querySelector(
            `.experience-item[data-experience-id="${specification.id}"]`
        );
        const item = experience?.querySelectorAll('.task-list li')[specification.index];
        const descriptionNode = item && [...item.childNodes].find(node =>
            node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        const description = descriptionNode?.textContent.trim().replace(/\s+/g, ' ');
        return description ? description.replace(/[.!?;,\s]+$/, '') : '';
    }

    function renderEditableBody() {
        const paragraphs = bodyField.value.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
        const nodes = paragraphs.map(paragraph => {
            const element = document.createElement('p');
            element.textContent = paragraph;
            return element;
        });
        bodyPrint.replaceChildren(...nodes);
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        const values = new FormData(form);
        const value = name => String(values.get(name) || '').trim();
        const company = value('company');
        const jobTitle = value('jobTitle');
        const requirements = value('requirements')
            .replace(/\s+/g, ' ')
            .replace(/[.!?;,\s]+$/, '');
        const focus = value('focus');
        const evidenceSpecs = focusExperience[focus];

        if (!company || !jobTitle || !evidenceSpecs) {
            return;
        }
        if (!requirements) {
            if (status) {
                status.textContent = text(
                    'letter.requirementsError',
                    'Please enter a short summary of the key job requirements.'
                );
            }
            return;
        }

        const evidence = evidenceSpecs.map(readExperience).filter(Boolean);
        if (!evidence.length) {
            if (status) {
                status.textContent = text(
                    'letter.noEvidence',
                    'No matching experience examples could be loaded for this focus. Please try again.'
                );
            }
            return;
        }

        const opening = interpolate(text(
            'letter.opening',
            'I am interested in the {jobTitle} position at {company}. Your posting identifies these key requirements: {requirements}. I would welcome the opportunity to apply my relevant experience to this work.'
        ), { company, jobTitle, requirements });
        const focusExample = interpolate(text(
            focusExampleKeys[focus],
            'Relevant examples include: {evidence}.'
        ), {
            evidence: evidence.join(text('letter.evidenceJoin', ' and ')),
            company,
            jobTitle
        });
        const closing = interpolate(text(
            'letter.closingParagraph',
            'I would welcome the opportunity to contribute my experience at {company} and learn the specific requirements of the {jobTitle} position.'
        ), { company, jobTitle });

        const street = value('street');
        const zip = value('zip');
        const city = value('city');
        const state = value('state');
        const country = value('country');
        const cityLine = [zip, city].filter(Boolean).join(' ');
        const regionLine = [cityLine, state].filter(Boolean).join(', ');
        const recipient = value('recipient');
        const greeting = punctuateSalutation(value('greeting') || (recipient
            ? interpolate(text('letter.salutationNamed', 'Dear {recipient}'), { recipient })
            : text('letter.salutation', 'Dear Hiring Manager')));

        const dateOptions = activeLanguage === 'de'
            ? { day: '2-digit', month: '2-digit', year: 'numeric' }
            : { day: 'numeric', month: 'long', year: 'numeric' };
        document.getElementById('letter-date').textContent = new Intl.DateTimeFormat(
            activeLanguage === 'fr' ? 'fr-FR' : activeLanguage === 'en' ? 'en-GB' : 'de-DE',
            dateOptions
        ).format(new Date());
        document.getElementById('letter-company-preview').textContent = company;
        document.getElementById('letter-recipient-preview').textContent = recipient;
        document.getElementById('letter-street-preview').textContent = street;
        document.getElementById('letter-city-preview').textContent = regionLine;
        document.getElementById('letter-country-preview').textContent = country;
        document.getElementById('letter-subject').textContent = interpolate(text(
            'letter.subject',
            'Application for the role: {jobTitle}'
        ), { jobTitle });
        document.getElementById('letter-greeting-preview').textContent = greeting;
        document.getElementById('letter-closer').textContent = value('closer') || text(
            'letter.closing',
            'Kind regards'
        );
        bodyField.value = [opening, focusExample, closing].join('\n\n');
        renderEditableBody();
        output.hidden = false;
        if (status) {
            status.textContent = text(
                'letter.generated',
                'Your draft is ready. You can edit it before printing.'
            );
        }
    });

    bodyField.addEventListener('input', renderEditableBody);
    greetingField.addEventListener('input', () => {
        greetingCustomized = true;
    });
    closerField.addEventListener('input', () => {
        closerCustomized = true;
    });
    let outputPosition;
    let originalDocumentTitle;
    printButton.addEventListener('click', () => {
        if (output.hidden) {
            return;
        }
        const company = document.getElementById('letter-company-preview').textContent.trim();
        const safeCompany = company
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/[. ]+$/g, '')
            .slice(0, 100) || 'Unternehmen';
        originalDocumentTitle = document.title;
        document.title = `Motivationsschreiben_${safeCompany}_Sinowski`;
        outputPosition = {
            parent: output.parentElement,
            nextSibling: output.nextSibling
        };
        document.body.append(output);
        document.body.classList.add('print-cover-letter');
        window.print();
    });
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('print-cover-letter');
        if (originalDocumentTitle) {
            document.title = originalDocumentTitle;
            originalDocumentTitle = null;
        }
        if (outputPosition?.parent) {
            const { parent, nextSibling } = outputPosition;
            parent.insertBefore(output, nextSibling?.parentNode === parent ? nextSibling : null);
            outputPosition = null;
        }
    });
    document.addEventListener('languagechange', event => {
        activeLocale = event.detail.locale || {};
        activeLanguage = event.detail.language || 'de';
        if (!greetingCustomized) {
            greetingField.value = text('letter.salutation', 'Dear Hiring Manager,');
        }
        if (!closerCustomized) {
            closerField.value = text('letter.closing', 'Kind regards');
        }
    });
}

function getContentSlug(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function initializeContentTranslations() {
    document.addEventListener('languagechange', event => {
        const { language, locale } = event.detail;

        document.querySelectorAll('.experience-item[data-experience-id]').forEach(entry => {
            const descriptions = locale.experience?.[entry.dataset.experienceId] || [];
            entry.querySelectorAll('.task-list li').forEach((item, index) => {
                const textNode = [...item.childNodes].find(node =>
                    node.nodeType === Node.TEXT_NODE && node.textContent.trim()
                );
                if (!textNode) {
                    return;
                }

                if (!item.dataset.originalText) {
                    item.dataset.originalText = textNode.textContent.trim();
                }
                textNode.textContent = ` ${language === 'de' ? item.dataset.originalText : (descriptions[index] || item.dataset.originalText)}`;
            });
        });

        document.querySelectorAll('#certifications .certification-item').forEach(card => {
            const title = card.querySelector('.entry-title')?.textContent.trim().replace(/\s+/g, ' ');
            const issuer = card.querySelector('.entry-subtitle')?.textContent.trim();
            const year = card.querySelector('.date-badge')?.textContent.trim();
            const details = card.querySelector('.details');
            if (!title || !issuer || !year || !details) {
                return;
            }

            if (!details.dataset.originalText) {
                details.dataset.originalText = details.textContent.trim();
            }
            const key = `${getContentSlug(title)}-${year}`;
            details.textContent = language === 'de'
                ? details.dataset.originalText
                : (locale.certificationDetails?.[key] || details.dataset.originalText);
        });

        document.querySelectorAll('.publication-card').forEach(card => {
            const title = card.querySelector('.entry-title')?.textContent.trim().replace(/\s+/g, ' ');
            const summary = card.querySelector('.pub-description');
            if (!title || !summary) {
                return;
            }

            if (!summary.dataset.originalText) {
                summary.dataset.originalText = summary.textContent.trim();
            }
            const key = getContentSlug(title);
            summary.textContent = language === 'de'
                ? summary.dataset.originalText
                : (locale.publicationSummaries?.[key] || summary.dataset.originalText);
        });
    });
}

function initializeCertifications() {
    const controls = document.getElementById('certification-controls');
    const sortSelect = document.getElementById('certification-sort');
    const status = document.getElementById('certification-sort-status');
    const results = document.getElementById('certification-results');
    const fallbackSections = document.querySelectorAll('#certifications .cert-section');

    if (!controls || !sortSelect || !status || !results) {
        return;
    }

    let certifications = [];
    let collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });
    let activeLocale = {};
    let activeLanguage = 'de';
    const categoryKeys = {
        'Künstliche Intelligenz': 'certifications.category.ai',
        'Data & BI': 'certifications.category.dataBi',
        Datenbanken: 'certifications.category.databases'
    };

    function compareText(first, second) {
        return collator.compare(first, second);
    }

    function getCategoryLabel(category) {
        const key = categoryKeys[category] || 'certifications.category.other';
        return activeLocale[key] || category;
    }

    function getSortedCertifications(sortBy) {
        return [...certifications].sort((first, second) => {
            let comparison = 0;

            if (sortBy === 'year') {
                comparison = Number(second.year) - Number(first.year);
            } else if (sortBy === 'topic') {
                comparison = compareText(first.category, second.category);
            } else {
                comparison = compareText(first.issuer, second.issuer);
            }

            return comparison || compareText(first.title, second.title);
        });
    }

    function createCard(certification) {
        const card = document.createElement('article');
        card.className = 'card certification-item';

        const header = document.createElement('header');
        header.className = 'entry-header';
        const titleArea = document.createElement('div');
        titleArea.className = 'title-area';
        const title = document.createElement('h3');
        title.className = 'entry-title';

        if (certification.url) {
            const link = document.createElement('a');
            link.href = certification.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = certification.title;
            title.append(link);
        } else {
            title.textContent = certification.title;
        }

        const provider = document.createElement('p');
        provider.className = 'entry-subtitle';
        provider.textContent = certification.issuer;
        titleArea.append(title, provider);

        const year = document.createElement('span');
        year.className = 'date-badge';
        year.textContent = certification.year;
        header.append(titleArea, year);

        const topic = document.createElement('p');
        topic.className = 'certification-topic';
        topic.textContent = getCategoryLabel(certification.category);

        const details = document.createElement('p');
        details.className = 'details';
        const translationKey = `${getContentSlug(certification.title)}-${certification.year}`;
        details.textContent = activeLanguage === 'de'
            ? certification.details
            : (activeLocale.certificationDetails?.[translationKey] || certification.details);

        card.append(header, topic, details);
        return card;
    }

    function renderResults() {
        const sortBy = sortSelect.value;
        const sortedCertifications = getSortedCertifications(sortBy);
        const fragment = document.createDocumentFragment();

        sortedCertifications.forEach(certification => {
            fragment.append(createCard(certification));
        });

        results.replaceChildren(fragment);
        results.hidden = false;
        controls.hidden = false;
        fallbackSections.forEach(section => {
            section.hidden = true;
        });

        const sortLabelKeys = {
            year: 'certifications.statusSortYear',
            topic: 'certifications.statusSortTopic',
            provider: 'certifications.statusSortProvider'
        };
        const statusTemplate = activeLocale['certifications.status'] || '{count} certifications · Sorted by {sort}';
        const sortLabel = activeLocale[sortLabelKeys[sortBy]] || sortBy;
        status.textContent = statusTemplate
            .replace('{count}', String(certifications.length))
            .replace('{sort}', sortLabel);

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    sortSelect.addEventListener('change', renderResults);
    document.addEventListener('languagechange', event => {
        activeLocale = event.detail.locale;
        activeLanguage = event.detail.language;
        collator = new Intl.Collator(activeLanguage, { sensitivity: 'base', numeric: true });
        if (certifications.length > 0) {
            renderResults();
        }
    });

    fetch('certifications.json', { headers: { Accept: 'application/json' } })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.some(certification =>
                !certification.title || !certification.issuer || !certification.year || !certification.details
            )) {
                throw new Error('Certification data has an invalid structure');
            }

            certifications = data.map(certification => ({
                ...certification,
                category: certification.category || 'Weitere Themen'
            }));
            renderResults();
        })
        .catch(error => {
            console.warn('Certification data could not be loaded; keeping the static HTML fallback.', error);
        });
}
