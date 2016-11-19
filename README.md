# adxl345-sensor
[<img src="https://img.shields.io/badge/Node.js-4.x%20through%207.x-brightgreen.svg">](https://nodejs.org) [<img src="https://img.shields.io/npm/v/adxl345-sensor.svg">](https://www.npmjs.com/package/adxl345-sensor)

[<img src="https://cdn-shop.adafruit.com/970x728/1231-00.jpg" width="150" align="right">](https://www.adafruit.com/product/1231)

Welcome to adxl345-sensor, a Node.js I2C module for the Analog Devices ADXL345 three-axis digital accelerometer. Adafruit sells a [ADXL345 breakout board](https://www.adafruit.com/product/1231) and [here is the datasheet](http://www.analog.com/static/imported-files/data_sheets/ADXL345.pdf).

This module uses [i2c-bus](https://github.com/fivdi/i2c-bus) which should provide access with Node.js on Linux boards like the Raspberry Pi Zero, 1, 2, or 3, BeagleBone, BeagleBone Black, or Intel Edison.

Since adxl345-sensor needs to talk directly to the I2C bus and requires access to /dev/i2c, you will typically need run Node with elevated privileges or add your user account to the i2c group: ```$ sudo adduser $USER i2c```

## I2C Address

If pin ```SDO/ALT ADDRESS``` is HIGH the 7-bit I2C address is 0x1D. If pin ```SDO/ALT ADDRESS``` is LOW the 7-bit I2C address is 0x53. The [Adafruit ADXL345 breakout board](https://www.adafruit.com/product/1231) is configured for 0x53. This pin floats by default so if you are using another breakout board be sure to determine if you need to wire this pin yourself.

## Example Code

ADXL345 initialization is broken out into a seperate function for explicit error checking. ```ADXL345.init()``` and ```ADXL345.readAcceleration()``` return promises. ```ADXL345.readAcceleration()``` will return three-axis values in m/s² units by default. Use ```ADXL345.readAcceleration(true)``` for g-force units.

```
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
```

##Example Output

```
> sudo node example.js          
Found ADXL345 device id 0xe5 on bus i2c-1, address 0x53
ADXL345 initialization succeeded
data = {
  "x": 0.008,
  "y": 0.008,
  "z": 0.9520000000000001,
  "units": "g"
}
```
##Example Wiring

For I2C setup on a Raspberry Pi, take a look at my [pi-weather-station](https://github.com/skylarstein/pi-weather-station) project.
