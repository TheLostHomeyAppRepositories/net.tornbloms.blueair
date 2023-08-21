"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = require("homey");
const blueair_client_1 = require("blueair-client");
class BlueAir405ClassicDriver extends homey_1.Driver {
    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('BlueAir 405 Classic Driver has been initialized');
    }
    async onPair(session) {
        let username = '';
        let password = '';
        let status = true;
        // Pairing sequences
        session.setHandler('login', async (data) => {
            username = data.username;
            password = data.password;
            try {
                const client = new blueair_client_1.ApiClient(username, password);
                await client.initialize();
            }
            catch (e) {
                this.log(e);
                status = false;
            }
            // return true to continue adding the device if the login succeeded
            // return false to indicate to the user the login attempt failed
            // thrown errors will also be shown to the user
            return status;
        });
        session.setHandler('list_devices', async () => {
            try {
                const client = new blueair_client_1.ApiClient(username, password);
                await client.initialize();
                const devicesList = await client.getDevices();
                // Check if devicesList is an array before mapping over it
                if (!Array.isArray(devicesList)) {
                    throw new Error('devicesList is not an array');
                }
                // console.log(devicesList);
                const devices = devicesList.map((device) => {
                    return {
                        name: device.name,
                        data: {
                            uuid: device.uuid,
                            mac: device.mac,
                        },
                        store: {
                            name: device.name,
                            userId: device.userId,
                        },
                        settings: {
                            username: username,
                            password: password,
                        },
                    };
                });
                // console.log(devices);
                return devices;
            }
            catch (err) {
                this.log(err);
            }
        });
    }
}
module.exports = BlueAir405ClassicDriver;
//# sourceMappingURL=driver.js.map