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
        if (el && translations[lang][id]) {
            el.innerHTML = translations[lang][id]; // using innerHTML to allow tags if needed
        }
    });
}

function toggleLanguage() {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    updateLanguage(newLang);
}

window.toggleLanguage = toggleLanguage;

// Intersection Observer for scroll animations
function initScrollAnimations() {
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.classList.add('is-visible');
    });
}

// Lightbox Modal Implementation
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
        const mediaWrapper = document.getElementById('lightboxMediaWrapper');
        if (mediaWrapper) mediaWrapper.innerHTML = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openLightbox(mediaPath, mediaType, title = '', description = '') {
    setupLightbox();
    const modal = document.getElementById('lightbox-modal');
    const wrapper = document.getElementById('lightboxMediaWrapper');
    const caption = document.getElementById('lightboxCaption');

    if (mediaType === 'video') {
        wrapper.innerHTML = `<video src="${mediaPath}" controls autoplay style="max-width:90vw; max-height:75vh;"></video>`;
    } else {
        wrapper.innerHTML = `<img src="${mediaPath}" alt="${title || 'Repair'}" style="max-width:90vw; max-height:75vh;">`;
    }

    let captionText = '';
    if (title) captionText += `<div>${title}</div>`;
    if (description) captionText += `<div style="font-weight: normal; font-size: 0.95rem; margin-top: 5px; opacity: 0.85;">${description}</div>`;
    caption.innerHTML = captionText;

    modal.classList.add('active');
}

// Fetch and render repairs
async function fetchRepairs() {
    try {
        const response = await fetch('/api/repairs');
        const repairs = await response.json();
        const container = document.getElementById('repairs-container');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        const limit = container.dataset.limit ? parseInt(container.dataset.limit) : null;
        let repairsToRender = repairs;
        if (limit && repairs.length > limit) {
            repairsToRender = repairs.slice(0, limit);
        }
        
        repairsToRender.forEach((repair, index) => {
            const card = document.createElement('div');
            card.className = 'repair-card animate-on-scroll';
            card.style.transitionDelay = `${index * 0.1}s`;
            
            let mediaHtml = '';
            if (repair.mediaType === 'video') {
                mediaHtml = `<video class="repair-media" src="${repair.mediaPath}"></video>`;
            } else {
                mediaHtml = `<img class="repair-media" src="${repair.mediaPath}" alt="${repair.title || 'Repair image'}">`;
            }
            
            let infoHtml = '';
            if (repair.title || repair.description) {
                infoHtml = `
                    <div class="repair-info">
                        ${repair.title ? `<h4>${repair.title}</h4>` : ''}
                        ${repair.description ? `<p>${repair.description}</p>` : ''}
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="repair-media-container">
                    ${mediaHtml}
                </div>
                ${infoHtml}
            `;

            // Click event to launch Lightbox
            card.addEventListener('click', () => {
                openLightbox(repair.mediaPath, repair.mediaType, repair.title, repair.description);
            });

            container.appendChild(card);
        });

        // Re-init observer for dynamically added elements
        initScrollAnimations();

    } catch (error) {
        console.error('Error fetching repairs:', error);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Fetch and render reviews
async function fetchReviews() {
    try {
        const response = await fetch('/api/reviews');
        const reviews = await response.json();
        const container = document.getElementById('reviewsGrid');
        if (!container) return;

        container.innerHTML = '';

        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'testimonial animate-on-scroll';
            card.innerHTML = `
                <p dir="auto">"${escapeHtml(review.comment)}"</p>
                <div class="review-author">
                    <span class="review-name" dir="auto"><bdi>- ${escapeHtml(review.name)}</bdi></span>
                    ${review.date ? `<span class="review-date" dir="auto"><bdi>${escapeHtml(review.date)}</bdi></span>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        initScrollAnimations();
    } catch (err) {
        console.error('Error fetching reviews:', err);
    }
}

// Setup Review Form submission
function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    const statusMsg = document.getElementById('reviewStatusMessage');
    const modal = document.getElementById('reviewModal');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reviewName').value.trim();
        const comment = document.getElementById('reviewComment').value.trim();

        if (!name || !comment) return;

        statusMsg.textContent = currentLang === 'ar' ? 'جاري إرسال رأيك...' : 'Submitting your review...';
        statusMsg.style.color = 'var(--primary-yellow)';

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, comment })
            });

            if (res.ok) {
                statusMsg.textContent = currentLang === 'ar' ? 'شكراً لك! تم إضافة رأيك بنجاح.' : 'Thank you! Your review has been added.';
                statusMsg.style.color = '#2e7d32';
                form.reset();
                fetchReviews(); // Refresh review list
                setTimeout(() => {
                    if (modal) modal.classList.remove('active');
                    statusMsg.textContent = '';
                }, 1500);
            } else {
                const data = await res.json();
                statusMsg.textContent = data.error || (currentLang === 'ar' ? 'حدث خطأ' : 'An error occurred');
                statusMsg.style.color = 'var(--primary-red)';
            }
        } catch (err) {
            statusMsg.textContent = currentLang === 'ar' ? 'حدث خطأ في الاتصال' : 'Connection error';
            statusMsg.style.color = 'var(--primary-red)';
        }
    });
}

// Setup Modal open/close actions
function setupReviewModal() {
    const openBtn = document.getElementById('openReviewModalBtn');
    const modal = document.getElementById('reviewModal');
    const closeBtn = document.getElementById('closeReviewModalBtn');
    const statusMsg = document.getElementById('reviewStatusMessage');

    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        if (statusMsg) statusMsg.textContent = '';
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateLanguage(currentLang);
    fetchRepairs();
    fetchReviews();
    setupReviewForm();
    setupReviewModal();
    initScrollAnimations();
});

