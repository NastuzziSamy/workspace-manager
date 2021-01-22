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

    if (preferedWorkspaceApp) {
        return Shell.AppSystem.get_default().lookup_app(preferedWorkspaceApp);
    }
}

var openPreferedApp = (index) => {
    const app = getPreferedApp(index);

    if (app) {
        openNewWindow(app);
    }
}