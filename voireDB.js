const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('messagerie.db');

const requete = db.prepare('SELECT * FROM user');
const utilisateurs = requete.all();

console.log(utilisateurs);