/**
 * Utilitaires généraux
 */

/**
 * Échappe les caractères HTML spéciaux
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Affiche un message d'erreur
 */
function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    const sheetsContent = document.getElementById('sheets-content');
    const compoContent = document.getElementById('compo-content');
    
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
    sheetsContent.innerHTML = '';
    compoContent.innerHTML = '';
    disableTabs();
}

/**
 * Active les onglets de navigation
 */
function enableTabs() {
    const compoBtn = document.getElementById('tab-compo');
    if (compoBtn) compoBtn.disabled = false;
}

/**
 * Désactive les onglets de navigation
 */
function disableTabs() {
    const compoBtn = document.getElementById('tab-compo');
    if (compoBtn) compoBtn.disabled = true;
}
