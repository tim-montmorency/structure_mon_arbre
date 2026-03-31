# Recherche - Elie

**Objectif**: Créer un outil web interactif permettant aux étudiants de pratiquer la taille d’arbres jeunes/moyens en identifiant 5 à 7 défauts par arbre (sanitaires, structurels, branches basses, angles aigus, etc...)

## Contexte et Contraintes du Projet

- Arbres **jeunes/moyens** seulement (peu de branches, pas de feuilles requises)
- **5 à 7 défauts clairs** par arbre (malades, brisées, interférentes, angles aigus, espacement axiale/radiale mauvais, branches basses temporaires, verticales, etc...)
- Interaction : cliquer sur une branche + feedback immédiat (bonne/mauvaise coupe + explication pédagogique)
- Vue 3D libre (orbite 360°)
- Scénarios/exercices multiples si possible.
- Interface web sur `tim-montmorency.com/incubateur`
- Doit être le **moins lourd possible** (optimisation prioritaire)

###  Solutions Web

#### Three.js 

- ~500 KB–2 MB taille du bundle
- Excellente facilité d'interaction (clic dans notre cas)

- **Génération d’arbres**:
  - [EZ-Tree](https://github.com/dgreenheck/ez-tree) /  [Démo](https://www.eztree.dev/)
  - ["Creating realistic 3D trees with Three.js"](https://tympanus.net/codrops/2025/01/27/fractals-to-forests-creating-realistic-3d-trees-with-three-js/)
  - plusieurs paramètres (niveaux de branches, angles axiaux/radiaux, espacement, gnarliness, etc...)
  - Alternative: [FloraSynth](https://www.florasynth.com/)

- **Mécaniques obligatoires à implémenter**:
  - **Scene + Camera + Renderer** (WebGLRenderer ou WebGPURenderer si possible)
  - **Branch hierarchy**: Chaque branche doit être un `Mesh` séparé contenant le type de défaut (sanitary, structure, etc...) si il y'en a
  - **Raycasting**: `raycaster.intersectObjects()` sur clic/touch -> détecter exactement quelle branche est touchée
  - **Animation de coupe** : scale -> 0 + fade + particules simples (ou slice shader) -> suppression du mesh
  - **Feedback pédagogique** : couleur (vert/rouge) + panneau HTML ou tooltip avec explication + score
  - **OrbitControls** (ou TrackballControls) pour vue 360°
  - **UI**: HTML/CSS overlay (ou React Three Fiber + @react-three/drei si on veut React)
  - **Données des arbres**: Si on fait plusieurs arbres on peut utiliser une base de donnée JSON (arbre + liste des bonnes et mauvaise coupes)
  - **Performance**: InstancedMesh pour branches identiques, low-poly, pas de feuilles

####  Moteurs de Jeu avec Export Web

- **Unity + WebGL**:
  - Plugin: Procedural Tree Builder (Asset Store), [OpenFracture](https://github.com/dgreenheck/OpenFracture)

- **Godot + HTML5 export**:
  - Plugin: [gdTree3D](https://github.com/JekSun97/gdTree3D)

#### Outils de Modélisation 3D + Export vers Web

- **Blender**:
  - [Easy Tree](https://extensions.blender.org/add-ons/easy-tree/)
  - Générer arbres procéduraux et exporter en .glb -> charger dans Three.js / EZTree ?
  - [The Grove 3D](https://www.thegrove3d.com/) (Payant)

- **Maya**: Option de générer des arbres par brush (Content browser) mais pas trop bon. Blender serait meilleur


## Solution principale retenue à date: Three.js + EZ-Tree 

- Parfaitement adapté au web
- EZ-Tree donne exactement le contrôle procédural dont on a besoin (jeunes arbres, 5-7 défauts faciles à taguer).
- Interaction clic/coupe ultra-simple avec "raycasting"
- Support WebGPU
- Bundle léger et optimisation facile

**Options rejetées**:
- Unity WebGL: trop lourd comparé à Three.js
- Maya/Blender: pas interactif en temps réel sans l'utilisation de Three.js derrière

### Exemple de site web qui utilise Three.js pour la 3D
