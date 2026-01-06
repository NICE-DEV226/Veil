// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Advanced Scroll Animation for Logo Transition
const heroLogo = document.querySelector('.hero-logo-large');
const navLogo = document.querySelector('.brand-logo');
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;
    const scrollMax = 250; // Quicker transition

    let progress = Math.min(scrollPos / scrollMax, 1);

    // 1. Hero Logo Animation
    if (heroLogo) {
        // Linear shrink and fade
        const scale = 1 - (progress * 0.8);
        const opacity = 1 - (progress * 1.5);
        const blur = progress * 10;

        heroLogo.style.transform = `scale(${scale}) translateY(${progress * -30}px)`;
        heroLogo.style.opacity = Math.max(opacity, 0);
        heroLogo.style.filter = `blur(${blur}px)`;
    }

    // 2. Navbar Logo Reveal
    if (navLogo) {
        if (progress > 0.7) {
            navLogo.classList.add('visible');
        } else {
            navLogo.classList.remove('visible');
        }
    }

    // 3. Navbar State
    if (scrollPos > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Intersection Observer for Reveal Animations
const revealOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, revealOptions);

document.querySelectorAll('.feature-card, .why-item, .install-box, .section-header').forEach(el => {
    el.classList.add('reveal-init');
    revealObserver.observe(el);
});

// Add dynamically generated CSS for reveals
const revealStyles = document.createElement('style');
revealStyles.textContent = `
    .reveal-init {
        opacity: 0;
        transform: translateY(40px);
        transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .revealed {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(revealStyles);
