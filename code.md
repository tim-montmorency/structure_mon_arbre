# Documentation du code

Documentation des fonctions publiques et de l'architecture technique du système de visualisation et d'interaction avec des arbres 3D.

## Vue d'ensemble

Le système est composé de plusieurs modules responsables de:
- Charger et afficher des modèles d'arbres 3D
- Gérer l'interaction utilisateur (sélection et coupe de branches)
- Contrôler la caméra orbitale
- Créer l'environnement (ciel, sol, herbe, rochers, éclairage)
- Animer le vent et gérer l'interface utilisateur

## Données mémorisées

- **URL**: paramètres d'orbite (distance, hauteur, rotation)
- **Score global**: cumulé sur tous les niveaux (réinitialisé par `selectTree()`)
- **Historique des temps**: liste des temps par niveau complété
- **État UI**: niveau actif, état des panneaux

## Chronomètre et pointage

- Chrono démarre automatiquement à `resetExercise()`
- Format MM:SS affiché dans le panneau Chrono & Score
- Bonus x2 points si réponse avant 120 secondes
- Historique des temps enregistrés à chaque niveau complété
- Score total affiché en vert (positif) ou rouge (négatif)

---

## main.js

Point d'entrée principal de l'application. Initialise la scène Three.js, charge l'environnement et gère le cycle de vie des arbres.

### `loadTree(config)`

Charge un nouvel arbre dans la scène.

**Arguments:**
- `config`: objet de configuration contenant:
  - `model`: chemin vers le fichier .glb de l'arbre
  - `scale`: facteur d'échelle à appliquer au modèle
  - `id` et `label`: identifiant et nom du niveau

**Comportement:**
```javascript
loadTree({ 
  model: "./models/Tree8.glb", 
  scale: 0.7, 
  id: 8, 
  label: "Arbre 8" 
})
```

- Réinitialise l'interface utilisateur pour le nouvel arbre
- Nettoie les interactions de l'arbre précédent
- Charge le modèle GLTF du serveur
- Configure les ombres et les normales du modèle
- Centre la caméra sur l'arbre
- Charge l'environnement une seule fois (sol, herbe, rochers, silhouette)
- Crée une nouvelle instance `TreeInteraction` pour gérer les interactions

### Boucle d'animation

```javascript
renderer.setAnimationLoop(animate)
```

Exécutée chaque image:
- Met à jour les uniforms du vent pour l'animation de l'herbe
- Met à jour la position de la caméra via `OrbitController.update()`
- Rend la scène

---

## addPersonSilhouette.js

Ajoute une silhouette humaine à l'échelle pour la référence de taille.

### `addPersonSilhouette(scene)`

Crée une silhouette humaine stylisée composée de géométries primitives.

**Argument:**
- `scene`: la scène Three.js où ajouter la silhouette

**Retourne:**
- Un groupe Three.js contenant les mailles (corps, tête, bras, jambes)

**Détails:**
- La silhouette est positionnée à (3.0, 0, 0) sur la pastille
- Tous les éléments sont configurés pour:
  - Projeter des ombres (`castShadow = true`)
  - Être ignorés par le raycasting (pour éviter les clics accidentels sur la silhouette)

---

## grass.js

Crée un système de gazon animé par le vent utilisant la géométrie instanciée et des shaders personnalisés.

### `class Grass`

Gère le rendu performant de milliers de brins d'herbe.

#### `constructor(wind, opts = {})`

Crée un groupe de brins d'herbe avec animation procédurale du vent et zones de terre nue.

**Arguments:**
- `wind`: instance de classe `Wind` pour accéder aux uniforms de temps
- `opts`: options de configuration (tous optionnels):
  - `count`: nombre de brins (défaut: 80000)
  - `radius`: rayon de la pastille (défaut: 4.0)
  - `bladeHeight`: hauteur des brins (défaut: 0.15)
  - `bladeHeightVariation`: variation de hauteur (défaut: 0.08)
  - `bladeWidth`: largeur des brins (défaut: 0.04)
  - `noiseScale`: échelle du bruit procédural (défaut: 0.67)
  - `patchiness`: couverture d'herbe vs zones nues (défaut: 0.92, où 1 = tout herbe)

**Fonctionnalités:**
```javascript
const grass = new Grass(wind, { count: 50000, radius: 4.0 })
scene.add(grass.mesh)
```

- Utilise la géométrie instanciée pour des performances optimales
- Applique des shaders personnalisés pour:
  - L'animation du vent basée sur le bruit de Perlin
  - La courbure naturelle des brins
  - La translucence (lumière traversant)
  - L'occlusion ambiante
  - La réaction aux ombres dynamiques
- Génère des zones de terre nue réalistes via du bruit procédural
- Chaque brin a une variation aléatoire de hauteur, largeur et orientation

#### `activate(scene)`

Ajoute l'herbe à la scène ou la rend visible.

**Argument:**
- `scene`: la scène Three.js

#### `deactivate()`

Rend l'herbe invisible sans la retirer de la scène.

---

## ground.js

Crée la pastille de sol avec texture et normales.

### `createGround()`

Crée une géométrie cylindrique texturée pour le sol.

**Arguments:** aucun

**Retourne:**
- Un maille Three.js (`Mesh`) représentant le sol

**Caractéristiques:**
```javascript
const ground = createGround()
scene.add(ground)
```

- Géométrie: cylindre avec rayon 4.0 et hauteur 0.1
- Textures: carte de couleur et normale de terre chargées depuis `./textures/dirt_*.jpg`
- Les textures sont répétées 3 fois pour plus de détail
- Reçoit les ombres (`receiveShadow = true`)
- Ignoré par le raycasting des interactions

---

## lighting.js

Configure l'éclairage de la scène.

### `createLighting(scene)`

Ajoute un système d'éclairage avec une lumière ambiante douce et un soleil directionnel.

**Argument:**
- `scene`: la scène Three.js

**Retourne:**
- Un objet contenant `sunLight` (la lumière solaire pour les references)

**Configuration d'éclairage:**
```javascript
const { sunLight } = createLighting(scene)
```

- **Lumière ambiante**: HemisphereLight avec ciel bleu et sol marron, intensité 0.7
- **Soleil** (lumière directionnelle):
  - Position: (4, 5, 3)
  - Intensité: 5.0
  - Résolution des ombres: 2048x2048
  - Produit des ombres douces via `PCFSoftShadowMap`
  - Bias ajusté pour éviter les artefacts d'ombre

---

## sky.js

Crée un ciel animé avec dégradé, nuages et soleil.

### `createSky(scene)`

Génère un dôme de ciel avec shader personnalisé.

**Argument:**
- `scene`: la scène Three.js

**Retourne:**
- Le matériau du ciel (`ShaderMaterial`) pour accéder aux uniforms

**Caractéristiques:**
```javascript
const skyMaterial = createSky(scene)
// Les uniforms peuvent être modifiés en temps réel
skyMaterial.uniforms.uTime.value += delta
```

- **Géométrie**: sphère de rayon 500 avec verso rendu (BackSide)
- **Shader**: implémente:
  - Dégradé ciel / horizon / sol
  - Calcul du soleil avec halo
  - Rendu procédural des nuages via bruit Simplex
  - Animation temporelle des nuages
- **Uniforms** (modifiables en temps réel):
  - `uTime`: temps d'animation
  - `uCloudCoverage`: pourcentage de couverture nuageuse (0-100)
  - `uCloudDensity`: densité des nuages (0-100)
  - `uCloudScale`: échelle visuelle des nuages
  - `uSunDirection`, `uSkyColor`, `uHorizonColor`, `uGroundColor`

---

## rocks.js

Crée des rochers dispersés sur la pastille.

### `createRocks(opts = {})`

Génère un groupe de rochers géométriquement instanciés.

**Argument:**
- `opts`: options (tous optionnels):
  - `minScale`: facteur d'échelle minimal (défaut: 0.06)
  - `maxScale`: facteur d'échelle maximal (défaut: 0.15)

**Retourne:**
- Un groupe Three.js contenant les rochers instanciés

**Détails:**
```javascript
const rocks = createRocks({ minScale: 0.05, maxScale: 0.2 })
scene.add(rocks)
```

- **Géométrie**: icosaèdre (20 faces) légèrement déformé pour chaque rocher
- **Matériau**: `MeshStandardMaterial` avec rugosité élevée (0.9)
- **Placement**: 8 rochers dispersés aléatoirement sur la pastille
- **Rotation et échelle**: aléatoires pour chaque rocher
- Produits et reçoivent les ombres
- Ignorés par le raycasting

---

## wind.js

Gère les uniforms d'animation du vent pour les shaders.

### `class Wind`

Container simple pour les uniforms de vent utilisés par les shaders du gazon et des arbres.

#### `constructor()`

Initialise les uniforms du vent.

```javascript
const wind = new Wind()
```

- Crée un uniform `iTime` initialisé à 0
- Peut être accédé via `wind.uniforms` pour être passé aux matériaux shader

#### `update(delta)`

Met à jour le temps d'animation du vent.

**Argument:**
- `delta`: temps écoulé depuis la dernière image en secondes

**Fonctionnement:**
```javascript
const clock = new THREE.Clock()
function animate() {
  wind.update(clock.getDelta())
  // ...
}
```

- Ajoute `delta` à `wind.uniforms.iTime.value`
- Utilisé pour animer les brins d'herbe et autres éléments dynamiques

---

## OrbitController.js

Gère une caméra orbitale avec contrôle lisse et zones de déplacement confinées.

### `class OrbitController`

Positionne la caméra autour d'une cible avec deux zones: cylindrique (bas) et sphérique (haut).

#### `constructor(camera, options = {})`

Initialise le contrôleur d'orbite.

**Arguments:**
- `camera`: caméra Three.js à contrôler
- `options`: configuration (tous optionnels):
  - `distance`: rayon horizontal (défaut: 10)
  - `height`: hauteur normalisée 0-1 (défaut: π/4)
  - `rotation`: rotation horizontale en radians (défaut: 0)
  - `target`: point de visée (défaut: (0, 1.5, 0))
  - `maxHeight`: hauteur maximale (défaut: 5.5)
  - `offset`: décalage à appliquer à la caméra (défaut: (0, 0.2, 0))

**Comportement:**
```javascript
const orbitController = new OrbitController(camera, {
  distance: 8,
  height: 0.5,
  rotation: Math.PI,
  target: new THREE.Vector3(0, 2, 0)
})
```

- La caméra suit une trajectoire hybride:
  - **Zone basse (height < 0.8)**: cylindre vertical autour de la cible
  - **Zone haute (height >= 0.8)**: interpolation douce vers une hémisphère écrasée
- La caméra regarde toujours vers un point intermédiaire (pas directement la cible)

#### `centerOn(object)`

Positionne la cible d'orbite au centre d'un objet 3D.

**Argument:**
- `object`: objet Three.js à centrer

```javascript
orbitController.centerOn(tree)
orbitController.update()
```

- Calcule une boîte englobante (bounding box) de l'objet
- Déplace la cible à son centre

#### `update()`

Calcule et applique la position de la caméra en fonction des paramètres actuels.

```javascript
function animate() {
  orbitController.update()
  renderer.render(scene, camera)
}
```

- Appelé chaque image pour maintenir la caméra synchronisée
- Calcule la position en coordonnées sphériques/cylindriques selon la hauteur
- Applique les offsets et fait regarder la caméra vers le point de visée

---

## TreeInteraction.js

Gère l'interaction utilisateur avec l'arbre: sélection, survol et validation de la coupe.

### `class TreeInteraction`

Système de raycasting et sélection de branches avec validation du résultat.

#### `constructor(scene, camera, tree)`

Initialise le système d'interaction sur un arbre.

**Arguments:**
- `scene`: scène Three.js contenant l'arbre
- `camera`: caméra pour le raycasting
- `tree`: groupe/objet racine de l'arbre

```javascript
const treeInteraction = new TreeInteraction(scene, camera, tree)
```

**Initialisation:**
- Configure les écouteurs de survol (`mousemove`) et clic (`click`)
- Crée un outline jaune autour de chaque maille pour la sélection
- Identifie et enregistre toutes les branches défectueuses (userData.isBad === true)
- Compte le total des mailles de l'arbre (excluant les outlines)

#### `destroy()`

Nettoie les écouteurs d'événements.

```javascript
treeInteraction.destroy()
// Puis créer une nouvelle instance pour un autre arbre
```

- Supprime les écouteurs `mousemove` et `click`
- Appelé avant de charger un nouvel arbre

#### Propriétés publiques

**`selectedMeshes`**: `Set` de mailles actuellement sélectionnées

**`cutBranches`**: tableau des branches coupées avec références parent pour rétablissement

**`onSelectionChange`**: callback appelé avec le nombre de mailles sélectionnées

```javascript
treeInteraction.onSelectionChange = (count) => {
  console.log(`${count} branche(s) sélectionnée(s)`)
}
```

#### Interaction utilisateur

**Survol:**
- Affiche la branche survolée en **cyan** et ses enfants en **rose**
- Curseur devient `pointer`
- Curseur devient `not-allowed` si la branche est indestructible

**Clic:**
- Sélectionne/désélectionne la branche cliquée et ses enfants
- Maille sélectionnée devient **rouge**, enfants **rose clair**
- Surbrillance verte foncé si survolée pendant la sélection

#### `cutSelected()`

Supprime toutes les mailles sélectionnées de l'arbre.

```javascript
treeInteraction.cutSelected()
```

- Détache les mailles sélectionnées de leurs parents
- Enregistre les coupures pour `restoreAll()`
- Vide la sélection
- Appelle `onSelectionChange(0)`

#### `restoreAll()`

Rétablit toutes les branches coupées.

```javascript
treeInteraction.restoreAll()
```

- Réattache les branches coupées à leurs parents d'origine
- Restaure la sélection
- Réinitialise les compteurs d'erreur

#### `validate()`

Évalue la performance de l'utilisateur en identifiant les branches mal traitées.

**Retourne:**
```javascript
{
  cut: [
    { name, tag, isBad, caughtByMixedParent },
    ...
  ],
  missed: [
    { name, tag },
    ...
  ],
  wrongCuts: [
    { name },
    ...
  ],
  wrongCutCount: number,
  wrongBranchDisplayCount: number,
  overCut: boolean
}
```

- **cut**: branches défectueuses identifiées (coupées ou sélectionnées)
- **missed**: branches défectueuses non identifiées et toujours présentes
- **wrongCuts**: branches saines cliquées par erreur (parents mixtes)
- **overCut**: true si plus de 30% de l'arbre a été retiré
- **caughtByMixedParent**: true si la branche est sous un nœud cliqué qui contient aussi des branches saines

---

## Ui.js

Le fichier contient la classe Ui, responsable de la gestion complète de l’interface utilisateur de l’application de Structure mon arbre.

Cette classe:
- crée les panneaux visuels
- gère les boutons et les glissières
- affiche le score et le chronomètre
- permet la sélection des niveaux
- met à jour les paramètres de caméra
- affiche les rétroactions après validation

## Point d'entrée
#### `constructor(orbitController, domElement, trees = [])`
Initialise l’interface utilisateur et crée tous les panneaux interactifs de l’application.
```javascript
constructor(orbitController, domElement, trees = []){...}
```


**Paramètres:**
- `orbitController`: contrôleur utilisé pour manipuler la caméra orbitale
- `domElement`: élément HTML utilisé pour détecter les interactions souris
- `trees`: tableau contenant les configurations des arbres/niveaux

Le constructeur créer :
- initialise les variables
- crée les glissières
- crée les boutons
- crée le panneau de score et de temps
- crée le sélecteur de niveaux
- active les contrôles de souris et de zoom

## Fonction publique
#### `updateSlider(key, value)`
Met à jour la valeur d’une glissière et applique immédiatement la modification à la caméra.
```javascript
updateSlider("height", 0.75){...}
```
**Arguments:**
- `key`: nom de la propriété à modifier (`"rotation"`, `"height"`,`"distance"`)
- `value`: nouvelle valeur

#### `updateURL()`
Met à jour les paramètres de caméra dans l’URL de la page.
```javascript
updateURL(){...}
```
#### `setValidateEnabled(enabled)`
Active ou désactive le bouton de validation.

```javascript
 setValidateEnabled(enabled) {...}
```

**Argument:**
- `enabled`: détermine si le bouton est active ou non

#### `setCutEnabled(enabled)`
Active ou désactive le bouton de validation.

```javascript
 setCutEnabled(enabled) {...}
```

**Argument:**
- `enabled`: détermine si le bouton est active ou non
#### `setResstoreEnabled(enabled)`
Active ou désactive le bouton de validation.

```javascript
 setRestoreEnabled(enabled) {...}
```

**Argument:**
- `enabled`: détermine si le bouton est active ou non

#### `showFeedback(results)`
Affiche le panneau de rétroaction après la validation d’un exercice.
```javascript
  showFeedback({ cut, missed, wrongCuts, wrongCutCount, wrongBranchDisplayCount, overCut }) {...}
```
Cette fonction:
- calcule le score
- applique les pénalités
- affiche les bonnes et mauvaises réponses
- met à jour le bouton de validation
**Argument:**
  - `cut`: branches correctement identifiées
  - `missed`: branches manquées
  - `wrongCuts`: branches incorrectement sélectionnées
  - `wrongCutCount`: nombre de mauvaises sélections
  - `wrongBranchDisplayCount`: nombre affiché dans le panneau
  - `overCut`: indique si plus de 30% de l’arbre a été coupé
 
  #### `resetExercise()`
  Réinitialise l’exercice courant pour un nouveau niveau.
  ```javascript
  resetExercise() {...}
  ```

Appelé par main.js -> loadTree() à chaque chargement d'arbre.
Remet à zéro tout ce qui est propre au niveau en cours :
- état du bouton Valider
- panneau de rétroaction
- chrono (repart de 0)
- Sets de suivi des branches scorées / pénalisées
  Ne touche PAS au score total ni à l'historique des temps : ces données survivent d'un niveau à l'autre et ne sont effacées que par selectTree().

#### `hideFeedback()`
Cache le panneau de rétroaction.
```javascript
   hideFeedback() {...}
  ```
#### `selectTree(index)`
Permet de sélectionner un niveau manuellement.
```javascript
   selectTree(index) {...}
  ```
**Argument:**
  - `index`: index du niveau à sélectionner

#### `addTree(treeConfig)`
Ajoute un nouvel arbre dans le sélecteur de niveaux.
```javascript
   addTree(treeConfig) {...}
  ```
**Argument:**
  - `treeConfig`: configuration du nouvel arbre
