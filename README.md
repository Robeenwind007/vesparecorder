# 🐝 Vespa Recorder v2.1

Application PWA de suivi et enregistrement des nids de frelons asiatiques (*Vespa velutina*).

**© Olivier BERNARD 2026** — [vesparecorder.vercel.app](https://vesparecorder.vercel.app)

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Style | Tailwind CSS |
| Carte | Leaflet.js + OpenStreetMap |
| Backend | Supabase (PostgreSQL + Storage) |
| PWA | vite-plugin-pwa + Workbox |
| Déploiement | Vercel (CI/CD automatique) |
| Versioning | Git + GitHub |

---

## Fonctionnalités v2.1

- 🗺️ **Carte** — marqueurs colorés par espèce, filtres, légende
- ✍️ **Saisie** — GPS automatique au Save, formulaire mobile-first
- 📋 **Liste** — filtres par année/espèce/statut/recherche
- 📄 **Export** — rapport PDF et Excel avec filtres (période, donneur, espèce, statut)
- 📊 **Stats** — taux de traitement, espèces, emplacements, donneurs
- 📸 **Photos** — prise de photo directe, stockage Supabase
- 👥 **Multi-utilisateurs** — email mémorisé, sans mot de passe
- 👁️ **Impersonation** — admin peut voir l'app comme un piégeur
- 🏢 **Donneurs** — liste globale + personnelle par utilisateur
- 📱 **PWA** — installable Android et iOS

---

## Installation

### 1. Cloner et installer
```bash
git clone https://github.com/Robeenwind007/vesparecorder.git
cd vesparecorder
npm install
```

### 2. Configurer Supabase
```bash
cp .env.example .env.local
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

SQL Editor Supabase → exécuter dans l'ordre :
1. `supabase/schema.sql`
2. `supabase/import_n1.sql`

### 3. Développement
```bash
npm run dev
```

### 4. Déploiement Vercel
```bash
git push origin main  # Redéploiement automatique
```

Variables Vercel : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

### 5. Versioning
```bash
./bump-version.sh  # Incrémente la version patch
git add . && git commit -m "..." && git push
```

---

## Géocodage en masse
```bash
node geocode.mjs  # Géocode les adresses sans coordonnées GPS
```

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| Piégeur | Ses observations + export PDF/Excel |
| Admin | Tout + impersonation + rapport global |

---

## Structure
```
src/
├── components/   Layout, UI
├── hooks/        useUser (auth localStorage + impersonation)
├── lib/          supabase.ts (client + requêtes)
├── pages/        Carte, Liste, Formulaire, Stats, Profil, Admin, Rapport
└── types/        TypeScript

supabase/
├── schema.sql    Tables, RLS, vues
└── import_n1.sql Données 2025
```

---

## Licence
Usage privé — © Olivier BERNARD 2026
