const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('messagerie.db');


const typesMime = {
    '.html' : 'text/html; charset=utf-8',
    '.css' : 'text/css; charset=utf-8',
    '.js' : 'text/javascript; charset=utf-8'
}

const serveur = http.createServer((req, res) => {

    if (req.method === 'POST' && req.url === '/register'){

        let corps = '';

        req.on('data', (morceau) => {
            corps += morceau;
        });

        req.on('end', () => {
            console.log('Donnees recus : ', corps);

            const donnees = new URLSearchParams(corps);
            const name = donnees.get('name');
            const lastName = donnees.get('lastName');
            const email = donnees.get('email');
            const password = donnees.get('password');

            if (!name || !email || !password) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('Champs manquants');
                return;
            }

            const sel = crypto.randomBytes(16).toString('hex');
            const hash = crypto.scryptSync(password, sel, 64).toString('hex');
            const PasswordDB = sel +':' + hash;

            console.log('mot de passe en claire  = ', password);
            console.log('mot de passe hash : ', PasswordDB);

            const requete = db.prepare(`
                INSERT INTO user (name, lastName, email, password)
                VALUES (?, ?, ?, ?)
            `);

            const result = requete.run(name, lastName, email, PasswordDB);

            console.log('Utilisateur ajouter : ID=' + result.lastInsertRowid );

            res.end('Inscription reussis');
        });

        return;
    }

    if (req.method === 'POST' && req.url === '/login') {

        let corps = '';
        req.on('data', (morceau) => { corps += morceau; });

        req.on('end', () => {
            const donnees  = new URLSearchParams(corps);
            const email    = donnees.get('email')?.trim();
            const password = donnees.get('password');

            console.log('--- Tentative de connexion ---');
            console.log('Email cherché :', JSON.stringify(email));

            // 1. Chercher l'utilisateur par son email
            const utilisateur = db.prepare('SELECT * FROM user WHERE email = ?').get(email);
            console.log('Utilisateur trouvé :', utilisateur);

            // 2. Aucun compte avec cet email ?
            if (!utilisateur) {
                res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('Email ou mot de passe incorrect');
                return;
            }

            // 3. Vérifier le mot de passe
            const [sel, hashStocke] = utilisateur.password.split(':');
            const hashSaisi = crypto.scryptSync(password, sel, 64).toString('hex');

            console.log('Hash stocké :', hashStocke);
            console.log('Hash saisi  :', hashSaisi);
            console.log('Identiques ? :', hashSaisi === hashStocke);

            if (hashSaisi === hashStocke) {
                res.end('Connexion réussie ! Bienvenue ' + utilisateur.name);
            } else {
                res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('Email ou mot de passe incorrect');
            }
        });

        return;
    }

    let chemin = req.url;
    if (chemin === '/'){
        chemin = '/index.html';
    }

    else if (!chemin.includes('.')){
        chemin = chemin + '.html';
    }

    const extension = path.extname(chemin);

    const type = typesMime[extension] || 'text/plain; charset=utf-8';

    fs.readFile('./public' + chemin, (err, contenu) => {
        if (err) {
            res.writeHead(404, { 'Content-Type' : 'text/html; charset=utf-8'});
            res.end('<h1> Page Introuvable </h1>');
            return;
        }
        res.writeHead(200, {'Content-Type' : type});
        res.end(contenu)
    });
});


serveur.listen(8000);