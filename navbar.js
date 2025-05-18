document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navBar = document.querySelector('.nav-bar');
    
    const checkScreenWidth = () => {
        const width = window.innerWidth;
        console.log(`Screen width: ${width}px`);
        if (width <= 768) {
            console.log('Media query should be active (mobile view)');
            if (hamburgerMenu) {
                hamburgerMenu.style.display = 'block';  // 強制的に表示
                console.log('Hamburger menu should be visible');
            }
        }
    };
    
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    
    if (hamburgerMenu && navBar) {
        hamburgerMenu.addEventListener('click', () => {
            navBar.classList.toggle('open');
            console.log('Menu toggled:', navBar.classList.contains('open'));
        });
    } else {
        console.error('Hamburger menu or nav bar not found');
    }
});
