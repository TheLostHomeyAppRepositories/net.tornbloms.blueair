import BlueAirAwsBaseDriver from '../BlueAirAwsBaseDriver';
import { BlueAirAwsClient } from 'blueairaws-client';
import { Region } from 'blueairaws-client/dist/Consts';
import { DiagnosticLogger } from '../../lib/diagnostics';

const HUMIDIFIER_MODELS = ['h35i', 'h76i', 't10i', 't20i'];
// Some units (e.g. DreamWell H38i) report a generic model string
// ("…:iotmodule:…"), so also accept devices that expose humidifier-only state.
const HUMIDIFIER_STATE_KEYS = ['autorh', 'wlevel'];

class BlueAirHumidifierDriver extends BlueAirAwsBaseDriver {
  protected deviceModelFilters = ['humidifier'];
  private logger!: DiagnosticLogger;

  private isHumidifier(info: { model: string; state: object }): boolean {
    const model = info.model.toLowerCase();
    return (
      HUMIDIFIER_MODELS.some((m) => model.includes(m)) ||
      HUMIDIFIER_STATE_KEYS.some((k) => k in info.state)
    );
  }

  protected async filterCompatibleDevices(
    devicesList: any[],
    client: BlueAirAwsClient,
    username: string,
    password: string
  ) {
    const accountuuid = devicesList[0].name;
    const compatible = [];

    for (const device of devicesList) {
      const statusArray = await client.getDeviceStatus(accountuuid, [device.uuid]);
      for (const info of statusArray) {
        const match = this.isHumidifier(info);
        this.logger.info(
          `[pair] model="${info.model}" name="${info.name}" state=[${Object.keys(info.state).join(',')}] → ${match ? 'humidifier' : 'skipped'}`
        );
        if (match) {
          compatible.push({
            name: info.name,
            data: { accountuuid, uuid: info.id, mac: device.mac },
            store: { name: info.name },
            settings: { username, password, region: Region.EU },
          });
        }
      }
    }
    return compatible;
  }

  async onInit(): Promise<void> {
    this.logger = new DiagnosticLogger(
      'BlueAirHumidifierDriver',
      (...args: unknown[]) => this.log(...(args as any[])),
      (...args: unknown[]) => this.error(...(args as any[]))
    );
    await super.onInit();
  }
}

module.exports = BlueAirHumidifierDriver;
