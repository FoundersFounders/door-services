import _ from "underscore";

class BackendManager {

  constructor() {
    this.openers = [];
  }

  addOpener(opener) {
    this.openers.push(opener);
  }

  canOpen(doorId) {
    return _.find(this.openers, opener => opener.canOpen(doorId));
  }

  open(doorId, time) {
    let opener = _.find(this.openers, opener => opener.canOpen(doorId));
    if(opener !== null) opener.open(doorId, time);
  }
}

export default BackendManager;
