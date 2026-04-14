export function createGUI(cameraParams, updateURL, domElement) {
  const baseRight = 20;
  const sliderHeight = 110;
  const gap = 10;
  const numButtons = 1;
  const totalHeight = 3 * (sliderHeight + gap) + numButtons * (50 + gap);
  const baseTop = Math.round((window.innerHeight - totalHeight) / 2);

  // --- Définition des paramètres de caméra ---
  const sliderDefs = [
    { key: "rotation", min: -Math.PI, max: Math.PI, label: "Rotation" },
    { key: "height", min: 0.01, max: Math.PI / 2, label: "Hauteur" },
    { key: "distance", min: 1, max: 5, label: "Distance" },
  ];

  // --- Référence aux sliders (sera rempli après création) ---
  const sliderRefs = {};

  // --- Fonction pour modifier un slider (déclenche l'événement input) ---
  const setSliderValue = (key, value) => {
    const slider = sliderRefs[key];
    if (slider) {
      const def = sliderDefs.find((d) => d.key === key);
      const clampedValue = Math.max(def.min, Math.min(def.max, value));
      slider.value = clampedValue;
      slider.dispatchEvent(new Event("input"));
    }
  };

  // --- Drag souris du milieu (style Blender) ---
  let isMiddleMouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  domElement.addEventListener("mousedown", (e) => {
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
    setSliderValue("rotation", cameraParams.rotation - dx * rotateSpeed);
    setSliderValue("height", cameraParams.height - dy * rotateSpeed);
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 1) isMiddleMouseDown = false;
  });

  // --- Scroll pour zoomer ---
  domElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const zoomSpeed = 0.5;
      const newDistance = cameraParams.distance + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
      setSliderValue("distance", newDistance);
    },
    { passive: false },
  );

  // --- Sliders ---
  sliderDefs.forEach((slider, index) => {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      right: ${baseRight}px;
      top: ${baseTop + index * (sliderHeight + gap)}px;
      width: 320px;
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-distance: 8px;
      padding: 16px 18px;
      backdrop-filter: blur(10px);
      z-index: 1000;
    `;

    const label = document.createElement("label");
    label.textContent = slider.label;
    label.style.cssText = `
      display: block;
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 10px;
      font-family: Arial, sans-serif;
    `;

    const sliderInput = document.createElement("input");
    sliderInput.type = "range";
    sliderInput.min = slider.min;
    sliderInput.max = slider.max;
    sliderInput.step = slider.key === "distance" ? 0.1 : 0.01;
    sliderInput.value = cameraParams[slider.key];
    sliderInput.style.cssText = `
      width: 100%;
      height: 4px;
      accent-color: #ffffff;
      cursor: pointer;
      display: block;
    `;

    const valueDisplay = document.createElement("div");
    console.log(slider.key);
    console.log(cameraParams);
    valueDisplay.textContent = cameraParams[slider.key].toFixed(2);
    valueDisplay.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      margin-top: 6px;
      text-align: right;
      font-family: Arial, sans-serif;
    `;

    sliderInput.addEventListener("input", (e) => {
      cameraParams[slider.key] = parseFloat(e.target.value);
      valueDisplay.textContent = parseFloat(e.target.value).toFixed(2);
      updateURL();
    });

    // Enregistrer la référence au slider
    sliderRefs[slider.key] = sliderInput;

    container.appendChild(label);
    container.appendChild(sliderInput);
    container.appendChild(valueDisplay);
    document.body.appendChild(container);
  });

  // --- Boutons ---
  const buttonsStartTop = baseTop + sliderDefs.length * (sliderHeight + gap) + gap;

  const buttonStyle = `
    position: fixed;
    right: ${baseRight}px;
    width: 320px;
    padding: 14px 18px;
    background: rgba(15, 15, 15, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
    border-distance: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    font-family: Arial, sans-serif;
    transition: background 0.2s ease, border-color 0.2s ease;
    z-index: 1000;
  `;

  const buttonHoverOn = (btn) => {
    btn.style.background = "rgba(255, 255, 255, 0.1)";
    btn.style.borderColor = "rgba(255, 255, 255, 0.4)";
  };
  const buttonHoverOff = (btn) => {
    btn.style.background = "rgba(15, 15, 15, 0.9)";
    btn.style.borderColor = "rgba(255, 255, 255, 0.15)";
  };

  // Reset Caméra
  const resetButton = document.createElement("button");
  resetButton.textContent = "Reset Caméra";
  resetButton.style.cssText = buttonStyle;
  resetButton.style.top = `${buttonsStartTop}px`;

  resetButton.addEventListener("mouseenter", () => buttonHoverOn(resetButton));
  resetButton.addEventListener("mouseleave", () => buttonHoverOff(resetButton));
  resetButton.addEventListener("click", () => {
    setSliderValue("rotation", 0);
    setSliderValue("height", Math.PI / 2);
    setSliderValue("distance", 3);
  });

  document.body.appendChild(resetButton);
}
