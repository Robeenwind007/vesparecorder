# Changelog — Vespa Recorder

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

---

## [2.0.0] — Avril 2026

### Nouveautés majeures
- **Réécriture complète** depuis AppSheet vers React PWA
- **Identification sans mot de passe** — email mémorisé dans localStorage
- **Carte interactive** Leaflet.js + OpenStreetMap avec marqueurs colorés par espèce
- **PWA installable** sur Android et iOS avec icône personnalisée
- **Supabase** comme backend (PostgreSQL + Storage + RLS)
- **Déploiement Vercel** avec CI/CD automatique sur push GitHub

### Fonctionnalités
- Saisie intervention mobile-first avec GPS automatique au Save
- Filtre par année dans la liste, détecté dynamiquement depuis les données
- Donneurs d'ordre rattachés à l'utilisateur avec ajout inline dans le formulaire
- Page statistiques complète (taux de traitement, espèces, emplacements, donneurs)
- Page admin : gestion utilisateurs et donneurs d'ordre
- Géocodage automatique des adresses via Nominatim OSM
- Script de géocodage en masse des données historiques
- Import des 222 observations 2025 depuis l'ancienne application

### Corrections
- Boutons sélectionnés : fond orange plein (au lieu du simple contour)
- "Actif" renommé en "Non retiré" / "Laissés" dans toute l'interface
- Conservation de l'auteur original lors d'une modification par l'admin
- Service Worker fusionné (suppression du double bloc workbox)
- Splash screen affiché avant le router pour contourner le cache PWA

---

## [1.0.0] — 2025

- Application AppSheet initiale par Olivier BERNARD
- Saisie des interventions frelons asiatiques
- 222 observations enregistrées sur la saison 2025
