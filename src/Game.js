window.LB = window.LB || {};
// ============================================================
// Game — entry file (loaded last). Phaser configuration + start-up.
// ============================================================
const config = {
  // WebGL normally; Canvas when index.html is opened straight from disk
  // (browsers block WebGL from reading local image files).
  type: location.protocol === 'file:' ? Phaser.CANVAS : Phaser.AUTO,
  width: 960,
  height: 704,
  parent: 'game-container',
  backgroundColor: '#e9e0cc',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: true },
  loader: { imageLoadType: 'HTMLImageElement', crossOrigin: 'anonymous' },
  scene: [BootScene, PreloaderScene, TitleScene, StarterScene, WorldScene, BattleScene]
};

// Bind the game to a top-level identifier
const game = new Phaser.Game(config);
LB.game = game;
LB.initUI(game);
