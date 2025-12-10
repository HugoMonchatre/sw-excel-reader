/**
 * Gestion de la recherche de joueurs pour une composition
 */

/**
 * Normalise un nom de monstre pour la comparaison
 * Retire les variantes de 2A pour permettre la comparaison
 */
function normalizeMonsterName(name) {
    if (!name) return null;

    // Convertir en minuscules et trim
    let normalized = name.trim().toLowerCase();

    // Retirer toutes les variantes de 2A
    // "(2a)", "2a", " (2a) ", etc.
    normalized = normalized
        .replace(/\s*\(2a\)\s*/gi, '')  // Retire (2A) avec ou sans espaces
        .replace(/\s+2a\s*/gi, '')       // Retire 2A précédé d'espaces
        .trim();

    return normalized;
}

/**
 * Récupère les données du workbook depuis le DOM
 * (données mises en cache lors du traitement du fichier)
 */
function getWorkbookData() {
    // Vérifie s'il y a une donnée globale du workbook
    return window.workbookData || null;
}

/**
 * Récupère les noms des colonnes (monstres) depuis le tableau DOM
 * Cherche dans TOUTES les feuilles et combine les résultats
 */
function getMonsterColumns() {
    const allMonsterColumns = [];

    // Chercher dans toutes les feuilles (sheet-0, sheet-1, etc.)
    for (let sheetIndex = 0; sheetIndex < 10; sheetIndex++) {
        const sheet = document.getElementById(`sheet-${sheetIndex}`);
        if (!sheet) break;

        const table = sheet.querySelector('table');
        if (!table) continue;

        const thead = table.querySelector('thead');
        if (!thead) continue;

        const headers = thead.querySelectorAll('th');

        headers.forEach((header, index) => {
            // Récupérer le nom du monstre depuis l'attribut data-monster
            const monsterName = header.getAttribute('data-monster');
            // Garder le nom s'il existe et n'est pas une chaîne vide
            const cleanName = monsterName && monsterName.trim() ? monsterName.trim() : null;

            if (cleanName) {
                allMonsterColumns.push({
                    index: index,
                    name: cleanName,
                    sheetIndex: sheetIndex
                });
            }
        });
    }

    console.log('Colonnes avec noms (toutes feuilles):', allMonsterColumns);
    return allMonsterColumns;
}

/**
 * Récupère les données d'une feuille spécifique
 */
function getSheetData(sheetIndex) {
    const sheet = document.getElementById(`sheet-${sheetIndex}`);
    if (!sheet) return null;

    const table = sheet.querySelector('table');
    if (!table) return null;

    const tbody = table.querySelector('tbody');
    if (!tbody) return null;

    return { sheet, table, tbody };
}

/**
 * Trouve les joueurs qui ont les monstres de la composition
 * @param {Array} selectedMonsters - Les 3 monstres sélectionnés
 * @returns {Array} Liste des joueurs avec leurs données
 */
function findPlayersWithCompo(selectedMonsters) {
    const monsterColumns = getMonsterColumns();

    if (!monsterColumns || monsterColumns.length === 0) {
        console.warn('Aucune colonne de monstre trouvée');
        return [];
    }

    // Filtrer pour obtenir seulement les monstres sélectionnés
    const selectedMonsterNames = selectedMonsters
        .filter(m => m !== null)
        .map(m => m.name);

    console.log('Monstres sélectionnés:', selectedMonsterNames);
    console.log('Colonnes disponibles:', monsterColumns);

    // Trouver les colonnes correspondant aux monstres sélectionnés
    const selectedMonsterInfo = selectedMonsterNames.map(name => {
        const normalizedSearchName = normalizeMonsterName(name);
        const found = monsterColumns.find(col => {
            if (!col.name) return false;
            const normalizedColName = normalizeMonsterName(col.name);
            return normalizedColName === normalizedSearchName;
        });
        return { searchName: name, ...found };
    });

    // Vérifier que tous les monstres ont été trouvés
    if (selectedMonsterInfo.some(info => !info.name)) {
        console.warn('Certains monstres ne sont pas trouvés dans les colonnes du tableau');
        return [];
    }

    // Récupérer tous les joueurs de toutes les feuilles
    // On utilise un Map pour fusionner les données par nom de joueur
    const playersMap = new Map();

    // Parcourir chaque feuille
    for (let sheetIndex = 0; sheetIndex < 10; sheetIndex++) {
        const sheetData = getSheetData(sheetIndex);
        if (!sheetData) break;

        const rows = sheetData.tbody.querySelectorAll('tr');

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 0) return;

            const playerName = cells[0]?.textContent.trim();
            if (!playerName) return;

            // Initialiser le joueur s'il n'existe pas
            if (!playersMap.has(playerName)) {
                playersMap.set(playerName, {
                    name: playerName,
                    monsterCounts: {},
                    sheetData: {}
                });
            }

            // Sauvegarder les cellules de cette feuille pour ce joueur
            playersMap.get(playerName).sheetData[sheetIndex] = cells;
        });
    }

    // Maintenant, pour chaque joueur, vérifier s'il a tous les monstres
    const playersWithCompo = [];

    playersMap.forEach((player) => {
        let hasAllMonsters = true;
        const monsterCounts = {};

        selectedMonsterInfo.forEach((monsterInfo) => {
            const sheetIndex = monsterInfo.sheetIndex;
            const cellIndex = monsterInfo.index;
            const cells = player.sheetData[sheetIndex];

            let count = 0;
            if (cells && cells[cellIndex]) {
                const cellValue = cells[cellIndex].textContent.trim();
                count = parseInt(cellValue) || 0;
            }

            monsterCounts[monsterInfo.searchName] = count;

            if (count < 1) {
                hasAllMonsters = false;
            }
        });

        if (hasAllMonsters) {
            console.log(`✅ ${player.name} a tous les monstres!`, monsterCounts);
            playersWithCompo.push({
                name: player.name,
                monsterCounts: monsterCounts
            });
        }
    });

    console.log('Joueurs trouvés avec la compo:', playersWithCompo);
    return playersWithCompo;
}

/**
 * Génère le HTML pour afficher les joueurs
 */
function generatePlayersListHTML(players, selectedMonsters) {
    if (!players || players.length === 0) {
        return `
            <div style="text-align: center; color: var(--text-tertiary); padding: 20px;">
                <p>Aucun joueur n'a la composition</p>
            </div>
        `;
    }

    let html = `
        <div class="players-list-container">
            <div class="players-list-title">
                👥 Joueurs (${players.length})
            </div>
            
            <div class="players-list-content">
                <table class="players-table">
                    <thead>
                        <tr>
                            <th>Joueur</th>
    `;

    // Ajouter les en-têtes pour chaque monstre
    selectedMonsters.forEach(monster => {
        if (monster !== null) {
            html += `<th>${escapeHtml(monster.name)}</th>`;
        }
    });

    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Ajouter les lignes de joueurs
    players.forEach(player => {
        html += `
                        <tr>
                            <td class="player-name">${escapeHtml(player.name)}</td>
        `;

        selectedMonsters.forEach(monster => {
            if (monster !== null) {
                const count = player.monsterCounts[monster.name] || 0;
                const bgClass = count > 1 ? 'count-multiple' : (count === 1 ? 'count-single' : 'count-zero');
                html += `<td class="player-count ${bgClass}">${count}</td>`;
            }
        });

        html += `
                        </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    return html;
}
