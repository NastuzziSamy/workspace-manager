const { Shell } = imports.gi;

const WORKSPACE_APPS = [
    'org.gnome.Terminal.desktop',
    'firefox.desktop',
    'codium.desktop',
    'org.gnome.Nautilus.desktop',
    'spotify.desktop',
    'org.gnome.Evolution.desktop',
    null,
    null,
    null,
    'slack_slack.desktop',
    null,
];

var openNewWindow = (app) => app.open_new_window(global.get_current_time());

var focusWindow = (window) => window.activate(global.get_current_time());

var getPreferedApp = (index) => {
    const preferedWorkspaceApp = WORKSPACE_APPS[index];
    const appSystem = Shell.AppSystem.get_default();
    if (!preferedWorkspaceApp || !appSystem) return;

    return appSystem.lookup_app(preferedWorkspaceApp);
};

var openPreferedApp = (index) => {
    const app = getPreferedApp(index);
    if (!app) return;

    openNewWindow(app);
};

var getWindowApp = (window) => {
    const windowTracker = Shell.WindowTracker.get_default();
    if (!windowTracker) return;

    return windowTracker.get_window_app(window);
};

var closeWindow = (window) => window.delete(global.get_current_time());

var closeAllWindows = (index) => {
    const workspace = global.workspace_manager.get_workspace_by_index(index);
    if (!workspace) return;

    const windows = workspace.list_windows();

    for (const key in windows) {
        closeWindow(windows[key]);
    }
}

var removeWorkspace = (index) => {
    const workspace = global.workspace_manager.get_workspace_by_index(index);
    if (!workspace) return;

    global.workspace_manager.removeWorkspace(workspace, global.get_current_time());
}