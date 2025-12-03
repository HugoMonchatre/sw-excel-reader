// Liste globale des monstres disponibles (persiste pendant la durée de vie de la fonction)
let availableMonsters = [];

module.exports = (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'POST') {
        availableMonsters = req.body.monsters || [];
        return res.json({ success: true, count: availableMonsters.length });
    }

    res.status(405).json({ error: 'Method not allowed' });
};
