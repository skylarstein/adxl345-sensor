'use strict';

const ADXL345 = require('adxl345-sensor');

// The ADXL345 constructor options are optional.
// Defaults are i2cBusNo 1, i2cAddress 0x53.
//
// ADXL345.I2C_ADDRESS_ALT_GROUNDED() = 0x53
// ADXL345.I2C_ADDRESS_ALT_HIGH() = 0x1D
//
const options = { i2cBusNo   : 1,
                  i2cAddress : ADXL345.I2C_ADDRESS_ALT_GROUNDED() };

const adxl345 = new ADXL345(options);

const readAcceleration = () => {
  const gForce = true; // false for the default of m/s²
  adxl345.readAcceleration(gForce)
    .then((data) => { 
      console.log(`data = ${JSON.stringify(data, null, 2)}`);
      setTimeout(readAcceleration, 1000);
    })
    .catch((err) => {
      console.log(`ADXL345 read error: ${err}`);
      setTimeout(readAcceleration, 1000);
    });
};

// Initialize the ADXL345 accelerometer
//
adxl345.init()
  .then((deviceId) => {
    console.log('ADXL345 initialization succeeded');
    readAcceleration();
  })
  .catch((err) => console.error(`ADXL345 initialization failed: ${err} `));
