import { Device } from 'homey';
import { BlueAirAwsClient } from 'blueairaws-client';
import {
  Region,
  BlueAirDeviceStatus,
  BlueAirDeviceState,
  BlueAirDeviceSensorData,
} from 'blueairaws-client/dist/Consts';

/**
 * Represents a setting object.
 * This interface allows additional properties, accommodating any setting that might be required.
 */
interface Setting {
  name: string;
  [key: string]: any; // This allows for other properties in the setting object.
}

/**
 * Filters the device attributes array to find a specified item value.
 * @param devices - An array of BlueAirDeviceStatus objects to search through.
 * @param itemName - The name of the item to search for (e.g., 'fanspeed', 'childlock').
 * @returns The Setting object of the found item or null if not found.
 */
function filterSettings(
  devices: BlueAirDeviceStatus[],
  itemName: string,
): Setting | null {
  for (const device of devices) {
    // Check if itemName exists in the state
    if (itemName in device.state) {
      const stateValue = device.state[itemName as keyof BlueAirDeviceState];
      if (stateValue !== undefined && stateValue !== null) {
        return { name: itemName, value: String(stateValue) }; // Return a Setting object
      }
    }

    // Check if itemName exists in the sensorData
    if (itemName in device.sensorData) {
      const sensorDataValue =
        device.sensorData[itemName as keyof BlueAirDeviceSensorData];
      if (sensorDataValue !== undefined && sensorDataValue !== null) {
        return { name: itemName, value: String(sensorDataValue) }; // Return a Setting object
      }
    }
  }

  return null; // Return null if the item is not found in any device
}

/**
 * Represents the BlueAir HealthProtect device.
 * This class is responsible for managing the device's capabilities and settings within the Homey app.
 */
class BlueAirHealthProtectDevice extends Device {
  private _savedfanspeed: Setting | null | undefined;

  /**
   * onInit is called when the device is initialized.
   * This method sets up capability listeners and initializes the device's settings.
   */
  async onInit(): Promise<void> {
    const settings = this.getSettings();
    const data = this.getData();

    this.log(
      'Initializing BlueAirHealthProtectDevice with settings:',
      settings,
    );

    try {
      // Initialize the BlueAir client
      const client = new BlueAirAwsClient(
        settings.username,
        settings.password,
        Region.EU,
      );
      await client.initialize();
      this.log('AccountUUID:', data.accountuuid);

      // Fetch the initial device attributes
      const DeviceAttributes = await client.getDeviceStatus(data.accountuuid, [
        data.uuid,
      ]);
      this.log('DeviceAttributes:', DeviceAttributes);

      // Retrieve initial fan speed setting
      this._savedfanspeed = filterSettings(DeviceAttributes, 'fanspeed');

      // Register capability listeners to handle user interactions
      this.registerCapabilityListener('fanspeed', async (value) => {
        this.log('Changed fan speed:', value);
        await client.setFanSpeed(data.uuid, value);

        // Log and debug the result from the API call
        const result = filterSettings(DeviceAttributes, 'fanspeed');
        this.log('Filtered fan speed settings:', result);
      });

      this.registerCapabilityListener('automode', async (value) => {
        this.log('Changed automode:', value);
        await client.setFanAuto(data.uuid, value);

        // Log and debug the result from the API call
        const result = filterSettings(DeviceAttributes, 'automode');
        this.log('Filtered automode settings:', result);
      });

      this.registerCapabilityListener('brightness2', async (value) => {
        this.log('Changed brightness:', value);
        await client.setBrightness(data.uuid, value);

        // Log and debug the result from the API call
        const result = filterSettings(DeviceAttributes, 'brightness');
        this.log('Filtered brightness settings:', result);
      });

      this.registerCapabilityListener('child_lock', async (value) => {
        this.log('Changed child lock:', value);
        await client.setChildLock(data.uuid, value);

        // Log and debug the result from the API call
        const result = filterSettings(DeviceAttributes, 'childlock');
        this.log('Filtered child lock settings:', result);
      });

      // Fetch and set initial states for all capabilities
      const resultFanSpeed = filterSettings(DeviceAttributes, 'fanspeed');
      const resultBrightness = filterSettings(DeviceAttributes, 'brightness');
      const resultChildLock = filterSettings(DeviceAttributes, 'childlock');
      const resultFilterStatus = filterSettings(
        DeviceAttributes,
        'filterusage',
      );
      const resultWiFiStatus = filterSettings(DeviceAttributes, 'online');
      const resultAutoMode = filterSettings(DeviceAttributes, 'automode'); // Fetch automode

      // Log initial capability values for debugging
      this.log('Initial fanspeed:', resultFanSpeed);
      this.log('Initial brightness:', resultBrightness);
      this.log('Initial child_lock:', resultChildLock);
      this.log('Initial wifi_status:', resultWiFiStatus);
      this.log('Initial filter_status:', resultFilterStatus);
      this.log('Initial automode:', resultAutoMode);

      // Set initial capability values, converting to correct types as needed
      this.setCapabilityValue(
        'fanspeed',
        Number(resultFanSpeed?.value ?? 0),
      ).catch(this.error);
      this.setCapabilityValue(
        'brightness2',
        Number(resultBrightness?.value ?? 0),
      ).catch(this.error);
      this.setCapabilityValue(
        'child_lock',
        resultChildLock?.value === 'true',
      ).catch(this.error);
      this.setCapabilityValue(
        'wifi_status',
        resultWiFiStatus?.value === 'true',
      ).catch(this.error);
      this.setCapabilityValue(
        'filter_status',
        resultFilterStatus?.value ?? '',
      ).catch(this.error);
      this.setCapabilityValue(
        'automode',
        resultAutoMode?.value === 'true',
      ).catch(this.error);

      // Store device information in settings
      this.setSettings({
        uuid: DeviceAttributes[0].id,
        name: DeviceAttributes[0].name,
        model: DeviceAttributes[0].model,
        mac: DeviceAttributes[0].mac,
        serial: DeviceAttributes[0].serial,
        mcuFirmware: DeviceAttributes[0].mcu,
        wlanDriver: DeviceAttributes[0].wifi,
      });

      // Periodic updates for capabilities to reflect real-time changes
      setInterval(async () => {
        this.log(
          'Executing periodic update at interval:',
          settings.update * 1000,
        );

        // Fetch updated device attributes
        const DeviceAttributes = await client.getDeviceStatus(
          data.accountuuid,
          [data.uuid],
        );

        // Fetch updated states for each capability
        const resultFanSpeed = filterSettings(DeviceAttributes, 'fanspeed');
        const resultBrightness = filterSettings(DeviceAttributes, 'brightness');
        const resultChildLock = filterSettings(DeviceAttributes, 'childlock');
        const resultFilterStatus = filterSettings(
          DeviceAttributes,
          'filterusage',
        );
        const resultWiFiStatus = filterSettings(DeviceAttributes, 'online');
        const resultAutoMode = filterSettings(DeviceAttributes, 'automode'); // Fetch automode

        // Log updated capability values for debugging
        this.log('Updated fanspeed:', resultFanSpeed);
        this.log('Updated brightness:', resultBrightness);
        this.log('Updated child_lock:', resultChildLock);
        this.log('Updated wifi_status:', resultWiFiStatus);
        this.log('Updated filter_status:', resultFilterStatus);
        this.log('Updated automode:', resultAutoMode);

        // Update capabilities with new values
        this.setCapabilityValue(
          'fanspeed',
          Number(resultFanSpeed?.value ?? 0),
        ).catch(this.error);
        this.setCapabilityValue(
          'brightness2',
          Number(resultBrightness?.value ?? 0),
        ).catch(this.error);
        this.setCapabilityValue(
          'child_lock',
          resultChildLock?.value === 'true',
        ).catch(this.error);
        this.setCapabilityValue(
          'wifi_status',
          resultWiFiStatus?.value === 'true',
        ).catch(this.error);
        this.setCapabilityValue(
          'filter_status',
          resultFilterStatus?.value ?? '',
        ).catch(this.error);
        this.setCapabilityValue(
          'automode',
          resultAutoMode?.value === 'true',
        ).catch(this.error); // Update automode

        // Trigger fan speed change card if there's a change
        if (this._savedfanspeed !== resultFanSpeed) {
          const cardTriggerFilter = this.homey.flow.getTriggerCard(
            'fan-speed-has-changed',
          );
          cardTriggerFilter.trigger({
            'device-name': settings.name,
            'device-uuid': settings.uuid,
            'fan speed': resultFanSpeed?.value ?? 0,
          });
          this._savedfanspeed = resultFanSpeed;
        }
      }, settings.update * 1000);

      // Periodic check for filter status and trigger notification if needed
      setInterval(async () => {
        const DeviceAttributes = await client.getDeviceStatus(
          data.accountuuid,
          [data.uuid],
        );

        // Update device settings for monitoring
        this.setSettings({
          uuid: DeviceAttributes[0].id,
          name: DeviceAttributes[0].name,
          model: DeviceAttributes[0].model,
          mac: DeviceAttributes[0].mac,
          serial: DeviceAttributes[0].serial,
          mcuFirmware: DeviceAttributes[0].mcu,
          wlanDriver: DeviceAttributes[0].wifi,
        });

        // Check filter usage status and trigger alert if it needs changing
        const resultFilterStatus = filterSettings(
          DeviceAttributes,
          'filterusage',
        );
        if (
          resultFilterStatus !== null &&
          resultFilterStatus !== undefined &&
          Number(resultFilterStatus) >= 95
        ) {
          const cardTriggerFilter = this.homey.flow.getTriggerCard(
            'filter-needs-change',
          );
          cardTriggerFilter.trigger({
            'device-name': settings.name,
            'device-uuid': settings.uuid,
            'device-response': resultFilterStatus,
          });
        }
      }, 60000);

      this.log('BlueAirHealthProtectDevice has been initialized');
    } catch (e) {
      this.error('Error during initialization:', e); // Log any initialization errors
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded(): Promise<void> {
    this.log('BlueAirHealthProtectDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * This method handles any necessary changes when settings are updated.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    newSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log('BlueAirHealthProtectDevice settings were changed');
    this.log('Old Settings:', oldSettings);
    this.log('New Settings:', newSettings);
    this.log('Changed Keys:', changedKeys);
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used to synchronize the name to the device.
   * @param name The new name
   */
  async onRenamed(name: string): Promise<void> {
    this.log('BlueAirHealthProtectDevice was renamed to:', name);
  }

  /**
   * onDeleted is called when the user deleted the device.
   * This method handles any cleanup that might be necessary.
   */
  async onDeleted(): Promise<void> {
    this.log('BlueAirHealthProtectDevice has been deleted');
  }
}

module.exports = BlueAirHealthProtectDevice;
