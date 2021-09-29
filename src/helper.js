const { Shell } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WORKSPACE_APPS } = Me.imports.src.consts;

var log = (text) => global.log('[managers.workspace] ' + text);

var openNewWindow = (app) => app.open_new_window(global.get_current_time());

var focusWindow = (window) => window.activate(global.get_current_time());

var isWindowOnOneWorkspace = (window) => !window.is_always_on_all_workspaces() && !window.is_on_all_workspaces();

var getWindows = (workspace) => {
    return workspace.list_windows().filter(isWindowOnOneWorkspace);
};

var getFocusedWindow = (workspace=null) => {
    if (!workspace) {
        workspace = global.workspace_manager.get_active_workspace();
    }

    const windows = getWindows(workspace);

    for (const key in windows) {
        const window = windows[key];

        if (window.appears_focused) {
            return window;
        }
    }
};

var getWindowsByApp = (workspace) => {
    const byApps = {};
    const windows = getWindows(workspace);

    for (const key in windows) {
        const window = windows[key];
        const app = getWindowApp(window);
        const appName = app.get_name();

        if (byApps[appName]) {
            byApps[appName].push(window);
        } else {
            byApps[appName] = [window];
        }
    }

    return byApps;
};

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
};

var removeWorkspace = (index) => {
    const workspace = global.workspace_manager.get_workspace_by_index(index);
    if (!workspace) return;

    global.workspace_manager.remove_workspace(workspace, global.get_current_time());
};
