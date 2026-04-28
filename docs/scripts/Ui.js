export class Ui {
  constructor(orbitController, domElement, trees = []) {
    this.orbitController = orbitController;
    this.domElement = domElement;
    this.sliderRefs = {};
    this._urlTimeout = null;

    this.baseRight = 20;
    this.sliderHeight = 110;
    this.gap = 10;

    // --- Définition des glissières (min/max = gauche/droite du curseur) ---
    this.sliderDefs = [
      { key: "rotation", min: -Math.PI, max: Math.PI, label: "Rotation caméra:" },
      { key: "height", min: 0.15, max: 1, label: "Hauteur caméra:" },
      { key: "distance", min: 5, max: 1, label: "Distance caméra:" },
    ];

    this.buttonCount = 2; // Reset + Couper
    const totalHeight = this.sliderDefs.length * (this.sliderHeight + this.gap) + this.buttonCount * (50 + this.gap);
    this.baseTop = Math.round((window.innerHeight - totalHeight) / 2);

    this._activeTreeIndex = 0;
    this._treeButtons = [];
    this.onTreeSelect = null;

    // --- Chronomètre et score ---
    this._levelStartTime = null; // horodatage de départ du niveau courant
    this._currentLevelElapsed = 0; // secondes écoulées au moment où le chrono est figé
    this._timerInterval = null; // identifiant du setInterval du chrono courant (null = chrono arrêté)

    // ─────────────────────────────────────────────────────────────────────────
    // Score global
    // ─────────────────────────────────────────────────────────────────────────
    // _totalScore    : score cumulé sur tous les niveaux joués.
    //                  Peut devenir négatif. Ne se remet à zéro que si l'utilisateur
    //                  clique manuellement sur un bouton de niveau (1 / 2 / 3...).
    //                  Passer au niveau suivant via "Prochain Exercice" le conserve.
    //
    // _levelTimers   : tableau des temps enregistrés à la fin de chaque niveau terminé.
    //                  Format : [{ levelIndex: number, elapsed: number (secondes) }, ...]
    //                  Affiché dans l'historique du panneau Chrono & Score.
    // ─────────────────────────────────────────────────────────────────────────
    this._totalScore = 0;
    this._levelTimers = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Système de points — formule appliquée à chaque validation :
    //
    // CAS 1 — surcoupe (> 30 % de l'arbre retiré) :
    //   Aucun point positif accordé.
    //   Pénalité forfaitaire OVERCUT_PENALTY appliquée UNE SEULE FOIS par tentative
    //   (pas par re-validation sans Recommencer). Réinitialisée sur Recommencer.
    //
    // CAS 2 — pas de surcoupe :
    //   scoreDelta = (nouvellesBonnesBranches × BASE × multiplicateur)
    //              - (nouveauxParentsMixtes × WRONG_PENALTY)
    //
    // --- bonnesBranches ---
    //   Branches défectueuses identifiées par un clic précis (clic direct OU parent
    //   dont TOUS les enfants sont défectueux). Ne compte pas les branches capturées
    //   par un parent mixte (voir ci-dessous).
    //   Chaque branche ne rapporte des points QU'UNE SEULE FOIS par niveau.
    //   Suivi via _scoredBranchNames (Set de noms).
    //
    // --- multiplicateur ---
    //   x2 si le temps écoulé < FAST_THRESHOLD_SEC, x1 sinon.
    //
    // --- parent mixte ---
    //   Un noeud cliqué est «mixte» s'il contient à la fois des branches défectueuses
    //   ET des branches saines. Dans ce cas :
    //     - Pas de points positifs pour les branches défectueuses qu'il couvre
    //       (le flag caughtByMixedParent vient de validate() dans TreeInteraction).
    //     - Le noeud lui-même compte comme UNE mauvaise coupe (-25 pts, une fois).
    //     - Les branches couvertes sont neutralisées ce tour via _nullifiedBranchNames
    //       (réinitialisé sur Recommencer pour permettre les clics individuels).
    //   Si l'utilisateur re-valide sans Recommencer, aucun changement de score.
    //   Après Recommencer, cliquer les branches individuellement fonctionne normalement.
    //
    // --- pénalité de surcoupe ---
    //   Forfaitaire, appliquée une seule fois par tentative (pas par re-validation).
    //   Réinitialisée sur Recommencer via _overcutApplied.
    // ─────────────────────────────────────────────────────────────────────────
    this._FAST_THRESHOLD_SEC = 120; // délai en secondes pour bénéficier du multiplicateur bonus
    this._FAST_MULTIPLIER = 2; // valeur du multiplicateur bonus (x2)
    this._BASE_POINTS = 50; // points par bonne branche identifiée précisément
    this._WRONG_PENALTY = 25; // points retirés par parent mixte cliqué (une fois par noeud)
    this._OVERCUT_PENALTY = 150; // pénalité forfaitaire si > 30 % de l'arbre est retiré

    // Sets et flags de suivi pour éviter le double-comptage
    this._scoredBranchNames = new Set(); // branches défectueuses déjà récompensées ce niveau
    this._penalizedWrongBranches = new Set(); // parents mixtes déjà pénalisés ce niveau
    this._nullifiedBranchNames = new Set(); // branches neutralisées par un parent mixte ce tour (reset sur Recommencer)
    this._overcutApplied = false; // pénalité de surcoupe déjà appliquée ce tour (reset sur Recommencer)

    this._createSliders();
    this._createButtons();
    this._createFeedbackPanel();
    this._createTreeSelector(trees);
    this._createTimerScorePanel();
    this._setupMouseControls();
    this._setupScrollControls();
  }

  // --- Mettre à jour la valeur d'une glissière (source unique de vérité) ---
  updateSlider(key, value) {
    const slider = this.sliderRefs[key];
    if (!slider) return;
    const def = this.sliderDefs.find((d) => d.key === key);
    const lo = Math.min(def.min, def.max);
    const hi = Math.max(def.min, def.max);
    const clamped = Math.max(lo, Math.min(hi, value));
    slider.value = def.min > def.max ? hi + lo - clamped : clamped;
    slider.dispatchEvent(new Event("input"));
  }

  // --- Mettre à jour l'URL avec les paramètres d'orbite (avec délai pour éviter le throttling) ---
  updateURL() {
    if (this._urlTimeout) clearTimeout(this._urlTimeout);
    this._urlTimeout = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("distance", this.orbitController.distance.toFixed(2));
      params.set("height", this.orbitController.height.toFixed(2));
      params.set("rotation", this.orbitController.rotation.toFixed(2));
      window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
    }, 100);
  }

  // --- Glissières (panneau regroupé à droite) ---
  _createSliders() {
    // Colonne de droite contenant sliders + boutons
    this.rightColumn = document.createElement("div");
    this.rightColumn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Panneau des sliders
    const sliderPanel = document.createElement("div");
    sliderPanel.style.cssText = `
      background: rgba(15, 15, 15, 1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 16px 18px;
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 260px;
      box-sizing: border-box;
    `;

    // Titre du panneau
    const panelTitle = document.createElement("div");
    panelTitle.textContent = "Structure mon arbre";
    panelTitle.style.cssText = `
      color: #ffffff;
      font-weight: 500;
      font-size: 34px;
      font-family: 'Lush Garden';
      margin-bottom: 12px;
      padding-bottom: 5px;
      text-align: center;
      border-bottom: 4px solid rgba(255, 255, 255, 0.15);
    `;
    sliderPanel.appendChild(panelTitle);

    const labelStyle = `
      display: block;
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 8px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      text-align: left;
      width: 100%;
    `;
    const inputStyle = `
      height: 5px;
      accent-color:  rgba(95, 102, 89, 1);
      cursor: pointer;
      display: block;
      width: 75%;
      box-sizing: border-box;
    `;

    // Toggle Gazon (en haut du panneau)
    this.grassEnabled = true;
    const grassRow = document.createElement("div");
    grassRow.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 16px;
      width: 100%;
    `;
    const grassLabel = document.createElement("span");
    grassLabel.textContent = "Gazon :";
    grassLabel.style.cssText = `
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Plus Jakarta Sans';
      margin-bottom: 6px;
    `;
    const grassTrack = document.createElement("div");
    grassTrack.style.cssText = `
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: rgba(95, 102, 89, 1);
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    `;
    const grassThumb = document.createElement("div");
    grassThumb.style.cssText = `
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #948c8cff;
      position: absolute;
      top: 3px;
      left: 23px;
      transition: left 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    `;
    grassTrack.appendChild(grassThumb);
    grassTrack.addEventListener("click", () => {
      this.grassEnabled = !this.grassEnabled;
      if (this.grassEnabled) {
        grassTrack.style.background = "rgba(95, 102, 89, 1)";
        grassThumb.style.left = "23px";
      } else {
        grassTrack.style.background = "rgba(255, 249, 249, 1)";
        grassThumb.style.left = "3px";
      }
      if (this.onToggleGrass) this.onToggleGrass(this.grassEnabled);
    });
    const grassTrackWrapper = document.createElement("div");
    grassTrackWrapper.style.cssText = `
      width: 75%;
      margin-left: auto;
      margin-right: auto;
    `;
    grassTrackWrapper.appendChild(grassTrack);

    grassRow.appendChild(grassLabel);
    grassRow.appendChild(grassTrackWrapper);
    sliderPanel.appendChild(grassRow);

    this.sliderDefs.forEach((sliderDef) => {
      const lo = Math.min(sliderDef.min, sliderDef.max);
      const hi = Math.max(sliderDef.min, sliderDef.max);
      const inverted = sliderDef.min > sliderDef.max;

      const container = document.createElement("div");
      container.style.cssText = "margin-bottom: 16px; width: 100%;";
      const label = document.createElement("label");
      label.textContent = sliderDef.label;
      label.style.cssText = labelStyle;

      const sliderInput = document.createElement("input");
      sliderInput.type = "range";
      sliderInput.min = lo;
      sliderInput.max = hi;
      sliderInput.step = sliderDef.key === "distance" ? 0.1 : 0.01;
      sliderInput.value = inverted ? hi + lo - this.orbitController[sliderDef.key] : this.orbitController[sliderDef.key];
      sliderInput.style.cssText = inputStyle + "margin-left: auto; margin-right: auto;";

      sliderInput.addEventListener("input", (e) => {
        const raw = parseFloat(e.target.value);
        this.orbitController[sliderDef.key] = inverted ? hi + lo - raw : raw;
        this.updateURL();
      });

      this.sliderRefs[sliderDef.key] = sliderInput;

      container.appendChild(label);
      container.appendChild(sliderInput);
      sliderPanel.appendChild(container);
    });

    // Bouton Reset Caméra sous les sliders
    this.sliderButtonBar = document.createElement("div");
    this.sliderButtonBar.style.cssText = `
      display: flex;
      justify-content: center;
      margin-top: 8px;
    `;
    sliderPanel.appendChild(this.sliderButtonBar);

    this.rightColumn.appendChild(sliderPanel);
    document.body.appendChild(this.rightColumn);
  }

  // --- Boutons ---
  _createButtons() {
    // Bouton Reset Caméra dans le panneau des sliders
    this._createButton("Reset Caméra", this.sliderButtonBar, () => {
      this.updateSlider("rotation", 0);
      this.updateSlider("height", Math.PI / 2);
      this.updateSlider("distance", 3);
    });

    // Panneau des boutons d'action (sous les sliders)
    const buttonPanel = document.createElement("div");
    buttonPanel.style.cssText = `
      background: rgba(15, 15, 15, 1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 260px;
      align-items: stretch;
      box-sizing: border-box;
      backdrop-filter: blur(10px);
    `;

    // Couper + Rétablir côte à côte
    const actionRow = document.createElement("div");
    actionRow.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    this.cutButton = this._createButton(
      "Couper",
      actionRow,
      () => {
        if (this.onCutBranch) this.onCutBranch();
      },
      { bg: "rgba(180, 40, 40, 0.85)", border: "rgba(255, 80, 80, 0.5)", hover: "rgba(220, 60, 60, 0.9)", icon: "./icons/scissors.png", iconPos: "top" },
    );
    this.cutButton.style.padding = "6px 8px";
    this.cutButton.style.fontSize = "15px";
    this._setButtonEnabled(this.cutButton, false);

    this.restoreButton = this._createButton(
      "Rétablir",
      actionRow,
      () => {
        if (this.onRestoreBranches) this.onRestoreBranches();
      },
      { bg: "rgba(30, 80, 180, 0.85)", border: "rgba(80, 130, 255, 0.5)", hover: "rgba(50, 110, 220, 0.9)", icon: "./icons/restore.png", iconPos: "top" },
    );
    this.restoreButton.style.padding = "0px 2px";
    this.restoreButton.style.fontSize = "15px";
    this._setButtonEnabled(this.restoreButton, false);

    buttonPanel.appendChild(actionRow);

    // Ligne de séparation
    const separator = document.createElement("div");
    separator.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.15);
      margin: 2px 0;
    `;
    buttonPanel.appendChild(separator);

    // Valider -> Recommencer / Prochain Exercice (un seul bouton)
    this._validated = false;
    this._allFound = false;
    this.validateButton = this._createButton(
      "Valider",
      buttonPanel,
      () => {
        if (!this._validated) {
          if (this.onValidate) this.onValidate();
          this._validated = true;
          this._setButtonEnabled(this.cutButton, false);
          this._setButtonEnabled(this.restoreButton, false);
          // Le texte du bouton est mis à jour dans showFeedback()
        } else {
          this._validated = false;
          this._allFound = false;
          this.hideFeedback();
          this._setButtonEnabled(this.restoreButton, false);
          this.validateButton.querySelector("span").textContent = "Valider";
          const validateImg1 = this.validateButton.querySelector("img");
          if (validateImg1) validateImg1.src = "./icons/check.png";
          if (this._wasAllFound) {
            // Niveau terminé -> sauvegarder le temps puis passer au suivant
            this._levelTimers.push({ levelIndex: this._activeTreeIndex, elapsed: this._currentLevelElapsed });
            this._updateTimerScorePanel();
            if (this.onNextExercise) this.onNextExercise();
          } else {
            // Recommencer -> réinitialiser uniquement les branches neutralisées par un parent mixte
            // pour permettre les clics individuels sur le prochain essai.
            // _overcutApplied N'est PAS remis à zéro : la pénalité de surcoupe ne s'applique
            // qu'une seule fois par exercice (pas par tentative).
            this._nullifiedBranchNames = new Set();
            this._resumeLevelTimer();
            this._updateTimerScorePanel();
            if (this.onRestart) this.onRestart();
          }
          this._wasAllFound = false;
        }
      },
      { bg: "rgba(85, 99, 45, 1)", border: "rgba(150, 174, 80, 1)", hover: "rgba(150, 174, 80, 1)", icon: "./icons/check.png", iconPos: "left" },
    );
    // Désactivé par défaut : il faut sélectionner ou couper une branche pour valider
    this._setButtonEnabled(this.validateButton, false);

    this.rightColumn.appendChild(buttonPanel);
  }

  _setButtonEnabled(btn, enabled) {
    if (enabled) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    } else {
      btn.disabled = true;
      btn.style.opacity = "0.4";
      btn.style.pointerEvents = "none";
    }
  }

  setValidateEnabled(enabled) {
    if (this._validated) return; // ne pas toucher au bouton après une validation
    this._setButtonEnabled(this.validateButton, enabled);
  }

  setCutEnabled(enabled) {
    if (this._validated) return;
    this._setButtonEnabled(this.cutButton, enabled);
  }

  setRestoreEnabled(enabled) {
    if (this._validated) return;
    this._setButtonEnabled(this.restoreButton, enabled);
  }

  _createButton(text, parent, onClick, color = null) {
    const btn = document.createElement("button");
    const bg = color ? color.bg : "rgba(15, 15, 15, 0.9)";
    const border = color ? color.border : "rgba(255, 255, 255, 0.15)";
    const hoverBg = color ? color.hover : "rgba(255, 255, 255, 0.1)";
    const icon = color ? color.icon : null;
    const iconPos = color ? color.iconPos : null;

    btn.style.cssText = `
      padding: 12px 16px;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: background 0.2s ease, border-color 0.2s ease;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-direction: ${iconPos === "top" ? "column" : "row"};
    `;

    if (icon) {
      const img = document.createElement("img");
      img.src = icon;
      img.style.cssText = `
        width: 30px;
        height: 30px;
        object-fit: contain;
        pointer-events: none;
      `;
      btn.appendChild(img);
    }

    const span = document.createElement("span");
    span.textContent = text;
    btn.appendChild(span);

    btn.addEventListener("mouseenter", () => {
      btn.style.background = hoverBg;
      btn.style.borderColor = border;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = bg;
      btn.style.borderColor = border;
    });
    btn.addEventListener("click", onClick);
    parent.appendChild(btn);
    return btn;
  }

  // --- Correspondance tag → libellé lisible ---
  _tagToLabel(tag) {
    const labels = {
      interférente: "Branche interférente",
      concurrente: "Branche concurrente",
      aigue: "Branche angle aigu",
      rejet: "Rejet",
      malade: "Branche malade",
      brisée: "Branche brisée",
      distribution: "Branche mal répartie",
      couronne: "Branche couronne",
      débordante: "Branche débordante",
      temporaire: "Branche temporaire",
      flèche: "Supression de la double flèche",
    };
    return labels[tag] || tag || "Branche inconnue";
  }

  // --- Panneau de rétroaction (bottom-left, caché par défaut) ---
  _createFeedbackPanel() {
    this.feedbackPanel = document.createElement("div");
    this.feedbackPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      max-width: 260px;
      max-height: 60vh;
      overflow-y: auto;
      color: #ffffff;
      background: rgba(0, 0, 0, 1);
      padding: 20px 25px;
      border-radius: 8px;
      font-size: 15px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      z-index: 1000;
      display: none;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(this.feedbackPanel);
  }

  // --- Calculer le score et afficher le panneau de rétroaction après validation ---
  //
  // Reçoit les résultats produits par TreeInteraction.validate() :
  //   cut          : branches défectueuses identifiées (coupées ou sélectionnées)
  //   missed       : branches défectueuses encore présentes et non sélectionnées
  //   wrongCuts    : branches saines cliquées par erreur — tableau [{name}] (un élément par noeud cliqué)
  //   wrongCutCount: longueur de wrongCuts (fourni pour l'affichage dans le feedback)
  //   overCut      : booléen — vrai si > 30 % des meshes de l'arbre ont été retirés
  showFeedback({ cut, missed, wrongCuts, wrongCutCount, wrongBranchDisplayCount, overCut }) {
    // 1. Figer le chrono
    const elapsed = this._stopLevelTimer();

    if (overCut) {
      // CAS 1 — surcoupe : aucun point positif, pénalité forfaitaire une fois par tentative
      if (!this._overcutApplied) {
        this._totalScore -= this._OVERCUT_PENALTY;
        this._overcutApplied = true;
      }
    } else {
      // CAS 2 — pas de surcoupe

      // 2. Bonnes branches identifiées précisément (exclut celles capturées par un parent mixte
      //    et celles déjà récompensées lors d'une tentative précédente)
      const correctCutsForScore = cut.filter((b) => b.isBad && !b.caughtByMixedParent && !this._scoredBranchNames.has(b.name));
      correctCutsForScore.forEach((b) => this._scoredBranchNames.add(b.name));

      // 3. Neutraliser les branches capturées par un parent mixte ce tour
      //    (pas de points, mais réinitialisable sur Recommencer pour les clics individuels)
      cut.filter((b) => b.isBad && b.caughtByMixedParent && !this._nullifiedBranchNames.has(b.name)).forEach((b) => this._nullifiedBranchNames.add(b.name));

      // 4. Multiplicateur de rapidité
      const multiplier = elapsed < this._FAST_THRESHOLD_SEC ? this._FAST_MULTIPLIER : 1;

      // 5. Parents mixtes : pénaliser seulement ceux pas encore pénalisés ce niveau
      const newWrongCuts = (wrongCuts || []).filter((w) => !this._penalizedWrongBranches.has(w.name));
      newWrongCuts.forEach((w) => this._penalizedWrongBranches.add(w.name));

      // 6. Variation de score
      const scoreDelta = correctCutsForScore.length * this._BASE_POINTS * multiplier - newWrongCuts.length * this._WRONG_PENALTY;
      this._totalScore += scoreDelta;
    }

    this._updateTimerScorePanel();

    let html = "";

    const correctCuts = cut.filter((b) => b.isBad);
    const hasWrongCuts = wrongCutCount > 0;
    const allFound = missed.length === 0 && correctCuts.length > 0 && !hasWrongCuts;

    // Met à jour le texte du bouton selon le résultat
    this._wasAllFound = allFound && !overCut;
    const newText = allFound && !overCut ? "Prochain Exercice" : "Recommencer";
    const newIcon = allFound && !overCut ? "./icons/next.png" : "./icons/retry.png";
    this.validateButton.querySelector("span").textContent = newText;
    const validateImg = this.validateButton.querySelector("img");
    if (validateImg) validateImg.src = newIcon;

    if (overCut) {
      html += `<p style="margin: 0 0 10px 0; color: #ff6666; font-weight: 600;">Vous avez coupé plus de 30% de l'arbre. Faites attention à ne pas retirer trop de branches.</p>`;
    }

    if (allFound) {
      html += `<h3 style="margin: 0 0 10px 0; color: #00ff88; font-size: 20px;">Félicitations !</h3>`;
      html += `<p style="margin: 0 0 6px 0; color: #aaa;">Branches bien identifiées :</p>`;
      html += `<ul style="margin: 0 0 0 16px; padding: 0;">`;
      for (const b of correctCuts) {
        html += `<li style="margin: 2px 0; color: #00ff88;">${this._tagToLabel(b.tag)}</li>`;
      }
      html += `</ul>`;
    } else {
      if (correctCuts.length > 0) {
        html += `<p style="margin: 0 0 6px 0; color: #00cc66; font-weight: 600;">✅ Vous avez correctement identifié :</p>`;
        html += `<ul style="margin: 0 0 14px 16px; padding: 0;">`;
        for (const b of correctCuts) {
          html += `<li style="margin: 2px 0; color: #00cc66;">${this._tagToLabel(b.tag)}</li>`;
        }
        html += `</ul>`;
      }

      if (missed.length > 0) {
        html += `<p style="margin: 0 0 6px 0; color: #ff6666; font-weight: 600;">❌ Branche${missed.length > 1 ? "s" : ""} manquée${wrongCutCount > 1 ? "s" : ""}: ${missed.length} </p>`;
        html += `<ul style="margin: 0 0 14px 16px; padding: 0;">`;
        for (const b of missed) {
          html += `<li style="margin: 2px 0; color: #ff6666;">${this._tagToLabel(b.tag)}</li>`;
        }
        html += `</ul>`;
      }

      if (hasWrongCuts) {
        const wCount = wrongBranchDisplayCount ?? wrongCutCount;
        html += `<p style="margin: 0 0 6px 0; color: #ffaa00; font-weight: 600;">⚠️ Branche${wCount > 1 ? "s" : ""} mal identifiée${wCount > 1 ? "s" : ""}: ${wCount} branche${wCount > 1 ? "s" : ""}</p>`;
      }

      if (correctCuts.length === 0 && missed.length === 0 && !hasWrongCuts) {
        html += `<p style="margin: 0; color: #aaa;">Aucune branche n'a été identifiée.</p>`;
      }
    }

    this.feedbackPanel.innerHTML = html;
    this.feedbackPanel.style.display = "block";
  }

  // --- Réinitialiser l'état de l'exercice pour un nouveau niveau ---
  //
  // Appelé par main.js -> loadTree() à chaque chargement d'arbre.
  // Remet à zéro tout ce qui est propre au niveau en cours :
  //   - état du bouton Valider
  //   - panneau de rétroaction
  //   - chrono (repart de 0)
  //   - Sets de suivi des branches scorées / pénalisées
  // Ne touche PAS au score total ni à l'historique des temps : ces données
  // survivent d'un niveau à l'autre et ne sont effacées que par selectTree().
  resetExercise() {
    this._validated = false;
    this._wasAllFound = false;
    // Réinitialiser tous les Sets et flags de suivi pour le nouveau niveau
    this._scoredBranchNames = new Set();
    this._penalizedWrongBranches = new Set();
    this._nullifiedBranchNames = new Set();
    this._overcutApplied = false;
    this.validateButton.querySelector("span").textContent = "Valider";
    const validateImg2 = this.validateButton.querySelector("img");
    if (validateImg2) validateImg2.src = "./icons/check.png";
    this.hideFeedback();
    // Désactiver aussi le bouton Valider au chargement d'un nouveau niveau
    this._setButtonEnabled(this.validateButton, false);
    // Démarrer un nouveau chrono — le score total n'est pas réinitialisé ici
    this._startLevelTimer();
    this._updateTimerScorePanel();
  }

  // --- Cacher le panneau de rétroaction ---
  hideFeedback() {
    this.feedbackPanel.style.display = "none";
  }

  // --- Sélecteur d'arbres (rangée de boutons numérotés en haut à gauche) ---
  _createTreeSelector(trees) {
    // Colonne de gauche : contient le sélecteur de niveaux + le panneau chronomètre/score
    this.leftColumn = document.createElement("div");
    this.leftColumn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    document.body.appendChild(this.leftColumn);

    this._treeSelectorPanel = document.createElement("div");
    this._treeSelectorPanel.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: rgba(15, 15, 15, 1);
      padding: 18px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #ffffff;
      width: 260px;
      box-sizing: border-box;
    `;

    const buttonsRow = document.createElement("div");
    buttonsRow.style.cssText = `display: flex; gap: 16px;`;
    this._treeSelectorPanel.appendChild(buttonsRow);
    this._buttonsRow = buttonsRow;

    trees.forEach((tree, i) => this._addTreeButton(tree, i));

    const levelLabel = document.createElement("span");
    levelLabel.textContent = "Niveau :";
    levelLabel.style.cssText = `
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding-top: 4px;
      padding-bottom: 10px;
    `;
    this._treeSelectorPanel.insertBefore(levelLabel, this._treeSelectorPanel.firstChild);

    this.leftColumn.appendChild(this._treeSelectorPanel);
    this._updateTreeSelectorActive();
  }

  _addTreeButton(tree, i) {
    const btn = document.createElement("button");
    btn.textContent = String(i + 1);
    btn.title = tree.label;
    btn.style.cssText = `
      width: 42px;
      height: 42px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: background 0.15s, border-color 0.15s;
    `;
    btn.addEventListener("click", () => this.selectTree(i));
    btn.addEventListener("mouseenter", () => {
      if (i !== this._activeTreeIndex) btn.style.background = "rgba(255, 255, 255, 0.18)";
    });
    btn.addEventListener("mouseleave", () => {
      if (i !== this._activeTreeIndex) btn.style.background = "rgba(255, 255, 255, 0.08)";
    });
    this._treeButtons.push(btn);
    (this._buttonsRow || this._treeSelectorPanel).appendChild(btn);
  }

  // Appelé par un clic manuel sur 1/2/3 -> réinitialisation complète
  selectTree(index) {
    if (index === this._activeTreeIndex) return;
    this._activeTreeIndex = index;
    this._updateTreeSelectorActive();
    // Sélection manuelle -> réinitialisation complète du chrono et du score
    this._totalScore = 0;
    this._levelTimers = [];
    if (this._timerEl) this._timerEl.textContent = "00:00";
    if (this._scoreEl) {
      this._scoreEl.textContent = "0";
      this._scoreEl.style.color = "#ffffff";
    }
    if (this.onTreeSelect) this.onTreeSelect(index);
  }

  // Appelé par "Prochain Exercice" -> avance sans réinitialiser le score ni l'historique
  _advanceToTree(index) {
    this._activeTreeIndex = index;
    this._updateTreeSelectorActive();
    if (this.onTreeSelect) this.onTreeSelect(index);
  }

  _updateTreeSelectorActive() {
    this._treeButtons.forEach((btn, i) => {
      if (i === this._activeTreeIndex) {
        btn.style.background = "rgba(57, 64, 50, 1)";
        btn.style.borderColor = "rgba(83, 94, 73, 1)";
        btn.style.color = "rgba(255, 255, 255, 1)";
      } else {
        btn.style.background = "rgba(255, 255, 255, 0.08)";
        btn.style.borderColor = "rgba(255, 255, 255, 0.03)";
        btn.style.color = "rgba(255, 255, 255, 0.23)";
      }
    });
  }

  addTree(treeConfig) {
    const i = this._treeButtons.length;
    this._addTreeButton(treeConfig, i);
    this._updateTreeSelectorActive();
  }

  // --- Glisser avec le bouton du milieu (style Blender) ---
  _setupMouseControls() {
    let isMiddleMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let pendingDX = 0;
    let pendingDY = 0;
    let rafId = null;

    const applyDrag = () => {
      rafId = null;
      if (pendingDX === 0 && pendingDY === 0) return;
      const rotateSpeed = 0.0025; // Sensibilité à la rotation horizontale
      const heightSpeed = 0.004; // Sensibilité à la hauteur
      this.updateSlider("rotation", this.orbitController.rotation - pendingDX * rotateSpeed);
      this.updateSlider("height", this.orbitController.height + pendingDY * heightSpeed);
      pendingDX = 0;
      pendingDY = 0;
    };

    this.domElement.addEventListener("mousedown", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        isMiddleMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        pendingDX = 0;
        pendingDY = 0;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!isMiddleMouseDown) return;
      pendingDX += e.clientX - lastMouseX;
      pendingDY += e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(applyDrag);
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 1) {
        isMiddleMouseDown = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        applyDrag();
      }
    });
  }

  // --- Molette pour zoomer ---
  _setupScrollControls() {
    this.domElement.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const zoomSpeed = 0.5;
        const newDistance = this.orbitController.distance + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
        this.updateSlider("distance", newDistance);
      },
      { passive: false },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chronomètre
  //
  // Le chrono mesure le temps passé sur le niveau courant.
  // Il est utilisé pour :
  //   - afficher le temps en direct dans le panneau Chrono & Score
  //   - calculer le multiplicateur bonus lors de la validation
  //   - alimenter l'historique des temps une fois le niveau terminé
  //
  // Trois états possibles :
  //   démarré  -> _startLevelTimer()  : repart de 0, utilisé pour un nouveau niveau
  //   repris   -> _resumeLevelTimer() : reprend depuis _currentLevelElapsed, après Recommencer
  //   figé     -> _stopLevelTimer()   : arrête le setInterval, retourne le temps écoulé
  //
  // _levelStartTime    : horodatage Date.now() du démarrage (corrigé au résumé pour tenir compte
  //                      du temps déjà écoulé avant la pause)
  // _currentLevelElapsed : secondes écoulées au moment du dernier arrêt (permet la reprise)
  // ─────────────────────────────────────────────────────────────────────────

  // Repart de zéro — appelé par resetExercise() à chaque nouveau niveau
  _startLevelTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    this._levelStartTime = Date.now();
    this._currentLevelElapsed = 0;
    this._tickTimer();
    this._timerInterval = setInterval(() => this._tickTimer(), 1000);
  }

  // Reprend depuis le dernier temps figé — appelé quand l'utilisateur clique Recommencer
  // Recalcule _levelStartTime en le décalant dans le passé pour que l'écart avec now()
  // corresponde au temps déjà écoulé avant l'arrêt.
  _resumeLevelTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    this._levelStartTime = Date.now() - this._currentLevelElapsed * 1000;
    this._tickTimer();
    this._timerInterval = setInterval(() => this._tickTimer(), 1000);
  }

  // Arrête le chrono, sauvegarde le temps dans _currentLevelElapsed et le retourne.
  // Appelé par showFeedback() pour figer le temps au moment de la validation.
  _stopLevelTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    const elapsed = this._levelStartTime ? Math.floor((Date.now() - this._levelStartTime) / 1000) : 0;
    this._currentLevelElapsed = elapsed;
    if (this._timerEl) this._timerEl.textContent = this._formatTime(elapsed);
    return elapsed;
  }

  // Tick appelé chaque seconde par le setInterval.
  // Met à jour l'affichage du temps et l'indice de bonus :
  //   - tant que elapsed < seuil : affiche le temps limite, passe en orange dans les 30 dernières secondes
  //   - après le seuil           : affiche "Bonus expiré" en gris atténué
  _tickTimer() {
    if (!this._levelStartTime) return;
    const elapsed = Math.floor((Date.now() - this._levelStartTime) / 1000);
    if (this._timerEl) this._timerEl.textContent = this._formatTime(elapsed);
    if (this._bonusHintEl) {
      if (elapsed < this._FAST_THRESHOLD_SEC) {
        const restant = this._FAST_THRESHOLD_SEC - elapsed;
        this._bonusHintEl.textContent = `Répondez avant ${this._formatTime(this._FAST_THRESHOLD_SEC)} pour x${this._FAST_MULTIPLIER}`;
        this._bonusHintEl.style.color = restant < 30 ? "rgba(255,140,40,1)" : "rgba(255,255,255,0.65)";
      } else {
        this._bonusHintEl.textContent = "Bonus expiré";
        this._bonusHintEl.style.color = "rgba(255,255,255,0.2)";
      }
    }
  }

  // Convertit un nombre de secondes en chaîne MM:SS
  _formatTime(sec) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mise à jour du panneau Chrono & Score
  //
  // Rafraîchit tous les éléments visuels du panneau après chaque changement
  // de score ou de temps. Appelé par showFeedback() et resetExercise().
  //
  // Affiche :
  //   - le score total en vert (>= 0) ou rouge (< 0)
  //   - la section historique des temps si au moins un niveau est terminé :
  //       "Niveau 1 — 01:23", "Niveau 2 — 00:45", ... + Total
  //   - masque la section historique si aucun niveau n'est encore terminé
  // ─────────────────────────────────────────────────────────────────────────

  _updateTimerScorePanel() {
    if (!this._timerEl) return;

    // Score total — vert si positif ou nul, rouge si négatif
    if (this._scoreEl) {
      this._scoreEl.textContent = String(this._totalScore);
      this._scoreEl.style.color = this._totalScore >= 0 ? "#00cc66" : "#ff6666";
    }

    // Historique par niveau — visible uniquement après le premier niveau complété
    if (this._levelTimers.length > 0 && this._historySection) {
      this._historySection.style.display = "block";
      let historyHtml = "";
      let totalSec = 0;
      this._levelTimers.forEach((t) => {
        totalSec += t.elapsed;
        historyHtml += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:13px;">
          <span style="color:rgba(255,255,255,0.55);">Niveau ${t.levelIndex + 1}</span>
          <span style="font-variant-numeric:tabular-nums;color:rgba(255,255,255,0.8);">${this._formatTime(t.elapsed)}</span>
        </div>`;
      });
      if (this._historyRows) this._historyRows.innerHTML = historyHtml;
      if (this._totalTimeEl) this._totalTimeEl.textContent = this._formatTime(totalSec);
    } else if (this._historySection) {
      this._historySection.style.display = "none";
    }
  }

  // ─────────────────────────────────────────────
  // Panneau Chronomètre + Score (colonne de gauche)
  // ─────────────────────────────────────────────

  _createTimerScorePanel() {
    const panel = document.createElement("div");
    panel.style.cssText = `
      background: rgba(15, 15, 15, 1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      width: 260px;
      box-sizing: border-box;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #ffffff;
      backdrop-filter: blur(10px);
      overflow: hidden;
    `;

    // — En-tête cliquable (collapse/expand) —
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;
    `;

    const chevron = document.createElement("img");
    chevron.src = "./icons/chevron-up.svg";
    chevron.style.cssText = `
      width: 12px;
      height: 8px;
      flex-shrink: 0;
      transition: transform 0.2s;
    `;

    const headerTitle = document.createElement("span");
    headerTitle.textContent = "Chrono & Score";
    headerTitle.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    `;

    header.appendChild(chevron);
    header.appendChild(headerTitle);
    panel.appendChild(header);

    // — Corps (contenu masquable) —
    const body = document.createElement("div");
    body.style.cssText = `padding: 0 16px 14px 16px;`;

    // Séparateur
    const topSep = document.createElement("div");
    topSep.style.cssText = `height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 12px;`;
    body.appendChild(topSep);

    // Ligne Temps
    const makeRow = (labelText) => {
      const row = document.createElement("div");
      row.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;`;
      const lbl = document.createElement("span");
      lbl.textContent = labelText;
      lbl.style.cssText = `font-size: 14px; color: rgba(255,255,255,0.55); font-weight: 600;`;
      const val = document.createElement("span");
      val.style.cssText = `font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums;`;
      row.appendChild(lbl);
      row.appendChild(val);
      body.appendChild(row);
      return val;
    };

    this._timerEl = makeRow("Temps :");
    this._timerEl.textContent = "00:00";
    this._timerEl.style.color = "#ffffff";

    this._scoreEl = makeRow("Score :");
    this._scoreEl.textContent = "0";
    this._scoreEl.style.color = "#ffffff";

    // Séparateur léger avant la zone infos
    const infoSep = document.createElement("div");
    infoSep.style.cssText = `height: 1px; background: rgba(255,255,255,0.08); margin-bottom: 10px;`;
    body.appendChild(infoSep);

    // Indice de rapidité pour le multiplicateur bonus
    this._bonusHintEl = document.createElement("div");
    this._bonusHintEl.textContent = `Répondez avant ${this._formatTime(this._FAST_THRESHOLD_SEC)} pour x${this._FAST_MULTIPLIER}`;
    this._bonusHintEl.style.cssText = `font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.65); margin-bottom: 8px; letter-spacing: 0.01em;`;
    body.appendChild(this._bonusHintEl);

    // Légende des points
    const legend = document.createElement("div");
    legend.style.cssText = `display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px;`;

    const makeLegendRow = (label, valueText, color) => {
      const row = document.createElement("div");
      row.style.cssText = `display: flex; justify-content: space-between; align-items: center;`;
      const lbl = document.createElement("span");
      lbl.textContent = label;
      lbl.style.cssText = `font-size: 11px; color: rgba(255,255,255,0.38);`;
      const val = document.createElement("span");
      val.textContent = valueText;
      val.style.cssText = `font-size: 11px; font-weight: 700; color: ${color};`;
      row.appendChild(lbl);
      row.appendChild(val);
      return row;
    };

    legend.appendChild(makeLegendRow("Bonne branche", `+${this._BASE_POINTS}`, "rgba(120,200,100,0.8)"));
    legend.appendChild(makeLegendRow("Mauvaise coupe", `−${this._WRONG_PENALTY}`, "rgba(220,100,80,0.8)"));
    legend.appendChild(makeLegendRow("Surcoupe (>30%)", `−${this._OVERCUT_PENALTY}`, "rgba(220,140,40,0.85)"));
    body.appendChild(legend);

    // Note explicative : chaque branche ne compte qu'une fois par exercice
    const legendNote = document.createElement("div");
    legendNote.textContent = "* Chaque branche n'ajoute ou ne retire des points qu'une seule fois par exercice.";
    legendNote.style.cssText = `font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 6px; margin-bottom: 2px; line-height: 1.4;`;
    body.appendChild(legendNote);

    // Section historique des temps par niveau (masquée jusqu'au premier niveau terminé)
    this._historySection = document.createElement("div");
    this._historySection.style.display = "none";

    const histSep1 = document.createElement("div");
    histSep1.style.cssText = `height: 1px; background: rgba(255,255,255,0.1); margin: 10px 0 10px 0;`;

    this._historyRows = document.createElement("div");

    const histSep2 = document.createElement("div");
    histSep2.style.cssText = `height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0;`;

    const totalRow = document.createElement("div");
    totalRow.style.cssText = `display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700;`;

    const totalLabel = document.createElement("span");
    totalLabel.textContent = "Total";
    totalLabel.style.color = "rgba(255,255,255,0.7)";

    this._totalTimeEl = document.createElement("span");
    this._totalTimeEl.textContent = "00:00";
    this._totalTimeEl.style.cssText = `font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.8);`;

    totalRow.appendChild(totalLabel);
    totalRow.appendChild(this._totalTimeEl);

    this._historySection.appendChild(histSep1);
    this._historySection.appendChild(this._historyRows);
    this._historySection.appendChild(histSep2);
    this._historySection.appendChild(totalRow);

    body.appendChild(this._historySection);
    panel.appendChild(body);

    // — Toggle collapse —
    let expanded = true;
    header.addEventListener("click", () => {
      expanded = !expanded;
      body.style.display = expanded ? "block" : "none";
      chevron.style.transform = expanded ? "" : "rotate(180deg)";
    });

    this.leftColumn.appendChild(panel);
  }
}
