'use strict';

const i2c = require('i2c-bus');

/**
*  A Node.js I2C module for the Analog Devices ADXL345 three-axis digital accelerometer.
*/
class ADXL345 {

  /**
   * @constructor
   * @param {Object} [options]
   * @param {number} [options.i2cBusNo=1] - i2c bus number, ie. /dev/i2c-X
   * @param {number} [options.i2cAddress=0x53] - device i2c address.
   * @param {Object} [options.i2cBus] - i2c-bus Bus object (inject for testing).
   */
  constructor(options) {
    this.i2cBusNo = (options && options.hasOwnProperty('i2cBusNo')) ? options.i2cBusNo : 1;
    this.i2cAddress = (options && options.hasOwnProperty('i2cAddress')) ? options.i2cAddress : ADXL345.I2C_ADDRESS_ALT_GROUNDED();
    this.i2cBus = (options && options.hasOwnProperty('i2cBus')) ? options.i2cBus : i2c.openSync(this.i2cBusNo);

    this.ADXL345_REG_DEVID       = 0x00; // Device ID
    this.ADXL345_REG_OFSX        = 0x1E; // X-axis offset
    this.ADXL345_REG_OFSY        = 0x1F; // Y-axis offset
    this.ADXL345_REG_OFSZ        = 0x20; // Z-axis offset
    this.ADXL345_REG_BW_RATE     = 0x2C; // Data rate and power mode control
    this.ADXL345_REG_POWER_CTL   = 0x2D; // Power-saving features control
    this.ADXL345_REG_DATA_FORMAT = 0x31; // Data format control
    this.ADXL345_REG_DATAX0      = 0x32; // read 6 bytes from ADXL345_REG_DATAX0 for all three axes
    this.ADXL345_REG_DATAX1      = 0x33;
    this.ADXL345_REG_DATAY0      = 0x34;
    this.ADXL345_REG_DATAY1      = 0x35;
    this.ADXL345_REG_DATAZ0      = 0x36;
    this.ADXL345_REG_DATAZ1      = 0x37;

    this.ADXL345_MG2G_SCALE_FACTOR = 0.004; // 4mg per lsb
    this.EARTH_GRAVITY_MS2 = 9.80665;
  }

  /**
   * Write a byte to an ADXL345 register.  Abstracts and Promisifies
   * i2c writes.
   * @private
   * @param {number} register
   * @param {number} value - 8-bit value.
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  writeByte(register, value) {
    return new Promise((resolve, reject) => {
      this.i2cBus.writeByte(this.i2cAddress, register, value, (err) => {
          if (err) {
            reject(err);
          }
          else {
            resolve();
          }
      });
    });
  }

  /**
   * Read a byte from an ADXL345 register.  Abstracts and Promisifies
   * i2c reads.
   * @private
   * @param {number} register
   * @returns {Promise} Resolves with 8-bit register value, rejects with Error.
   */
  readByte(register) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, register, (err, value) => {
        return err ? reject(err) : resolve(value);
      });
    });
  }

  /**
   * Read bytes from a series of sequential ADXL345 registers.  Abstracts around
   * Promisifies i2c block reads.
   * @private
   * @param {number} register - Starting register address.
   * @param {number} bytes - Number of bytes to read.
   * @returns {Promise} Resolves with Buffer[bytes], rejects with Error.
   */
  readBlock(register, bytes) {
    return new Promise((resolve, reject) => {
      this.i2cBus.readI2cBlock(this.i2cAddress, register, bytes, new Buffer(bytes), (err, bytesRead, buffer) => {
        return err ? reject(err) : resolve(buffer);
      });
    });
  }

  /**
   * Read Device ID
   * @returns {Promise} Resolves with device ID, rejects with Error.
   */
  getDevId() {
    return this.readByte(this.ADXL345_REG_DEVID);
  }

  /**
   * Set POWER_CTL register.
   * @param {number} value - 8-bit register value
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  setPowerCtl(value) {
    return this.writeByte(this.ADXL345ADXL345_REG_POWER_CTL, value);
  }

  /**
   * Initialize the device.  Performs a device ID check, then  puts then
   * device into measurement mode.
   * @returns {Promise} Resolves with device ID on success, rejects with Error.
   */
  init() {
    return this.getDevId().then((deviceId) => {
      if (deviceId !== ADXL345.DEVICE_ID()) {
        return Promise.reject(Error(`Unexpected ADXL345 device ID: 0x${deviceId.toString(16)}`));
      }
      console.log(`Found ADXL345 device id 0x${deviceId.toString(16)} on bus i2c-${this.i2cBusNo}, address 0x${this.i2cAddress.toString(16)}`);
      return this.setPowerCtl(this.POWER_CTL_MEASURE).then(() => deviceId);
    });
  }

  /**
   * Read acceleration data for X,Y,Z axis.
   * @param {boolean} [gForce=false] - When true, return values in g, when
   * false, return values in m/s/s.
   * @returns {Promise} Resolves with {x, y, z, units}
   */
  getAcceleration(gForce) {
    return this.readBlock(this.ADXL345_REG_DATAX0, 6).then((buffer) => {
      let x = this.int16(buffer[1], buffer[0]) * this.ADXL345_MG2G_SCALE_FACTOR;
      let y = this.int16(buffer[3], buffer[2]) * this.ADXL345_MG2G_SCALE_FACTOR;
      let z = this.int16(buffer[5], buffer[4]) * this.ADXL345_MG2G_SCALE_FACTOR;
      return {
            x : gForce ? x : x * this.EARTH_GRAVITY_MS2,
            y : gForce ? y : y * this.EARTH_GRAVITY_MS2,
            z : gForce ? z : z * this.EARTH_GRAVITY_MS2,
            units : gForce ? 'g' : 'm/s²'
      };
    });
  }

  /**
   * Set measurement range.  Regarless of range, full-resolution mode is
   * always used.
   * @param {number} range - ADXL345.RANGE_X_G() | X=2,4,8,16
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  setMeasurementRange(range) {
    if(!ADXL345.isValidRange(range)) {
      return Promise.reject(`Invalid range (${range})`);
    }
    return this.readByte(this.ADXL345_REG_DATA_FORMAT).then((format) => {
      format &= ~0b1111;
      format |= range;
      format |= 0b1000; // Enable FULL-RESOLUTION mode for range scaling
      return this.writeByte(this.ADXL345_REG_DATA_FORMAT, format);
    });
  }

  /**
   * Get measurement range.
   * @returns {Promise} Resolves with 2-bit range value, rejects on Error.  Result
   * can be converted to a string using {@link stringifyMeasurementRange}.
   */
  getMeasurementRange() {
    return this.readByte(this.ADXL345_REG_DATA_FORMAT).then((format) => format & 0b11);
  }

  /**
   * Set date rate.  LOW_POWER bit is always cleared (ie. normal operation)
   * when the rate is set.
   * @param {number} dataRate - 4-bit data rate value
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  setDataRate(dataRate) {
    if(!ADXL345.isValidDataRate(dataRate)) {
      return Promise.reject(Error(`Invalid data rate (${dataRate})`));
    }
    return this.writeByte(this.ADXL345_REG_BW_RATE, dataRate & 0b1111);
  }

  /**
   * Get data rate
   * @returns {Promise} Resolves with 4-bit data rate value, rejects with Error.
   */
  getDataRate() {
    return this.readByte(this.ADXL345_REG_BW_RATE).then((bwRate) => (bwRate & 0b1111));
  }

  /**
   * Set the X-axis offset value.
   * @param {number} value - 8-bits, twos compliment, 15.6mg/LSB.
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  setOffsetX(value) {
    return this.writeByte(this.ADXL345_REG_OFSX, value);
  }

  /**
   * Set the Y-axis offset value.
   * @param {number} value - 8-bits, twos compliment, 15.6mg/LSB.
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  setOffsetY(value) {
    return this.writeByte(this.ADXL345_REG_OFSY, value);
  }

  /**
   * Set the Z-axis offset value.
   * @param {number} value - 8-bits, twos compliment, 15.6mg/LSB.
   * @returns {Promise} Resolves on success, rejects with Error.
   */
  setOffsetZ(value) {
    return this.writeByte(this.ADXL345_REG_OFSZ, value);
  }

  /**
   * Read offset settings.  One call reads all 3 offset registers.
   * @returns {Promise} Resolves with {x, y, z}, rejects with Error.
   */
  getOffsets() {
    return this.readBlock(this.ADXL345_REG_OFSX, 3).then((buffer) => ({
        x : buffer[0],
        y : buffer[1],
        z : buffer[2]
      }));
  }

  /**
   * Convert 2-byte array into unsigned 16-bit integer
   * @private
   * @param {number} msb
   * @param {number} lsb
   * @returns {number} 16-bit unsigned integer.
   */
  uint16(msb, lsb) {
    return msb << 8 | lsb;
  }

  /**
   * Convert 2-byte array into signed 16-bit integer
   * @private
   * @param {number} msb
   * @param {number} lsb
   * @returns {number} 16-bit signed integer.
   */
  int16(msb, lsb) {
    let val = this.uint16(msb, lsb);
    return val > 32767 ? (val - 65536) : val;
  }

  /**
   * Verify range bits are valid
   * @private
   * @param {number} range - 2-bit range value.
   * @returns {boolean} true if valid.
   */
  static isValidRange(range) {
    switch(range) {
      // Could simply check for range >= 0 && range <= 0x3 but to be padantic...
      case ADXL345.RANGE_2_G():
      case ADXL345.RANGE_4_G():
      case ADXL345.RANGE_8_G():
      case ADXL345.RANGE_16_G():
        return true;

      default:
        return false;
    }
  }

  /**
  * Verify data rate bits are valid.
  * @private
  * @param {number} dataRate - 2-byte range value
  * @returns {boolean} true if valid.
  */
  static isValidDataRate(dataRate) {
    switch(dataRate) {
      // Could simply check for dataData >= 0 && dataRate <= 0xF but to be padantic...
      case ADXL345.DATARATE_0_10_HZ():
      case ADXL345.DATARATE_0_20_HZ():
      case ADXL345.DATARATE_0_39_HZ():
      case ADXL345.DATARATE_0_78_HZ():
      case ADXL345.DATARATE_1_56_HZ():
      case ADXL345.DATARATE_3_13_HZ():
      case ADXL345.DATARATE_6_25HZ():
      case ADXL345.DATARATE_12_5_HZ():
      case ADXL345.DATARATE_25_HZ():
      case ADXL345.DATARATE_50_HZ():
      case ADXL345.DATARATE_100_HZ():
      case ADXL345.DATARATE_200_HZ():
      case ADXL345.DATARATE_400_HZ():
      case ADXL345.DATARATE_800_HZ():
      case ADXL345.DATARATE_1600_HZ():
      case ADXL345.DATARATE_3200_HZ():
        return true;

      default:
        return false;
    }
  }

  /**
   * Convert range bits into string.
   * @param {number} range - 2-bit range value
   * @returns {string}
   */
  static stringifyMeasurementRange(range) {
    switch(range) {
      case ADXL345.RANGE_2_G() : return 'RANGE_2_G';
      case ADXL345.RANGE_4_G() : return 'RANGE_4_G';
      case ADXL345.RANGE_8_G() : return 'RANGE_8_G';
      case ADXL345.RANGE_16_G(): return 'RANGE_16_G';

      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Convert rate bytes into string.
   * @param {number} rate - 2-byte rate value
   * @returns {string}
   */
  static stringifyDataRate(dataRate) {
    switch(dataRate) {
      case ADXL345.DATARATE_0_10_HZ() : return 'DATARATE_0_10_HZ';
      case ADXL345.DATARATE_0_20_HZ() : return 'DATARATE_0_20_HZ';
      case ADXL345.DATARATE_0_39_HZ() : return 'DATARATE_0_39_HZ';
      case ADXL345.DATARATE_0_78_HZ() : return 'DATARATE_0_78_HZ';
      case ADXL345.DATARATE_1_56_HZ() : return 'DATARATE_1_56_HZ';
      case ADXL345.DATARATE_3_13_HZ() : return 'DATARATE_3_13_HZ';
      case ADXL345.DATARATE_6_25HZ()  : return 'DATARATE_6_25HZ';
      case ADXL345.DATARATE_12_5_HZ() : return 'DATARATE_12_5_HZ';
      case ADXL345.DATARATE_25_HZ()   : return 'DATARATE_25_HZ';
      case ADXL345.DATARATE_50_HZ()   : return 'DATARATE_50_HZ';
      case ADXL345.DATARATE_100_HZ()  : return 'DATARATE_100_HZ';
      case ADXL345.DATARATE_200_HZ()  : return 'DATARATE_200_HZ';
      case ADXL345.DATARATE_400_HZ()  : return 'DATARATE_400_HZ';
      case ADXL345.DATARATE_800_HZ()  : return 'DATARATE_800_HZ';
      case ADXL345.DATARATE_1600_HZ() : return 'DATARATE_1600_HZ';
      case ADXL345.DATARATE_3200_HZ() : return 'DATARATE_3200_HZ';

      default:
        return 'UNKNOWN';
    }
  }

  static I2C_ADDRESS_ALT_GROUNDED() {
    return 0x53; // The SDO/ALT ADDRESS pin is grounded
  }

  static I2C_ADDRESS_ALT_HIGH() {
    return 0x1D; // The SDO/ALT ADDRESS pin is high
  }

  static DEVICE_ID() {
    return 0xE5;
  }

  // Measurement ranges used with setMeasurementRange/getMeasurementRange (ADXL345_REG_DATA_FORMAT)
  //
  static RANGE_2_G()  { return 0b00; } // +/- 2g (default)
  static RANGE_4_G()  { return 0b01; } // +/- 4g
  static RANGE_8_G()  { return 0b10; } // +/- 8g
  static RANGE_16_G() { return 0b11; } // +/- 16g

  // Data rates used with setDataRate/getDataRate (ADXL345_REG_BW_RATE)
  //
  static DATARATE_0_10_HZ() { return 0b0000; } // 0.05Hz Bandwidth  23µA IDD
  static DATARATE_0_20_HZ() { return 0b0001; } // 0.10Hz Bandwidth  23µA IDD
  static DATARATE_0_39_HZ() { return 0b0010; } // 0.20Hz Bandwidth  23µA IDD
  static DATARATE_0_78_HZ() { return 0b0011; } // 0.39Hz Bandwidth  23µA IDD
  static DATARATE_1_56_HZ() { return 0b0100; } // 0.78Hz Bandwidth  34µA IDD
  static DATARATE_3_13_HZ() { return 0b0101; } // 1.56Hz Bandwidth  40µA IDD
  static DATARATE_6_25HZ()  { return 0b0110; } // 3.13Hz Bandwidth  45µA IDD
  static DATARATE_12_5_HZ() { return 0b0111; } // 6.25Hz Bandwidth  50µA IDD
  static DATARATE_25_HZ()   { return 0b1000; } // 12.5Hz Bandwidth  60µA IDD
  static DATARATE_50_HZ()   { return 0b1001; } //   25Hz Bandwidth  90µA IDD
  static DATARATE_100_HZ()  { return 0b1010; } //   50Hz Bandwidth 140µA IDD // default reset value
  static DATARATE_200_HZ()  { return 0b1011; } //  100Hz Bandwidth 140µA IDD
  static DATARATE_400_HZ()  { return 0b1100; } //  200Hz Bandwidth 140µA IDD
  static DATARATE_800_HZ()  { return 0b1101; } //  400Hz Bandwidth 140µA IDD
  static DATARATE_1600_HZ() { return 0b1110; } //  800Hz Bandwidth  90µA IDD
  static DATARATE_3200_HZ() { return 0b1111; } // 1600Hz Bandwidth 140µA IDD
}

module.exports = ADXL345;
