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

    this._createSliders();
    this._createButtons();
    this._createFeedbackPanel();
    this._createTreeSelector(trees);
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
      top: 60px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Panneau des sliders
    const sliderPanel = document.createElement("div");
    sliderPanel.style.cssText = `
      background: rgba(15, 15, 15, 0.9);
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
      background: rgba(15, 15, 15, 0.9);
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

    this.cutButton = this._createButton("Couper", actionRow, () => {
      if (this.onCutBranch) this.onCutBranch();
    }, { bg: "rgba(180, 40, 40, 0.85)", border: "rgba(255, 80, 80, 0.5)", hover: "rgba(220, 60, 60, 0.9)", icon: "./icons/scissors.png", iconPos: "top" });
    this.cutButton.style.padding = "6px 8px";
    this.cutButton.style.fontSize = "15px";
    this._setButtonEnabled(this.cutButton, false);

    this.restoreButton = this._createButton("Rétablir", actionRow, () => {
      if (this.onRestoreBranches) this.onRestoreBranches();
    }, { bg: "rgba(30, 80, 180, 0.85)", border: "rgba(80, 130, 255, 0.5)", hover: "rgba(50, 110, 220, 0.9)", icon: "./icons/restore.png", iconPos: "top" });
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
    this.validateButton = this._createButton("Valider", buttonPanel, () => {
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
        if (this._wasAllFound) {
          if (this.onNextExercise) this.onNextExercise();
        } else {
          if (this.onRestart) this.onRestart();
        }
        this._wasAllFound = false;
      }
    }, { bg: "rgba(85, 99, 45, 1)", border: "rgba(150, 174, 80, 1)", hover: "rgba(150, 174, 80, 1)", icon: "./icons/check.png", iconPos: "left" });

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
      left: 100px;
      max-width: 400px;
      max-height: 60vh;
      overflow-y: auto;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.85);
      padding: 20px 25px;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      z-index: 1000;
      display: none;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(this.feedbackPanel);
  }

  // --- Afficher le résultat de la validation ---
  showFeedback({ cut, missed, wrongCutCount, overCut }) {
    let html = "";

    const correctCuts = cut.filter((b) => b.isBad);
    const hasWrongCuts = wrongCutCount > 0;
    const allFound = missed.length === 0 && correctCuts.length > 0 && !hasWrongCuts;

    // Met à jour le texte du bouton selon le résultat
    this._wasAllFound = allFound && !overCut;
    this.validateButton.querySelector("span").textContent = allFound && !overCut ? "Prochain Exercice" : "Recommencer";

    if (overCut) {
      html += `<p style="margin: 0 0 10px 0; color: #ff6666; font-weight: 600;">Vous avez coupé plus de 30% de l'arbre. Faites attention à ne pas retirer trop de branches.</p>`;
    }

    if (allFound) {
      html += `<h3 style="margin: 0 0 10px 0; color: #00ff88;">Félicitations, vous les avez toutes trouvées !</h3>`;
      html += `<p style="margin: 0 0 6px 0; color: #aaa;">Branches correctement identifiées :</p>`;
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
        html += `<p style="margin: 0 0 6px 0; color: #ff6666; font-weight: 600;">❌ Vous avez manqué ${missed.length} branche${missed.length > 1 ? "s" : ""} :</p>`;
        html += `<ul style="margin: 0 0 14px 16px; padding: 0;">`;
        for (const b of missed) {
          html += `<li style="margin: 2px 0; color: #ff6666;">${this._tagToLabel(b.tag)}</li>`;
        }
        html += `</ul>`;
      }

      if (hasWrongCuts) {
        html += `<p style="margin: 0 0 6px 0; color: #ffaa00; font-weight: 600;">⚠️ Vous avez identifié ${wrongCutCount} branche${wrongCutCount > 1 ? "s" : ""} qui n'aurai${wrongCutCount > 1 ? "ent" : "t"} pas dû être identifiée${wrongCutCount > 1 ? "s" : ""}.</p>`;
      }

      if (correctCuts.length === 0 && missed.length === 0 && !hasWrongCuts) {
        html += `<p style="margin: 0; color: #aaa;">Aucune branche n'a été identifiée.</p>`;
      }
    }

    this.feedbackPanel.innerHTML = html;
    this.feedbackPanel.style.display = "block";
  }

  // --- Réinitialiser l'état de l'exercice (appelé lors du changement d'arbre) ---
  resetExercise() {
    this._validated = false;
    this._wasAllFound = false;
    this.validateButton.querySelector("span").textContent = "Valider";
    this._setButtonEnabled(this.restoreButton, false);
    this.hideFeedback();
  }

  // --- Cacher le panneau de rétroaction ---
  hideFeedback() {
    this.feedbackPanel.style.display = "none";
  }

  // --- Sélecteur d'arbres (rangée de boutons numérotés en haut au centre) ---
  _createTreeSelector(trees) {
    this._treeSelectorPanel = document.createElement("div");
    this._treeSelectorPanel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      display: flex;
      
      gap: 8px;
      z-index: 1000;
      background: rgba(15, 15, 15, 0.85);
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      font-family: 'Plus Jakarta Sans', sans-serif;
    `;
    trees.forEach((tree, i) => this._addTreeButton(tree, i));
    document.body.appendChild(this._treeSelectorPanel);
    this._updateTreeSelectorActive();
  }

  _addTreeButton(tree, i) {
    const btn = document.createElement("button");
    btn.textContent = String(i + 1);
    btn.title = tree.label;
    btn.style.cssText = `
      width: 36px;
      height: 36px;
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
    this._treeSelectorPanel.appendChild(btn);
  }

  selectTree(index) {
    if (index === this._activeTreeIndex) return;
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
}
