const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { WorkspaceManager } = Me.imports.src.manager;


var Extension = class {
    enable() {
        if (!global.managers) {
            global.managers = {};
        }

        global.managers.workspace = new WorkspaceManager();
    }

    disable() {
        if (!global.managers) return;

        if (global.managers.workspace) {
            global.managers.workspace.destroy();
        }

        global.managers.workspace = undefined;
    }
};
