export class GUI {
  constructor(orbitController, domElement) {
    this.orbitController = orbitController;
    this.domElement = domElement;
    this.sliderRefs = {};
    this._urlTimeout = null;

    this.baseRight = 20;
    this.sliderHeight = 110;
    this.gap = 10;

    // --- Définition des glissières (min/max = gauche/droite du curseur) ---
    this.sliderDefs = [
      { key: "rotation", min: -Math.PI, max: Math.PI, label: "Rotation" },
      { key: "height", min: Math.PI / 2, max: 0.01, label: "Hauteur" },
      { key: "distance", min: 9, max: 1, label: "Distance" },
    ];

    this.buttonCount = 2; // Reset + Couper
    const totalHeight = this.sliderDefs.length * (this.sliderHeight + this.gap) + this.buttonCount * (50 + this.gap);
    this.baseTop = Math.round((window.innerHeight - totalHeight) / 2);

    this._createInfoPanel();
    this._createSliders();
    this._createButtons();
    this._createFeedbackPanel();
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

  // --- Panneau d'information ---
  _createInfoPanel() {
    const info = document.createElement("div");
    info.id = "info";
    info.style.cssText = `
      position: fixed;
      top: 75px;
      left: 50%;
      transform: translateX(-50%);
      color: #ffffff;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px 25px;
      border-radius: 5px;
      font-size: 15px;
      z-index: 50;
      font-family: Arial, sans-serif;
    `;
    info.innerHTML = `
      <h3 style="margin: 0 0 10px 0; font-size: 18px; text-align: center;">Démo Interaction Arbre</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 30px;">
        <p style="margin: 4px 0; line-height: 1.5;">🖱️ Survolez pour mettre en évidence</p>
        <p style="margin: 4px 0; line-height: 1.5;">🖱️ Cliquez pour sélectionner</p>
        <p style="margin: 4px 0; line-height: 1.5;">🖱️ Clic du milieu pour la caméra</p>
        <p style="margin: 4px 0; line-height: 1.5;">🖱️ Molette pour zoomer</p>
      </div>
    `;
    document.body.appendChild(info);
  }

  // --- Glissières ---
  _createSliders() {
    const panelStyle = `
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 16px 18px;
      backdrop-filter: blur(10px);
      z-index: 1000;
      position: fixed;
    `;
    const labelStyle = `
      display: block;
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 10px;
      font-family: Arial, sans-serif;
      text-align: center;
    `;
    const inputStyle = `
      height: 4px;
      accent-color: #ffffff;
      cursor: pointer;
      display: block;
    `;

    this.sliderDefs.forEach((sliderDef) => {
      const lo = Math.min(sliderDef.min, sliderDef.max);
      const hi = Math.max(sliderDef.min, sliderDef.max);
      const inverted = sliderDef.min > sliderDef.max;

      const container = document.createElement("div");
      const label = document.createElement("label");
      label.textContent = sliderDef.label;
      label.style.cssText = labelStyle;

      const sliderInput = document.createElement("input");
      sliderInput.type = "range";
      sliderInput.min = lo;
      sliderInput.max = hi;
      sliderInput.step = sliderDef.key === "distance" ? 0.1 : 0.01;
      sliderInput.value = inverted ? hi + lo - this.orbitController[sliderDef.key] : this.orbitController[sliderDef.key];

      // La glissière est le SEUL endroit qui met à jour orbitController
      sliderInput.addEventListener("input", (e) => {
        const raw = parseFloat(e.target.value);
        this.orbitController[sliderDef.key] = inverted ? hi + lo - raw : raw;
        this.updateURL();
      });

      this.sliderRefs[sliderDef.key] = sliderInput;

      if (sliderDef.key === "rotation") {
        // Bas au centre, horizontal
        container.style.cssText =
          panelStyle +
          `
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
        `;
        sliderInput.style.cssText = inputStyle + `width: 100%;`;
      } else if (sliderDef.key === "height") {
        // Droite, vertical
        container.style.cssText =
          panelStyle +
          `
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 60px;
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
        `;
        sliderInput.style.cssText =
          inputStyle +
          `
          width: 250px;
          transform: rotate(-90deg);
          transform-origin: center center;
          margin-top: 130px;
        `;
      } else if (sliderDef.key === "distance") {
        // Gauche, vertical
        container.style.cssText =
          panelStyle +
          `
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 60px;
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
        `;
        sliderInput.style.cssText =
          inputStyle +
          `
          width: 250px;
          transform: rotate(-90deg);
          transform-origin: center center;
          margin-top: 130px;
        `;
      }

      container.appendChild(label);
      container.appendChild(sliderInput);
      document.body.appendChild(container);
    });
  }

  // --- Boutons ---
  _createButtons() {
    // Conteneur des 3 boutons en haut au centre
    const topBar = document.createElement("div");
    topBar.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: ${this.gap}px;
      z-index: 1000;
    `;

    // Réinitialiser la caméra
    this._createButton("Reset Caméra", topBar, () => {
      this.updateSlider("rotation", 0);
      this.updateSlider("height", Math.PI / 2);
      this.updateSlider("distance", 3);
    });

    // Couper la branche sélectionnée
    this.cutButton = this._createButton("Couper la branche", topBar, () => {
      if (this.onCutBranch) this.onCutBranch();
    });

    // Rétablir toutes les branches
    this.restoreButton = this._createButton("Rétablir les branches", topBar, () => {
      if (this.onRestoreBranches) this.onRestoreBranches();
    });

    document.body.appendChild(topBar);

    // Valider — en bas à droite
    this._validated = false;
    const validateContainer = document.createElement("div");
    validateContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    `;
    this.validateButton = this._createButton("Valider", validateContainer, () => {
      if (!this._validated) {
        // Mode Valider
        if (this.onValidate) this.onValidate();
        this._validated = true;
        this.validateButton.textContent = "Recommencer";
        this._setButtonEnabled(this.cutButton, false);
        this._setButtonEnabled(this.restoreButton, false);
      } else {
        // Mode Recommencer
        if (this.onRestart) this.onRestart();
        this.hideFeedback();
        this._validated = false;
        this.validateButton.textContent = "Valider";
        this._setButtonEnabled(this.cutButton, true);
        this._setButtonEnabled(this.restoreButton, true);
      }
    });
    document.body.appendChild(validateContainer);
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

  _createButton(text, parent, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      padding: 14px 24px;
      width: 200px;
      text-align: center;
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      font-family: Arial, sans-serif;
      transition: background 0.2s ease, border-color 0.2s ease;
      white-space: nowrap;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255, 255, 255, 0.1)";
      btn.style.borderColor = "rgba(255, 255, 255, 0.4)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(15, 15, 15, 0.9)";
      btn.style.borderColor = "rgba(255, 255, 255, 0.15)";
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
      font-family: Arial, sans-serif;
      z-index: 1000;
      display: none;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(this.feedbackPanel);
  }

  // --- Afficher le résultat de la validation ---
  showFeedback({ cut, missed, wrongCutCount }) {
    let html = "";

    const correctCuts = cut.filter((b) => b.isBad);
    const hasWrongCuts = wrongCutCount > 0;
    const allFound = missed.length === 0 && correctCuts.length > 0 && !hasWrongCuts;

    if (allFound) {
      html += `<h3 style="margin: 0 0 10px 0; color: #00ff88;">🎉 Félicitations, vous les avez toutes trouvées !</h3>`;
      html += `<p style="margin: 0 0 6px 0; color: #aaa;">Branches retirées :</p>`;
      html += `<ul style="margin: 0 0 0 16px; padding: 0;">`;
      for (const b of correctCuts) {
        html += `<li style="margin: 2px 0; color: #00ff88;">${this._tagToLabel(b.tag)}</li>`;
      }
      html += `</ul>`;
    } else {
      if (correctCuts.length > 0) {
        html += `<p style="margin: 0 0 6px 0; color: #00cc66; font-weight: 600;">✅ Vous avez correctement retiré :</p>`;
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
        html += `<p style="margin: 0 0 6px 0; color: #ffaa00; font-weight: 600;">⚠️ Vous avez coupé ${wrongCutCount} branche${wrongCutCount > 1 ? "s" : ""} qui n'aurai${wrongCutCount > 1 ? "ent" : "t"} pas dû être coupée${wrongCutCount > 1 ? "s" : ""}.</p>`;
      }

      if (correctCuts.length === 0 && missed.length === 0 && !hasWrongCuts) {
        html += `<p style="margin: 0; color: #aaa;">Aucune branche n'a été coupée.</p>`;
      }
    }

    this.feedbackPanel.innerHTML = html;
    this.feedbackPanel.style.display = "block";
  }

  // --- Cacher le panneau de rétroaction ---
  hideFeedback() {
    this.feedbackPanel.style.display = "none";
  }

  // --- Glisser avec le bouton du milieu (style Blender) ---
  _setupMouseControls() {
    let isMiddleMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    this.domElement.addEventListener("mousedown", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        isMiddleMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!isMiddleMouseDown) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      const rotateSpeed = 0.005;
      // Met à jour les glissières uniquement — les glissières mettent à jour orbitController
      this.updateSlider("rotation", this.orbitController.rotation - dx * rotateSpeed);
      this.updateSlider("height", this.orbitController.height + dy * rotateSpeed);
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 1) isMiddleMouseDown = false;
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
