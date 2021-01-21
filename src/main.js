const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { ActivitiesBarHidder } = Me.imports.src.bar.activitiesHidder;
const { WMBar } = Me.imports.src.bar.wmBar;
var Extension = class {
    enable() {
        this.bar = new WMBar();
        this.activitiesHidder = new ActivitiesBarHidder();
        
        Main.panel.addToStatusArea('wm-bar', this.bar, 0, 'left');
    }

    disable() {
        this.bar.destroy();
        this.activitiesHidder.destroy();
    }
};
