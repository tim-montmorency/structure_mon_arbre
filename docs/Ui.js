export class Ui {
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
      { key: "height", min: 0.15, max: 1, label: "Hauteur" },
      { key: "distance", min: 5, max: 1, label: "Distance" },
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

  // --- Panneau d'information (à gauche) ---
  _createInfoPanel() {
    const info = document.createElement("div");
    info.id = "info";
    info.style.cssText = `
      position: fixed;
      top: 60px;
      left: 20px;
      color: #ffffff;
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 15px;
      z-index: 1000;
      font-family: Arial, sans-serif;
      width: 260px;
      box-sizing: border-box;
      backdrop-filter: blur(10px);
    `;
    info.innerHTML = `
      <div style="font-weight:700; margin-bottom:8px; font-size:16px;">Démo Interaction Arbre</div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 6px;">
        <div style="margin: 2px 0; line-height: 1.3; font-size:15px;">🖱️ Survolez pour mettre en évidence</div>
        <div style="margin: 2px 0; line-height: 1.3; font-size:15px;">🖱️ Cliquez pour sélectionner</div>
        <div style="margin: 2px 0; line-height: 1.3; font-size:15px;">🖱️ Clic du milieu pour la caméra</div>
        <div style="margin: 2px 0; line-height: 1.3; font-size:15px;">🖱️ Molette pour zoomer</div>
      </div>
    `;
    document.body.appendChild(info);
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

    const labelStyle = `
      display: block;
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 8px;
      font-family: Arial, sans-serif;
      text-align: center;
    `;
    const inputStyle = `
      height: 4px;
      accent-color: #ffffff;
      cursor: pointer;
      display: block;
      width: 100%;
      box-sizing: border-box;
    `;

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
      sliderInput.style.cssText = inputStyle;

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

    // Couper la branche sélectionnée
    this.cutButton = this._createButton("Couper la branche", buttonPanel, () => {
      if (this.onCutBranch) this.onCutBranch();
    });
    this._setButtonEnabled(this.cutButton, false);

    // Rétablir toutes les branches
    this.restoreButton = this._createButton("Rétablir les branches", buttonPanel, () => {
      if (this.onRestoreBranches) this.onRestoreBranches();
    });
    this._setButtonEnabled(this.restoreButton, false);

    // Toggle Grass button
    this.grassEnabled = true;
    this.grassToggleButton = this._createButton("🌱 ON", buttonPanel, () => {
      this.grassEnabled = !this.grassEnabled;
      this.grassToggleButton.textContent = this.grassEnabled ? "🌱 ON" : "🌱 OFF";
      if (this.onToggleGrass) this.onToggleGrass(this.grassEnabled);
    });

    // Valider
    this._validated = false;
    this.validateButton = this._createButton("Valider", buttonPanel, () => {
      if (!this._validated) {
        if (this.onValidate) this.onValidate();
        this._validated = true;
        this.validateButton.textContent = "Recommencer";
        this._setButtonEnabled(this.cutButton, false);
        this._setButtonEnabled(this.restoreButton, false);
      } else {
        this._validated = false;
        if (this.onRestart) this.onRestart();
        this.hideFeedback();
        this.validateButton.textContent = "Valider";
        this._setButtonEnabled(this.restoreButton, false);
      }
    });

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

  _createButton(text, parent, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      padding: 12px 16px;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
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

  // --- Cacher le panneau de rétroaction ---
  hideFeedback() {
    this.feedbackPanel.style.display = "none";
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
