import { Driver } from 'homey';
import { ApiClient } from 'blueair-client';

class BlueAirHealthprotectDriver extends Driver {
    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('BlueAir Healthprotect Driver has been initialized');
    }

    async onPair(session: any): Promise<void> {
        let username = '';
        let password = '';
        let status = true;
        // Pairing sequences
        session.setHandler(
            'login',
            async (data: { username: string; password: string }) => {
                username = data.username;
                password = data.password;

                try {
                    const client = new ApiClient(username, password);
                    await client.initialize();
                } catch (e) {
                    this.log(e);
                    status = false;
                }
                // return true to continue adding the device if the login succeeded
                // return false to indicate to the user the login attempt failed
                // thrown errors will also be shown to the user
                return status;
            }
        );

        // Define a session handler for listing devices
        session.setHandler('list_devices', async () => {
            try {
                // Create a new API client instance with the provided username and password
                const client = new ApiClient(username, password);

                // Initialize the API client
                await client.initialize();

                // Fetch the list of devices from the API
                const devicesList = await client.getDevices();

                // Validate that the returned devicesList is indeed an array
                if (!Array.isArray(devicesList)) {
                    throw new Error('devicesList is not an array');
                }

                // Initialize an empty array to store devices that meet the compatibility criteria
                const compatibleDevices = [];

                // Iterate over each device in the devicesList
                for (const device of devicesList) {
                    // Fetch detailed information for the current device using its UUID
                    const deviceInfo = await client.getDeviceInfo(device.uuid);

                    // Check if the device's compatibility matches the desired value
                    if (
                        deviceInfo.compatibility
                            .toLowerCase()
                            .includes('healthprotect'.toLowerCase())
                    ) {
                        // If the device is compatible, add its details to the compatibleDevices array
                        compatibleDevices.push({
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
                        });
                    }
                }

                // Return the list of compatible devices
                return compatibleDevices;
            } catch (err) {
                // Log any errors that occur during the process
                this.log(err);
            }
        });
    }
}

module.exports = BlueAirHealthprotectDriver;
