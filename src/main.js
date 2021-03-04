const { Gio } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WorkspaceManager } = Me.imports.src.manager;
const { Settings } = Me.imports.src.settings;
// const { PrefsWidget } = Me.imports.src.widget;

const SCHEMAS = {
    'workspace': 'org.gnome.shell.extensions.managers.workspace',
    'keybindings': 'org.gnome.shell.extensions.managers.workspace.keybindings',
}


var Extension = class {
    constructor() {
        this.loadSettings();
    }

    loadSettings() {
        this.settings = new Settings(SCHEMAS);
    }

    enable() {
        if (!global.managers) {
            global.managers = {};
        }

        global.managers.workspace = new WorkspaceManager(this.settings);
    }

    disable() {
        if (!global.managers) return;

        if (global.managers.workspace) {
            global.managers.workspace.destroy();
        }

        global.managers.workspace = undefined;
    }
};
