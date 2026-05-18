# Documentation technique du IU

## Description du fichier
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
