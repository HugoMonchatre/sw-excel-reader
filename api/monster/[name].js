const https = require('https');

// Cache simple (persiste pendant la durée de vie de la fonction)
const cache = new Map();

module.exports = async (req, res) => {
    const { name } = req.query;
    const monsterName = decodeURIComponent(name).trim();

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Vérifier le cache
    if (cache.has(monsterName.toLowerCase())) {
        return res.json(cache.get(monsterName.toLowerCase()));
    }

    // Chercher sur l'API SWARFARM
    const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(monsterName)}&limit=10`;

    https.get(url, (apiRes) => {
        let data = '';

        apiRes.on('data', (chunk) => {
            data += chunk;
        });

        apiRes.on('end', () => {
            try {
                const jsonData = JSON.parse(data);

                if (jsonData.results && jsonData.results.length > 0) {
                    const monster = jsonData.results.find(m =>
                        m.name.toLowerCase() === monsterName.toLowerCase()
                    ) || jsonData.results[0];

                    const result = {
                        found: true,
                        name: monster.name,
                        image: `https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`,
                        element: monster.element,
                        archetype: monster.archetype,
                        awaken_level: monster.awaken_level
                    };

                    cache.set(monsterName.toLowerCase(), result);
                    return res.json(result);
                }

                const notFound = { found: false, name: monsterName };
                cache.set(monsterName.toLowerCase(), notFound);
                res.json(notFound);
            } catch (error) {
                res.json({ found: false, name: monsterName });
            }
        });
    }).on('error', () => {
        res.json({ found: false, name: monsterName });
    });
};
