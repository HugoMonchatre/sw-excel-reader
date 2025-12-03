import https from 'https';

const cache = new Map();

export default async function handler(req, res) {
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

    // Chercher sur l'API SWARFARM
    const url = `https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(name)}&limit=10`;

    return new Promise((resolve) => {
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
                        res.json(result);
                        resolve();
                        return;
                    }

                    const notFound = { found: false, name };
                    cache.set(name.toLowerCase(), notFound);
                    res.json(notFound);
                    resolve();
                } catch (error) {
                    res.json({ found: false, name });
                    resolve();
                }
            });
        }).on('error', () => {
            res.json({ found: false, name });
            resolve();
        });
    });
}
