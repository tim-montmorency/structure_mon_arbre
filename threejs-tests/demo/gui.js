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
      top: 10px;
      left: 10px;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.7);
      padding: 20px;
      border-radius: 5px;
      font-size: 15px;
      z-index: 50;
      max-width: 350px;
      font-family: Arial, sans-serif;
    `;
    info.innerHTML = `
      <h3 style="margin: 0 0 12px 0; font-size: 18px;">Démo Interaction Arbre</h3>
      <p style="margin: 8px 0; line-height: 1.5;"><strong>Contrôles:</strong></p>
      <p style="margin: 8px 0; line-height: 1.5;">🖱️ Survolez les branches pour les mettre en évidence</p>
      <p style="margin: 8px 0; line-height: 1.5;">🖱️ Cliquez sur une branche pour la sélectionner</p>
      <p style="margin: 8px 0; line-height: 1.5;">🖱️ Clic du milieu pour déplacer la caméra</p>
      <p style="margin: 8px 0; line-height: 1.5;">🖱️ Molette pour zoomer</p>
    `;
    document.body.appendChild(info);
  }

  // --- Glissières ---
  _createSliders() {
    this.sliderDefs.forEach((sliderDef, index) => {
      const container = document.createElement("div");
      container.style.cssText = `
        position: fixed;
        right: ${this.baseRight}px;
        top: ${this.baseTop + index * (this.sliderHeight + this.gap)}px;
        width: 320px;
        background: rgba(15, 15, 15, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 16px 18px;
        backdrop-filter: blur(10px);
        z-index: 1000;
      `;

      const label = document.createElement("label");
      label.textContent = sliderDef.label;
      label.style.cssText = `
        display: block;
        color: #ffffff;
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 10px;
        font-family: Arial, sans-serif;
      `;

      const lo = Math.min(sliderDef.min, sliderDef.max);
      const hi = Math.max(sliderDef.min, sliderDef.max);
      const inverted = sliderDef.min > sliderDef.max;

      const sliderInput = document.createElement("input");
      sliderInput.type = "range";
      sliderInput.min = lo;
      sliderInput.max = hi;
      sliderInput.step = sliderDef.key === "distance" ? 0.1 : 0.01;
      sliderInput.value = inverted ? hi + lo - this.orbitController[sliderDef.key] : this.orbitController[sliderDef.key];
      sliderInput.style.cssText = `
        width: 100%;
        height: 4px;
        accent-color: #ffffff;
        cursor: pointer;
        display: block;
      `;

      // La glissière est le SEUL endroit qui met à jour orbitController
      sliderInput.addEventListener("input", (e) => {
        const raw = parseFloat(e.target.value);
        this.orbitController[sliderDef.key] = inverted ? hi + lo - raw : raw;
        this.updateURL();
      });

      this.sliderRefs[sliderDef.key] = sliderInput;

      container.appendChild(label);
      container.appendChild(sliderInput);
      document.body.appendChild(container);
    });
  }

  // --- Boutons ---
  _createButtons() {
    const buttonsStartTop = this.baseTop + this.sliderDefs.length * (this.sliderHeight + this.gap) + this.gap;

    // Réinitialiser la caméra
    this._createButton("Reset Caméra", buttonsStartTop, () => {
      this.updateSlider("rotation", 0);
      this.updateSlider("height", Math.PI / 2);
      this.updateSlider("distance", 3);
    });

    // Couper la branche sélectionnée
    this.cutButton = this._createButton("Couper la branche", buttonsStartTop + 50 + this.gap, () => {
      if (this.onCutBranch) this.onCutBranch();
    });

    // Rétablir toutes les branches
    this.restoreButton = this._createButton("Rétablir les branches", buttonsStartTop + 2 * (50 + this.gap), () => {
      if (this.onRestoreBranches) this.onRestoreBranches();
    });

    this.buttonCount = 3;
  }

  _createButton(text, top, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      position: fixed;
      right: ${this.baseRight}px;
      top: ${top}px;
      width: 320px;
      padding: 14px 18px;
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      font-family: Arial, sans-serif;
      transition: background 0.2s ease, border-color 0.2s ease;
      z-index: 1000;
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
    document.body.appendChild(btn);
    return btn;
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
