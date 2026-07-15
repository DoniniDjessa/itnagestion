Agis en tant que développeur full-stack senior expert en React, Tailwind CSS et Supabase. Je veux que tu génères le code complet d'une application web (Webapp) pour un centre de santé. 

Ne me donne pas d'explications théoriques, écris directement le code propre, modulaire et entièrement fonctionnel en suivant rigoureusement les spécifications UI/UX et Backend ci-dessous.

---

### 1. GUIDELINES UI/UX & DIRECTION ARTISTIQUE
Inspire-toi d'un design moderne de type "Soft Clean Tech / Médical" (très épuré, calme et professionnel).

* **Palette de Couleurs (Tailwind) :**
    * Fond global de l'application : Gris ultra-léger et frais (`bg-slate-50` ou `#F8FAFC`).
    * Composants de cartes (Cards) : Blanc pur (`bg-white`), coins arrondis modérés (`rounded-xl` / 12px), bordures très fines (`border-slate-100`) et ombres subtiles (`shadow-sm`).
    * Couleur Primaire (Professionnelle/Médicale) : Bleu doux/Indigo (`slate-900` pour le texte fort, boutons en `bg-blue-600` avec effet hover).
    * Couleur d'Accentuation (Santé/Succès) : Vert d'eau / Turquoise (`emerald-500` ou `teal-500`) pour les statuts positifs et les actions secondaires clés.
* **Typographie :** Utilise une police sans-serif géométrique, moderne et très lisible pour les chiffres et les tableaux (ex: Inter, Plus Jakarta Sans ou Geist).
* **Icônes :** Utilise uniquement la bibliothèque "Lucide React" avec des tracés fins (stroke-width de 1.5px à 2px) pour un rendu premium.

---

### 2. ARCHITECTURE DE L'INTERFACE & SIDEBAR
L'application doit utiliser un layout global avec une barre latérale (Sidebar) fixe à gauche et une zone de contenu dynamique à droite.

* **La Sidebar (Gauche) :**
    * Largeur fixe (`w-64`), hauteur totale (`h-screen`), fond blanc, séparée du contenu par une bordure droite très fine (`border-r border-slate-100`).
    * En haut : Logo élégant et nom du centre de santé.
    * Navigation avec les 3 onglets dynamiques (gère l'état actif avec un fond bleu très clair `bg-blue-50` et du texte bleu `text-blue-600`) :
        1.  **Dashboard** (Icône : `LayoutDashboard`)
        2.  **Patients** (Icône : `Users`)
        3.  **Commandes** (Icône : `ShoppingBag` ou `FileText`)

---

### 3. CONTENU DES PAGES (FRONTEND & SATESTATES)

* **PAGE 1 : DASHBOARD (Tableau de bord)**
    * **KPI Cards (Statistiques) :** Affiche 3 jolies cartes d'indicateurs (Nombre total de patients, Commandes en cours, Chiffre d'affaires/Montant total du mois) avec des icônes associées et des micro-indicateurs de tendance verte.
    * **Graphique d'activité :** Intègre un composant visuel (utilise Recharts si disponible, sinon une simulation de graphique très propre en CSS/SVG) montrant l'évolution des visites de patients.
    * **Dernières activités :** Une liste verticale épurée (Timeline) montrant les derniers événements du centre (ex: "Nouveau patient inscrit", "Commande validée").

* **PAGE 2 : PATIENTS (Gestion de la patientèle)**
    * **Barre d'outils supérieure :** Un champ de recherche textuelle à gauche et un bouton "Ajouter un Patient" à droite (Couleur Teal/Vert d'eau).
    * **Tableau des Patients :** Un tableau soigné affichant :
        * Avatar circulaire avec les initiales du patient sur fond pastel.
        * Nom complet, Téléphone, Date de naissance, Genre.
        * Un badge de statut esthétique (ex: "Suivi actif").
        * Un bouton d'action discret pour "Voir le dossier".
    * **Interaction :** Le bouton "Ajouter un Patient" doit ouvrir un tiroir latéral (Slide-over) ou une boîte de dialogue (Modal) moderne contenant un formulaire pour créer un patient.

* **PAGE 3 : COMMANDES (Suivi du matériel et des prescriptions)**
    * **Filtres de Statuts :** Une barre d'onglets pour filtrer rapidement les commandes (Toutes, En attente, Livrées, Annulées).
    * **Tableau des Commandes :** Affichant :
        * ID/Référence de commande (ex: CMD-2026-001) mis en évidence.
        * Date de commande.
        * Patient lié.
        * Montant total en gras.
        * Badge de couleur pour le statut (`bg-yellow-50 text-yellow-700` pour En attente, `bg-emerald-50 text-emerald-700` pour Livré).
    * **Formulaire "Nouvelle Commande" :** Un bouton ouvrant un formulaire interactif pour saisir une commande avec sélection du patient, ajout dynamique de produits (nom, quantité, prix unitaire) et calcul automatique du montant total.

---

### 4. ARCHITECTURE BACKEND & SUPABASE
Écris les requêtes et l'intégration Supabase (JS/TS client) pour faire fonctionner l'interface de manière dynamique. Utilise cette structure de base de données :

* **Table `patients` :**
    * `id` (UUID, primary key, default: gen_random_uuid())
    * `created_at` (timestamptz, default: now())
    * `first_name` (text)
    * `last_name` (text)
    * `phone` (text)
    * `email` (text)
    * `birth_date` (date)
    * `gender` (text)
    * `medical_history` (text)
* **Table `commandes` :**
    * `id` (UUID, primary key, default: gen_random_uuid())
    * `created_at` (timestamptz, default: now())
    * `reference_id` (text, unique)
    * `patient_id` (UUID, foreign key vers `patients.id`)
    * `items` (JSONB - exemple de structure interne : `[{ "name": "Produit", "qty": 1, "price": 100 }]`)
    * `total_amount` (numeric)
    * `status` (text, default: 'En attente')

Génère maintenant le code complet en séparant proprement les composants (Sidebar, Layout, Dashboard, Patients, Commandes) et en y intégrant les appels Supabase (Fetch, Insert) pour rendre l'application 100% interactive.