import { Device } from 'homey';
import { ApiClient } from 'blueair-client';

/**
 * Represents a setting object.
 */
interface Setting {
    name: string;
    [key: string]: any; // This allows for other properties in the setting object.
}

/**
 * Represents the event data for the onSettings function.
 */
interface OnSettingsEvent {
    oldSettings: Record<string, any>;
    newSettings: Record<string, any>;
    changedKeys: string[];
}

/**
 * Converts a UNIX timestamp to a human-readable date-time string.
 *
 * @param UNIX_timestamp - The UNIX timestamp to be converted.
 * @returns A string representation of the date and time in the format "YYYY-MM-DD HH:mm:ss".
 */
function timeConverter(UNIX_timestamp: number): string {
    const a: Date = new Date(UNIX_timestamp * 1000);

    /**
     * Helper function to ensure numbers are represented with two digits.
     *
     * @param n - The number to be padded.
     * @returns A string representation of the number, padded with a leading zero if the number is less than 10.
     */
    function pad(n: number): string {
        return n < 10 ? '0' + n : n.toString();
    }

    const year: number = a.getFullYear();
    const month: string = pad(a.getMonth() + 1); // Add 1 to the month value because getMonth() is zero-based
    const date: string = pad(a.getDate());
    const hour: string = pad(a.getHours());
    const min: string = pad(a.getMinutes());
    const sec: string = pad(a.getSeconds());
    const time: string =
        year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

/**
 * Filters the settings array to find a setting by its name.
 * @param settings - An array of settings to search through.
 * @param name - The name of the setting to search for.
 * @returns The found setting or null if not found.
 */
function filterSettings(settings: Setting[], name: string): Setting | null {
    const setting: Setting | undefined = settings.find(
        (s: Setting) => s.name === name
    );
    return setting || null;
}
class BlueAir405ClassicDevice extends Device {
    private _savedfanspeed: Setting | null | undefined;
    /**
     * onInit is called when the device is initialized.
     */
    async onInit(): Promise<void> {
        let settings = this.getSettings();
        let data = this.getData();
        let userId = this.getStoreValue('userId');

        try {
            const client = new ApiClient(settings.username, settings.password);
            await client.initialize();

            var DeviceAttributes = await client.getDeviceAttributes(data.uuid);
            var DeviceInfo = await client.getDeviceInfo(data.uuid);
            this._savedfanspeed = filterSettings(DeviceAttributes, 'fan_speed');

            this.registerCapabilityListener('fan_speed', async (value) => {
                const result = filterSettings(DeviceAttributes, 'fan_speed');
                if (value == 'auto') {
                    this.log('Changed fan speed: Auto');
                    await client.setFanAuto(data.uuid, 'auto', 'auto', userId);
                } else {
                    this.log('Changed fan speed:', value);
                    await client.setFanSpeed(
                        data.uuid,
                        value,
                        result?.defaultValue,
                        userId
                    );
                    await client.setFanAuto(
                        data.uuid,
                        'manual',
                        'manual',
                        userId
                    );
                }
            });
            this.registerCapabilityListener('brightness', async (value) => {
                const result = filterSettings(DeviceAttributes, 'brightness');
                this.log('Changed brightness:', value);
                await client.setBrightness(
                    data.uuid,
                    String(value),
                    result?.defaultValue,
                    userId
                );
            });
            this.registerCapabilityListener('child_lock', async (value) => {
                const result = filterSettings(DeviceAttributes, 'child_lock');
                if (value) {
                    this.log('Changed child lock:', value);
                    await client.setChildLock(
                        data.uuid,
                        '1',
                        result?.defaultValue,
                        userId
                    );
                } else {
                    this.log('Changed child lock:', value);
                    await client.setChildLock(
                        data.uuid,
                        '0',
                        result?.defaultValue,
                        userId
                    );
                }
            });

            let result_fan_speed = filterSettings(
                DeviceAttributes,
                'fan_speed'
            );
            let result_brightness = filterSettings(
                DeviceAttributes,
                'brightness'
            );
            let result_child_lock = filterSettings(
                DeviceAttributes,
                'child_lock'
            );
            let result_filter_status = filterSettings(
                DeviceAttributes,
                'filter_status'
            );
            let result_wifi_status = filterSettings(
                DeviceAttributes,
                'wifi_status'
            );
            this.setCapabilityValue(
                'fan_speed',
                result_fan_speed?.currentValue
            );
            this.setCapabilityValue(
                'brightness',
                parseInt(result_brightness?.currentValue)
            );
            if (result_child_lock?.currentValue == 1) {
                this.setCapabilityValue('child_lock', true);
            } else {
                this.setCapabilityValue('child_lock', false);
            }

            this.setCapabilityValue(
                'last_retrival_date',
                timeConverter(DeviceInfo.lastSyncDate)
            );
            if (result_wifi_status?.currentValue == '1') {
                this.setCapabilityValue('wifi_status', 'OK');
            } else {
                this.setCapabilityValue('wifi_status', 'Error');
            }
            this.setCapabilityValue(
                'filter_status',
                result_filter_status?.currentValue
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
                lastSyncDate: timeConverter(DeviceInfo.lastSyncDate),
                installationDate: timeConverter(DeviceInfo.installationDate),
                lastCalibrationDate: timeConverter(
                    DeviceInfo.lastCalibrationDate
                ),
                initUsagePeriod: String(DeviceInfo.initUsagePeriod),
                rebootPeriod: String(DeviceInfo.rebootPeriod),
                roomLocation: DeviceInfo.roomLocation,
            });

            setInterval(async () => {
                this.log('setInternal: ', settings.update * 1000);
                var DeviceAttributes = await client.getDeviceAttributes(
                    data.uuid
                );
                var DeviceInfo = await client.getDeviceInfo(data.uuid);
                let result_fan_speed = filterSettings(
                    DeviceAttributes,
                    'fan_speed'
                );
                let result_brightness = filterSettings(
                    DeviceAttributes,
                    'brightness'
                );
                let result_child_lock = filterSettings(
                    DeviceAttributes,
                    'child_lock'
                );
                let result_filter_status = filterSettings(
                    DeviceAttributes,
                    'filter_status'
                );
                let result_wifi_status = filterSettings(
                    DeviceAttributes,
                    'wifi_status'
                );
                this.setCapabilityValue(
                    'fan_speed',
                    result_fan_speed?.currentValue
                );
                this.setCapabilityValue(
                    'brightness',
                    parseInt(result_brightness?.currentValue)
                );
                if (result_child_lock?.currentValue == 1) {
                    this.setCapabilityValue('child_lock', true);
                } else {
                    this.setCapabilityValue('child_lock', false);
                }

                this.setCapabilityValue(
                    'last_retrival_date',
                    timeConverter(DeviceInfo.lastSyncDate)
                );
                if (result_wifi_status?.currentValue == '1') {
                    this.setCapabilityValue('wifi_status', 'OK');
                } else {
                    this.setCapabilityValue('wifi_status', 'Error');
                }
                this.setCapabilityValue(
                    'filter_status',
                    result_filter_status?.currentValue
                );
                if (
                    this._savedfanspeed?.currentValue !=
                    result_fan_speed?.currentValue
                ) {
                    const cardTriggerFilter = this.homey.flow.getTriggerCard(
                        'fan-speed-has-changed'
                    );
                    cardTriggerFilter.trigger({
                        'device-name': settings.name,
                        'device-uuid': settings.uuid,
                        'fan speed': result_filter_status?.currentValue,
                    });
                    this._savedfanspeed = result_fan_speed;
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
                    lastSyncDate: timeConverter(DeviceInfo.lastSyncDate),
                    installationDate: timeConverter(
                        DeviceInfo.installationDate
                    ),
                    lastCalibrationDate: timeConverter(
                        DeviceInfo.lastCalibrationDate
                    ),
                    initUsagePeriod: String(DeviceInfo.initUsagePeriod),
                    rebootPeriod: String(DeviceInfo.rebootPeriod),
                    roomLocation: DeviceInfo.roomLocation,
                });
                var DeviceAttributes = await client.getDeviceAttributes(
                    data.uuid
                );
                let result_filter_status = filterSettings(
                    DeviceAttributes,
                    'filter_status'
                );
                if (result_filter_status?.currentValue != 'OK') {
                    const cardTriggerFilter = this.homey.flow.getTriggerCard(
                        'filter-needs-change'
                    );
                    cardTriggerFilter.trigger({
                        'device-name': settings.name,
                        'device-uuid': settings.uuid,
                        'device-response': result_filter_status?.currentValue,
                    });
                }
            }, 60000);

            const fancard = this.homey.flow.getActionCard('set-fan-speed');
            fancard.registerRunListener(async (value) => {
                this.log(
                    'Want to change the fan speed with value: ',
                    value.fanspeed
                );
                if (value.speed == 'auto') {
                    this.log('Changed fan speed to:', value.fanspeed);
                    await client.setFanAuto(data.uuid, 'auto', 'auto', userId);
                } else {
                    this.log('Changed fan speed:', value.fanspeed);
                    await client.setFanSpeed(
                        data.uuid,
                        value.fanspeed,
                        value.fanspeed,
                        userId
                    );
                    await client.setFanAuto(
                        data.uuid,
                        'manual',
                        'manual',
                        userId
                    );
                }
            });

            const brightnesscard =
                this.homey.flow.getActionCard('set-brightness');
            brightnesscard.registerRunListener(async (value) => {
                this.log(
                    'Want to change the brightness with value: ',
                    value.brightness
                );

                await client.setBrightness(
                    data.uuid,
                    value.brightness,
                    value.brightness,
                    userId
                );
                this.log('Changed brightness to:', value.brightness);
            });

            this.log('BlueAir405ClassicDevice has been initialized');
        } catch (e) {
            this.log(e);
        }
    }

    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded(): Promise<void> {
        this.log('BlueAir405ClassicDevice has been added');
    }

    /**
     * onSettings is called when the user updates the device's settings.
     * @param event the onSettings event data
     * @param event.oldSettings The old settings object
     * @param event.newSettings The new settings object
     * @param event.changedKeys An array of keys changed since the previous version
     * @returns A promise that resolves to a custom message that will be displayed or void.
     */
    async onSettings({
        oldSettings,
        newSettings,
        changedKeys,
    }: OnSettingsEvent): Promise<string | void> {
        this.log('BlueAir405ClassicDevice settings where changed');
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used to synchronize the name to the device.
     * @param name The new name
     */
    async onRenamed(name: string): Promise<void> {
        this.log('BlueAir405ClassicDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted(): Promise<void> {
        this.log('BlueAir405ClassicDevice has been deleted');
    }
}

module.exports = BlueAir405ClassicDevice;
