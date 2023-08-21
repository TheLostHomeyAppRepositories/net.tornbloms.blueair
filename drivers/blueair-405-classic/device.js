'use strict';

const { Device } = require('homey');

const { ApiClient } = require('blueair-client');

/**
 * Converts a UNIX timestamp to a human-readable date-time string.
 *
 * @param {number} UNIX_timestamp - The UNIX timestamp to be converted.
 * @returns {string} - A string representing the date and time in the format "YYYY-MM-DD HH:MM:SS".
 *
 * @example
 * const timestamp = 1629460800; // Represents "2021-08-20 12:00:00"
 * const readableDate = timeConverter(timestamp);
 * console.log(readableDate); // Outputs: "2021-08-20 12:00:00"
 */
function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);

    /**
     * Helper function to ensure numbers are represented with two digits.
     *
     * @param {number} n - The number to be padded.
     * @returns {string} - A string representation of the number, padded with a leading zero if the number is less than 10.
     */
    function pad(n) {
        return n < 10 ? '0' + n : n;
    }

    var year = a.getFullYear();
    var month = pad(a.getMonth() + 1); // Add 1 to the month value because getMonth() is zero-based
    var date = pad(a.getDate());
    var hour = pad(a.getHours());
    var min = pad(a.getMinutes());
    var sec = pad(a.getSeconds());
    var time =
        year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

function filterSettings(settings, name) {
    const setting = settings.find((s) => s.name === name);
    return setting || null;
}

class BlueAir405ClassicDevice extends Device {
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
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
                        result.defaultValue,
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
                    result.defaultValue,
                    userId
                );
            });
            this.registerCapabilityListener('child_lock', async (value) => {
                const result = filterSettings(DeviceAttributes, 'child_lock');
                if (value) {
                    this.log('Changed child lock:', value);
                    await client.setChildLock(
                        data.uuid,
                        1,
                        result.defaultValue,
                        userId
                    );
                } else {
                    this.log('Changed child lock:', value);
                    await client.setChildLock(
                        data.uuid,
                        0,
                        result.defaultValue,
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
            this.setCapabilityValue('fan_speed', result_fan_speed.currentValue);
            this.setCapabilityValue(
                'brightness',
                parseInt(result_brightness.currentValue)
            );
            if (result_child_lock.currentValue == 1) {
                this.setCapabilityValue('child_lock', true);
            } else {
                this.setCapabilityValue('child_lock', false);
            }

            this.setCapabilityValue(
                'last_retrival_date',
                timeConverter(DeviceInfo.lastSyncDate)
            );
            if (result_wifi_status.currentValue == '1') {
                this.setCapabilityValue('wifi_status', 'OK');
            } else {
                this.setCapabilityValue('wifi_status', 'Error');
            }
            this.setCapabilityValue(
                'filter_status',
                result_filter_status.currentValue
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

            this.CapabilityInterval = setInterval(async () => {
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
                    result_fan_speed.currentValue
                );
                this.setCapabilityValue(
                    'brightness',
                    parseInt(result_brightness.currentValue)
                );
                if (result_child_lock.currentValue == 1) {
                    this.setCapabilityValue('child_lock', true);
                } else {
                    this.setCapabilityValue('child_lock', false);
                }

                this.setCapabilityValue(
                    'last_retrival_date',
                    timeConverter(DeviceInfo.lastSyncDate)
                );
                if (result_wifi_status.currentValue == '1') {
                    this.setCapabilityValue('wifi_status', 'OK');
                } else {
                    this.setCapabilityValue('wifi_status', 'Error');
                }
                this.setCapabilityValue(
                    'filter_status',
                    result_filter_status.currentValue
                );
                if (
                    this._savedfanspeed.currentValue !=
                    result_fan_speed.currentValue
                ) {
                    const cardTriggerFilter = this.homey.flow.getTriggerCard(
                        'fan-speed-has-changed'
                    );
                    cardTriggerFilter.trigger({
                        'device-name': settings.name,
                        'device-uuid': settings.uuid,
                        'fan speed': result_filter_status.currentValue,
                    });
                    this._savedfanspeed = result_fan_speed;
                }
            }, settings.update * 1000);

            this.SettingsInterval = setInterval(async () => {
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
                if (result_filter_status.currentValue != 'OK') {
                    const cardTriggerFilter = this.homey.flow.getTriggerCard(
                        'filter-needs-change'
                    );
                    cardTriggerFilter.trigger({
                        'device-name': settings.name,
                        'device-uuid': settings.uuid,
                        'device-response': result_filter_status.currentValue,
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
    async onAdded() {
        this.log('BlueAir405ClassicDevice has been added');
    }

    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        // let settings = this.getSettings();
        // clearInterval(this.CapabilityInterval);
        // this.CapabilityInterval = setInterval(async () => {
        //     this.log('setInternal: ', settings.update * 1000);
        //     var DeviceAttributes = await client.getDeviceAttributes(data.uuid);
        //     var DeviceInfo = await client.getDeviceInfo(data.uuid);
        //     let result_fan_speed = filterSettings(
        //         DeviceAttributes,
        //         'fan_speed'
        //     );
        //     let result_brightness = filterSettings(
        //         DeviceAttributes,
        //         'brightness'
        //     );
        //     let result_child_lock = filterSettings(
        //         DeviceAttributes,
        //         'child_lock'
        //     );
        //     let result_filter_status = filterSettings(
        //         DeviceAttributes,
        //         'filter_status'
        //     );
        //     let result_wifi_status = filterSettings(
        //         DeviceAttributes,
        //         'wifi_status'
        //     );
        //     this.setCapabilityValue('fan_speed', result_fan_speed.currentValue);
        //     this.setCapabilityValue(
        //         'brightness',
        //         parseInt(result_brightness.currentValue)
        //     );
        //     if (result_child_lock.currentValue) {
        //         this.setCapabilityValue('child_lock', true);
        //     } else {
        //         this.setCapabilityValue('child_lock', false);
        //     }

        //     this.setCapabilityValue(
        //         'last_retrival_date',
        //         timeConverter(DeviceInfo.lastSyncDate)
        //     );
        //     if (result_wifi_status.currentValue == '1') {
        //         this.setCapabilityValue('wifi_status', 'OK');
        //     } else {
        //         this.setCapabilityValue('wifi_status', 'Error');
        //     }
        //     this.setCapabilityValue(
        //         'filter_status',
        //         result_filter_status.currentValue
        //     );
        // }, settings.update * 1000);

        this.log('BlueAir405ClassicDevice settings where changed');
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('BlueAir405ClassicDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        clearInterval(this.CapabilityInterval);
        clearInterval(this.SettingsInterval);
        this.log('BlueAir405ClassicDevice has been deleted');
    }
}

module.exports = BlueAir405ClassicDevice;
