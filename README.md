# Recherche - Elie

**Objectif**: Créer un outil web interactif permettant aux étudiants de pratiquer la taille d’arbres jeunes/moyens en identifiant 5 à 7 défauts par arbre (sanitaires, structurels, branches basses, angles aigus, etc...)

## Contexte et Contraintes du Projet

- Arbres **jeunes/moyens** seulement (peu de branches, pas de feuilles requises)
- **5 à 7 défauts clairs** par arbre (malades, brisées, interférentes, angles aigus, espacement axiale/radiale mauvais, branches basses temporaires, verticales, etc...)
- Interaction : cliquer sur une branche + feedback (bonne/mauvaise coupe qui montre la branche en vert ou rouge + explication pédagogique optionnel)
- Vue 3D libre (orbite 360°)
- Scénarios/exercices multiples si possible.
- Interface web
- Doit être le **moins lourd possible** (optimisation prioritaire)


### Three.js 

- ~500 KB–2 MB taille du bundle
- Excellente facilité d'interaction (clic dans notre cas)

- **Génération d’arbres**:
  - [EZ-Tree](https://github.com/dgreenheck/ez-tree) /  [Démo](https://www.eztree.dev/)
  - ["Creating realistic 3D trees with Three.js"](https://tympanus.net/codrops/2025/01/27/fractals-to-forests-creating-realistic-3d-trees-with-three-js/)
  - plusieurs paramètres (niveaux de branches, angles axiaux/radiaux, espacement, gnarliness, etc...)
  - Alternative: [FloraSynth](https://www.florasynth.com/)

- **Mécaniques à implémenter**:
  - **Scene + Camera + Renderer** (WebGLRenderer ou WebGPURenderer si possible)
  - **Branch hierarchy**: Chaque branche doit être un `Mesh` séparé contenant le type de défaut (sanitary, structure, etc...) si il y'en a
  - [Raycasting](https://threejs.org/docs/#api/en/core/Raycaster): `raycaster.intersectObjects()` sur clic/touch -> détecter exactement quelle branche est touchée
  - **Feedback pédagogique** : couleur (vert/rouge) + panneau HTML ou tooltip avec explication + score si on veut rendre l'experience comme un jeu pour capter l'attention des étudiants
  - **OrbitControls** (ou TrackballControls) pour vue 360°
  - **Données des arbres**: Si on fait plusieurs arbres on peut utiliser une base de donnée JSON (arbre + liste des bonnes et mauvaise coupes)
  - **Performance**: InstancedMesh pour branches identiques, low-poly, pas de feuilles

#### Raycasting dans Three.js

- Hover sur les branches + clic pour sélectionner
- Three.js vérifie quels objets (meshes) ce rayon touche dans la scène
- On récupère l’objet le plus proche (la branche touchée)

- Permet le **hover**: quand la souris passe sur une branche, on peut la surligner (exemple: bordure jaune ou changement de couleur temporaire)
- Permet le **clic**: quand l’étudiant clique, on identifie exactement quelle branche (ou segment de branche) a été touchée
- Supporte la hiérarchie: une grosse branche peut être composée de plusieurs meshes (tronçon 1, 2, 3). On peut couper un segment à la fois ou toute la branche d’un coup

- Démo officielle de sélection d’objets par Dan Greenheck (auteur d’EZ-Tree) :  
  https://dgreenheck.github.io/threejs-object-selection/  
  https://github.com/dgreenheck/threejs-object-selection (repo) 
- Tutoriel par Dan Greenheck :  
  https://www.youtube.com/watch?v=QATefHrO4kg
- Exemples de tracking avec le hover:  
  https://threejs.org/examples/#webgl_interactive_cubes    
  https://threejs.org/docs/#api/en/core/Raycaster    
  https://threejs.org/examples/#webgl_interactive_lines    


###  Moteurs de Jeu avec Export Web

- **Unity + WebGL**:
  - Plugin: Procedural Tree Builder (Asset Store), [OpenFracture](https://github.com/dgreenheck/OpenFracture)

- **Godot + HTML5 export**:
  - Plugin: [gdTree3D](https://github.com/JekSun97/gdTree3D)

### Outils de Modélisation 3D + Export vers Web

- **Blender**:
  - [Easy Tree](https://extensions.blender.org/add-ons/easy-tree/)
  - Générer arbres procéduraux et exporter en .glb -> charger dans Three.js / EZTree ?
  - [The Grove 3D](https://www.thegrove3d.com/) (Payant)

- **Maya**: Option de générer des arbres par brush (Content browser) mais pas trop bon. Blender serait meilleur

## Solution principale retenue à date: Three.js + EZ-Tree 

- Parfaitement adapté au web
- EZ-Tree donne le contrôle procédural dont on a besoin (jeunes arbres, 5-7 défauts faciles à taguer).
- Interaction clic/coupe ultra-simple avec "raycasting"
- Support WebGPU
- Bundle léger et optimisation facile

**Options rejetées**:
- Unity WebGL: trop lourd comparé à Three.js
- Maya/Blender: pas interactif en temps réel sans l'utilisation de Three.js derrière

### Exemple de site web qui utilise Three.js pour la 3D

- **[EZ-Tree](https://www.eztree.dev/)** 
  Comme mentionner, c'est un générateur potentiel que nous pouvons utiliser    
  On peut ajouter raycasting + tagging de défauts par-dessus

- **[Three.js Raycasting Object Selection](https://dgreenheck.github.io/threejs-object-selection/)** (par l’auteur d’EZ-Tree)  
  hover + clic sur objets hiérarchiques (branches)  
  Exactement la mécanique hover -> sélection -> feedback couleur que nous voulons

- **[Interactive cutting of pieces off a mesh (three-bvh-csg)](https://discourse.threejs.org/t/demo-interactive-cutting-of-pieces-off-a-mesh-three-bvh-csg-rapier3d/45404)**    
  Démo Three.js: tu “coupes” un mesh en temps réel avec une brosse, le mesh se met à jour  
  Preuve que le “clic pour couper/supprimer une partie” fonctionne en WebGL sans animation lourde

- **[FloraSynth – Procedural Tree Generator](https://www.florasynth.com/)**  
  appuie sur espace pour générer des arbres différents, vue 3D libre
  Preuve que la génération + interaction 3D d’arbres jeunes fonctionne parfaitement dans un navigateur

- **[AJM Tree Generator](https://andrewmarsh.com/software/tree3d-web/)**  
  Web app qui génère des arbres procéduraux 3D en direct (abstraits ou réalistes), vue 360°    


## Autre projets

- **[3D2cut – Digital Vine Pruning Training](https://www.3d2cut.com/)**  
  Plateforme web avec simulations interactives de coupe sur vignes 3D

- **[Go Bonsai – Interactive 3D Tree Simulator](https://frankforce.com/games/go-bonsai/)**  
  Version application

