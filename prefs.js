const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

function init () {
}

function buildPrefsWidget () {
  let widget = new MyPrefsWidget();
  widget.show_all();
  return widget;
}

const MyPrefsWidget = new GObject.Class({

  Name : "My.Prefs.Widget",
  GTypeName : "MyPrefsWidget",
  Extends : Gtk.Box,
  
  _init : function (params) {
  
    this.parent(params);
    this.margin = 20;
    this.set_spacing(15);
    this.set_orientation(Gtk.Orientation.VERTICAL);
    
    // On GNOME SHELL +3.36 you don't need to quit on destroy
    //this.connect('destroy', Gtk.main_quit);
    
    let myLabel = new Gtk.Label({
      label : "Translated Text"    
    });
    
    const cellAccelRenderer = new Gtk.CellRendererAccel({
      editable: true,
      'accel-mode': Gtk.CellRendererAccelMode.OTHER,
    });
    cellAccelRenderer.connect('accel-cleared', (rend, strIter) => {
        const [success, iter] = model.get_iter_from_string(strIter);
      
        if (!success) {
            throw new Error('Something be broken, yo.');
        }

        const name = model.get_value(iter, 0);
        // this.settings.set_strv(name, ['']);
    });
    cellAccelRenderer.connect(
        'accel-edited',
        (rend, strIter, key, mods) => {
            const value = Gtk.accelerator_name(key, mods);
            const [success, iter] = model.get_iter_from_string(strIter);
            if (!success) {
                throw new Error('Something be broken, yo.');
            }

            const name = model.get_value(iter, 0);
            // this.settings.set_strv(name, [value]);
        }
    );
    
    let hBox = new Gtk.Box();
    hBox.set_orientation(Gtk.Orientation.HORIZONTAL);
    
    hBox.pack_start(myLabel, false, false, 0);
    hBox.pack_end(cellAccelRenderer, false, false, 0);
    
    this.add(hBox);
  }

});
