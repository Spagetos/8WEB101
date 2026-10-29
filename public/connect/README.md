# Connect — messagerie + carte avec Supabase

Site en HTML / CSS / JavaScript « pur » (aucun framework, aucune installation npm).
Supabase gère :

- **les comptes** (inscription, connexion, mot de passe, déconnexion)
- **la base de données** (profils, messages, positions GPS)
- **le temps réel** (messages reçus instantanément, positions qui bougent sur la carte, qui est en ligne)

La carte utilise **Leaflet + OpenStreetMap** (gratuit, pas de clé à créer).

---

## 1. Créer le projet Supabase

1. Va sur <https://supabase.com>, crée un compte puis **New project**.
2. Attends que le projet soit prêt (1-2 min).

## 2. Créer la base de données

1. Dans le menu de gauche : **SQL Editor** → **New query**.
2. Copie-colle **tout** le fichier `supabase/schema.sql`.
3. Clique **Run**. Tu dois voir « Success ».

Ça crée les tables `profiles` et `messages`, la sécurité (RLS) et active le temps réel.

## 3. Régler l'authentification (pour tester facilement)

**Authentication → Sign In / Providers → Email** :

- Pendant le développement, désactive **Confirm email** : tu pourras créer des comptes de test
  (même avec de fausses adresses) et être connecté directement.
- Si tu le laisses activé, chaque inscription envoie un e-mail de confirmation.

**Authentication → URL Configuration** : mets dans **Site URL** l'adresse où tu lances le site
(ex. `http://127.0.0.1:5500`).

## 4. Brancher le site sur ton projet

Dans Supabase : **Project Settings → API** (ou **API Keys**). Copie :

- **Project URL**
- la clé publique **anon** (ou **publishable**)

Colle-les dans `js/config.js`.

> ⚠️ N'utilise jamais la clé `service_role` / `secret` dans le site : elle donne tous les droits.
> La clé anon/publishable est faite pour être publique, c'est la sécurité RLS qui protège les données.

## 5. Lancer le site

Les pages utilisent des modules JavaScript (`type="module"`), donc **double-cliquer sur le fichier
HTML ne marchera pas** : il faut un petit serveur local.

- **VS Code** : installe l'extension *Live Server* → clic droit sur `login.html` → *Open with Live Server*.
- ou dans un terminal, dans le dossier : `npx serve .` ou `python -m http.server 5500`

Puis ouvre `http://127.0.0.1:5500/login.html`.

## 6. Tester

1. Crée un compte.
2. Ouvre une **fenêtre de navigation privée** (ou un autre navigateur) et crée un deuxième compte.
3. Écris d'un compte à l'autre : le message arrive en direct, le badge se met à jour.
4. Ouvre la carte sur les deux : accepte la géolocalisation, chacun voit l'autre.

---

## Structure des fichiers

```
connect/
├── login.html          Connexion / inscription
├── index.html          Accueil (stats, conversations récentes, nouveaux membres)
├── messages.html       Messagerie en temps réel
├── contacts.html       Annuaire des membres (en ligne / hors ligne)
├── map.html            Carte Leaflet avec la position des membres
├── settings.html       Profil, notifications, confidentialité, mot de passe
├── style.css           Ton design d'origine + les ajouts
├── js/
│   ├── config.js       ← URL + clé Supabase à remplir
│   ├── supabase.js     Création du client Supabase
│   └── app.js          Code commun : vérif. connexion, sidebar, présence, badge, utilitaires
└── supabase/
    └── schema.sql      Tables + sécurité + temps réel (à exécuter dans Supabase)
```

## Comment ça marche (pour ton rapport / ta soutenance)

| Fonction | Côté Supabase | Côté code |
|---|---|---|
| Inscription / connexion | Supabase Auth (`auth.users`) | `supabase.auth.signUp()` / `signInWithPassword()` dans `login.html` |
| Profil créé automatiquement | Trigger `handle_new_user` | — |
| Protection des pages | — | `initApp()` dans `js/app.js` redirige vers `login.html` sans session |
| Envoyer un message | Table `messages` | `supabase.from("messages").insert(...)` |
| Recevoir en direct | Realtime *Postgres Changes* | `supabase.channel(...).on("postgres_changes", ...)` |
| Qui est en ligne | Realtime *Presence* (rien en base) | `channel.track()` dans `js/app.js` |
| Géolocalisation | Colonnes `latitude` / `longitude` | `navigator.geolocation` + `update()` dans `map.html` |
| Sécurité | Row Level Security | Chaque utilisateur ne lit que **ses** messages et ne modifie que **son** profil |

**Sécurité garantie par la base (pas par le JavaScript)** — testée :

- on ne voit que les messages qu'on a envoyés ou reçus ;
- on ne peut pas envoyer un message au nom de quelqu'un d'autre ;
- un message ne peut pas être modifié (seule la date de lecture, par le destinataire) ;
- on ne peut modifier que son propre profil, et jamais son e-mail ou son id ;
- si « Partager ma position » est désactivé, la position est **effacée** de la base.

## Limites / pistes d'amélioration

- **Contacts = tous les membres inscrits.** Pour un vrai système d'amis, ajouter une table
  `contacts (user_id, contact_id, status)` avec demandes d'ajout.
- Les préférences de **notifications** sont stockées dans le navigateur (localStorage) et ne
  fonctionnent que lorsqu'un onglet Connect est ouvert (de vraies notifications push nécessitent
  un *service worker*).
- Pas de **photo de profil** : on peut l'ajouter avec Supabase Storage (bucket `avatars`).
- La position est mise à jour à l'ouverture de la carte et via le bouton « Ma position »
  (on pourrait utiliser `watchPosition` pour un suivi continu).
- La géolocalisation du navigateur ne marche qu'en **https** ou sur **localhost / 127.0.0.1**.

## Mise en ligne

Le site étant statique, tu peux le publier gratuitement sur **Netlify**, **Vercel** ou
**GitHub Pages** (glisser-déposer le dossier). Pense à ajouter l'adresse finale dans
Supabase → Authentication → URL Configuration.
