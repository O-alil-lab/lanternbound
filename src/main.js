// ============================================================
// Lanternbound — game start-up (Phaser configuration)
// ============================================================
LB.game = new Phaser.Game({
  // WebGL when served from a web server; Canvas when index.html is opened straight from disk
  // (browsers block WebGL from reading local image files).
  type: location.protocol === 'file:' ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 704,
  backgroundColor: '#e9e0cc',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: true },
  // Lets the game load images when index.html is opened straight from disk
  loader: { imageLoadType: 'HTMLImageElement' },
  scene: [BootScene, TitleScene, StarterScene, WorldScene, BattleScene]
});
