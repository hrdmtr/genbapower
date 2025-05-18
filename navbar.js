document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navBar = document.querySelector('.nav-bar');
    
    if (hamburgerMenu && navBar) {
        hamburgerMenu.addEventListener('click', () => {
            navBar.classList.toggle('open');
        });
    }
});
