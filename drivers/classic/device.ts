import { Device } from 'homey';
import { ApiClient } from 'blueair-client';

/**
 * Represents a setting object.
 */
interface Setting {
  name: string;
  [key: string]: any; // This allows for other properties in the setting object.
}
class BlueAirClassicDevice extends Device {
  private _savedfanspeed: Setting | null | undefined;
  /**
   * onInit is called when the device is initialized.
   */
  async onInit(): Promise<void> {
    const settings = this.getSettings();
    const data = this.getData();
    const userId = this.getStoreValue('userId');

    try {
      const client = new ApiClient(settings.username, settings.password);
      await client.initialize();

      const DeviceAttributes = await client.getDeviceAttributes(data.uuid);
      const DeviceInfo = await client.getDeviceInfo(data.uuid);
      this._savedfanspeed = this.filterSettings(DeviceAttributes, 'fan_speed');

      this.registerCapabilityListener('fan_speed', async (value) => {
        const result = this.filterSettings(DeviceAttributes, 'fan_speed');
        if (value === 'auto') {
          this.log('Changed fan speed: Auto');
          await client.setFanAuto(data.uuid, 'auto', 'auto', userId);
        } else {
          this.log('Changed fan speed:', value);
          await client.setFanSpeed(
            data.uuid,
            value,
            result?.defaultValue,
            userId,
          );
          await client.setFanAuto(data.uuid, 'manual', 'manual', userId);
        }
      });
      this.registerCapabilityListener('brightness', async (value) => {
        const result = this.filterSettings(DeviceAttributes, 'brightness');
        this.log('Changed brightness:', value);
        await client.setBrightness(
          data.uuid,
          String(value),
          result?.defaultValue,
          userId,
        );
      });
      this.registerCapabilityListener('child_lock', async (value) => {
        const result = this.filterSettings(DeviceAttributes, 'child_lock');
        if (value) {
          this.log('Changed child lock:', value);
          await client.setChildLock(
            data.uuid,
            '1',
            result?.defaultValue,
            userId,
          );
        } else {
          this.log('Changed child lock:', value);
          await client.setChildLock(
            data.uuid,
            '0',
            result?.defaultValue,
            userId,
          );
        }
      });

      const resultFanSpeed = this.filterSettings(DeviceAttributes, 'fan_speed');
      const resultBrightness = this.filterSettings(
        DeviceAttributes,
        'brightness',
      );
      const resultChildLock = this.filterSettings(
        DeviceAttributes,
        'child_lock',
      );
      const resultFilterStatus = this.filterSettings(
        DeviceAttributes,
        'filter_status',
      );
      const resultWiFiStatus = this.filterSettings(
        DeviceAttributes,
        'wifi_status',
      );
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

      this.setCapabilityValue(
        'last_retrival_date',
        this.timeConverter(DeviceInfo.lastSyncDate),
      ).catch(this.error);
      if (resultWiFiStatus?.currentValue === '1') {
        this.setCapabilityValue('wifi_status', true);
      } else {
        this.setCapabilityValue('wifi_status', false);
      }
      this.setCapabilityValue(
        'filter_status',
        resultFilterStatus?.currentValue,
      );

      this.setSettings({
        uuid: DeviceInfo.uuid,
        name: DeviceInfo.name,
        compatibility: DeviceInfo.compatibility,
        model: DeviceInfo.model,
        mac: DeviceInfo.mac,
        firmware: DeviceInfo.firmware,
        mcuFirmware: DeviceInfo.mcuFirmware,
        wlanDriver: DeviceInfo.wlanDriver,
        lastSyncDate: this.timeConverter(DeviceInfo.lastSyncDate),
        installationDate: this.timeConverter(DeviceInfo.installationDate),
        lastCalibrationDate: this.timeConverter(DeviceInfo.lastCalibrationDate),
        initUsagePeriod: String(DeviceInfo.initUsagePeriod),
        rebootPeriod: String(DeviceInfo.rebootPeriod),
        roomLocation: DeviceInfo.roomLocation,
      });

      setInterval(async () => {
        this.log('setInternal: ', settings.update * 1000);
        const DeviceAttributes = await client.getDeviceAttributes(data.uuid);
        const DeviceInfo = await client.getDeviceInfo(data.uuid);
        const resultFanSpeed = this.filterSettings(
          DeviceAttributes,
          'fan_speed',
        );
        const resultBrightness = this.filterSettings(
          DeviceAttributes,
          'brightness',
        );
        const resultChildLock = this.filterSettings(
          DeviceAttributes,
          'child_lock',
        );
        const resultFilterStatus = this.filterSettings(
          DeviceAttributes,
          'filter_status',
        );
        const resultWiFiStatus = this.filterSettings(
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
        if (resultChildLock?.currentValue === 1) {
          this.setCapabilityValue('child_lock', true).catch(this.error);
        } else {
          this.setCapabilityValue('child_lock', false).catch(this.error);
        }
        this.setCapabilityValue(
          'last_retrival_date',
          this.timeConverter(DeviceInfo.lastSyncDate),
        ).catch(this.error);
        if (resultWiFiStatus?.currentValue === '1') {
          this.setCapabilityValue('wifi_status', true).catch(this.error);
        } else {
          this.setCapabilityValue('wifi_status', false);
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
          uuid: DeviceInfo.uuid,
          name: DeviceInfo.name,
          compatibility: DeviceInfo.compatibility,
          model: DeviceInfo.model,
          mac: DeviceInfo.mac,
          firmware: DeviceInfo.firmware,
          mcuFirmware: DeviceInfo.mcuFirmware,
          wlanDriver: DeviceInfo.wlanDriver,
          lastSyncDate: this.timeConverter(DeviceInfo.lastSyncDate),
          installationDate: this.timeConverter(DeviceInfo.installationDate),
          lastCalibrationDate: this.timeConverter(
            DeviceInfo.lastCalibrationDate,
          ),
          initUsagePeriod: String(DeviceInfo.initUsagePeriod),
          rebootPeriod: String(DeviceInfo.rebootPeriod),
          roomLocation: DeviceInfo.roomLocation,
        });
        const DeviceAttributes = await client.getDeviceAttributes(data.uuid);
        const resultFilterStatus = this.filterSettings(
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
        if (value.speed === 'auto') {
          this.log('Changed fan speed to:', value.fanspeed);
          await client.setFanAuto(data.uuid, 'auto', 'auto', userId);
        } else {
          this.log('Changed fan speed:', value.fanspeed);
          await client.setFanSpeed(
            data.uuid,
            value.fanspeed,
            value.fanspeed,
            userId,
          );
          await client.setFanAuto(data.uuid, 'manual', 'manual', userId);
        }
      });

      const brightnesscard = this.homey.flow.getActionCard('set-brightness');
      brightnesscard.registerRunListener(async (value) => {
        this.log(
          'Want to change the brightness with value: ',
          value.brightness,
        );

        await client.setBrightness(
          data.uuid,
          value.brightness,
          value.brightness,
          userId,
        );
        this.log('Changed brightness to:', value.brightness);
      });

      this.log('BlueAirClassicDevice has been initialized');
    } catch (e) {
      this.log(e);
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded(): Promise<void> {
    this.log('BlueAirClassicDevice has been added');
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
    this.log('BlueAirClassicDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used to synchronize the name to the device.
   * @param name The new name
   */
  async onRenamed(name: string): Promise<void> {
    this.log('BlueAirClassicDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted(): Promise<void> {
    this.log('BlueAirClassicDevice has been deleted');
  }

  /**
   * Converts a UNIX timestamp to a human-readable date-time string based on language.
   *
   * @param unixTimeStamp - The UNIX timestamp to be converted.
   * @returns A string representation of the date and time based on the language.
   */
  timeConverter(this: any, unixTimeStamp: number): string {
    const a: Date = new Date(unixTimeStamp * 1000);

    /**
     * Helper function to ensure numbers are represented with two digits.
     *
     * @param n - The number to be padded.
     * @returns A string representation of the number, padded with a leading zero if the number is less than 10.
     */
    function pad(n: number): string {
      return n < 10 ? `0${n}` : n.toString();
    }

    const year: number = a.getFullYear();
    const month: string = pad(a.getMonth() + 1);
    const date: string = pad(a.getDate());
    const hour: string = pad(a.getHours());
    const min: string = pad(a.getMinutes());
    const sec: string = pad(a.getSeconds());

    let time: string;
    const lang = this.homey.i18n.getLanguage();
    switch (lang) {
      case 'en':
        time = `${year}-${month}-${date} ${hour}:${min}:${sec}`;
        break;
      case 'nl':
      case 'da':
        time = `${date}-${month}-${year} ${hour}:${min}:${sec}`;
        break;
      case 'de':
      case 'no':
      case 'ru':
        time = `${date}.${month}.${year} ${hour}:${min}:${sec}`;
        break;
      case 'fr':
      case 'it':
      case 'es':
        time = `${date}/${month}/${year} ${hour}:${min}:${sec}`;
        break;
      case 'sv':
      case 'pl':
        time = `${year}-${month}-${date} ${hour}:${min}:${sec}`;
        break;
      default:
        time = `${year}-${month}-${date} ${hour}:${min}:${sec}`; // Default format
    }

    return time;
  }

  /**
   * Filters the settings array to find a setting by its name.
   * @param settings - An array of settings to search through.
   * @param name - The name of the setting to search for.
   * @returns The found setting or null if not found.
   */
  filterSettings(settings: Setting[], name: string): Setting | null {
    if (!Array.isArray(settings)) {
      this.log('Settings is not an array', settings);
      return null;
    }
    const setting: Setting | undefined = settings.find(
      (s: Setting) => s.name === name,
    );
    return setting || null;
  }
}

module.exports = BlueAirClassicDevice;
