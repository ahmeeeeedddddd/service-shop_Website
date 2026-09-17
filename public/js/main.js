import translations from './translations.js';

let currentLang = 'ar'; // Default to Arabic

const elementsToTranslate = [
    'navHome', 'navPhotos', 'navVideo', 'navServices', 'navContact',
    'heroTitle', 'featuresTitle', 'featPricesTitle', 'featPricesDesc',
    'featSpecTitle', 'featSpecDesc', 'featEstTitle', 'featEstDesc',
    'visaTitle', 'visaDesc', 'repairsTitle', 'seeAllRepairs',
    'insuranceTitle', 'servicesTitle', 'srvQuick', 'srvGear',
    'srvSpark', 'srvFilter', 'srvSuspension', 'srvBelt', 'srvBearings',
    'srvBrakes', 'srvPaint', 'srvTow', 'srvAccident', 'srvExclusive',
    'feedbackTitle', 'addReviewTitle', 'submitReviewBtn', 'langToggle'
];

function updateLanguage(lang) {
    currentLang = lang;
    const body = document.body;

    if (lang === 'ar') {
        body.classList.remove('ltr');
        body.classList.add('rtl');
    } else {
        body.classList.remove('rtl');
        body.classList.add('ltr');
    }

    elementsToTranslate.forEach(id => {
        const el = document.getElementById(id);
        if (el && translations[lang] && translations[lang][id]) {
            el.innerHTML = translations[lang][id];
        }
    });
}

function toggleLanguage() {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    updateLanguage(newLang);
}

window.toggleLanguage = toggleLanguage;

// Scroll animations
function initScrollAnimations() {
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.classList.add('is-visible');
    });
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function setupLightbox() {
    if (document.getElementById('lightbox-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'lightbox-modal';
    modal.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" id="lightboxClose">&times;</button>
            <div class="lightbox-media-wrapper" id="lightboxMediaWrapper"></div>
            <div class="lightbox-caption" id="lightboxCaption"></div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('lightboxClose');
    const closeModal = () => {
        modal.classList.remove('active');
        const mw = document.getElementById('lightboxMediaWrapper');
        if (mw) mw.innerHTML = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openLightbox(mediaPath, mediaType, title = '', description = '') {
    setupLightbox();
    const modal = document.getElementById('lightbox-modal');
    const wrapper = document.getElementById('lightboxMediaWrapper');
    const caption = document.getElementById('lightboxCaption');

    if (mediaType === 'video') {
        wrapper.innerHTML = `<video src="${mediaPath}" controls autoplay style="max-width:90vw;max-height:75vh;"></video>`;
    } else {
        wrapper.innerHTML = `<img src="${mediaPath}" alt="${title || 'Repair'}" style="max-width:90vw;max-height:75vh;">`;
    }

    let cap = '';
    if (title) cap += `<div>${title}</div>`;
    if (description) cap += `<div style="font-weight:normal;font-size:.95rem;margin-top:5px;opacity:.85;">${description}</div>`;
    caption.innerHTML = cap;

    modal.classList.add('active');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── Repairs ─────────────────────────────────────────────────────────────────
async function fetchRepairs() {
    const container = document.getElementById('repairs-container');
    if (!container) return;

    try {
        const response = await fetch('/api/repairs');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const repairs = await response.json();

        container.innerHTML = '';

        if (!Array.isArray(repairs) || repairs.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">لا توجد إصلاحات بعد</p>';
            return;
        }

        const limit = container.dataset.limit ? parseInt(container.dataset.limit) : null;
        const repairsToRender = (limit && repairs.length > limit) ? repairs.slice(0, limit) : repairs;

        repairsToRender.forEach((repair, index) => {
            // Normalize column names (Supabase may use snake_case)
            const mediaPath = repair.mediaPath || repair.media_path || repair.mediapath || '';
            const mediaType = repair.mediaType || repair.media_type || repair.mediatype || 'image';
            const title = repair.title || '';
            const description = repair.description || '';

            const card = document.createElement('div');
            card.className = 'repair-card animate-on-scroll';
            card.style.transitionDelay = `${index * 0.1}s`;

            const mediaHtml = mediaType === 'video'
                ? `<video class="repair-media" src="${mediaPath}" muted playsinline></video>`
                : `<img class="repair-media" src="${mediaPath}" alt="${escapeHtml(title) || 'Repair image'}" loading="lazy">`;

            const infoHtml = (title || description) ? `
                <div class="repair-info">
                    ${title ? `<h4>${escapeHtml(title)}</h4>` : ''}
                    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                </div>` : '';

            card.innerHTML = `
                <div class="repair-media-container">${mediaHtml}</div>
                ${infoHtml}
            `;

            card.addEventListener('click', () => openLightbox(mediaPath, mediaType, title, description));
            container.appendChild(card);
        });

        initScrollAnimations();

    } catch (error) {
        console.error('Error fetching repairs:', error);
        if (container) container.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">تعذر تحميل الإصلاحات</p>';
    }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
async function fetchReviews() {
    const container = document.getElementById('reviewsGrid');
    if (!container) return;

    try {
        const response = await fetch('/api/reviews');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reviews = await response.json();

        container.innerHTML = '';

        if (!Array.isArray(reviews) || reviews.length === 0) {
            container.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:#555;">كن أول من يشارك رأيه!</p>';
            return;
        }

        reviews.forEach(review => {
            // Normalize column names (Supabase may use snake_case or different casing)
            const name = review.name || '';
            const comment = review.comment || '';
            const date = review.date || (review.created_at ? review.created_at.split('T')[0] : '');

            const card = document.createElement('div');
            card.className = 'testimonial animate-on-scroll';
            card.innerHTML = `
                <p dir="auto">"${escapeHtml(comment)}"</p>
                <div class="review-author">
                    <span class="review-name"><bdi>- ${escapeHtml(name)}</bdi></span>
                    ${date ? `<span class="review-date">${escapeHtml(date)}</span>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        initScrollAnimations();
    } catch (err) {
        console.error('Error fetching reviews:', err);
        if (container) container.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:#555;">تعذر تحميل الآراء</p>';
    }
}

// ─── Review Form ──────────────────────────────────────────────────────────────
function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    const statusMsg = document.getElementById('reviewStatusMessage');
    const modal = document.getElementById('reviewModal');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const name = document.getElementById('reviewName').value.trim();
        const comment = document.getElementById('reviewComment').value.trim();
        if (!name || !comment) return;

        if (statusMsg) {
            statusMsg.textContent = currentLang === 'ar' ? 'جاري إرسال رأيك...' : 'Submitting your review...';
            statusMsg.style.color = 'var(--primary-yellow)';
        }

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, comment })
            });

            if (res.ok) {
                if (statusMsg) {
                    statusMsg.textContent = currentLang === 'ar' ? 'شكراً لك! تم إضافة رأيك بنجاح.' : 'Thank you! Your review has been added.';
                    statusMsg.style.color = '#2e7d32';
                }
                form.reset();
                fetchReviews();
                setTimeout(() => {
                    if (modal) modal.classList.remove('active');
                    if (statusMsg) statusMsg.textContent = '';
                }, 1500);
            } else {
                const data = await res.json().catch(() => ({}));
                if (statusMsg) {
                    statusMsg.textContent = data.error || (currentLang === 'ar' ? 'حدث خطأ' : 'An error occurred');
                    statusMsg.style.color = 'var(--primary-red)';
                }
            }
        } catch (err) {
            console.error('Review submit error:', err);
            if (statusMsg) {
                statusMsg.textContent = currentLang === 'ar' ? 'حدث خطأ في الاتصال' : 'Connection error';
                statusMsg.style.color = 'var(--primary-red)';
            }
        }
    });
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function setupReviewModal() {
    const openBtn = document.getElementById('openReviewModalBtn');
    const modal = document.getElementById('reviewModal');
    const closeBtn = document.getElementById('closeReviewModalBtn');
    const statusMsg = document.getElementById('reviewStatusMessage');

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            if (statusMsg) statusMsg.textContent = '';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('active');
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateLanguage(currentLang);
    setupReviewForm();
    setupReviewModal();
    initScrollAnimations();

    fetchRepairs().catch(e => console.error('Repairs error:', e));
    fetchReviews().catch(e => console.error('Reviews error:', e));
});
