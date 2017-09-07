import _ from "underscore";

class DoorBackend {

  constructor(config) {
    this.doorConfigs = config.doorConfigs;
    this.locks = _.mapObject(config.doorConfigs, doorConfig =>
      (doorConfig.lockTime ? { lockTime: doorConfig.lockTime } : undefined)
    );
    this.openers = [];
  }

  addOpener(opener) {
    this.openers.push(opener);
  }

  open(user, doorId) {
    // check if the user was properly authenticated (handled by DoorSlackBot)
    if (!user) return { result: DoorBackend.OPEN_RESULT.UNAUTHORIZED };

    // check if the door is locked by the virtue of a recent opening by another person
    const lock = this.locks[doorId];
    if (lock) {
      const now = new Date().getTime();
      if (lock.lastUser !== user.email && now - lock.lastTime < lock.lockTime) {
        return { result: DoorBackend.OPEN_RESULT.LOCKED, user: lock.lastUser };
      }
      lock.lastUser = user.email;
      lock.lastTime = now;
    }

    // find an opener able to open this door
    let opener = _.find(this.openers, opener => opener.canOpen(doorId));
    if (!opener) return { result: DoorBackend.OPEN_RESULT.UNAVAILABLE };

    // finally, open the door
    opener.open(doorId, this.doorConfigs[doorId].openTime);
    return { result: DoorBackend.OPEN_RESULT.SUCCESS };
  }
}

DoorBackend.OPEN_RESULT = {
  SUCCESS: "SUCCESS",
  LOCKED: "LOCKED",
  UNAVAILABLE: "UNAVAILABLE",
  UNAUTHORIZED: "UNAUTHORIZED"
};

export default DoorBackend;
