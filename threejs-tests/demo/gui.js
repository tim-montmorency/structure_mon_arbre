export function createGUI(cameraParams, updateURL, toggleDotsVisibility) {
  const baseRight = 20;
  const sliderHeight = 110;
  const gap = 10;
  const numButtons = toggleDotsVisibility ? 2 : 1;
  const totalHeight = 3 * (sliderHeight + gap) + numButtons * (50 + gap);
  const baseTop = Math.round((window.innerHeight - totalHeight) / 2);

  // Create individual slider containers
  const sliders = [
    { key: "theta", min: -Math.PI, max: Math.PI, label: "Gauche / Droite" },
    { key: "phi", min: 0.01, max: Math.PI / 2, label: "Haut / Bas" },
    { key: "radius", min: 1, max: 5, label: "Zoom" },
  ];

  sliders.forEach((slider, index) => {
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

  const buttonsStartTop = baseTop + sliders.length * (sliderHeight + gap) + gap;

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

  // Reset Camera Button
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
    document.querySelectorAll("input[type='range']").forEach((input, i) => {
      input.value = [cameraParams.theta, cameraParams.phi, cameraParams.radius][i];
      input.nextElementSibling.textContent = parseFloat(input.value).toFixed(2);
    });
  });

  document.body.appendChild(resetButton);

  // Points de Coupe Button
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
