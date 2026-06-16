// Animazione conteggio numerico da zero
function animateNumbers() {
    const numberElements = document.querySelectorAll('.animate-number');
    
    numberElements.forEach(el => {
        const target = parseFloat(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        const prefix = el.getAttribute('data-prefix') || '';
        const duration = parseInt(el.getAttribute('data-duration')) || 2000;
        const isDecimal = el.getAttribute('data-decimal') === 'true';
        
        let start = 0;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing ease-out
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = target * easeOut;
            
            if (isDecimal) {
                el.textContent = prefix + current.toFixed(1) + suffix;
            } else {
                el.textContent = prefix + Math.round(current) + suffix;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                // Assicurati che il numero finale sia esatto
                if (isDecimal) {
                    el.textContent = prefix + target.toFixed(1) + suffix;
                } else {
                    el.textContent = prefix + target + suffix;
                }
            }
        }
        
        requestAnimationFrame(update);
    });
}

// Animazione barra slider per valori nutrizionali
function animateNutritionBars() {
    const bars = document.querySelectorAll('.nutrition-bar');
    
    bars.forEach(bar => {
        const target = parseFloat(bar.getAttribute('data-target'));
        const max = parseFloat(bar.getAttribute('data-max')) || 100;
        const duration = parseInt(bar.getAttribute('data-duration')) || 1500;
        const unit = bar.getAttribute('data-unit') || '';
        const label = bar.querySelector('.bar-label');
        const fill = bar.querySelector('.bar-fill');
        const value = bar.querySelector('.bar-value');
        
        const percentage = (target / max) * 100;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing ease-out
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = target * easeOut;
            const currentPercentage = percentage * easeOut;
            
            if (fill) {
                fill.style.width = currentPercentage + '%';
            }
            
            if (value) {
                value.textContent = current.toFixed(1) + ' ' + unit;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                if (fill) fill.style.width = percentage + '%';
                if (value) value.textContent = target + ' ' + unit;
            }
        }
        
        requestAnimationFrame(update);
    });
}

// Intersection Observer per avviare animazioni quando gli elementi entrano in viewport
function initAnimations() {
    const observerOptions = {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target;
                
                // Anima numeri nella sezione
                const numbers = section.querySelectorAll('.animate-number');
                numbers.forEach(el => {
                    if (!el.classList.contains('animated')) {
                        el.classList.add('animated');
                        animateSingleNumber(el);
                    }
                });
                
                // Anima barre nutrizionali
                const bars = section.querySelectorAll('.nutrition-bar');
                bars.forEach(bar => {
                    if (!bar.classList.contains('animated')) {
                        bar.classList.add('animated');
                        animateSingleBar(bar);
                    }
                });
            }
        });
    }, observerOptions);
    
    // Osserva tutte le sezioni con animazioni
    document.querySelectorAll('.animate-section').forEach(section => {
        observer.observe(section);
    });
}

// Anima un singolo numero
function animateSingleNumber(el) {
    const target = parseFloat(el.getAttribute('data-target'));
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = parseInt(el.getAttribute('data-duration')) || 2000;
    const isDecimal = el.getAttribute('data-decimal') === 'true';
    
    let start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;
        
        if (isDecimal) {
            el.textContent = prefix + current.toFixed(1) + suffix;
        } else {
            el.textContent = prefix + Math.round(current) + suffix;
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (isDecimal) {
                el.textContent = prefix + target.toFixed(1) + suffix;
            } else {
                el.textContent = prefix + target + suffix;
            }
        }
    }
    
    requestAnimationFrame(update);
}

// Anima una singola barra
function animateSingleBar(bar) {
    const target = parseFloat(bar.getAttribute('data-target'));
    const max = parseFloat(bar.getAttribute('data-max')) || 100;
    const duration = parseInt(bar.getAttribute('data-duration')) || 1500;
    const unit = bar.getAttribute('data-unit') || '';
    const fill = bar.querySelector('.bar-fill');
    const value = bar.querySelector('.bar-value');
    
    const percentage = Math.min((target / max) * 100, 100);
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;
        const currentPercentage = percentage * easeOut;
        
        if (fill) {
            fill.style.width = currentPercentage + '%';
        }
        
        if (value) {
            value.textContent = current.toFixed(1) + ' ' + unit;
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (fill) fill.style.width = percentage + '%';
            if (value) value.textContent = target + ' ' + unit;
        }
    }
    
    requestAnimationFrame(update);
}

// Avvia animazioni al caricamento della pagina
document.addEventListener('DOMContentLoaded', function() {
    console.log('Animations.js caricato');
    console.log('Elementi .animate-section trovati:', document.querySelectorAll('.animate-section').length);
    console.log('Elementi .nutrition-bar trovati:', document.querySelectorAll('.nutrition-bar').length);
    initAnimations();
});

// Esporta funzioni per uso globale
window.animateNumbers = animateNumbers;
window.animateNutritionBars = animateNutritionBars;
window.initAnimations = initAnimations;
