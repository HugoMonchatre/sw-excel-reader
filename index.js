// Point d'entrée pour Vercel
// Les fichiers statiques sont servis automatiquement
module.exports = (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.end(html);
};
