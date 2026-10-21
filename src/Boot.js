window.LB = window.LB || {};
// ============================================================
// Boot — one-time setup: waits briefly for the web fonts, then opens the Preloader.
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.sound.pauseOnBlur = false;
    const go = () => this.scene.start('Preloader');
    if (document.fonts && document.fonts.load) {
      Promise.race([
        Promise.all([document.fonts.load('800 40px Fraunces'), document.fonts.load('800 16px Nunito')]),
        new Promise(r => setTimeout(r, 1500))
      ]).then(go, go);
    } else go();
  }
}
