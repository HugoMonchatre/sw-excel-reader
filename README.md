# Excel Reader - Summoners War

Application web pour lire des fichiers Excel contenant des données de Summoners War et créer des compositions d'équipe.

## Fonctionnalités

- 📊 Lecture de fichiers Excel (.xlsx, .xls)
- 🎯 Création de compositions d'équipe
- 🔍 Recherche automatique d'images de monstres via l'API SWARFARM
- 🌙 Mode sombre
- 📱 Interface responsive

## Déploiement sur Vercel

### Prérequis

1. Créer un compte gratuit sur [Vercel](https://vercel.com)
2. Installer Git (si pas déjà fait)

### Option 1 : Déploiement via interface web (Recommandé)

1. **Push ton code sur GitHub** :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <ton-repo-github>
   git push -u origin main
   ```

2. **Connecte Vercel à GitHub** :
   - Va sur [vercel.com](https://vercel.com)
   - Clique sur "Import Project"
   - Sélectionne ton repo GitHub
   - Clique sur "Deploy"

3. **C'est fini !** 🎉
   - Vercel détecte automatiquement la config
   - Ton site sera disponible sur `ton-projet.vercel.app`

### Option 2 : Déploiement via CLI

1. **Installe Vercel CLI** :
   ```bash
   npm install -g vercel
   ```

2. **Login** :
   ```bash
   vercel login
   ```

3. **Déploie** :
   ```bash
   vercel
   ```
   - Réponds aux questions (defaults OK)
   - Ton site sera déployé !

4. **Déploiement en production** :
   ```bash
   vercel --prod
   ```

## Structure du projet

```
sw_guilde/
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── compoBuilder.js
│   ├── darkMode.js
│   ├── fileHandler.js
│   ├── navigation.js
│   ├── playerFinder.js
│   └── utils.js
├── index.html
├── server.js
├── monster_mapping.json
├── vercel.json
└── package.json
```

## Configuration Vercel

Le fichier `vercel.json` configure automatiquement :
- Routes API (`/api/*`)
- Serveur Node.js
- Fichiers statiques (HTML, CSS, JS)

## Développement local

```bash
npm install
npm start
```

Ouvre [http://localhost:3000](http://localhost:3000)

## Partage du lien

Une fois déployé, partage simplement le lien `ton-projet.vercel.app` avec tes amis !

Le site est :
- ✅ HTTPS automatique
- ✅ Accessible à tous
- ✅ Pas besoin de domaine
- ✅ 100% gratuit (plan Hobby)

## Mise à jour

Pour mettre à jour ton site :

**Via GitHub** :
```bash
git add .
git commit -m "Update"
git push
```
→ Vercel redéploie automatiquement !

**Via CLI** :
```bash
vercel --prod
```

## Support

Si tu rencontres des problèmes :
- Vérifie les logs sur le dashboard Vercel
- Assure-toi que `node_modules` n'est pas commité (dans `.gitignore`)
