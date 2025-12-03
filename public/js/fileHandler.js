/**
 * Gestion des fichiers Excel
 */

// Cache pour les images des monstres
const monsterImageCache = new Map();

/**
 * Charge plusieurs monstres en une seule requête batch
 */
async function fetchMonstersBatch(monsterNames) {
    const validNames = monsterNames
        .map(n => String(n).trim())
        .filter(n => n && n.length >= 2 && !/^\d+$/.test(n));

    // Séparer les noms en cache et ceux à charger
    const cached = {};
    const toFetch = [];

    validNames.forEach(name => {
        if (monsterImageCache.has(name)) {
            cached[name] = monsterImageCache.get(name);
        } else {
            toFetch.push(name);
        }
    });

    // Si tout est en cache, retourner directement
    if (toFetch.length === 0) {
        return cached;
    }

    try {
        const response = await fetch('/api/monsters-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: toFetch })
        });

        if (!response.ok) {
            return cached;
        }

        const data = await response.json();

        // Mettre en cache les résultats
        Object.entries(data.results || {}).forEach(([name, result]) => {
            const image = result.found ? result.image : null;
            monsterImageCache.set(name, image);
            cached[name] = image;
        });

        // Marquer les non-trouvés comme null
        toFetch.forEach(name => {
            if (!cached.hasOwnProperty(name)) {
                monsterImageCache.set(name, null);
                cached[name] = null;
            }
        });

        return cached;
    } catch (error) {
        console.error('Erreur fetch batch:', error.message);
        return cached;
    }
}

async function fetchMonsterImage(monsterName) {
    try {
        const cleanName = String(monsterName).trim();
        if (!cleanName || cleanName.length < 2 || /^\d+$/.test(cleanName)) {
            return null;
        }

        // Vérifier le cache d'abord
        if (monsterImageCache.has(cleanName)) {
            return monsterImageCache.get(cleanName);
        }

        const response = await fetch(`/api/monster?name=${encodeURIComponent(cleanName)}`);

        if (!response.ok) {
            monsterImageCache.set(cleanName, null);
            return null;
        }

        const data = await response.json();

        if (data.found && data.image) {
            monsterImageCache.set(cleanName, data.image);
            return data.image;
        }

        monsterImageCache.set(cleanName, null);
        return null;
    } catch (error) {
        console.error(`Erreur fetch monstre ${monsterName}:`, error.message);
        monsterImageCache.set(String(monsterName).trim(), null);
        return null;
    }
}

/**
 * Génère un tableau HTML à partir des données Excel
 * Affiche d'abord le tableau sans images, puis charge les images en parallèle
 */
async function generateTable(data, sheet = null) {
    if (!data || data.length === 0) {
        return '<div class="no-file">Aucune donnée dans cette feuille</div>';
    }

    let maxCols = 0;
    data.forEach(row => {
        if (Array.isArray(row) && row.length > maxCols) {
            maxCols = row.length;
        }
    });

    // Extraire les noms des monstres directement du sheet (ligne 4 = index 3)
    let monsterNames = [];
    if (sheet && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
            const cell = sheet[cellAddress];
            monsterNames[col] = cell ? cell.v : undefined;
        }
        if (range.e.c + 1 > maxCols) {
            maxCols = range.e.c + 1;
        }
    } else {
        monsterNames = data[3] || [];
    }

    let html = '<div class="table-wrapper"><table>';

    // Collecter les noms de monstres valides pour le chargement batch
    const validMonsters = [];
    for (let i = 0; i < maxCols; i++) {
        const monsterName = Array.isArray(monsterNames) ? monsterNames[i] : '';
        const trimmedName = monsterName ? String(monsterName).trim() : '';
        if (trimmedName && trimmedName.length >= 2 && !/^\d+$/.test(trimmedName)) {
            validMonsters.push({ index: i, name: trimmedName });
        }
    }

    // Charger toutes les images en une seule requête batch
    const monsterNamesToFetch = validMonsters.map(m => m.name);
    const batchResults = await fetchMonstersBatch(monsterNamesToFetch);

    // Créer un map pour accès rapide par index
    const imageMap = new Map();
    validMonsters.forEach(m => {
        imageMap.set(m.index, batchResults[m.name] || null);
    });

    // En-têtes avec images des monstres
    html += '<thead><tr>';
    for (let i = 0; i < maxCols; i++) {
        const monsterName = Array.isArray(monsterNames) ? monsterNames[i] : '';
        const trimmedName = monsterName ? String(monsterName).trim() : '';
        const dataMonster = `data-monster="${escapeHtml(trimmedName)}"`;

        let headerContent = `${escapeHtml(trimmedName || 'Col ' + (i + 1))}`;

        const monsterImage = imageMap.get(i);
        if (monsterImage) {
            headerContent = `<div style="margin-bottom: 8px;"><img style="max-width: 60px; max-height: 60px; border-radius: 4px; border: 1px solid #ddd;" src="${monsterImage}" alt="${escapeHtml(trimmedName)}"/></div><div style="font-weight: 600; font-size: 12px;">${escapeHtml(trimmedName)}</div>`;
        }

        html += `<th style="text-align: center; vertical-align: top;" ${dataMonster}>${headerContent}</th>`;
    }
    html += '</tr></thead>';

    // Données - filtrer les lignes vides (à partir de la ligne 5)
    html += '<tbody>';
    for (let i = 4; i < data.length; i++) {
        const row = data[i];

        let isEmptyRow = true;
        if (Array.isArray(row)) {
            for (let j = 0; j < maxCols; j++) {
                if (row[j] !== undefined && row[j] !== null && String(row[j]).trim() !== '') {
                    isEmptyRow = false;
                    break;
                }
            }
        }

        if (!isEmptyRow) {
            html += '<tr>';
            for (let j = 0; j < maxCols; j++) {
                const cell = Array.isArray(row) ? row[j] : '';
                html += `<td>${escapeHtml(String(cell || ''))}</td>`;
            }
            html += '</tr>';
        }
    }
    html += '</tbody>';

    html += '</table></div>';
    return html;
}

/**
 * Retourne un objet vide pour chaque sheet (les images ne sont plus utilisées)
 */
async function extractImagesFromExcel(arrayBuffer, sheetNames) {
    const imagesMap = {};
    sheetNames.forEach(name => {
        imagesMap[name] = [];
    });
    return imagesMap;
}

/**
 * Traite un fichier Excel chargé
 */
function processFile(arrayBuffer, fileName) {
    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
            showError('Le fichier ne contient aucune feuille');
            return;
        }

        extractImagesFromExcel(arrayBuffer, sheetNames).then(imagesMap => {
            const sheetsToDisplay = sheetNames.slice(0, 2);
            const tabNames = ['A remplir 5nat', 'A remplir 4nat'];
            const sheetsContent = document.getElementById('sheets-content');
            const compoContent = document.getElementById('compo-content');

            let tabsHtml = '';
            sheetsToDisplay.forEach((name, index) => {
                const displayName = tabNames[index] || name;
                tabsHtml += `<button class="tab-btn ${index === 0 ? 'active' : ''}" data-sheet="${index}" onclick="switchMainTab(${index})">
                    ${escapeHtml(displayName)}
                </button>`;
            });
            tabsHtml += `<button class="tab-btn" id="tab-compo" onclick="switchMainTab(2)">🎯 Créer Compo</button>`;
            
            document.getElementById('sheets-tabs').innerHTML = tabsHtml;

            // Sauvegarder les données du workbook globalement
            window.workbookData = {
                sheets: sheetsToDisplay.map((name, index) => ({
                    name: name,
                    data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 })
                }))
            };

            // Créer le HTML initial avec les divs de chargement
            let sheetsHtml = '<div id="sheets-container">';
            sheetsToDisplay.forEach((name, index) => {
                sheetsHtml += `<div class="sheet-content" id="sheet-${index}" data-sheet="${index}" style="display: ${index === 0 ? 'block' : 'none'}; min-height: 400px;">
                    <div class="loading"><div class="spinner"></div> Chargement des données...</div>
                </div>`;
            });
            sheetsHtml += '</div>';

            sheetsContent.innerHTML = sheetsHtml;
            compoContent.style.display = 'none';
            sheetsContent.style.display = 'block';

            // Générer tous les tableaux en parallèle
            const tablePromises = sheetsToDisplay.map((name, index) => {
                const sheet = workbook.Sheets[name];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                return generateTable(data, sheet).then(tableHtml => {
                    const sheetDiv = document.getElementById(`sheet-${index}`);
                    if (sheetDiv) {
                        sheetDiv.innerHTML = tableHtml;
                    }
                });
            });

            // Une fois tous les tableaux générés, sauvegarder le HTML complet
            Promise.all(tablePromises).then(() => {
                window.sheetsHTML = sheetsContent.innerHTML;
            });
            
            // Extraire les noms des monstres et les envoyer au serveur
            const monsterNames = [];
            sheetsToDisplay.forEach((sheetName) => {
                const sheet = workbook.Sheets[sheetName];
                if (sheet && sheet['!ref']) {
                    const range = XLSX.utils.decode_range(sheet['!ref']);
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
                        const cell = sheet[cellAddress];
                        const monsterName = cell ? cell.v : undefined;
                        if (monsterName && typeof monsterName === 'string' && monsterName.trim()) {
                            monsterNames.push(monsterName.trim());
                        }
                    }
                }
            });
            
            // Envoyer les noms des monstres au serveur
            if (monsterNames.length > 0) {
                fetch('/api/set-available-monsters', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ monsters: monsterNames })
                })
                .then(response => response.json())
                .catch(error => {
                    console.error('Erreur envoi monstres:', error);
                });
            }
            
            enableTabs();
            switchMainTab(0);

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sheetIndex = e.target.dataset.sheet;
                    switchSheet(sheetIndex);
                });
            });
        }).catch(error => {
            showError(`Erreur lors de l'extraction des images: ${error.message}`);
        });

    } catch (error) {
        showError(`Erreur lors du traitement: ${error.message}`);
    }
}

/**
 * Gère la sélection d'un fichier
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameDisplay = document.getElementById('fileName');
    const errorMsg = document.getElementById('errorMsg');
    const sheetsContent = document.getElementById('sheets-content');

    fileNameDisplay.textContent = `Fichier: ${file.name}`;
    errorMsg.classList.remove('show');

    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            sheetsContent.innerHTML = '<div class="loading"><div class="spinner"></div> Lecture du fichier...</div>';

            setTimeout(() => {
                processFile(event.target.result, file.name);
            }, 100);
        } catch (error) {
            showError(`Erreur lors de la lecture: ${error.message}`);
        }
    };

    reader.onerror = function () {
        showError('Erreur lors du chargement du fichier');
    };

    reader.readAsArrayBuffer(file);
}
