# 🐝 Vespa Recorder v2.0

Application PWA de suivi et enregistrement des nids de frelons asiatiques (*Vespa velutina*).  
Remplace l'ancienne application AppSheet. Fonctionne sur Android et iOS sans installation de store.

**par Olivier BERNARD**

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Style | Tailwind CSS |
| Carte | Leaflet.js + OpenStreetMap (gratuit) |
| Backend / BDD | Supabase (PostgreSQL + Auth + Storage) |
| PWA | vite-plugin-pwa + Workbox |
| Déploiement | Vercel (recommandé) ou Netlify |
| Versioning | Git + GitHub |

---

## Fonctionnalités

- 🗺️ **Carte interactive** — visualisation de toutes les observations avec filtres espèce/statut
- ✍️ **Saisie intervention** — formulaire mobile-first identique à AppSheet, amélioré
- 📋 **Liste** — recherche texte + filtres, vue détail de chaque observation
- 📊 **Statistiques** — tableau de bord complet (taux de traitement, par espèce, emplacements, donneurs)
- 📸 **Photos** — prise de photo directement depuis l'appareil, stockage Supabase Storage
- 📍 **GPS natif** — capture automatique de la position ou saisie par adresse + géocodage OSM
- 👥 **Rôles** — Admin (tout voir/modifier) + Piégeur (ses propres saisies)
- 📱 **PWA installable** — "Ajouter à l'écran d'accueil" sur Android et iOS

---

## Installation et démarrage

### 1. Prérequis

- Node.js ≥ 18
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) (gratuit)

### 2. Cloner et installer

```bash
git clone https://github.com/VOTRE_USERNAME/vesparecorder.git
cd vesparecorder
npm install
```

### 3. Configurer Supabase

1. Créer un nouveau projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécuter dans l'ordre :
   - `supabase/schema.sql` — crée toutes les tables, RLS, fonctions
   - `supabase/import_n1.sql` — importe les 222 observations 2025

3. Copier vos clés API :
   - Dashboard → Settings → API → **Project URL** et **anon public key**

```bash
cp .env.example .env.local
# Éditer .env.local avec vos valeurs
```

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...votre_clé...
```

### 4. Lancer en développement

```bash
npm run dev
# → http://localhost:5173
```

### 5. Créer le premier compte admin

1. Lancer l'app, aller sur `/login`
2. Utiliser l'email `bertrandbernard10@gmail.com` — il sera automatiquement promu admin grâce au trigger SQL
3. (Ou aller dans Supabase → Authentication → Users → Invite user)

---

## Déploiement sur Vercel (recommandé)

### Option A — Via l'interface web (le plus simple)

1. Pousser le code sur GitHub :
```bash
git init
git add .
git commit -m "feat: initial vesparecorder v2"
git remote add origin https://github.com/VOTRE_USERNAME/vesparecorder.git
git push -u origin main
```

2. Sur [vercel.com](https://vercel.com) :
   - "Add New Project" → importer depuis GitHub
   - Framework preset : **Vite** (auto-détecté)
   - Ajouter les variables d'environnement :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Cliquer "Deploy"

3. Chaque `git push` redéploie automatiquement ✅

### Option B — Via CLI Vercel

```bash
npm i -g vercel
vercel
# Suivre les instructions, ajouter les env vars quand demandé
```

---

## Déploiement sur Netlify

```bash
npm run build
# Puis drag & drop du dossier /dist sur netlify.com
# Ou connecter le repo GitHub avec les mêmes variables d'env
```

---

## Installation sur mobile (PWA)

### Android (Chrome)
1. Ouvrir l'URL de l'app dans Chrome
2. Menu (⋮) → "Ajouter à l'écran d'accueil"
3. L'icône apparaît comme une vraie app

### iOS (Safari)
1. Ouvrir l'URL dans Safari (pas Chrome)
2. Bouton partage (□↑) → "Sur l'écran d'accueil"
3. L'icône apparaît, l'app s'ouvre en plein écran

---

## Structure du projet

```
vesparecorder/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Navigation bottom + header
│   │   └── UI.tsx              # Composants réutilisables
│   ├── hooks/
│   │   └── useAuth.tsx         # Contexte auth Supabase
│   ├── lib/
│   │   └── supabase.ts         # Client + toutes les requêtes
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── CartePage.tsx       # Carte Leaflet interactive
│   │   ├── ListePage.tsx       # Liste + recherche
│   │   ├── FormulaireIntervention.tsx  # Saisie / édition
│   │   ├── ObservationDetail.tsx
│   │   ├── StatsPage.tsx       # Dashboard statistiques
│   │   ├── ProfilPage.tsx
│   │   ├── AdminDonneurs.tsx
│   │   └── AdminUtilisateurs.tsx
│   ├── types/
│   │   └── index.ts            # Types TypeScript + constantes
│   ├── App.tsx                 # Router + protection routes
│   ├── main.tsx
│   └── index.css               # Tailwind + dark mode Leaflet
├── supabase/
│   ├── schema.sql              # BDD complète (tables, RLS, vues)
│   └── import_n1.sql           # Import 222 observations 2025
├── public/                     # Icônes PWA
├── .env.example
├── .gitignore
├── package.json
├── vite.config.ts              # Config Vite + PWA
├── tailwind.config.js
└── tsconfig.json
```

---

## Données importées (N-1 / 2025)

| Champ | Valeurs |
|-------|---------|
| Total observations | 222 |
| Avec GPS | ~100 |
| Avec adresse | ~122 |
| Espèces | Asiatique (217), Européen (5), Guêpes (1) |
| Retirés | 104 |
| Actifs | 118 |
| Emplacements | Arbre, Haie, Appenti, Toiture, Garage… |
| Donneurs d'ordre | 19 structures |

---

## Géocodage des adresses

Les observations sans coordonnées GPS sont géocodées automatiquement à la saisie via **Nominatim / OpenStreetMap** (gratuit, pas de clé API nécessaire). Les 121 observations historiques avec adresse seulement seront visibles dans la liste mais pas sur la carte jusqu'à re-géocodage.

Pour géocoder en masse les données historiques, un script optionnel peut être fourni sur demande.

---

## Licence

Usage privé — Vespa Recorder par Olivier BERNARD
