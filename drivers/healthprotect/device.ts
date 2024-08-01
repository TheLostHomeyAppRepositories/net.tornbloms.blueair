import { Device } from 'homey';
import { BlueAirAwsClient } from 'blueairaws-client';
import { Region } from 'blueairaws-client/dist/Consts';

/**
 * Represents a setting object.
 */
interface Setting {
  name: string;
  [key: string]: any; // This allows for other properties in the setting object.
}

/**
 * Filters the settings array to find a setting by its name.
 * @param settings - An array of settings to search through.
 * @param name - The name of the setting to search for.
 * @returns The found setting or null if not found.
 */
function filterSettings(settings: Setting[], name: string): Setting | null {
  const setting: Setting | undefined = settings.find(
    (s: Setting) => s.name === name,
  );
  return setting || null;
}
class BlueAirHealthProtectDevice extends Device {
  private _savedfanspeed: Setting | null | undefined;
  /**
   * onInit is called when the device is initialized.
   */
  async onInit(): Promise<void> {
    const settings = this.getSettings();
    const data = this.getData();

    try {
      const client = new BlueAirAwsClient(
        settings.username,
        settings.password,
        Region.EU,
      );
      await client.initialize();
      this.log('AccountUUID:', data.accountuuid);

      const DeviceAttributes = await client.getDeviceStatus(data.accountuuid, [
        data.uuid,
      ]);
      this.log('DeviceAttributes:', DeviceAttributes);

      this._savedfanspeed = filterSettings(DeviceAttributes, 'fanspeed');

      this.registerCapabilityListener('fanspeed', async (value) => {
        const result = filterSettings(DeviceAttributes, 'fanspeed');
        this.log('Changed fan speed:', value);
        this.log('Filtered fan speed settings:', result);
        await client.setFanSpeed(data.uuid, value);
      });
      this.registerCapabilityListener('automode', async (value) => {
        const result = filterSettings(DeviceAttributes, 'automode');
        this.log('Changed automode:', value);
        this.log('Filtered automode settings:', result);
        await client.setFanAuto(data.uuid, value);
      });
      this.registerCapabilityListener('brightness', async (value) => {
        const result = filterSettings(DeviceAttributes, 'brightness');
        this.log('Changed brightness:', value);
        this.log('Filtered brightness settings:', result);
        await client.setBrightness(data.uuid, value);
      });
      this.registerCapabilityListener('child_lock', async (value) => {
        const result = filterSettings(DeviceAttributes, 'childlock');
        this.log('Changed child lock:', value);
        this.log('Filtered child lock: settings:', result);
        await client.setChildLock(data.uuid, value);
      });

      const resultFanSpeed = filterSettings(DeviceAttributes, 'fanspeed');
      const resultBrightness = filterSettings(DeviceAttributes, 'brightness');
      const resultChildLock = filterSettings(DeviceAttributes, 'childlock');
      const resultFilterStatus = filterSettings(
        DeviceAttributes,
        'filterusage',
      );
      const resultWiFiStatus = filterSettings(DeviceAttributes, 'online');

      this.setCapabilityValue('fanspeed', resultFanSpeed).catch(this.error);
      this.setCapabilityValue('brightness', resultBrightness).catch(this.error);
      this.setCapabilityValue('child_lock', resultChildLock).catch(this.error);
      this.setCapabilityValue('wifi_status', resultWiFiStatus).catch(
        this.error,
      );
      this.setCapabilityValue('filter_status', resultFilterStatus).catch(
        this.error,
      );

      this.setSettings({
        uuid: DeviceAttributes[0].id,
        name: DeviceAttributes[0].name,
        model: DeviceAttributes[0].model,
        mac: DeviceAttributes[0].mac,
        serial: DeviceAttributes[0].serial,
        mcuFirmware: DeviceAttributes[0].mcu,
        wlanDriver: DeviceAttributes[0].wifi,
      });

      setInterval(async () => {
        this.log('setInternal: ', settings.update * 1000);
        const DeviceAttributes = await client.getDeviceStatus(
          data.accountuuid,
          [data.uuid],
        );

        const resultFanSpeed = filterSettings(DeviceAttributes, 'fanspeed');
        const resultBrightness = filterSettings(DeviceAttributes, 'brightness');
        const resultChildLock = filterSettings(DeviceAttributes, 'childlock');
        const resultFilterStatus = filterSettings(
          DeviceAttributes,
          'filterusage',
        );
        const resultWiFiStatus = filterSettings(DeviceAttributes, 'online');

        this.setCapabilityValue('fanspeed', resultFanSpeed).catch(this.error);
        this.setCapabilityValue('brightness', resultBrightness).catch(
          this.error,
        );
        this.setCapabilityValue('child_lock', resultChildLock).catch(
          this.error,
        );
        this.setCapabilityValue('wifi_status', resultWiFiStatus).catch(
          this.error,
        );
        this.setCapabilityValue('filter_status', resultFilterStatus).catch(
          this.error,
        );

        if (this._savedfanspeed !== resultFanSpeed) {
          const cardTriggerFilter = this.homey.flow.getTriggerCard(
            'fan-speed-has-changed',
          );
          cardTriggerFilter.trigger({
            'device-name': settings.name,
            'device-uuid': settings.uuid,
            'fan speed': resultFanSpeed,
          });
          this._savedfanspeed = resultFanSpeed;
        }
      }, settings.update * 1000);

      setInterval(async () => {
        const DeviceAttributes = await client.getDeviceStatus(
          data.accountuuid,
          [data.uuid],
        );

        this.setSettings({
          uuid: DeviceAttributes[0].id,
          name: DeviceAttributes[0].name,
          model: DeviceAttributes[0].model,
          mac: DeviceAttributes[0].mac,
          serial: DeviceAttributes[0].serial,
          mcuFirmware: DeviceAttributes[0].mcu,
          wlanDriver: DeviceAttributes[0].wifi,
        });

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
            'device-response': resultFilterStatus?.currentValue,
          });
        }
      }, 60000);

      const fancard = this.homey.flow.getActionCard('set-fan-speed');
      fancard.registerRunListener(async (value) => {
        this.log('Want to change the fan speed with value: ', value.fanspeed);

        await client.setFanSpeed(data.uuid, value.fanspeed);
        this.log('Changed fan speed to:', value.fanspeed);
      });

      const brightnesscard = this.homey.flow.getActionCard('set-brightness');
      brightnesscard.registerRunListener(async (value) => {
        this.log(
          'Want to change the brightness with value: ',
          value.brightness,
        );
        await client.setBrightness(data.uuid, value.brightness);
        this.log('Changed brightness to:', value.brightness);
      });

      this.log('BlueAirHealthProtectDevice has been initialized');
    } catch (e) {
      this.log(e);
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
    this.log('BlueAirHealthProtectDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used to synchronize the name to the device.
   * @param name The new name
   */
  async onRenamed(name: string): Promise<void> {
    this.log('BlueAirHealthProtectDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted(): Promise<void> {
    this.log('BlueAirHealthProtectDevice has been deleted');
  }
}

module.exports = BlueAirHealthProtectDevice;
