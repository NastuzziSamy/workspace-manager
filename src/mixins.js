const { Meta, Shell } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const helper = Me.imports.src.helper;


var SignalMixin = {
    signals: [],

    connectSignal(element, signal, callback) {
        const id = element.connect(signal, callback);

        this.signals.push([element, id]);

        return id;
    },

    disconnectSignal(id) {
        for (const key in this.signals) {
            const [element, possibleId] = this.signals[key];

            if (possibleId === id) {
                try {
                    element.disconnect(id);
                } catch (_) {
                    helper.warn(`Cannot disconnect signal ${id}`);
                }

                this.signals.splice(key, 1);

                return;
            }
        }

        helper.warn(`Cannot find and disconnect signal ${id}`);
    },

    disconnectSignals() {
        for (const key in this.signals) {
            const [element, id] = this.signals[key];

            try {
                element.disconnect(id);
            } catch (_) {
                helper.warn(`Cannot disconnect signal ${id}`);
            }
        }

        this.signals = [];
    },
};


var KeybindingMixin = {
    keybindings: [],

    addKeybinding(name, settings, callback,
                  actionMode=Shell.ActionMode.NORMAL || Shell.ActionMode.OVERVIEW,
                  flags=Meta.KeyBindingFlags.NONE) {
        Main.wm.addKeybinding(name, settings, flags, actionMode, callback);

        this.keybindings.push(name);
    },

    removeKeybindings() {
        for (const key in this.keybindings) {
            Main.wm.removeKeybinding(this.keybindings[key]);
        }

        this.keybindings = [];
    },
};


var ProxyMixin = {
    proxies: [],

    applyProxy(element, method, callback) {
        const proxied = element[method].bind(element);
        const proxy = (...args) => {
            return callback(proxied, ...args);
        };

        this.proxies.push([element, method, element[method], proxy]);

        element[method] = proxy;
    },

    restoreProxies() {
        for (const key in this.proxies) {
            const [element, method, callback, proxy] = this.proxies[key];

            if (element[method] === proxy) {
                element[method] = callback;
            }
        }

        this.proxies = [];
    }
};