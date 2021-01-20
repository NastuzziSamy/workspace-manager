const { Clutter, Meta, Gio, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const Main = imports.ui.main;

const WORKSPACES_SCHEMA = "org.gnome.desktop.wm.preferences";
const WORKSPACES_KEY = "workspace-names";


var WMBar = GObject.registerClass(
    class WMBar extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'WMbar');
            
            this.wsSettings = new Gio.Settings({ schema: WORKSPACES_SCHEMA });
        
            this.layout = new St.BoxLayout({});
            this.add_child(this.layout);

            this.updateWorkspaces(false);
            this.updateActiveWorkspace(false);
            this.updateWorkspaceNames(false);
            this.updateWorkspaceWindows();

            this.setSignals();
        }
    
        destroy() {
            global.display.disconnect(this.windowCreateSignal);
            global.workspace_manager.disconnect(this.wsActiveSignal);
            global.workspace_manager.disconnect(this.wsNumberSignal);
            this.wsSettings.disconnect(this.wsNamesSignal);

            this.layout.destroy();
            super.destroy();
        }

        setSignals() {
            this.connect('scroll-event', (_, event) => {
                const direction = event.get_scroll_direction();

                switch (direction) {
                    case Clutter.ScrollDirection.UP:
                    case Clutter.ScrollDirection.DOWN:
                        this.selectNextWs(direction === Clutter.ScrollDirection.DOWN);
                        break;
                }
            });

            this.windowCreateSignal = global.display.connect('window-created', () => this.updateWorkspaceWindows());
            this.windowGrabEndSignal = global.display.connect('grab-op-end', (_0, _1, metaWindow, op) => this.moveActiveGrabbedWindow(metaWindow, op));
            this.wsNumberSignal = global.workspace_manager.connect('notify::n-workspaces', () => this.updateWorkspaces());
            this.wsActiveSignal = global.workspace_manager.connect('active-workspace-changed', () => this.updateActiveWorkspace());

            this.wsNamesSignal = this.wsSettings.connect(`changed::${WORKSPACES_KEY}`, () => this.updateWorkspaceNames());
        }
        
        updateWorkspaces(reload=true) {
            this.wsCount = global.workspace_manager.get_n_workspaces();

            for (let index = 0; index < global.workspace_manager.get_n_workspaces(); index++) {
                const workspace = global.workspace_manager.get_workspace_by_index(index);

                workspace.connect('window-added', () => this.updateWorkspaceWindows());
                workspace.connect('window-removed', () => this.updateWorkspaceWindows());
            }

            if (reload) {
                this.updateWorkspaceList();
            }
        }
        
        updateActiveWorkspace(reload=true) {
            this.activeWsIndex = global.workspace_manager.get_active_workspace_index();

            if (reload) {
                this.updateWorkspaceList();
            }
        }

        updateWorkspaceNames(reload=true) {
            this.wsNames = this.wsSettings.get_strv(WORKSPACES_KEY);

            if (reload) {
                this.updateWorkspaceList();
            }
        }

        updateWorkspaceWindows(reload=true) {
            this.msWindows = [];

            for (let index = 0; index < global.workspace_manager.get_n_workspaces(); index++) {
                const workspace = global.workspace_manager.get_workspace_by_index(index);

                this.msWindows[index] = workspace.list_windows().filter((window) => {
                    return !window.is_always_on_all_workspaces() && !window.is_on_all_workspaces();
                });
            }

            if (reload) {
                this.updateWorkspaceList();
            }
        }
    
        updateWorkspaceList() {
            this.layout.destroy_all_children();
            
            for (let index = 0; index < this.wsCount; ++index) {
                const wsBox = new St.Bin({ visible: true, reactive: true, can_focus: true, track_hover: true });	
                wsBox.label = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
                
                if (index == this.activeWsIndex) {
                    wsBox.label.style_class = 'workspace-active';
                } else {
                    wsBox.label.style_class = 'workspace-inactive';
                }

                if (this.msWindows[index].length === 0) {
                    wsBox.label.style_class += ' workspace-empty';
                } else {
                    wsBox.label.style_class += ' workspace-full';
                }

                if (this.wsNames[index]) {
                    wsBox.label.set_text(this.wsNames[index]);
                } else {
                    wsBox.label.set_text((index + 1));
                }

                wsBox.set_child(wsBox.label);
                wsBox.connect('button-press-event', () => this.selectWs(index));
                
                this.layout.add_actor(wsBox);
            };
        }
    
        selectWs(index) {
            if (global.workspace_manager.get_active_workspace_index() === index) {
                Main.overview.toggle();
            }
            
            global.workspace_manager.get_workspace_by_index(index).activate(global.get_current_time());
        }
    
        selectNextWs(previous) {
            if (previous) {
                return this.selectWs(this.activeWsIndex === 0 ? (this.wsCount - 1) : (this.activeWsIndex - 1));
            }

            this.selectWs((this.activeWsIndex + 1) % this.wsCount);
        }

        getGlobalPosition() {
            let position = this.get_position();
            let parent = this.get_parent();

            while (parent) {
                position[0] += parent.get_position()[0];
                position[1] += parent.get_position()[1];

                parent = parent.get_parent();
            }

            return position;
        }

        getWorkspaceIndexUnderCursor() {
            const [posX, posY] = this.getGlobalPosition();
            const [width, height] = this.get_size();
            const [pointerX, pointerY] = global.get_pointer();

            if (pointerX < posX || pointerX > (posX + width) 
                || pointerY < posY || pointerY > (posY + height)) {
                    return null;
            }

            const children = this.layout.get_children();
            const [relativeX, relativeY] = [pointerX - posX, pointerY - posY];

            for (const key in children) {
                const workspaceBin = children[key];
                const [binX, binY] = workspaceBin.get_position();
                const [binWidth, binHeight] = workspaceBin.get_size();

                if (relativeX > binX && relativeX < (binX + binWidth) 
                   && relativeY > binY && relativeY < (binY + binHeight)) {
                    return key;
                }
            }
        }

        moveActiveGrabbedWindow(metaWindow, op) {
            if (op === Meta.GrabOp.MOVING) {
                const wsIndex = this.getWorkspaceIndexUnderCursor();

                if (wsIndex !== null) {
                    metaWindow.change_workspace_by_index(wsIndex, true);

                    global.display.get_workspace_manager().get_workspace_by_index(wsIndex)
                        .activate_with_focus(metaWindow, global.get_current_time());
                }
            }
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