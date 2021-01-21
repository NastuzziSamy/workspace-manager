const Main = imports.ui.main;


var ActivitiesBarHidder = class {
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
};