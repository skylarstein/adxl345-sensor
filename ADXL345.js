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

    this.ADXL345_REG_DEVID     = 0x00;
    this.ADXL345_REG_POWER_CTL = 0x2D;
    this.ADXL345_REG_DATAX0    = 0x32; // read 6 bytes from ADXL345_REG_DATAX0 for all three axes
    this.ADXL345_REG_DATAX1    = 0x33;
    this.ADXL345_REG_DATAY0    = 0x34;
    this.ADXL345_REG_DATAY1    = 0x35;
    this.ADXL345_REG_DATAZ0    = 0x36;
    this.ADXL345_REG_DATAZ1    = 0x37;

    this.ADXL345_MG2G_SCALE_FACTOR = 0.004; // 4mg per lsb 
    this.EARTH_GRAVITY_MS2 = 9.80665;
  }

  init() {
    return new Promise((resolve, reject) => {

      // Request/read device ID, validate
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

  uint16(msb, lsb) {
    return msb << 8 | lsb;
  }

  int16(msb, lsb) {
    let val = this.uint16(msb, lsb);
    return val > 32767 ? (val - 65536) : val;
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

}

module.exports = ADXL345;
