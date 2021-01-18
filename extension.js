const Me = imports.misc.extensionUtils.getCurrentExtension();

const { Extension } = Me.imports.src.main;

function init() {
	return new Extension();
}

