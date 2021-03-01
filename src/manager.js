const { Clutter, Meta, Gio, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Handler = Main.windowAttentionHandler;

const { SignalMixin } = Me.imports.src.mixins;
const { WMBar } = Me.imports.src.bar.wmBar;
const helper = Me.imports.src.helper;

const WORKSPACES_SCHEMA = "org.gnome.desktop.wm.preferences";
const WORKSPACES_KEY = "workspace-names";


var WorkspaceManager = class {
    constructor() {
        this.reset();

        this.addBar();
        this.disableAttentionHandler();

        this.connectSignals();
    }

    destroy() {
        this.disconnectSignals();
    }

    connectSignals() {
        this.connectSignal(Main.layoutManager, 'startup-complete', () => this.startupCompleted());

        this.connectSignal(global.display, 'window-demands-attention', (_, window) => this.windowNeedsFocus(window));
        this.connectSignal(global.display, 'window-marked-urgent', (_, window) => this.windowNeedsFocus(window));
        this.connectSignal(global.display, 'window-created', (_, window) => this.updateCreatedWindow(window));
        this.connectSignal(global.display, 'notify::focus-window', () => this.updateFocusedWindow());
        this.connectSignal(global.workspace_manager, 'notify::n-workspaces', () => this.updateWorkspaces());
        this.connectSignal(global.window_manager, 'size-changed', () => this.updateWorkspaces());
        this.connectSignal(global.workspace_manager, 'active-workspace-changed', () => this.updateActiveWorkspace());
        this.connectSignal(this.wsSettings, `changed::${WORKSPACES_KEY}`, () => this.updateWorkspaceNames());
    }

    reset() {
        this.wsSettings = new Gio.Settings({ schema: WORKSPACES_SCHEMA });

        this.wsWindows = [];
        this.wsNames = [];
        this.windowsNeedsAttention = [];

        this.updateWorkspaces(false);
        this.updateActiveWorkspace(false);
        this.updateWorkspaceNames(false);
        this.updateWorkspaceWindows();
    }

    update() {
        if (this.bar) {
            this.bar.update();
        }
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

    hasWorkspaceWindows(index) {
        return this.wsWindows[index] && this.wsWindows[index].length > 0;
    }

    startupCompleted() {
        this.reset();
    }

    windowNeedsFocus(window) {
        if (this.windowsNeedsAttention.includes(window)
            || !helper.isWindowOnOneWorkspace(window)
            || helper.getFocusedWindow() === window) {
            return;
        }

        this.windowsNeedsAttention.push(window);

        this.update();
    }

    updateFocusedWindow(workspace) {
        const focusedWindow = helper.getFocusedWindow(workspace);
        if (!focusedWindow) return;

        const index = this.windowsNeedsAttention.indexOf(focusedWindow);

        if (index > -1) {
            this.windowsNeedsAttention.splice(index, 1);

            this.update();
        }
    }

    updateCreatedWindow(window) {
        this.windowNeedsFocus(window);

        this.updateWorkspaceWindows();
    }

    updateWorkspaces(update=true) {
        for (let index = 0; index < global.workspace_manager.get_n_workspaces(); index++) {
            const workspace = global.workspace_manager.get_workspace_by_index(index);

            workspace.connect('window-added', () => this.updateWorkspaceWindows());
            workspace.connect('window-removed', () => this.updateWorkspaceWindows());
        }

        if (update) {
            this.update();
        }
    }

    updateActiveWorkspace(update=true) {
        const workspace = global.workspace_manager.get_active_workspace();

        this.updateFocusedWindow(workspace);

        if (update) {
            this.update();
        }
    }

    updateWorkspaceNames(update=true) {
        this.wsNames = this.wsSettings.get_strv(WORKSPACES_KEY);

        if (update) {
            this.update();
        }
    }

    updateWorkspaceWindows(update=true) {
        this.wsWindows = [];

        for (let index = 0; index < global.workspace_manager.get_n_workspaces(); index++) {
            const workspace = global.workspace_manager.get_workspace_by_index(index);

            this.wsWindows[index] = helper.getWindows(workspace);
        }

        if (update) {
            this.update();
        }
    }
};

Object.assign(WorkspaceManager.prototype, SignalMixin);
