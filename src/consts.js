var WORKSPACE_SCHEMA_KEY = 'workspace';
var KEYBINDINGS_SCHEMA_KEY = 'keybindings';
var GNOME_SCHEMA_KEY = 'gnome_prefs';
var GNOME_KEYBINDINGS_SCHEMA_KEY = 'gnome_keybindings';

var SCHEMAS = {
    [WORKSPACE_SCHEMA_KEY]: 'org.gnome.shell.extensions.managers.workspace',
    [KEYBINDINGS_SCHEMA_KEY]: 'org.gnome.shell.extensions.managers.workspace.keybindings',
    [GNOME_SCHEMA_KEY]: 'org.gnome.desktop.wm.preferences',
    [GNOME_KEYBINDINGS_SCHEMA_KEY]: 'org.gnome.desktop.wm.keybindings',
};

var WORKSPACES_KEY = 'workspace-names';
var GO_TO_WORKSPACE_I_KEY = 'go-to-workspace-';
var MOVE_WINDOW_TO_WORKSPACE_I_KEY = 'move-window-to-workspace-';
var MOVE_TO_WORKSPACE_I_KEY = 'move-to-workspace-';
var SWITCH_TO_WORKSPACE_I_KEY = 'switch-to-workspace-';
var MAX_N_WORKSPACES = 36;

var WORKSPACE_APPS = [
    'org.gnome.Terminal.desktop',
    'firefox.desktop',
    'codium.desktop',
    'org.gnome.Nautilus.desktop',
    'spotify.desktop',
    'org.gnome.Evolution.desktop',
    null,
    null,
    'slack_slack.desktop',
    null,
];
