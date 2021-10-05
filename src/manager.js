const { Clutter, Meta, Shell, Gio, GObject, St } = imports.gi;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Handler = Main.windowAttentionHandler;

const { SignalMixin, KeybindingMixin } = Me.imports.src.mixins;
const { WorkspacesBar } = Me.imports.src.bar.index;
const helper = Me.imports.src.helper;
const { WORKSPACE_SCHEMA_KEY, KEYBINDINGS_SCHEMA_KEY, GNOME_SCHEMA_KEY, WORKSPACES_KEY, SWITCH_TO_WORKSPACE_I_KEY, MOVE_TO_WORKSPACE_I_KEY, MAX_N_WORKSPACES } = Me.imports.src.consts;

var WorkspaceManager = class {
    manage() {
        this.reset();

        this.trackSettings();

        this.connectSignals();
        this.addKeybindings();
    }

    destroy() {
        this.removeBar();

        this.removeKeybindings();
        this.disconnectSignals();
    }

    connectSignals() {
        this.connectSignal(Main.layoutManager, 'startup-complete', () => this.startupCompleted());

        this.connectSignal(global.display, 'window-demands-attention', (_, window) => this.windowNeedsFocus(window));
        this.connectSignal(global.display, 'window-marked-urgent', (_, window) => this.windowNeedsFocus(window));
        this.connectSignal(global.display, 'window-created', (_, window) => this.updateCreatedWindow(window));

        this.connectSignal(Shell.WindowTracker.get_default(), 'tracked-windows-changed', () => this.update());

        this.connectSignal(global.display, 'notify::focus-window', () => this.updateFocusedWindow());
        this.connectSignal(global.workspace_manager, 'workspace-added', (_, index) => this.handleCreatedWorkspaceIndex(index));
        this.connectSignal(global.workspace_manager, 'notify::n-workspaces', () => this.update());
        this.connectSignal(global.workspace_manager, 'active-workspace-changed', () => this.updateActiveWorkspace());
        this.connectSignal(global.window_manager, 'size-changed', () => this.update());
    }

    trackSettings() {
        Me.settings.track(GNOME_SCHEMA_KEY, WORKSPACES_KEY, () => this.updateWorkspaceNames());

        Me.settings.follow(WORKSPACE_SCHEMA_KEY, 'enable-workspace-bar',
            () => this.addBar(), () => this.removeBar());

        Me.settings.follow(WORKSPACE_SCHEMA_KEY, 'disable-attention-notification',
            () => this.disableAttentionHandler(), () => this.enableAttentionHandler());
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

    addBar() {
        this.bar = new WorkspacesBar();

        Main.panel.addToStatusArea(this.bar.accessible_name, this.bar, 0, 'left');

        Mainloop.idle_add(this.reset.bind(this));
    }

    removeBar() {
        if (this.bar) {
            this.bar.destroy();
        }

        this.bar = null;
    }

    addKeybindings() {
        const settings = Me.settings.get(KEYBINDINGS_SCHEMA_KEY);

        for (let i = 1; i <= MAX_N_WORKSPACES; i++) {
            this.addKeybinding(
                SWITCH_TO_WORKSPACE_I_KEY + i,
                settings,
                () => this.switchToWorkspace(i)
            );

            this.addKeybinding(
                MOVE_TO_WORKSPACE_I_KEY + i,
                settings,
                () => this.moveFocusedWindowToWorkspace(i)
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
        this.names = Me.settings.get(GNOME_SCHEMA_KEY, WORKSPACES_KEY);

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
Object.assign(WorkspaceManager.prototype, KeybindingMixin);
