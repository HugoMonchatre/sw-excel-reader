const cache = new Map();

module.exports = async function handler(req, res) {
    const monsterName = req.query.name || '';

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (!monsterName) {
        return res.status(400).json({ error: 'Monster name required' });
    }

    const name = decodeURIComponent(monsterName).trim();

    // Vérifier le cache
    if (cache.has(name.toLowerCase())) {
        return res.json(cache.get(name.toLowerCase()));
    }

    try {
        // Chercher sur l'API SWARFARM avec fetch natif
        const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(name)}&limit=10`;
        const response = await fetch(url);

        if (!response.ok) {
            const notFound = { found: false, name };
            cache.set(name.toLowerCase(), notFound);
            return res.json(notFound);
        }

        const jsonData = await response.json();

        if (jsonData.results && jsonData.results.length > 0) {
            const monster = jsonData.results.find(m =>
                m.name.toLowerCase() === name.toLowerCase()
            ) || jsonData.results[0];

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
