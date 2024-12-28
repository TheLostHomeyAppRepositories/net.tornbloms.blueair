/**
 * Utility class for supporting other code.
 */

export class Utils {
  /**
   * Converts a temperature from Celsius to Fahrenheit.
   *
   * The formula to convert Celsius to Fahrenheit is:
   * F = C * 9/5 + 32
   *
   * @param {number} celsius - The temperature in Celsius. Can be a decimal.
   * @returns {number} - The temperature converted to Fahrenheit.
   * @throws {Error} - Throws an error if the input is not a number.
   */
  static celsiusToFahrenheit(celsius: number): number {
    // Check if the input is a number
    if (typeof celsius !== 'number' || isNaN(celsius)) {
      throw new Error('Input must be a valid number');
    }

    // Convert Celsius to Fahrenheit using the formula
    const fahrenheit = (celsius * 9) / 5 + 32;

    // Return the result
    return fahrenheit;
  }

  /**
   * Converts a temperature from Celsius to Fahrenheit if the shouldConvert flag is true.
   *
   * @param {number} temperature - The temperature in Celsius. Can be a decimal.
   * @param {boolean} shouldConvert - A flag indicating whether to convert the temperature.
   * @returns {number} - The temperature converted to Fahrenheit if shouldConvert is true, otherwise the original temperature.
   * @throws {Error} - Throws an error if the input temperature is not a number.
   */
  static conditionalCelsiusToFahrenheit(
    temperature: number,
    shouldConvert: boolean
  ): number {
    if (shouldConvert) {
      return Utils.celsiusToFahrenheit(temperature);
    }
    return temperature;
  }
}
