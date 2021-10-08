const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WorkspaceManager } = Me.imports.src.manager;
const { Settings } = Me.imports.src.settings;
const { WORKSPACE_SCHEMA_KEY, SCHEMAS } = Me.imports.src.consts;
const { settings, setSettings } = Me.imports.src.helper;
// const { PrefsWidget } = Me.imports.src.widget;


var Extension = class {
    constructor() {
        this.loadSettings();

        if (!global.managers) {
            global.managers = {};
        }

        if (settings.debug) {
            global.managers._workspace = Me;
        }
    }

    loadSettings() {
        Me.settings = new Settings(SCHEMAS);

        for (const key in settings) {
            Me.settings.follow(WORKSPACE_SCHEMA_KEY, key, (value) => setSettings(key, value));
        }
    }

    enable() {
        global.managers.workspace = new WorkspaceManager();

        global.managers.workspace.manage();
    }

    disable() {
        Me.settings.disconnectSignals();

        if (!global.managers) {
            global.managers = {};
        }

        if (global.managers.workspace) {
            global.managers.workspace.destroy();
        }

        global.managers.workspace = undefined;
    }
};


// var Prefs = class {
//     constructor() {
//         this.widget = null;
//     }

//     getWidget() {
//         if (!this.widget) {
//             this.widget = new PrefsWidget();
//         }

//         return this.widget;
//     }
// };