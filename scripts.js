/* ═══════════════════════════════════════════════════════════════════════════
   ROBOT CRÊPE - JavaScript Interactions
   SAÉ 3.2 - BUT GMP - IUT Rennes
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Initialisation au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initSmoothScroll();
    initModals();
    initMindmap();
    initCarousel();
    initCostSimulator();
    initTheme();
});

/**
 * Gestion du Thème (Clair/Sombre)
 */
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');

    // Appliquer le thème sauvegardé ou par défaut (sombre)
    if (savedTheme === 'light') {
        root.setAttribute('data-theme', 'light');
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = root.getAttribute('data-theme');

            if (currentTheme === 'light') {
                root.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

/**
 * Simulateur de coût unitaire
 * Calcule le coût en fonction du nombre de robots
 */
function initCostSimulator() {
    const slider = document.getElementById('robot-quantity');
    const numberInput = document.getElementById('robot-quantity-num');
    const displayRd = document.getElementById('cout-rd');
    const displayTotal = document.getElementById('cout-total');
    const displayCommande = document.getElementById('cout-commande');

    if (!slider || !numberInput) return;

    // Coûts fixes par unité
    const costMatter = 200;
    const costMachine = 415;
    const fixedUnitCost = costMatter + costMachine;

    // Coût fixe global (à amortir)
    const totalRdCost = 2000;

    function updateCosts(source) {
        let quantity = parseInt(source.value);

        // Validation limites
        if (quantity < 1) quantity = 1;
        if (quantity > 10000) quantity = 10000;

        // Synchro des inputs
        if (source === slider) numberInput.value = quantity;
        else slider.value = quantity;

        // Calculs
        const rdPerUnit = totalRdCost / quantity;
        const totalPerUnit = fixedUnitCost + rdPerUnit;
        const totalCommande = totalPerUnit * quantity;

        // Formatage des prix
        const formatEuro = (val) => {
            // Pour les petits montants, afficher les décimales
            if (val < 10) return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
            return Math.round(val).toLocaleString('fr-FR') + ' €';
        };

        displayRd.textContent = formatEuro(rdPerUnit);
        displayTotal.textContent = formatEuro(totalPerUnit);
        displayCommande.textContent = formatEuro(totalCommande);
    }

    // Event listeners
    slider.addEventListener('input', () => updateCosts(slider));
    numberInput.addEventListener('input', () => updateCosts(numberInput));

    // Initialisation
    updateCosts(slider);
}

/**
 * Carrousel d'images
 * Défilement automatique + navigation manuelle
 */
function initCarousel() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.carousel__slide');
    const dots = carousel.querySelectorAll('.carousel__dot');
    const prevBtn = carousel.querySelector('.carousel__btn--prev');
    const nextBtn = carousel.querySelector('.carousel__btn--next');

    let currentSlide = 0;
    let autoPlayInterval;
    const autoPlayDelay = 4000; // 4 secondes

    function showSlide(index) {
        // Gestion de l'index circulaire
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        currentSlide = index;

        // Mise à jour des slides
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === currentSlide);
        });

        // Mise à jour des indicateurs
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    function startAutoPlay() {
        stopAutoPlay();
        autoPlayInterval = setInterval(nextSlide, autoPlayDelay);
    }

    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
        }
    }

    // Event listeners
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            startAutoPlay(); // Redémarre le timer
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            startAutoPlay(); // Redémarre le timer
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            startAutoPlay(); // Redémarre le timer
        });
    });

    // Pause au survol
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);

    // Démarrer le défilement automatique
    startAutoPlay();
}

/**
 * Carte mentale radiale interactive
 * Gère l'ouverture/fermeture des branches au clic
 */
function initMindmap() {
    // Nouvelle version radiale
    const radialNodes = document.querySelectorAll('.radial-node--branch');

    radialNodes.forEach(node => {
        const content = node.querySelector('.radial-node__content');

        if (content) {
            content.addEventListener('click', () => {
                node.classList.toggle('open');
            });
        }
    });
}

/**
 * Scroll Reveal Animation
 * Ajoute la classe 'visible' aux sections lorsqu'elles entrent dans le viewport
 */
function initScrollReveal() {
    const sections = document.querySelectorAll('.section');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

/**
 * Smooth Scroll Enhancement
 * Améliore le scroll vers les ancres avec un offset pour le header
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');

            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                const offsetTop = targetElement.offsetTop - 20;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Gestion des modales
 * Permet d'ouvrir/fermer les modales avec animation
 */
function initModals() {
    // Boutons qui ouvrent une modale
    const modalTriggers = document.querySelectorAll('[data-modal]');

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                openModal(modal);
            }
        });
    });

    // Éléments qui ferment la modale
    const closeButtons = document.querySelectorAll('[data-close-modal]');

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[aria-hidden="false"]');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

/**
 * Ouvre une modale
 * @param {HTMLElement} modal - L'élément modale à ouvrir
 */
function openModal(modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

/**
 * Ferme une modale
 * @param {HTMLElement} modal - L'élément modale à fermer
 */
function closeModal(modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Pause la vidéo si c'est une modale vidéo
    const video = modal.querySelector('video');
    if (video) {
        video.pause();
    }
}
