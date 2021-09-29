const { Gio } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WorkspaceManager } = Me.imports.src.manager;
const { Settings } = Me.imports.src.settings;
const { SCHEMAS } = Me.imports.src.consts;
// const { PrefsWidget } = Me.imports.src.widget;


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