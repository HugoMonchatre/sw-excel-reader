/**
 * Gestion du mode sombre
 */

const darkModeManager = {
    /**
     * Initialise le mode sombre
     */
    init() {
        // Récupérer la préférence sauvegardée
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Appliquer le mode
        if (isDarkMode) {
            this.enableDarkMode();
        }
        
        // Attacher l'événement du bouton toggle
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleDarkMode());
        }
    },
    
    /**
     * Active le mode sombre
     */
    enableDarkMode() {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.textContent = '☀️';
            toggle.title = 'Toggle light mode';
        }
    },

    /**
     * Désactive le mode sombre
     */
    disableDarkMode() {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.textContent = '🌙';
            toggle.title = 'Toggle dark mode';
        }
    },
    
    /**
     * Bascule entre les modes
     */
    toggleDarkMode() {
        if (document.body.classList.contains('dark-mode')) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }
};

// Initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    darkModeManager.init();
});
