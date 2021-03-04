const { Clutter, Meta, Shell, Gio, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Handler = Main.windowAttentionHandler;

const { SignalMixin } = Me.imports.src.mixins;
const { WorkspacesBar } = Me.imports.src.bar.index;
const helper = Me.imports.src.helper;

const WORKSPACES_SCHEMA = 'org.gnome.desktop.wm.preferences';
const WORKSPACES_KEY = 'workspace-names';
const SWITCH_TO_WORKSPACE_I_KEY = 'keybindings.switch-to-workspace-';
const MOVE_TO_WORKSPACE_I_KEY = 'keybindings.move-to-workspace-';
const MAX_N_WORKSPACES = 36;

var WorkspaceManager = class {
    constructor(settings) {
        this.wsSettings = new Gio.Settings({ schema: WORKSPACES_SCHEMA });
        this.settings = settings

        this.reset();

        this.trackSettings();

        // this.addKeybindings();

        this.connectSignals();
    }

    destroy() {
        // this.removeKeybindings();

        this.removeBar();

        this.disconnectSignals();
    }

    connectSignals() {
        this.connectSignal(Main.layoutManager, 'startup-complete', () => this.startupCompleted());

        this.connectSignal(global.display, 'window-demands-attention', (_, window) => this.windowNeedsFocus(window));
        this.connectSignal(global.display, 'window-marked-urgent', (_, window) => this.windowNeedsFocus(window));
        this.connectSignal(global.display, 'window-created', (_, window) => this.updateCreatedWindow(window));
        this.connectSignal(global.display, 'notify::focus-window', () => this.updateFocusedWindow());
        this.connectSignal(global.workspace_manager, 'workspace-added', (_, index) => this.handleCreatedWorkspaceIndex(index));
        this.connectSignal(global.workspace_manager, 'notify::n-workspaces', () => this.update());
        this.connectSignal(global.workspace_manager, 'active-workspace-changed', () => this.updateActiveWorkspace());
        this.connectSignal(global.window_manager, 'size-changed', () => this.update());
        this.connectSignal(this.wsSettings, `changed::${WORKSPACES_KEY}`, () => this.updateWorkspaceNames());
    }

    reset() {
        this.windows = [];
        this.names = [];
        this.windowsNeedsAttention = [];

        this.updateActiveWorkspace();
        this.updateWorkspaceNames();
        this.updateWorkspaceWindows();
    }

    update() {
        if (this.bar) {
            this.bar.update();
        }
    }

    trackSettings() {
        this.settings.follow('workspace', 'enable-workspace-bar',
            this.addBar.bind(this), this.removeBar.bind(this));

        this.settings.follow('workspace', 'disable-attention-notification',
            this.disableAttentionHandler.bind(this), this.enableAttentionHandler.bind(this));
    }

    addBar() {
        this.bar = new WorkspacesBar();

        Main.panel.addToStatusArea(this.bar.accessible_name, this.bar, 0, 'left');
    }

    removeBar() {
        if (this.bar) {
            this.bar.destroy();
        }

        this.bar = null;
    }

    addKeybindings() {
        for (let i = 0; i < MAX_N_WORKSPACES; i++) {
            Main.wm.addKeybinding(
                SWITCH_TO_WORKSPACE_I_KEY + i,
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL || Shell.ActionMode.OVERVIEW,
                () => this.switchToWorkspace(i)
            );

            Main.wm.addKeybinding(
                MOVE_TO_WORKSPACE_I_KEY + i,
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL || Shell.ActionMode.OVERVIEW,
                () => this.moveFocusedWindowToWorkspace(i)
            );
        }
    }

    removeKeybindings() {
        for (let i = 0; i < MAX_N_WORKSPACES; i++) {
            Main.wm.removeKeybinding(
                SWITCH_TO_WORKSPACE_I_KEY + i,
            );

            Main.wm.removeKeybinding(
                MOVE_TO_WORKSPACE_I_KEY + i,
            );
        }
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

    hasWindows(index) {
        return this.windows[index] && this.windows[index].length > 0;
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

    handleCreatedWorkspaceIndex(index) {
        const workspace = global.workspace_manager.get_workspace_by_index(index);

        workspace.connect('window-added', () => this.updateWorkspaceWindows());
        workspace.connect('window-removed', () => this.updateWorkspaceWindows());

        this.update();
    }

    updateActiveWorkspace() {
        const workspace = global.workspace_manager.get_active_workspace();

        this.updateFocusedWindow(workspace);

        this.update();
    }

    updateWorkspaceNames() {
        this.names = this.wsSettings.get_strv(WORKSPACES_KEY);

        this.update();
    }

    updateWorkspaceWindows() {
        this.windows = [];

        for (let index = 0; index < global.workspace_manager.get_n_workspaces(); index++) {
            const workspace = global.workspace_manager.get_workspace_by_index(index);

            this.windows[index] = helper.getWindows(workspace);
        }

        this.update();
    }

    switchToWorkspace(index) {
        if (global.workspace_manager.get_active_workspace_index() === index) {
            Main.overview.toggle();
        }

        global.workspace_manager.get_workspace_by_index(index).activate(global.get_current_time());
    }

    moveWindowToWorkspace(window, index) {
        window.change_workspace_by_index(wsIndex, true);

        global.display.get_workspace_manager().get_workspace_by_index(index)
            .activate_with_focus(window, global.get_current_time());
    }

    moveFocusedWindowToWorkspace() {
        this.moveWindowToWorkspace(helper.getFocusedWindow());
    }
};

Object.assign(WorkspaceManager.prototype, SignalMixin);
