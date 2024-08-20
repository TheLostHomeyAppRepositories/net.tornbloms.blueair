import BlueAirAwsBaseDriver from '../BlueAirAwsBaseDriver';

class BlueAirDustMagnetDriver extends BlueAirAwsBaseDriver {
  protected deviceModelFilter = 'dustmagnet';

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit(): Promise<void> {
    this.log('BlueAir DustMagnet Driver has been initialized');
    await super.onInit(); // Call the base class's onInit method
  }
}

module.exports = BlueAirDustMagnetDriver;
