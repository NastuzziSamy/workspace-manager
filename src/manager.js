const { Clutter, Meta, Shell, Gio, GObject, St } = imports.gi;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Handler = Main.windowAttentionHandler;

const { SignalMixin, KeybindingMixin } = Me.imports.src.mixins;
const { WorkspacesBar } = Me.imports.src.bar.index;
const { isWindowOnOneWorkspace, getFocusedWindow, getWorkspace, getWindows, goToWorkspaceIndex, moveWindowToWorkspaceIndex } = Me.imports.src.helper;
const { WORKSPACE_SCHEMA_KEY, KEYBINDINGS_SCHEMA_KEY, GNOME_SCHEMA_KEY, GNOME_KEYBINDINGS_SCHEMA_KEY, WORKSPACES_KEY, GO_TO_WORKSPACE_I_KEY, MOVE_WINDOW_TO_WORKSPACE_I_KEY, MAX_N_WORKSPACES, MOVE_TO_WORKSPACE_I_KEY, SWITCH_TO_WORKSPACE_I_KEY } = Me.imports.src.consts;

var WorkspaceManager = class {
    manage() {
        this.reset();

        this.trackSettings();

        this.connectSignals();
        this.addKeybindings();
    }

    reset() {
        this.windows = [];
        this.names = [];
        this.windowsNeedsAttention = [];

        this.lastWorkspace;
        this.currentWorkspace = global.workspace_manager.get_active_workspace();
        this.nWorkspaces = global.workspace_manager.get_n_workspaces();

        this.updateActiveWorkspace();
        this.updateWorkspaceNames();
        this.updateWorkspaceWindows();

        for (var i = 0; i < 12; i++) {
            Me.settings.set(GNOME_KEYBINDINGS_SCHEMA_KEY, MOVE_TO_WORKSPACE_I_KEY + (i + 1), []);
            Me.settings.set(GNOME_KEYBINDINGS_SCHEMA_KEY, SWITCH_TO_WORKSPACE_I_KEY + (i + 1), []);
        }
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
        this.connectSignal(global.workspace_manager, 'notify::n-workspaces', () => this.updateNWorkspaces());
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

    addKeybindings() {
        const settings = Me.settings.get(KEYBINDINGS_SCHEMA_KEY);

        for (let i = 0; i < MAX_N_WORKSPACES; i++) {
            this.addKeybinding(
                GO_TO_WORKSPACE_I_KEY + (i + 1),
                settings,
                () => this.goToWorkspaceIndex(i)
            );

            this.addKeybinding(
                MOVE_WINDOW_TO_WORKSPACE_I_KEY + (i + 1),
                settings,
                () => this.moveFocusedWindowToWorkspaceIndex(i)
            );
        }

        this.addKeybinding(
            'go-to-last-workspace',
            settings,
            () => this.goToLastWorkspace()
        );

        this.addKeybinding(
            'go-to-previous-workspace',
            settings,
            () => this.goToPreviousWorkspace()
        );

        this.addKeybinding(
            'go-to-next-workspace',
            settings,
            () => this.goToNextWorkspace()
        );
    }

    update() {
        if (this.bar) {
            this.bar.update();
        }
    }

    updateNWorkspaces() {
        this.nWorkspaces = global.workspace_manager.get_n_workspaces();

        this.update();
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
            || !isWindowOnOneWorkspace(window)
            || getFocusedWindow() === window) {
            return;
        }

        this.windowsNeedsAttention.push(window);

        this.update();
    }

    updateFocusedWindow(workspace) {
        const focusedWindow = getFocusedWindow(workspace);
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
        const workspace = getWorkspace(index);

        workspace.connect('window-added', () => this.updateWorkspaceWindows());
        workspace.connect('window-removed', () => this.updateWorkspaceWindows());

        this.update();
    }

    updateActiveWorkspace() {
        this.lastWorkspace = this.currentWorkspace;
        this.currentWorkspace = global.workspace_manager.get_active_workspace();

        this.updateFocusedWindow(this.currentWorkspace);

        this.update();
    }

    updateWorkspaceNames() {
        this.names = Me.settings.get(GNOME_SCHEMA_KEY, WORKSPACES_KEY);

        this.update();
    }

    updateWorkspaceWindows() {
        this.windows = [];

        for (let index = 0; index < this.nWorkspaces; index++) {
            const workspace = getWorkspace(index);

            this.windows[index] = getWindows(workspace);
        }

        this.update();
    }

    goToWorkspaceIndex(index) {
        if (this.currentWorkspace.index() === index) {
            Main.overview.toggle();

            return
        }

        goToWorkspaceIndex(index);
    }

    moveFocusedWindowToWorkspaceIndex(index) {
        moveWindowToWorkspaceIndex(getFocusedWindow(), index);
    }

    goToLastWorkspace() {
        if (this.lastWorkspace) {
            goToWorkspace(this.lastWorkspace);

            return true;
        }

        return false;
    }

    goToPreviousWorkspace() {
        const index = this.currentWorkspace.index();
        const goToIndex = (index - 1) % this.nWorkspaces;

        if (Me.settings.get(WORKSPACE_SCHEMA_KEY, 'cycle-focus-workspaces') || goToIndex < index) {
            goToWorkspace(getWorkspace(goToIndex));

            return true;
        }

        return false;
    }

    goToNextWorkspace() {
        const index = this.currentWorkspace.index();
        const goToIndex = (index + 1) % this.nWorkspaces;

        if (Me.settings.get(WORKSPACE_SCHEMA_KEY, 'cycle-focus-workspaces') || goToIndex > index) {
            goToWorkspace(getWorkspace(goToIndex));

            return true;
        }

        return false;
    }
};

Object.assign(WorkspaceManager.prototype, SignalMixin);
Object.assign(WorkspaceManager.prototype, KeybindingMixin);
