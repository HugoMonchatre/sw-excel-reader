const cache = new Map();

// Mapping des noms français vers anglais
const nameMapping = {
    "galion": "Galleon",
    "agirus": "Aegir",
    "hartmann": "Hertman",
    "judiah": "Judea",
    "spadassin du qilin": "Qilin Swordsman",
    "ramael": "Ryu"
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { names } = req.body;

    if (!Array.isArray(names)) {
        return res.status(400).json({ error: 'names must be an array' });
    }

    const results = {};

    // Traiter chaque monstre
    for (const name of names) {
        const cleanName = name.trim();
        const translatedName = translateMonsterName(cleanName);

        // Vérifier le cache
        if (cache.has(cleanName.toLowerCase())) {
            results[cleanName] = cache.get(cleanName.toLowerCase());
            continue;
        }

        try {
            // Chercher sur l'API SWARFARM avec le nom traduit
            const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(translatedName)}&limit=10`;
            const response = await fetch(url);

            if (!response.ok) {
                results[cleanName] = { found: false, name: cleanName };
                cache.set(cleanName.toLowerCase(), results[cleanName]);
                continue;
            }

            const jsonData = await response.json();

            if (jsonData.results && jsonData.results.length > 0) {
                const monster = jsonData.results.find(m =>
                    m.name.toLowerCase() === cleanName.toLowerCase()
                ) || jsonData.results[0];

                const result = {
                    found: true,
                    name: monster.name,
                    image: `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`,
                    element: monster.element,
                    archetype: monster.archetype,
                    awaken_level: monster.awaken_level
                };

                results[cleanName] = result;
                cache.set(cleanName.toLowerCase(), result);
            } else {
                results[cleanName] = { found: false, name: cleanName };
                cache.set(cleanName.toLowerCase(), results[cleanName]);
            }
        } catch (error) {
            console.error(`Error fetching monster ${cleanName}:`, error);
            results[cleanName] = { found: false, name: cleanName };
        }
    }

    res.json({ results });
}
