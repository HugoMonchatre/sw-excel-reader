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
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const query = req.query.query || '';

    if (!query || query.length < 1) {
        return res.json({ results: [] });
    }

    const cleanQuery = query.trim();
    const translatedQuery = translateMonsterName(cleanQuery);

    // Vérifier le cache
    const cacheKey = `search:${cleanQuery.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
    }

    try {
        // Chercher sur l'API SWARFARM
        const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(translatedQuery)}&limit=15`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.json({ results: [] });
        }

        const jsonData = await response.json();

        if (jsonData.results && jsonData.results.length > 0) {
            const results = jsonData.results.map(m => ({
                name: m.name,
                image: `https://swarfarm.com/static/herders/images/monsters/${m.image_filename}`,
                element: m.element,
                archetype: m.archetype,
                awaken_level: m.awaken_level
            }));

            const responseData = { results };
            cache.set(cacheKey, responseData);
            return res.json(responseData);
        }

        return res.json({ results: [] });
    } catch (error) {
        console.error('Error searching monsters:', error);
        return res.json({ results: [] });
    }
}
