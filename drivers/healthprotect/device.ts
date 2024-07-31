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

      const DeviceAttributes = await client.getDeviceStatus(
        data.accountuuid,
        data.uuid,
      );
      const DeviceInfo = DeviceAttributes[0];

      this._savedfanspeed = filterSettings(DeviceAttributes, 'fan_speed');

      this.registerCapabilityListener('fan_speed', async (value) => {
        const result = filterSettings(DeviceAttributes, 'fan_speed');
        this.log('Changed fan speed:', value);
        this.log('Filtered fan speed settings:', result);
        await client.setFanAuto(data.uuid, true);
      });
      this.registerCapabilityListener('brightness', async (value) => {
        const result = filterSettings(DeviceAttributes, 'brightness');
        this.log('Changed brightness:', value);
        this.log('Filtered brightness settings:', result);
        await client.setBrightness(data.uuid, value);
      });
      this.registerCapabilityListener('child_lock', async (value) => {
        const result = filterSettings(DeviceAttributes, 'child_lock');
        this.log('Changed child lock:', value);
        this.log('Filtered child lock: settings:', result);
        await client.setChildLock(data.uuid, value);
      });

      const resultFanSpeed = filterSettings(DeviceAttributes, 'fan_speed');
      const resultBrightness = filterSettings(DeviceAttributes, 'brightness');
      const resultChildLock = filterSettings(DeviceAttributes, 'child_lock');
      const resultFilterStatus = filterSettings(
        DeviceAttributes,
        'filter_status',
      );
      const resultWiFiStatus = filterSettings(DeviceAttributes, 'wifi_status');
      this.setCapabilityValue('fan_speed', resultFanSpeed?.currentValue).catch(
        this.error,
      );
      this.setCapabilityValue(
        'brightness',
        parseInt(resultBrightness?.currentValue, 10),
      ).catch(this.error);
      if (resultChildLock?.currentValue === 1) {
        this.setCapabilityValue('child_lock', true);
      } else {
        this.setCapabilityValue('child_lock', false);
      }
      if (resultWiFiStatus?.currentValue === '1') {
        this.setCapabilityValue('wifi_status', true);
      } else {
        this.setCapabilityValue('wifi_status', false);
      }
      if (resultFilterStatus?.currentValue === 'OK') {
        this.setCapabilityValue('filter_status', true).catch(this.error);
      } else {
        this.setCapabilityValue('filter_status', false).catch(this.error);
      }

      this.setSettings({
        uuid: DeviceInfo.id,
        name: DeviceInfo.name,
        // compatibility: DeviceInfo.compatibility,
        model: DeviceInfo.model,
        // mac: DeviceInfo.mac,
        // firmware: DeviceInfo.firmware,
        // mcuFirmware: DeviceInfo.mcuFirmware,
        // wlanDriver: DeviceInfo.wlanDriver,
        // lastSyncDate: timeConverter(DeviceInfo.lastSyncDate),
        // installationDate: timeConverter(DeviceInfo.installationDate),
        // lastCalibrationDate: timeConverter(DeviceInfo.lastCalibrationDate),
        // initUsagePeriod: String(DeviceInfo.initUsagePeriod),
        // rebootPeriod: String(DeviceInfo.rebootPeriod),
        // roomLocation: DeviceInfo.roomLocation,
      });

      setInterval(async () => {
        this.log('setInternal: ', settings.update * 1000);
        const DeviceAttributes = await client.getDeviceStatus(
          data.accountuuid,
          data.uuid,
        );
        // const DeviceInfo = DeviceAttributes[0];

        // let resultFanSpeed = filterSettings(DeviceAttributes, 'fan_speed');
        // let resultBrightness = filterSettings(DeviceAttributes, 'brightness');
        // let resultChildLock = filterSettings(DeviceAttributes, 'child_lock');
        // let resultFilterStatus = filterSettings(
        //  DeviceAttributes,
        //  'filter_status'
        // );
        const resultWiFiStatus = filterSettings(
          DeviceAttributes,
          'wifi_status',
        );
        this.setCapabilityValue(
          'fan_speed',
          resultFanSpeed?.currentValue,
        ).catch(this.error);
        this.setCapabilityValue(
          'brightness',
          parseInt(resultBrightness?.currentValue, 10),
        ).catch(this.error);
        this.setCapabilityValue(
          'filter_status',
          resultFilterStatus?.currentValue,
        );
        if (resultWiFiStatus?.currentValue === '1') {
          this.setCapabilityValue('wifi_status', true).catch(this.error);
        } else {
          this.setCapabilityValue(' wifi_status', false);
        }
        this.setCapabilityValue(
          'filter_status',
          resultFilterStatus?.currentValue,
        );
        if (
          this._savedfanspeed?.currentValue !== resultFanSpeed?.currentValue
        ) {
          const cardTriggerFilter = this.homey.flow.getTriggerCard(
            'fan-speed-has-changed',
          );
          cardTriggerFilter.trigger({
            'device-name': settings.name,
            'device-uuid': settings.uuid,
            'fan speed': resultFanSpeed?.currentValue,
          });
          this._savedfanspeed = resultFanSpeed;
        }
      }, settings.update * 1000);

      setInterval(async () => {
        this.setSettings({
          uuid: DeviceInfo.id,
          name: DeviceInfo.name,
          // compatibility: DeviceInfo.compatibility,
          model: DeviceInfo.model,
          // mac: DeviceInfo.mac,
          // firmware: DeviceInfo.firmware,
          // mcuFirmware: DeviceInfo.mcuFirmware,
          // wlanDriver: DeviceInfo.wlanDriver,
          // lastSyncDate: timeConverter(DeviceInfo.lastSyncDate),
          // installationDate: timeConverter(DeviceInfo.installationDate),
          // lastCalibrationDate: timeConverter(DeviceInfo.lastCalibrationDate),
          // initUsagePeriod: String(DeviceInfo.initUsagePeriod),
          // rebootPeriod: String(DeviceInfo.rebootPeriod),
          // roomLocation: DeviceInfo.roomLocation,
        });
        const DeviceAttributes = await client.getDeviceStatus(
          data.accountuuid,
          data.uuid,
        );
        const resultFilterStatus = filterSettings(
          DeviceAttributes,
          'filter_status',
        );
        if (resultFilterStatus?.currentValue !== 'OK') {
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

        await client.setFanAuto(data.uuid, value.fanspeed);
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
