import Promise from "bluebird";
import gpio from "rpi-gpio";

class RpiGpioOpener {

  constructor(config) {
    gpio.setMode(gpio.MODE_BCM);
    this.pin = config.pin;
    this.opening = false;
  }

  canOpen(doorId) {
    return doorId === "garage";
  }

  open(doorId, time) {
    if (doorId !== "garage" || this.opening) return;

    this.opening = true;
    this.writePin(true)
      .delay(time)
      .then(() => this.writePin(false))
      .catch(console.error)
      .finally(() => this.opening = false);
  }

  writePin(value) {
    const gpioSetup = Promise.promisify(gpio.setup, { context: gpio });
    const gpioWrite = Promise.promisify(gpio.write, { context: gpio });

    return gpioSetup(this.pin, gpio.DIR_OUT, gpio.EDGE_NONE)
      .tap(() => console.log(`Writing '${value}' to pin ${this.pin}`))
      .then(() => gpioWrite(this.pin, value));
  }
}

export default RpiGpioOpener;
