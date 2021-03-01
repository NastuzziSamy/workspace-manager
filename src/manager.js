const { Clutter, Meta, Gio, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Handler = Main.windowAttentionHandler;

const { SignalMixin } = Me.imports.src.mixins;
const { WMBar } = Me.imports.src.bar.wmBar;
const helper = Me.imports.src.helper;

var WorkspaceManager = class {
    constructor() {
        this.addBar();
        this.disableAttentionHandler();

        this.connectSignals();
    }

    destroy() {
        this.disconnectSignals();
    }

    connectSignals() {
        this.connectSignal(Main.layoutManager, 'startup-complete', () => this.startupCompleted());
    }

    addBar() {
        this.bar = new WMBar();

        Main.panel.addToStatusArea('wm-bar', this.bar, 0, 'left');
    }

    removeBar() {
        this.bar.destroy();

        this.bar = null;
    }

    disableAttentionHandler() {
        if (Handler._windowDemandsAttentionId) {
            global.display.disconnect(Handler._windowDemandsAttentionId);
            Handler._windowDemandsAttentionId = null;
        }

        if (Handler._windowMarkedUrgentId) {
            global.display.disconnect(Handler._windowMarkedUrgentId);
            Handler._windowMarkedUrgentId = null;
        }
    }

    enableAttentionHandler() {
        if (!Handler._windowDemandsAttentionId) {
            Handler._windowDemandsAttentionId = global.display.connect(
                'window-demands-attention', Handler._onWindowDemandsAttention
            );
        }

        if (!Handler._windowMarkedUrgentId) {
            Handler._windowMarkedUrgentId = global.display.connect(
                'window-marked-urgent', Handler._onWindowDemandsAttention
            );
        }
    }

    startupCompleted() {
        this.bar.reset();
    }
};

Object.assign(WorkspaceManager.prototype, SignalMixin);
