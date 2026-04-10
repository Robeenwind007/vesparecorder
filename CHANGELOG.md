# Changelog — Vespa Recorder

---

## [2.1.0] — Avril 2026

### Nouvelles fonctionnalités
- **Export rapport PDF et Excel** depuis l'onglet Observations (bouton 📄 Rapport)
  - Filtres : période (date début / date fin), donneur d'ordre, espèce, statut, recherche texte
  - PDF A4 paysage avec en-tête, tableau coloré et récapitulatif
  - Excel avec deux onglets : Interventions + Récapitulatif
  - Indicateur "· filtres actifs" quand des filtres sont appliqués
- **Rapport admin** (Profil → Générer un rapport PDF) avec sélection du piégeur
- **Impersonation admin** — voir l'app comme un piégeur sans saisir son email
  - Bouton 👁 "Voir comme lui" dans Gestion des utilisateurs
  - Bannière orange + bouton "← Revenir admin"
- **Filtres par année** dans la liste, détectés automatiquement depuis les données
- **Donneurs d'ordre personnels** — chaque piégeur peut ajouter ses propres donneurs (★)
- **GPS automatique au Save** — capture si non renseigné avant la sauvegarde
- **Splash screen** avec version et copyright au lancement
- **Icône PWA** personnalisée (V amber sur fond sombre)

### Améliorations
- Boutons sélectionnés : fond orange plein (cohérence avec le bouton Save)
- "Actif" renommé en "Non retiré" / "Laissés" dans toute l'interface
- Conservation de l'auteur original lors d'une modification par l'admin
- Date début export : 01/01/2025 par défaut (toute la saison)
- Filtre donneur d'ordre dans le panneau export

### Corrections
- Service Worker fusionné (suppression du double bloc workbox)
- Cache PWA : skipWaiting + clientsClaim pour mises à jour immédiates
- TypeScript : types corrigés (Profile → Utilisateur, vite/client)

---

## [2.0.0] — Avril 2026

### Nouveautés majeures
- Réécriture complète depuis AppSheet vers React PWA
- Identification sans mot de passe — email mémorisé dans localStorage
- Carte interactive Leaflet.js + OpenStreetMap
- PWA installable Android et iOS
- Supabase comme backend (PostgreSQL + Storage + RLS anon)
- Déploiement Vercel avec CI/CD automatique
- Import des 222 observations 2025 depuis l'ancienne application

---

## [1.0.0] — 2025

- Application AppSheet initiale par Olivier BERNARD
- Saisie des interventions frelons asiatiques
- 222 observations enregistrées sur la saison 2025
