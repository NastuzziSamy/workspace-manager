const { Clutter, Meta, Gio, GObject, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { MenuWindowItem } = Me.imports.src.bar.menuWindowItem;
const helper = Me.imports.src.helper;

const WORKSPACES_SCHEMA = "org.gnome.desktop.wm.preferences";
const WORKSPACES_KEY = "workspace-names";


var WMBar = GObject.registerClass(
    class WMBar extends PanelMenu.Button {
        _init() {
            super._init(0.5, 'WMbar');
            
            this.wsSettings = new Gio.Settings({ schema: WORKSPACES_SCHEMA });
        
            this.layout = new St.BoxLayout({});
            this.add_child(this.layout);

            this.updateWorkspaces(false);
            this.updateActiveWorkspace(false);
            this.updateWorkspaceNames(false);
            this.updateWorkspaceWindows();

            this.setSignals();
            this.createMenu();
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
            this.windowGrabEndSignal = global.display.connect('grab-op-end', (_0, _1, window, op) => (op === Meta.GrabOp.MOVING) && this.moveActiveGrabbedWindow(window, op));
            this.windowDragEndSignal = Main.overview.connect('window-drag-end', (_, window) => this.moveActiveGrabbedWindow(window));
            this.wsNumberSignal = global.workspace_manager.connect('notify::n-workspaces', () => this.updateWorkspaces());
            this.wsSizeSignal = global.window_manager.connect('size-changed', () => this.updateWorkspaces());
            this.wsActiveSignal = global.workspace_manager.connect('active-workspace-changed', () => this.updateActiveWorkspace());

            this.wsNamesSignal = this.wsSettings.connect(`changed::${WORKSPACES_KEY}`, () => this.updateWorkspaceNames());
        }

        createMenu() {
            this.menuSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this.menuSection);
        
            this.prepareMenu(0);
        }

        prepareMenu(index) {
            this.menuSection.actor.destroy_all_children();

            this.menuSection.addMenuItem(
                new PopupMenu.PopupSeparatorMenuItem('Espace de travail n°' + (index + 1))
            );

            if (this.setMenuQuickSection(index)) {
                this.menuSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }

            if (this.setMenuOpenedWindows(index)) {
                this.menuSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }

            this.setMenuCloseWindows(index);
        }

        setMenuQuickSection(index) {
            const app = helper.getPreferedApp(index);
            if (!app) return false;
            
            const menuQuickSection = new PopupMenu.PopupMenuSection();
            this.menuSection.addMenuItem(menuQuickSection);

            const menuItem = new PopupMenu.PopupMenuItem('Lancer ' + app.get_name());
            menuItem.connect('activate', () => helper.openNewWindow(app));

            menuQuickSection.addMenuItem(menuItem);

            return true;
        }

        generateMenuWindows(workspace, section, withoutWindow) {
            section.actor.destroy_all_children();

            const windowsByApp = helper.getWindowsByApp(workspace);
            const keys = Object.keys(windowsByApp).sort();

            for (const key in keys) {
                const appName = keys[key];
                const windows = windowsByApp[appName].sort((windowA, windowB) => {
                    windowB.get_title() - windowA.get_title();
                });

                if (windows.length === 1 && windows === [withoutWindow]) {
                    continue;
                }

                section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(appName));

                for (const subKey in windows) {
                    const window = windows[subKey];
                    if (window === withoutWindow) continue;

                    const windowItem = new MenuWindowItem(window);
                    windowItem.closeButton.connect('clicked', () => this.generateMenuWindows(workspace, section, window));
    
                    section.addMenuItem(windowItem);
                }
            }
        }

        setMenuOpenedWindows(index) {
            const workspace = global.workspace_manager.get_workspace_by_index(index);
            if (!workspace || workspace.n_windows === 0) return false;

            const menuWindowSection = new PopupMenu.PopupMenuSection();
            this.menuSection.addMenuItem(menuWindowSection);

            this.generateMenuWindows(workspace, menuWindowSection);

            return true;
        }

        setMenuCloseWindows(index) {
            const workspace = global.workspace_manager.get_workspace_by_index(index);
            if (!workspace) return false;

            const menuCloseSection = new PopupMenu.PopupMenuSection();
            this.menuSection.addMenuItem(menuCloseSection);
            
            if (workspace.n_windows === 0) {
                const menuItem = new PopupMenu.PopupMenuItem('Supprimer l\'espace de travail');
                menuItem.connect('activate', () => {
                    helper.removeWorkspace(index);

                    this.updateWorkspaceList();
                });
    
                menuCloseSection.addMenuItem(menuItem);

                return true;
            }

            const menuItem = new PopupMenu.PopupMenuItem('Tout fermer');
            menuItem.connect('activate', () => helper.closeAllWindows(index));

            menuCloseSection.addMenuItem(menuItem);

            return true;
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

                this.msWindows[index] = helper.getWindows(workspace);
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

                if (!this.msWindows[index] || this.msWindows[index].length === 0) {
                    wsBox.label.style_class += ' workspace-empty';
                } else {
                    wsBox.label.style_class += ' workspace-full';
                }

                if (this.wsNames[index]) {
                    wsBox.label.set_text(this.wsNames[index]);
                } else {
                    wsBox.label.set_text((index + 1) + '');
                }

                wsBox.set_child(wsBox.label);
                wsBox.connect('button-press-event', (_, event) => this.workspacePressed(event, index));
                
                this.layout.add(wsBox);
            };
        }
    
        workspacePressed(event, index) {
            switch (event.get_button()) {
                case 3:
                    this.prepareMenu(index);

                    if (this.menuIndex !== index) {
                        this.menuIndex = index;

                        if (this.menu.actor.is_visible()) {
                            return Clutter.EVENT_STOP;
                        }
                    }

                    return Clutter.EVENT_PROPAGATE;


                case 2:
                    if (this.menu.actor.is_visible()) {
                        this.menu.toggle();
                    }

                    helper.openPreferedApp(index);
                    
                    return Clutter.EVENT_STOP;

                case 3:
                default:
                    if (this.menu.actor.is_visible()) {
                        this.menu.toggle();
                    }

                    this.selectWs(index);

                    return Clutter.EVENT_STOP;
            }
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
                    return;
            }

            const children = this.layout.get_children();
            const relativeX = pointerX - posX;
            let binX = 0;

            for (const key in children) {
                const workspace = children[key];
                const binWidth = workspace.get_width();

                if (relativeX >= binX && relativeX <= (binX + binWidth)) {
                    return key;
                }

                binX += binWidth;
            }

            return;
        }

        moveActiveGrabbedWindow(window) {
            const wsIndex = this.getWorkspaceIndexUnderCursor();

            if (wsIndex >= 0) {
                window.change_workspace_by_index(wsIndex, true);

                global.display.get_workspace_manager().get_workspace_by_index(wsIndex)
                    .activate_with_focus(window, global.get_current_time());
            }
        }
    }
);