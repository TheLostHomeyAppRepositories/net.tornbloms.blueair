'use strict';

const Homey = require('homey');

class BlueAirApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('BlueAir has been initialized');
  }

}

module.exports = BlueAirApp;
