const cache = new Map();

// Mapping des noms français vers anglais
const nameMapping = {
    "galion": "Galleon",
    "spadassin du qilin": "Qilin Swordsman"
};

function translateMonsterName(name) {
    const lowerName = name.toLowerCase().trim();

    // Retirer "(2A)" ou "2A" pour la recherche
    const baseName = lowerName.replace(/\s*\(2a\)\s*/i, '').replace(/\s*2a\s*/i, '').trim();

    // Chercher dans le mapping
    if (nameMapping[baseName]) {
        return nameMapping[baseName];
    }

    return name;
}

module.exports = async function handler(req, res) {
    const monsterName = req.query.name || '';

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (!monsterName) {
        return res.status(400).json({ error: 'Monster name required' });
    }

    const name = decodeURIComponent(monsterName).trim();
    const translatedName = translateMonsterName(name);

    // Vérifier le cache
    if (cache.has(name.toLowerCase())) {
        return res.json(cache.get(name.toLowerCase()));
    }

    try {
        // Chercher sur l'API SWARFARM avec le nom traduit
        const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(translatedName)}&limit=10`;
        const response = await fetch(url);

        if (!response.ok) {
            const notFound = { found: false, name };
            cache.set(name.toLowerCase(), notFound);
            return res.json(notFound);
        }

        const jsonData = await response.json();

        if (jsonData.results && jsonData.results.length > 0) {
            // Vérifier si c'est un monstre 2A
            const is2A = name.toLowerCase().includes('2a');

            let monster;
            if (is2A) {
                // Pour les 2A, chercher avec awaken_level === 2
                monster = jsonData.results.find(m =>
                    m.name.toLowerCase() === translatedName.toLowerCase() && m.awaken_level === 2
                );
            }

            // Sinon chercher une correspondance normale
            if (!monster) {
                monster = jsonData.results.find(m =>
                    m.name.toLowerCase() === translatedName.toLowerCase()
                ) || jsonData.results[0];
            }

            const result = {
                found: true,
                name: monster.name,
                image: `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`,
                element: monster.element,
                archetype: monster.archetype,
                awaken_level: monster.awaken_level
            };

            cache.set(name.toLowerCase(), result);
            return res.json(result);
        }

        const notFound = { found: false, name };
        cache.set(name.toLowerCase(), notFound);
        return res.json(notFound);
    } catch (error) {
        console.error('Error fetching monster:', error);
        return res.json({ found: false, name });
    }
}
