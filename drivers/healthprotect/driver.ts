import { Driver } from 'homey';
import { BlueAirAwsClient } from 'blueairaws-client';
import { Region } from 'blueairaws-client/dist/Consts';

class BlueAirHealthProtectDriver extends Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('BlueAir HealthProtect Driver has been initialized');
  }

  async onPair(session: any): Promise<void> {
    let username = '';
    let password = '';

    // Pairing sequences
    session.setHandler(
      'login',
      async (data: { username: string; password: string }) => {
        username = data.username;
        password = data.password;

        try {
          const client = new BlueAirAwsClient(username, password, Region.EU);
          return await client.initialize(); // Use await here to correctly update the status
        } catch (e) {
          this.log(e);
          return false;
        }
      },
    );

    // Define a session handler for listing devices
    session.setHandler('list_devices', async () => {
      try {
        // Create a new API client instance with the provided username and password
        const client = new BlueAirAwsClient(username, password, Region.EU);

        // Initialize the API client
        if (await client.initialize()) {
          // Fetch the list of devices from the API
          const devicesList = await client.getDevices();

          // Validate that the returned devicesList is indeed an array
          if (!Array.isArray(devicesList)) {
            throw new Error('devicesList is not an array');
          }
          this.log(devicesList);

          // Initialize an empty array to store devices that meet the compatibility criteria
          const compatibleDevices = [];

          // Using the first device name as accountuuid
          const accountuuid = devicesList[0].name;

          // Iterate over each device in the devicesList
          for (const device of devicesList) {
            // Fetch detailed information for the current device using its UUID
            const deviceInfoArray = await client.getDeviceStatus(accountuuid, [
              device.uuid,
            ]);

            // Iterate over each deviceInfo in the deviceInfoArray
            for (const deviceInfo of deviceInfoArray) {
              // Check if the device's compatibility matches the desired value
              if (deviceInfo.model.toLowerCase().includes('healthprotect')) {
                // If the device is compatible, add its details to the compatibleDevices array
                compatibleDevices.push({
                  name: deviceInfo.name,
                  data: {
                    accountuuid: devicesList[0].name,
                    uuid: deviceInfo.id,
                    mac: device.mac,
                  },
                  store: {
                    name: deviceInfo.name,
                  },
                  settings: {
                    username,
                    password,
                    region: Region.EU,
                  },
                });
              }
            }
          }

          // Return the list of compatible devices
          return compatibleDevices;
        }
        return null;
      } catch (error) {
        // Log any errors that occur during the process
        this.log('Error listing devices:', error);
        // Return an appropriate error response
        return { error: 'Failed to list devices' };
      }
    });
  }
}

module.exports = BlueAirHealthProtectDriver;
