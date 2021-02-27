const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WMBar } = Me.imports.src.bar.wmBar;


var Extension = class {
    enable() {
        this.bar = new WMBar();

        Main.panel.addToStatusArea('wm-bar', this.bar, 0, 'left');
    }

    disable() {
        this.bar.destroy();

        this.bar = null;
    }
};
