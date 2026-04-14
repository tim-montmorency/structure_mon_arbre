export function createGUI(cameraParams, updateURL, toggleDotsVisibility, domElement) {
  const baseRight = 20;
  const sliderHeight = 110;
  const gap = 10;
  const numButtons = toggleDotsVisibility ? 2 : 1;
  const totalHeight = 3 * (sliderHeight + gap) + numButtons * (50 + gap);
  const baseTop = Math.round((window.innerHeight - totalHeight) / 2);

  // --- Mise à jour des sliders ---
  const updateSliders = () => {
    const sliders = document.querySelectorAll("input[type='range']");
    if (sliders.length >= 3) {
      sliders[0].value = cameraParams.theta;
      sliders[0].nextElementSibling.textContent = cameraParams.theta.toFixed(2);
      sliders[1].value = cameraParams.phi;
      sliders[1].nextElementSibling.textContent = cameraParams.phi.toFixed(2);
      sliders[2].value = cameraParams.radius;
      sliders[2].nextElementSibling.textContent = cameraParams.radius.toFixed(2);
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
    cameraParams.theta -= dx * rotateSpeed;
    cameraParams.theta = Math.max(-Math.PI, Math.min(Math.PI, cameraParams.theta));
    cameraParams.phi -= dy * rotateSpeed;
    cameraParams.phi = Math.max(0.01, Math.min(Math.PI / 2, cameraParams.phi));

    updateURL();
    updateSliders();
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
      cameraParams.radius += e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
      cameraParams.radius = Math.max(1, Math.min(50, cameraParams.radius));
      updateURL();
      updateSliders();
    },
    { passive: false },
  );

  // --- Sliders ---
  const sliderDefs = [
    { key: "theta", min: -Math.PI, max: Math.PI, label: "Gauche / Droite" },
    { key: "phi", min: 0.01, max: Math.PI / 2, label: "Haut / Bas" },
    { key: "radius", min: 1, max: 5, label: "Zoom" },
  ];

  sliderDefs.forEach((slider, index) => {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      right: ${baseRight}px;
      top: ${baseTop + index * (sliderHeight + gap)}px;
      width: 320px;
      background: rgba(15, 15, 15, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
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
    sliderInput.step = slider.key === "radius" ? 0.1 : 0.01;
    sliderInput.value = cameraParams[slider.key];
    sliderInput.style.cssText = `
      width: 100%;
      height: 4px;
      accent-color: #ffffff;
      cursor: pointer;
      display: block;
    `;

    const valueDisplay = document.createElement("div");
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
    border-radius: 8px;
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
    cameraParams.theta = 0;
    cameraParams.phi = Math.PI / 2;
    cameraParams.radius = 3;
    updateURL();
    updateSliders();  // ← utilise maintenant la fonction locale
  });

  document.body.appendChild(resetButton);

  // Points de Coupe
  if (toggleDotsVisibility) {
    const dotsButton = document.createElement("button");
    dotsButton.textContent = "Points de Coupe";
    dotsButton.style.cssText = buttonStyle;
    dotsButton.style.top = `${buttonsStartTop + 50 + gap}px`;

    dotsButton.addEventListener("mouseenter", () => buttonHoverOn(dotsButton));
    dotsButton.addEventListener("mouseleave", () => buttonHoverOff(dotsButton));
    dotsButton.addEventListener("click", () => toggleDotsVisibility());

    document.body.appendChild(dotsButton);
  }
}