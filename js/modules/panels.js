export default class PanelManager {
  constructor() {
    this.setupPanels();
  }

  setupPanels() {
    $('.panel').each((_, panel) => {
      const $panel = $(panel);
      const $titlebar = $panel.find('.panel__titlebar');
      const $toggle = $panel.find('.panel__toggle');
      const $content = $panel.find('.panel__content');

      // Make panel draggable
      $panel.draggable({
        handle: '.panel__titlebar',
        containment: '.playground',
        snap: true,
        snapTolerance: 10
      });
    });
  }
}