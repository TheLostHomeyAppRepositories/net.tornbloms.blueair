"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const { Log } = require('homey-log');
class BlueAirApp extends homey_1.default.App {
    /**
     * onInit is called when the app is initialized.
     */
    async onInit() {
        this.homeyLog = new Log({ homey: this.homey });
        this.log('BlueAir has been initialized');
    }
}
module.exports = BlueAirApp;
