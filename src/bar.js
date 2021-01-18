const { Clutter, Gio, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const Main = imports.ui.main;

var WORKSPACES_SCHEMA = "org.gnome.desktop.wm.preferences";
var WORKSPACES_KEY = "workspace-names";


const WMBar = GObject.registerClass(
    class WMBar extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'WMbar');
            
            this.wsSettings = new Gio.Settings({ schema: WORKSPACES_SCHEMA });
            this.wsNamesSignal = this.wsSettings.connect(`changed::${WORKSPACES_KEY}`, this.updateWorkspaceNames.bind(this));
        
            this.layout = new St.BoxLayout({});
            this.updateWorkspaceNames();
            this.add_child(this.layout);
            
            this.wsActiveSignal = global.workspace_manager.connect('active-workspace-changed', this.updateWorkspaceList.bind(this));
            this.wsNumberSignal = global.workspace_manager.connect('notify::n-workspaces', this.updateWorkspaceList.bind(this));
        }
    
        destroy() {
            global.workspace_manager.disconnect(this.wsActiveSignal);
            global.workspace_manager.disconnect(this.wsNumberSignal);
            this.wsSettings.disconnect(this.wsNamesSignal);

            this.layout.destroy();
            super.destroy();
        }
        
        updateWorkspaceNames() {
            this.wsNames = this.wsSettings.get_strv(WORKSPACES_KEY);

            this.updateWorkspaceList();
        }
    
        updateWorkspaceList() {
            this.layout.destroy_all_children();
            
            this.wsCount = global.workspace_manager.get_n_workspaces();
            this.activeWsIndex = global.workspace_manager.get_active_workspace_index();
            
            for (let wsIndex = 0; wsIndex < this.wsCount; ++wsIndex) {
                const wsBox = new St.Bin({ visible: true, reactive: true, can_focus: true, track_hover: true });	
                wsBox.label = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
                
                if (wsIndex == this.activeWsIndex) {
                    wsBox.label.style_class = 'workspace-active';
                } else {
                    wsBox.label.style_class = 'workspace-inactive';
                }

                if (this.wsNames[wsIndex]) {
                    wsBox.label.set_text(this.wsNames[wsIndex]);
                } else {
                    wsBox.label.set_text((wsIndex + 1));
                }

                wsBox.set_child(wsBox.label);
                wsBox.connect('button-press-event', () => this.selectWs(wsIndex) );
                
                this.layout.add_actor(wsBox);
            };
        }
    
        selectWs(wsIndex) {
            if (global.workspace_manager.get_active_workspace_index() === wsIndex) {
                Main.overview.toggle();
            }
            global.workspace_manager.get_workspace_by_index(wsIndex).activate(global.get_current_time());
        }
    }
);


class ActivitiesBarHidder {
    constructor() {
        this.activitiesContainer = Main.panel?.statusArea['activities']?.container;

        this.hide();
    }

    hide() {
        if (this.activitiesContainer) {
            this.activitesShown = this.activitiesContainer.is_visible();
        } else {
            this.activitesShown = false;
        }

        this.show(false);
    }

    show(status) {
        if (this.activitiesContainer) {
            if (!Main.sessionMode.isLocked && status) {
                this.activitiesContainer.show();
            } else {
                this.activitiesContainer.hide();
            }
        }
    }

    destroy() {
        this.show(this.activitesShown);
    }
}