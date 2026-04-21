import GUI from 'lil-gui';

export function createGUI(cameraParams, updateURL) {
  const gui = new GUI();

  gui.add(cameraParams, 'theta', -Math.PI, Math.PI)
    .name('Gauche / Droite')
    .onChange(updateURL).listen();

  gui.add(cameraParams, 'phi', 0.01, Math.PI / 2)
    .name('Haut / Bas')
    .onChange(updateURL).listen();

  gui.add(cameraParams, 'radius', 5, 20)
    .name('Zoom')
    .onChange(updateURL).listen();

  gui.add({
    reset: () => {
      cameraParams.theta = 0;
      cameraParams.phi = Math.PI / 2;
      cameraParams.radius = 5;
      updateURL(); // 🔥 important aussi
    }
  }, 'reset').name('Reset Caméra');

  return gui;
}