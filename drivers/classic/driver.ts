import { Driver } from 'homey';
import { ApiClient } from 'blueair-client';

class BlueAirClassicDriver extends Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('BlueAir Classic Driver has been initialized');
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
          const client = new ApiClient(username, password);
          return await client.initialize(); // Use await here to correctly update the status
        } catch (e) {
          this.log(e);
          // check if the error is related to user beeing locked out
          if (e instanceof Error && e.message.includes('User is locked out')) {
            return { error: this.homey.__('error_user_locked_out') };
          } else {
            return { error: this.homey.__('error_login_failed') };
          }
        }
      }
    );

    // Define a session handler for listing devices
    session.setHandler('list_devices', async () => {
      try {
        // Create a new API client instance with the provided username and password
        const client = new ApiClient(username, password);

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

          // Iterate over each device in the devicesList
          for (const device of devicesList) {
            // Fetch detailed information for the current device using its UUID
            const deviceInfo = await client.getDeviceInfo(device.uuid);

            // Check if the device's compatibility matches the desired value
            if (deviceInfo.compatibility.toLowerCase().includes('classic')) {
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
                  username,
                  password,
                },
              });
            }
          }

          // Return the list of compatible devices
          return compatibleDevices;
        }
        return null;
      } catch (error) {
        // Log any errors that occur during the process
        this.log('Error listing devices:', error);
        return { error: this.homey.__('error_list_devices_failed') };
      }
    });
  }
}

module.exports = BlueAirClassicDriver;
