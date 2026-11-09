# Connect

> Application Web de messagerie et de géolocalisation entre membres, réalisée dans le cadre du **Projet Libre** du cours **8WEB101 – Conception et programmation de sites Web**.

Connect permet à des utilisateurs de créer un compte, de voir qui est en ligne, d'échanger des messages privés **en temps réel** et de retrouver leurs contacts sur une **carte interactive**, tout en gardant le contrôle sur ce qu'ils partagent (position, statut en ligne).

🔗 **Site publié :** https://spagetos.github.io/8WEB101/public/connect

---

## Sommaire

- [Équipe](#équipe)
- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Pourquoi Supabase ?](#pourquoi-supabase-)
- [Structure du projet](#structure-du-projet)
- [Installation et lancement](#installation-et-lancement)
- [Base de données et sécurité](#base-de-données-et-sécurité)
- [Fonctionnement du temps réel](#fonctionnement-du-temps-réel)
- [Tests](#tests)
- [Limites et améliorations possibles](#limites-et-améliorations-possibles)

---

## Équipe

| Membre |
|--------|
| **Olivier BOUHOURS** |
| **Matteo GIUFFRE** |

---

## Fonctionnalités

| Page | Fichier | Ce qu'on peut y faire |
|------|---------|------------------------|
| **Connexion / Inscription** | `login.html` | Créer un compte (prénom, nom, courriel, mot de passe) ou se connecter. Les erreurs Supabase sont traduites en français. |
| **Accueil** | `index.html` | Tableau de bord : statistiques, 5 conversations les plus récentes, 4 derniers membres inscrits, nombre de contacts en ligne, actions rapides. |
| **Messages** | `messages.html` | Liste des conversations avec recherche, messages privés en temps réel, séparateurs par jour, accusés de lecture, compteur de non-lus. |
| **Map** | `map.html` | Carte OpenStreetMap avec la position des membres qui la partagent, distance par rapport à soi, recherche, sélection d'un contact, mises à jour en direct. |
| **Contacts** | `contacts.html` | Annuaire des membres, filtres *Tous / En ligne / Hors ligne*, copie d'un lien d'invitation. |
| **Settings** | `settings.html` | Modifier son profil (nom, rôle, couleur d'avatar) avec aperçu, notifications du navigateur, confidentialité (partage de position, statut en ligne), changement de mot de passe, déconnexion. |

Fonctionnalités communes à toutes les pages connectées (`js/app.js`) :

- redirection automatique vers `login.html` si l'utilisateur n'est pas connecté ;
- barre latérale générée dynamiquement avec le profil de l'utilisateur ;
- badge de messages non lus mis à jour en direct ;
- notifications du navigateur à la réception d'un message (si autorisées) ;
- statut « en ligne » partagé grâce à Supabase Realtime Presence.

---

## Technologies utilisées

| Technologie | Utilisation | Lien |
|-------------|-------------|------|
| **HTML5 / CSS3 / JavaScript (modules ES)** | Interface et logique côté client, sans framework ni étape de compilation | — |
| **Supabase** *(technologie explorée)* | Authentification, base de données PostgreSQL, sécurité par lignes (RLS), temps réel | <https://supabase.com> |
| **supabase-js v2** | Client JavaScript de Supabase, chargé depuis jsDelivr | <https://supabase.com/docs/reference/javascript> |
| **Leaflet 1.9.4** | Affichage de la carte interactive | <https://leafletjs.com> |
| **OpenStreetMap** | Tuiles (fond de carte) | <https://www.openstreetmap.org> |
| **API Web du navigateur** | Geolocation, Notifications, Clipboard, localStorage | <https://developer.mozilla.org> |

---

## Pourquoi Supabase ?

Supabase est la technologie Web principale explorée dans ce projet. C'est une plateforme « backend as a service » open source construite autour de **PostgreSQL**. Elle nous a permis d'avoir un vrai backend (comptes, base de données, temps réel) sans écrire ni héberger de serveur.

Ce que nous avons exploité :

1. **Supabase Auth** : inscription et connexion par courriel/mot de passe, session conservée dans le navigateur, changement de mot de passe.
2. **Base PostgreSQL** : tables `profiles` et `messages`, contraintes, index, fonctions et *triggers* en PL/pgSQL.
3. **Row Level Security (RLS)** : la sécurité est appliquée **dans la base de données**, pas seulement dans l'interface. La clé publique peut donc se trouver dans le code client sans danger.
4. **Realtime – Postgres Changes** : les nouveaux messages et les déplacements sur la carte arrivent sans recharger la page.
5. **Realtime – Presence** : savoir qui est en ligne à l'instant présent.

### Comparaison avec des alternatives

| Critère | **Supabase** | Firebase | Backend maison (Node.js + Express + Socket.io) |
|---------|--------------|----------|-----------------------------------------------|
| Type de base | SQL (PostgreSQL), relationnel | NoSQL (Firestore) | Au choix |
| Relations (profil ↔ messages) | Clés étrangères natives | À gérer manuellement | Au choix |
| Sécurité | Politiques RLS en SQL | Règles de sécurité Firebase | À coder soi-même |
| Temps réel | Inclus (Changes + Presence) | Inclus | Socket.io à intégrer |
| Open source / auto-hébergeable | Oui | Non | Oui |
| Serveur à héberger | Non | Non | Oui |
| Quantité de code backend | Faible (un fichier SQL) | Faible | Élevée |

Nous avons choisi Supabase parce qu'il offre un modèle relationnel adapté à une messagerie, une sécurité exprimée en SQL qu'on peut lire et vérifier, ainsi que le temps réel inclus, le tout avec une offre gratuite suffisante pour le projet.

---

## Structure du projet

```
connect/
├── index.html          # Accueil / tableau de bord
├── login.html          # Connexion et inscription
├── messages.html       # Messagerie privée en temps réel
├── map.html            # Carte des membres (Leaflet)
├── contacts.html       # Annuaire des membres
├── settings.html       # Profil, notifications, confidentialité, sécurité
├── style.css           # Feuille de style unique pour tout le site
├── js/
│   ├── config.js       # URL et clé publique du projet Supabase
│   ├── supabase.js     # Création du client Supabase partagé
│   └── app.js          # Code commun : session, barre latérale, présence,
│                       # notifications, utilitaires (dates, distances, avatars…)
└── supabase/
    └── schema.sql      # Tables, triggers, politiques RLS et temps réel
```

Chaque page HTML contient son propre script (`<script type="module">`) qui importe les fonctions communes depuis `js/app.js`.

---

## Installation et lancement

### 1. Prérequis

- Un compte gratuit sur [supabase.com](https://supabase.com)
- Un navigateur récent
- Un petit serveur local (les modules JavaScript ne fonctionnent pas en ouvrant les fichiers directement avec `file://`)

### 2. Créer la base de données

1. Créer un nouveau projet sur Supabase.
2. Ouvrir **SQL Editor**, coller le contenu de [`supabase/schema.sql`](supabase/schema.sql) puis cliquer sur **Run**.
   > ⚠️ Exécuter ce script **avant** de créer le premier compte, sinon le profil ne sera pas créé automatiquement.
3. *(Optionnel, pratique pour les tests)* Dans **Authentication → Sign In / Providers → Email**, désactiver **Confirm email** pour pouvoir se connecter sans valider le courriel.

### 3. Configurer le site

Dans **Project Settings → API**, copier le *Project URL* et la clé publique (*anon* / *publishable*), puis les coller dans [`js/config.js`](js/config.js) :

```js
export const SUPABASE_URL = "https://VOTRE_PROJET.supabase.co";
export const SUPABASE_ANON_KEY = "VOTRE_CLE_PUBLIQUE";
```

> Ne jamais mettre la clé `service_role` dans ce fichier : elle contourne toutes les règles de sécurité.

Si la configuration est absente, le site affiche un message d'erreur qui explique quoi faire.

### 4. Lancer le site

Depuis le dossier du projet, avec l'une de ces options :

```bash
# Python
python -m http.server 8000

# ou Node.js
npx serve .
```

ou avec l'extension **Live Server** de VS Code. Ouvrir ensuite <http://localhost:8000/login.html>.

> La géolocalisation et les notifications exigent un contexte sécurisé : `localhost` ou un site en **HTTPS**.

---

## Base de données et sécurité

### Tables

**`profiles`** : un profil par utilisateur, relié à `auth.users`
`id`, `email`, `first_name`, `last_name`, `role`, `color`, `latitude`, `longitude`, `location_updated_at`, `share_location`, `show_online`, `last_seen`, `created_at`

**`messages`** : messages privés entre deux utilisateurs
`id`, `sender_id`, `receiver_id`, `content` (1 à 2000 caractères), `read_at`, `created_at`

### Automatisations (triggers)

- **`handle_new_user`** : à l'inscription, crée automatiquement le profil avec le prénom, le nom et une couleur d'avatar au hasard.
- **`clear_hidden_location`** : si l'utilisateur désactive le partage de position, ses coordonnées sont **effacées de la base**, pas seulement masquées dans l'interface.

### Règles de sécurité (RLS)

| Table | Action | Règle |
|-------|--------|-------|
| `profiles` | Lire | Tout utilisateur connecté (annuaire et carte) |
| `profiles` | Modifier | Seulement son propre profil, et seulement certaines colonnes (impossible de changer son `id` ou son `email`) |
| `messages` | Lire | Seulement les messages qu'on a envoyés ou reçus |
| `messages` | Envoyer | Seulement en son propre nom, et pas à soi-même |
| `messages` | Modifier | Seulement le destinataire, et seulement la date de lecture (`read_at`) |

Côté client, tout texte affiché est protégé par la fonction `esc()` (`js/app.js`) pour éviter l'injection de HTML (XSS).

---

## Fonctionnement du temps réel

```
 Utilisateur A                    Supabase                    Utilisateur B
 ─────────────                    ────────                    ─────────────
 envoie un message ──INSERT──▶  table messages
                                       │  (publication supabase_realtime)
                                       └──── événement INSERT ───▶ badge + message affiché
                                                                   + notification navigateur

 met à jour sa position ─UPDATE─▶ table profiles ── événement ───▶ le marqueur bouge sur la carte

 ouvre le site ── track() ──▶  canal « online-users » ── sync ───▶ point vert « en ligne »
```

- **Postgres Changes** : `js/app.js` écoute les `INSERT` sur `messages` filtrés sur `receiver_id`, puis émet un événement `connect:message` que chaque page peut utiliser. `map.html` écoute les changements de `profiles`.
- **Presence** : chaque utilisateur rejoint le canal `online-users` avec son id comme clé. S'il désactive « statut en ligne » dans les paramètres, il appelle `untrack()` et disparaît de la liste.

---

## Tests

Le site a été testé sur ordinateur et sur téléphone. Scénario conseillé pour la démonstration :

1. Créer deux comptes (deux navigateurs, ou une fenêtre de navigation privée).
2. Envoyer un message de A vers B : il apparaît instantanément chez B, le badge augmente, puis le message passe à « lu ».
3. Autoriser la géolocalisation sur les deux comptes : les marqueurs et les distances apparaissent sur la carte.
4. Désactiver le partage de position chez A : son marqueur disparaît chez B.
5. Désactiver le statut en ligne chez A : il apparaît hors ligne chez B.

---

## Limites et améliorations possibles

- Pas encore de conversations de groupe ni d'envoi d'images.
- Les préférences de notifications sont enregistrées dans le navigateur (`localStorage`) et ne suivent donc pas l'utilisateur sur un autre appareil.
- Le chargement des conversations est limité aux 1000 derniers messages.
- Idées : messages de groupe, pièces jointes avec Supabase Storage, indicateur « est en train d'écrire… », mode sombre, application installable (PWA).

---

## Licence

Projet réalisé à des fins pédagogiques dans le cadre du cours 8WEB101.
