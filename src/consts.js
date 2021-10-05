var WORKSPACE_SCHEMA_KEY = 'workspace';
var KEYBINDINGS_SCHEMA_KEY = 'keybindings';
var GNOME_SCHEMA_KEY = 'gnome_prefs';

var SCHEMAS = {
    [WORKSPACE_SCHEMA_KEY]: 'org.gnome.shell.extensions.managers.workspace',
    [KEYBINDINGS_SCHEMA_KEY]: 'org.gnome.shell.extensions.managers.workspace.keybindings',
    [GNOME_SCHEMA_KEY]: 'org.gnome.desktop.wm.preferences',
};

var WORKSPACES_KEY = 'workspace-names';
var SWITCH_TO_WORKSPACE_I_KEY = 'switch-to-workspace-';
var MOVE_TO_WORKSPACE_I_KEY = 'move-to-workspace-';
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
