const { Clutter, Gio, GObject, Shell, St } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const helper = Me.imports.src.helper;


var MenuWindowItem = GObject.registerClass(
    class MenuWindowItem extends PopupMenu.PopupBaseMenuItem {
        _init(window) {
            this.window = window;
            this.app = helper.getWindowApp(this.window);

            super._init(this.window.appears_focused ? {
                style_class: 'popup-menu-window-focused',
            } : {});

            this.label = new St.Label({
                text: this.window.get_title(),
                style_class: 'popup-menu-window-title',
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(this.label);
            this.label_actor = this.label;

            this.closeButton = new St.Button({
                child: new St.Icon({
                    icon_name: 'edit-delete-symbolic',
                    style_class: 'popup-menu-icon',
                }),
                style_class: 'popup-menu-button',
            });
            this.closeButton.connect('clicked', () => this.closeWindow());
            this.add_child(this.closeButton);

            this.connect('activate', () => this.focusWindow());
        }

        focusWindow() {
            if (!this.window) return;

            helper.focusWindow(this.window);
        }

        closeWindow() {
            helper.closeWindow(this.window);

            this.window = null;
            this.app = null;
        }
    }
);