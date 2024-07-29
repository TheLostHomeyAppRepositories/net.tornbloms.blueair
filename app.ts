import Homey from 'homey';
class BlueAirApp extends Homey.App {
    /**
     * onInit is called when the app is initialized.
     */
    async onInit(): Promise<void> {
        this.log('BlueAir has been initialized');
    }
}

module.exports = BlueAirApp;
