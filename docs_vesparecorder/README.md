# 🐝 Vespa Recorder v2.0

Application PWA de suivi et enregistrement des nids de frelons asiatiques (*Vespa velutina*).  
Remplace l'ancienne application AppSheet. Fonctionne sur Android et iOS sans installation de store.

**© Olivier BERNARD 2026**  
**URL de production** : [vesparecorder.vercel.app](https://vesparecorder.vercel.app)

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Style | Tailwind CSS |
| Carte | Leaflet.js + OpenStreetMap (gratuit) |
| Backend / BDD | Supabase (PostgreSQL + Storage) |
| PWA | vite-plugin-pwa + Workbox |
| Déploiement | Vercel (CI/CD automatique) |
| Versioning | Git + GitHub |

---

## Fonctionnalités

- 🗺️ **Carte interactive** — marqueurs colorés par espèce, filtres, infobulle, légende
- ✍️ **Saisie intervention** — formulaire mobile-first, GPS automatique au Save
- 📋 **Liste** — recherche texte, filtres par année/espèce/statut, toggle admin
- 📊 **Statistiques** — taux de traitement, par espèce, emplacements, donneurs
- 📸 **Photos** — prise de photo directe, stockage Supabase Storage
- 📍 **GPS natif** — capture auto ou adresse + géocodage OSM
- 👥 **Multi-utilisateurs** — email mémorisé, sans mot de passe
- 🔐 **Rôles** — Admin (tout) + Piégeur (ses propres données)
- 📱 **PWA installable** — Android et iOS, icône sur l'écran d'accueil
- 🏢 **Donneurs d'ordre** — liste globale + personnelle par utilisateur

---

## Installation et démarrage

### Prérequis
- Node.js ≥ 18
- Compte [Supabase](https://supabase.com) (gratuit)
- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [GitHub](https://github.com)

### 1. Cloner et installer

```bash
git clone https://github.com/Robeenwind007/vesparecorder.git
cd vesparecorder
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) — région **Europe West**
2. SQL Editor → exécuter `supabase/schema.sql`
3. SQL Editor → exécuter `supabase/import_n1.sql` (données historiques 2025)
4. Settings → API → copier **Project URL** et **anon public key**

```bash
cp .env.example .env.local
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

### 3. Lancer en développement

```bash
npm run dev
# → http://localhost:5173
```

### 4. Déployer sur Vercel

```bash
git push origin main
# Vercel redéploie automatiquement à chaque push
```

Variables d'environnement à configurer dans Vercel :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Géocodage en masse

Pour géocoder les observations historiques sans coordonnées GPS :

```bash
node geocode.mjs
```

Le script traite toutes les observations avec adresse mais sans lat/lng, via Nominatim (1 req/sec).

---

## Structure du projet

```
vesparecorder/
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # Navigation + header
│   │   └── UI.tsx                  # Composants réutilisables
│   ├── hooks/
│   │   └── useUser.tsx             # Auth légère localStorage
│   ├── lib/
│   │   └── supabase.ts             # Client + requêtes BDD
│   ├── pages/
│   │   ├── SplashPage.tsx          # Écran de démarrage
│   │   ├── IdentificationPage.tsx  # Saisie email (1ère fois)
│   │   ├── CartePage.tsx           # Carte Leaflet
│   │   ├── ListePage.tsx           # Liste + filtres
│   │   ├── FormulaireIntervention.tsx
│   │   ├── ObservationDetail.tsx
│   │   ├── StatsPage.tsx
│   │   ├── ProfilPage.tsx
│   │   ├── AdminDonneurs.tsx
│   │   └── AdminUtilisateurs.tsx
│   ├── types/index.ts              # Types TypeScript
│   ├── App.tsx                     # Router + splash logique
│   └── index.css                   # Tailwind + dark Leaflet
├── supabase/
│   ├── schema.sql                  # BDD complète (tables, RLS, vues)
│   └── import_n1.sql               # Import données 2025
├── public/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── geocode.mjs                     # Script géocodage en masse
├── .env.example
├── vite.config.ts
└── README.md
```

---

## Installation sur mobile

### Android (Chrome)
1. Ouvrir Chrome → `vesparecorder.vercel.app`
2. Menu ⋮ → **Ajouter à l'écran d'accueil**

### iOS (Safari)
1. Ouvrir Safari (pas Chrome) → `vesparecorder.vercel.app`
2. Bouton partage □↑ → **Sur l'écran d'accueil**

---

## Identification sans mot de passe

L'email est saisi une seule fois et mémorisé dans `localStorage`. Les lancements suivants sont directs. Le rôle (admin/piégeur) est résolu en BDD à chaque démarrage pour rester à jour.

| Rôle | Accès |
|------|-------|
| Piégeur | Ses propres observations uniquement |
| Admin | Toutes les observations + administration |

---

## Licence

Usage privé — © Olivier BERNARD 2026
