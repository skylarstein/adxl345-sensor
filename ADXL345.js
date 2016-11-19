/*
  ADXL345.js

  A Node.js I2C module for the Analog Devices ADXL345 three-axis digital accelerometer.
*/

'use strict';

class ADXL345 {

  constructor(options) {
    const i2c = require('i2c-bus');

    this.i2cBusNo = (options && options.hasOwnProperty('i2cBusNo')) ? options.i2cBusNo : 1;    
    this.i2cBus = i2c.openSync(this.i2cBusNo);
    this.i2cAddress = (options && options.hasOwnProperty('i2cAddress')) ? options.i2cAddress : ADXL345.I2C_ADDRESS_ALT_GROUNDED();

    this.ADXL345_REG_DEVID       = 0x00;
    this.ADXL345_REG_BW_RATE     = 0x2C; // Data rate and power mode control
    this.ADXL345_REG_POWER_CTL   = 0x2D; // Power-saving features control
    this.ADXL345_REG_DATA_FORMAT = 0x31;
    this.ADXL345_REG_DATAX0      = 0x32; // read 6 bytes from ADXL345_REG_DATAX0 for all three axes
    this.ADXL345_REG_DATAX1      = 0x33;
    this.ADXL345_REG_DATAY0      = 0x34;
    this.ADXL345_REG_DATAY1      = 0x35;
    this.ADXL345_REG_DATAZ0      = 0x36;
    this.ADXL345_REG_DATAZ1      = 0x37;

    this.ADXL345_MG2G_SCALE_FACTOR = 0.004; // 4mg per lsb 
    this.EARTH_GRAVITY_MS2 = 9.80665;
  }

  init() {
    return new Promise((resolve, reject) => {
      // Read and validate expected device ID
      //
      this.i2cBus.writeByte(this.i2cAddress, this.ADXL345_REG_DEVID, 0, (err) => {
        if(err) {
          return reject(err);
        }

        this.i2cBus.readByte(this.i2cAddress, this.ADXL345_REG_DEVID, (err, deviceId) => {
          if(err) {
            return reject(err);
          }
          else if(deviceId !== ADXL345.DEVICE_ID()) {
            return reject(`Unexpected ADXL345 device ID: 0x${deviceId.toString(16)}`);
          }
          else {
            console.log(`Found ADXL345 device id 0x${deviceId.toString(16)} on bus i2c-${this.i2cBusNo}, address 0x${this.i2cAddress.toString(16)}`);

            // Enable measurement, disable AUTO_SLEEP
            //
            this.i2cBus.writeByte(this.i2cAddress, this.ADXL345_REG_POWER_CTL, 0x8, (err) => {
              if(err) {
                return reject(err);
              }

              resolve(deviceId);
            });
          }
        });
      });
    });
  }

  readAcceleration(gForce) {
    return new Promise((resolve, reject) => {

      // Request/read all three axes at once
      //
      this.i2cBus.writeByte(this.i2cAddress, this.ADXL345_REG_DATAX0, 0, (err) => {
        if(err) {
          return reject(err);
        }

        this.i2cBus.readI2cBlock(this.i2cAddress, this.ADXL345_REG_DATAX0, 6, new Buffer(6), (err, bytesRead, buffer) => {
          if(err) {
            return reject(err);
          }

          let x = this.int16(buffer[1], buffer[0]) * this.ADXL345_MG2G_SCALE_FACTOR;
          let y = this.int16(buffer[3], buffer[2]) * this.ADXL345_MG2G_SCALE_FACTOR;
          let z = this.int16(buffer[5], buffer[4]) * this.ADXL345_MG2G_SCALE_FACTOR;

          resolve({
            x : gForce ? x : x * this.EARTH_GRAVITY_MS2,
            y : gForce ? y : y * this.EARTH_GRAVITY_MS2,
            z : gForce ? z : z * this.EARTH_GRAVITY_MS2,
            units : gForce ? 'g' : 'm/s²'});
        });
      });
    });
  }

  setMeasurementRange(range) {
    return new Promise((resolve, reject) => {
      if(!ADXL345.isValidRange(range)) {
        return reject(`Invalid range (${range})`);
      }

      // Update the measurement range within the current ADXL345_REG_DATA_FORMAT register
      //
      this.i2cBus.readByte(this.i2cAddress, this.ADXL345_REG_DATA_FORMAT, (err, format) => {
        if(err) {
          return reject(err);
        }

        format &= ~0b1111;
        format |= range;
        format |= 0b1000; // Enable FULL-RESOLUTION mode for range scaling

        this.i2cBus.writeByte(this.i2cAddress, this.ADXL345_REG_DATA_FORMAT, format, (err) => {
          err ? reject(err) : resolve();
        });
      });
    });
  }

  getMeasurementRange() {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, this.ADXL345_REG_DATA_FORMAT, (err, format) => {
        if(err) {
          return reject(err);
        }
        resolve(format & 0b11);
      });
    });
  }

  setDataRate(dataRate) {
    return new Promise((resolve, reject) => {
      if(!ADXL345.isValidDataRate(dataRate)) {
        return reject(`Invalid data rate (${dataRate})`);
      }

      // We'll always clear the LOW_POWER bit and the remaining MSBs are unused,
      // so no need to read ADXL345_REG_BW_RATE before writing.
      //
      this.i2cBus.writeByte(this.i2cAddress, this.ADXL345_REG_BW_RATE, dataRate & 0b1111, (err) => {
        err ? reject(err) : resolve();
      });
    });
  }

  getDataRate() {
    return new Promise((resolve, reject) => {
      this.i2cBus.readByte(this.i2cAddress, this.ADXL345_REG_BW_RATE, (err, bwRate) => {
        if(err) {
          return reject(err);
        }
        resolve(bwRate & 0b1111);
      });
    });
  }

  uint16(msb, lsb) {
    return msb << 8 | lsb;
  }

  int16(msb, lsb) {
    let val = this.uint16(msb, lsb);
    return val > 32767 ? (val - 65536) : val;
  }

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

  static stringifyRange(range) {
    switch(range) {
      case ADXL345.RANGE_2_G() : return 'RANGE_2_G';
      case ADXL345.RANGE_4_G() : return 'RANGE_4_G';
      case ADXL345.RANGE_8_G() : return 'RANGE_8_G';
      case ADXL345.RANGE_16_G(): return 'RANGE_16_G';

      default:
        return 'UNKNOWN';
    }
  }

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
