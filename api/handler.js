const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '..')));

// Charger le mapping des noms
const mappingPath = path.join(__dirname, '../monster_mapping.json');
console.log(`📂 Cherche mapping à: ${mappingPath}`);

let monsterMapping = {};
try {
  monsterMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  console.log(`✅ Mapping chargé avec succès`);
} catch (error) {
  console.error(`⚠️ Impossible de charger le mapping:`, error.message);
}

// Cache pour les monstres trouvés
const monsterCache = {};

// Liste des monstres disponibles du fichier Excel (mise à jour lors du chargement du fichier)
let availableMonsters = [];

// Fonction pour récupérer un monstre depuis l'API swarfarm.com
async function getMonsterFromAPI(monsterName) {
    return new Promise((resolve) => {
        // Vérifier le mapping d'abord
        let searchName = monsterName;
        let is2A = false;
        
        // Vérifier si c'est marqué comme 2A
        if (monsterName.includes('(2A)') || monsterName.includes('2A')) {
            is2A = true;
            searchName = monsterName.replace(/\s*\(2A\)/i, '').replace(/\s*2A\s*/i, '').trim();
            console.log(`🔄 Recherche 2A détectée: ${monsterName} → ${searchName}`);
        }
        
        if (monsterMapping[searchName]) {
            searchName = monsterMapping[searchName];
            console.log(`📋 Mapping trouvé: ${monsterName} → ${searchName}`);
        }
        
        // Construire l'URL avec le paramètre de recherche
        const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(searchName)}&limit=10`;
        
        console.log(`🔍 Recherche sur swarfarm.com: ${searchName}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (jsonData.results && jsonData.results.length > 0) {
                        let monster = null;
                        
                        // Si c'est 2A, chercher la version avec awaken_level: 2
                        if (is2A) {
                            monster = jsonData.results.find(m => 
                                m.name.toLowerCase() === searchName.toLowerCase() && 
                                m.awaken_level === 2
                            );
                            if (monster) {
                                console.log(`✅ Monstre 2A trouvé: ${monster.name}`);
                            }
                        }
                        
                        // Sinon chercher une correspondance exacte
                        if (!monster) {
                            monster = jsonData.results.find(m => m.name.toLowerCase() === searchName.toLowerCase());
                        }
                        
                        // Ou prendre le premier résultat
                        if (!monster && jsonData.results.length > 0) {
                            monster = jsonData.results[0];
                        }
                        
                        if (monster) {
                            console.log(`✅ Monstre trouvé: ${monster.name} (awaken_level: ${monster.awaken_level})`);
                            resolve({
                                found: true,
                                name: monster.name,
                                image: `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`,
                                element: monster.element,
                                archetype: monster.archetype,
                                awaken_level: monster.awaken_level
                            });
                            return;
                        }
                    }
                    
                    console.log(`❌ Aucun monstre trouvé pour: ${searchName}`);
                    resolve({ found: false, name: monsterName });
                } catch (error) {
                    console.error(`⚠️ Erreur parsing JSON pour ${searchName}:`, error.message);
                    resolve({ found: false, name: monsterName });
                }
            });
        }).on('error', (error) => {
            console.error(`⚠️ Erreur API pour ${searchName}:`, error.message);
            resolve({ found: false, name: monsterName });
        });
    });
}

// Endpoint pour rechercher les infos du monstre
app.get('/monster/:name', async (req, res) => {
    const monsterName = decodeURIComponent(req.params.name).trim();
    
    // Vérifier le cache d'abord
    if (monsterCache[monsterName.toLowerCase()]) {
        console.log(`📦 Cache hit pour: ${monsterName}`);
        return res.json(monsterCache[monsterName.toLowerCase()]);
    }
    
    // Récupérer depuis l'API swarfarm.com
    const result = await getMonsterFromAPI(monsterName);
    
    // Mettre en cache
    monsterCache[monsterName.toLowerCase()] = result;
    
    res.json(result);
});

// Endpoint pour récupérer juste l'URL de l'image d'un monstre
app.get('/monster-image/:name', (req, res) => {
    const monsterName = decodeURIComponent(req.params.name).trim();
    const baseName = monsterName.replace(/\s*\(2a\)\s*/i, '').trim();
    
    // Récupérer depuis l'API swarfarm.com
    const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(baseName)}&limit=1`;
    
    https.get(url, (res2) => {
        let data = '';
        res2.on('data', (chunk) => { data += chunk; });
        res2.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                if (jsonData.results && jsonData.results.length > 0) {
                    const imageUrl = `https://swarfarm.com/static/herders/images/monsters/${jsonData.results[0].image_filename}`;
                    res.json({ image: imageUrl });
                } else {
                    res.json({ image: null });
                }
            } catch (error) {
                res.json({ image: null });
            }
        });
    }).on('error', () => res.json({ image: null }));
});

app.post('/set-available-monsters', (req, res) => {
    availableMonsters = req.body.monsters || [];
    console.log(`📝 Liste des monstres disponibles mise à jour: ${availableMonsters.join(', ')}`);
    res.json({ success: true, count: availableMonsters.length });
});

// Endpoint pour chercher des monstres (pour la barre de recherche)
// Ne retourne que les monstres présents dans availableMonsters
app.get('/search/:query', async (req, res) => {
    const query = decodeURIComponent(req.params.query).trim();
    
    if (query.length < 1) {
        return res.json({ results: [] });
    }
    
    return new Promise((resolve) => {
        // Nettoyer la query en enlevant le "(2A)" si présent pour la recherche API
        const cleanQuery = query.replace(/\s*\(2a\)\s*/i, '').trim();
        const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(cleanQuery)}&limit=15`;
        
        console.log(`🔍 Recherche: ${query} (nettoie en: ${cleanQuery}, parmi ${availableMonsters.length} monstres disponibles)`);
        
        https.get(url, async (res2) => {
            let data = '';
            
            res2.on('data', (chunk) => {
                data += chunk;
            });
            
            res2.on('end', async () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (jsonData.results && jsonData.results.length > 0) {
                        // Filtrer les résultats pour ne garder que les monstres disponibles
                        const results = jsonData.results
                            .filter(m => {
                                // Vérifier si le monstre est dans la liste des monstres disponibles
                                // Compare le nom sans (2A)
                                return availableMonsters.some(availableName => {
                                    const normalizedAvailable = availableName.toLowerCase().replace(/\s*\(2a\)\s*/i, '');
                                    const normalizedApi = m.name.toLowerCase();
                                    return normalizedAvailable === normalizedApi;
                                });
                            })
                            .map(m => {
                                // Chercher si ce monstre existe avec (2A) dans availableMonsters
                                const availableWithName = availableMonsters.find(availableName => {
                                    const normalizedAvailable = availableName.toLowerCase().replace(/\s*\(2a\)\s*/i, '');
                                    const normalizedApi = m.name.toLowerCase();
                                    return normalizedAvailable === normalizedApi;
                                });
                                
                                // Si le monstre est marqué comme 2A et que l'API retourne une version 2A, garder le (2A)
                                let displayName = m.name;
                                if (availableWithName && availableWithName.includes('(2A)') && m.awaken_level === 2) {
                                    displayName = m.name + ' (2A)';
                                }
                                
                                return {
                                    name: displayName,
                                    image: `https://swarfarm.com/static/herders/images/monsters/${m.image_filename}`,
                                    element: m.element,
                                    archetype: m.archetype,
                                    awaken_level: m.awaken_level
                                };
                            });
                        
                        // Ajouter aussi les résultats locaux qui correspondent à la recherche
                        // mais qui ne sont pas dans les résultats API
                        const apiMonsterNames = results.map(r => r.name.toLowerCase().replace(/\s*\(2a\)\s*/i, ''));
                        const additionalLocalResults = availableMonsters
                            .filter(monsterName => {
                                const normalized = monsterName.toLowerCase().replace(/\s*\(2a\)\s*/i, '');
                                // Inclure si ça match la recherche ET que ce n'est pas déjà dans les résultats API
                                return normalized.includes(cleanQuery.toLowerCase()) && 
                                       !apiMonsterNames.includes(normalized);
                            })
                            .map(async (monsterName) => {
                                // Chercher l'image dans les résultats API pour ce monstre
                                const baseName = monsterName.replace(/\s*\(2a\)\s*/i, '').trim();
                                let apiMonster = jsonData.results.find(m => 
                                    m.name.toLowerCase() === baseName.toLowerCase()
                                );
                                
                                // Si pas trouvé dans la recherche actuelle, faire une nouvelle recherche
                                if (!apiMonster) {
                                    const result = await getMonsterFromAPI(baseName);
                                    if (result.found) {
                                        apiMonster = result;
                                    }
                                }
                                
                                let image = null;
                                if (apiMonster && apiMonster.image_filename) {
                                    image = `https://swarfarm.com/static/herders/images/monsters/${apiMonster.image_filename}`;
                                } else if (apiMonster && apiMonster.image) {
                                    image = apiMonster.image;
                                }
                                
                                return {
                                    name: monsterName,
                                    image: image,
                                    element: apiMonster && apiMonster.element ? apiMonster.element : 'Unknown',
                                    archetype: apiMonster && apiMonster.archetype ? apiMonster.archetype : 'Unknown',
                                    awaken_level: apiMonster && apiMonster.awaken_level ? apiMonster.awaken_level : 0
                                };
                            });
                        
                        // Attendre tous les résultats locaux
                        const resolvedLocalResults = await Promise.all(additionalLocalResults);
                        
                        const allResults = [...results, ...resolvedLocalResults];
                        console.log(`✅ ${results.length} résultats API + ${resolvedLocalResults.length} résultats locaux`);
                        res.json({ results: allResults });
                    } else {
                        // Si pas de résultats de l'API, chercher dans availableMonsters
                        console.log(`⚠️ Pas de résultats API, cherche dans availableMonsters...`);
                        const localResults = availableMonsters
                            .filter(monsterName => {
                                const normalized = monsterName.toLowerCase().replace(/\s*\(2a\)\s*/i, '');
                                return normalized.includes(cleanQuery.toLowerCase());
                            })
                            .map(monsterName => {
                                // Chercher l'image via une nouvelle requête API
                                const baseName = monsterName.replace(/\s*\(2a\)\s*/i, '').trim();
                                
                                // On va utiliser une fonction synchrone simplifiée
                                // L'image sera chargée par le client si nécessaire
                                return {
                                    name: monsterName,
                                    image: `/api/monster-image/${encodeURIComponent(baseName)}`, // URL pour charger l'image
                                    element: 'Unknown',
                                    archetype: 'Unknown',
                                    awaken_level: 0
                                };
                            });
                        
                        console.log(`✅ ${localResults.length} résultats trouvés localement`);
                        res.json({ results: localResults });
                    }
                } catch (error) {
                    console.error(`⚠️ Erreur parsing JSON pour ${query}:`, error.message);
                    res.json({ results: [] });
                }
            });
        }).on('error', (error) => {
            console.error(`⚠️ Erreur API pour ${query}:`, error.message);
            res.json({ results: [] });
        });
    });
});

// Export pour Vercel serverless
module.exports = app;
