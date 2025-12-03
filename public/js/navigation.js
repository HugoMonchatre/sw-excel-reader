/**
 * Gestion de la navigation et des onglets
 */

/**
 * Change la feuille affichée
 */
function switchSheet(sheetIndex) {
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        btn.classList.toggle('active', String(index) === String(sheetIndex));
    });

    document.querySelectorAll('.sheet-content').forEach((sheet, index) => {
        sheet.style.display = String(index) === String(sheetIndex) ? 'block' : 'none';
    });
}

/**
 * Change l'onglet principal (Sheets vs Compo)
 */
function switchMainTab(tabIndex) {
    const sheetsTabsContainer = document.getElementById('sheets-tabs');
    const tabs = sheetsTabsContainer ?
        sheetsTabsContainer.querySelectorAll('.tab-btn') :
        [];

    const sheetsContent = document.getElementById('sheets-content');
    const compoContent = document.getElementById('compo-content');

    // Retirer la classe active de tous les boutons
    tabs.forEach(btn => btn.classList.remove('active'));

    // Ajouter la classe active au bon bouton
    if (tabs[tabIndex]) {
        tabs[tabIndex].classList.add('active');
    }

    if (tabIndex === 2 || event?.target?.id === 'tab-compo') {
        compoContent.innerHTML = compoBuilder.getCompoHTML();
        compoBuilder.attachEventListeners();
        compoContent.style.display = 'block';
        sheetsContent.style.display = 'none';
    } else {
        // Vérifier que window.sheetsHTML existe avant de l'utiliser
        if (window.sheetsHTML) {
            sheetsContent.innerHTML = window.sheetsHTML;
        }
        sheetsContent.style.display = 'block';
        compoContent.style.display = 'none';

        document.querySelectorAll('.sheet-content').forEach((sheet, idx) => {
            sheet.style.display = idx === tabIndex ? 'block' : 'none';
        });
    }
}
