import Promise from "bluebird";
import gpio from "rpi-gpio";
import _ from "underscore";

class RpiGpioOpener {

  constructor(config) {
    gpio.setMode(gpio.MODE_BCM);
    this.pins = config.pins;
    this.opening = {};
  }

  canOpen(doorId) {
    return !_.isUndefined(this.pins[doorId]);
  }

  open(doorId, time) {
    if (_.isUndefined(this.pins[doorId]) || this.opening[doorId]) return;

    this.opening[doorId] = true;
    this.writePin(doorId, true)
      .delay(time)
      .then(() => this.writePin(doorId, false))
      .catch(console.error)
      .finally(() => this.opening[doorId] = false);
  }

  writePin(doorId, value) {
    const pin = this.pins[doorId];
    const gpioSetup = Promise.promisify(gpio.setup, { context: gpio });
    const gpioWrite = Promise.promisify(gpio.write, { context: gpio });

    return gpioSetup(pin, gpio.DIR_OUT, gpio.EDGE_NONE)
      .tap(() => console.log(`Writing '${value}' to pin ${pin}`))
      .then(() => gpioWrite(pin, value));
  }
}

export default RpiGpioOpener;
