const { Gio, GLib } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const { SignalMixin } = Me.imports.src.mixins;
const { warn } = Me.imports.src.helper;


var Settings = class {
    constructor(schemas) {
        this.schemas = schemas;
        this.settings = {};

        const GioSSS = Gio.SettingsSchemaSource;

        const schemaSource = GioSSS.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            GioSSS.get_default(),
            false
        );

        for (const key in schemas) {
            const schema = schemas[key];
            const schemaObj = schemaSource.lookup(schema, true);

            if (schemaObj) {
                this.settings[key] = new Gio.Settings({ settings_schema : schemaObj });
            } else {
                warn(`Schema ${key} (${schema}) not found`);
            }
        }
    }

    destroy() {
        this.disconnectSignals();
    }

    get(key, name) {
        const settings = this.settings[key];
        if (!settings) {
            return warn(`Cannot find settings ${key}`);
        }

        if (!name) {
            return settings;
        }

        const variant = settings.get_value(name);
        const variantType = variant.get_type_string();

        switch (variantType) {
            case 'as':
                return variant.get_strv();

            case 'b':
                return variant.get_boolean();

            case 'i':
                return variant.get_int();

            case 'd':
                return variant.get_double();

            default:
                return variant.get_enum();
        }
    }

    set(key, name, value) {
        const settings = this.get(key);
        if (!settings) {
            return warn(`Cannot set settings ${name} with ${value}`);
        }

        const variant = settings.get_default_value(name);
        const variantType = variant.get_type_string();

        settings.set_value(name, new GLib.Variant(variantType, value));
    }

    reset(key, name) {
        const settings = this.get(key);
        if (!settings) {
            return warn(`Cannot reset settings ${name}`);
        }

        settings.set_value(name, settings.get_default_value(name));
    }

    track(key, name, callback, notCallback) {
        const settings = this.get(key);
        if (!settings) {
            return warn(`Cannot track settings ${name}`);
        }

        this.connectSignal(settings, `changed::${name}`, notCallback ? () => {
            const value = this.get(key, name);

            if (value) {
                callback(value);
            } else {
                notCallback(value);
            }
        } : () => {
            callback(this.get(key, name));
        });
    }

    follow(key, name, callback, notCallback) {
        this.track(key, name, callback, notCallback);

        const value = this.get(key, name);

        if (!notCallback || value) {
            return callback(value);
        }

        return notCallback(value);
    }
}

Object.assign(Settings.prototype, SignalMixin);