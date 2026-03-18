// Preloader Animation
document.addEventListener('DOMContentLoaded', function() {
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main-content');
    const progressBar = document.getElementById('preloader-progress');
    const percentageText = document.getElementById('percentage');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        // Update progress bar and percentage
        progressBar.style.width = progress + '%';
        percentageText.textContent = Math.floor(progress) + '%';
        
        // Change loading text based on progress
        const loadingText = document.querySelector('.loading-text');
        if (progress < 30) {
            loadingText.textContent = 'Initializing wallet...';
        } else if (progress < 60) {
            loadingText.textContent = 'Calculating balances...';
        } else if (progress < 90) {
            loadingText.textContent = 'Loading transactions...';
        } else {
            loadingText.textContent = 'Almost ready...';
        }
        
        if (progress === 100) {
            clearInterval(interval);
            
            // Add fade out animation
            setTimeout(() => {
                preloader.classList.add('fade-out');
                mainContent.classList.remove('hidden');
                
                // Remove preloader from DOM after animation
                setTimeout(() => {
                    preloader.style.display = 'none';
                    
                    // Trigger entrance animations
                    animateEntrance();
                }, 500);
            }, 500);
        }
    }, 100);
    
    // Simulate network requests
    simulateRequests();
});

// Simulate loading resources
function simulateRequests() {
    const requests = [
        { name: 'Firebase Connection', time: 800 },
        { name: 'User Data', time: 600 },
        { name: 'Transactions', time: 1000 },
        { name: 'Categories', time: 400 },
        { name: 'Settings', time: 300 }
    ];
    
    let completed = 0;
    
    requests.forEach(req => {
        setTimeout(() => {
            completed++;
            console.log(`✅ Loaded: ${req.name}`);
            
            // Dispatch progress event
            const event = new CustomEvent('resourceLoaded', {
                detail: { resource: req.name, completed, total: requests.length }
            });
            document.dispatchEvent(event);
        }, req.time);
    });
}

// Entrance animations for main content
function animateEntrance() {
    const elements = document.querySelectorAll('.feature-card, .hero-content > *');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            el.style.transition = 'all 0.6s ease-out';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

// Interactive preloader effects
document.addEventListener('mousemove', (e) => {
    const coins = document.querySelectorAll('.coin');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    coins.forEach((coin, index) => {
        const speed = (index + 1) * 20;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;
        
        coin.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px)`;
    });
});
