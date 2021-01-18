const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WMBar, ActivitiesBarHidder } = Me.imports.src.bar;

class Extension {
    enable() {
        this.bar = new WMBar();
        this.activitiesHidder = new ActivitiesBarHidder();
        
    	Main.panel.addToStatusArea('wm-bar', this.bar, 0, 'left');
    }

    disable() {
    	this.bar.destroy();
        this.activitiesHidder.destroy();
    }
}