# adxl345-sensor
[<img src="https://img.shields.io/badge/Node.js-4.x%20through%207.x-brightgreen.svg">](https://nodejs.org) [<img src="https://img.shields.io/npm/v/adxl345-sensor.svg">](https://www.npmjs.com/package/adxl345-sensor)

[<img src="https://cdn-shop.adafruit.com/970x728/1231-00.jpg" width="150" align="right">](https://www.adafruit.com/product/1231)

Welcome to adxl345-sensor, a Node.js I2C module for the Analog Devices ADXL345 three-axis digital accelerometer. Adafruit sells a [ADXL345 breakout board](https://www.adafruit.com/product/1231) and [here is the datasheet](http://www.analog.com/static/imported-files/data_sheets/ADXL345.pdf).

This module uses [i2c-bus](https://github.com/fivdi/i2c-bus) which should provide access with Node.js on Linux boards like the Raspberry Pi Zero, 1, 2, or 3, BeagleBone, BeagleBone Black, or Intel Edison.

Since adxl345-sensor needs to talk directly to the I2C bus and requires access to /dev/i2c, you will typically need run Node with elevated privileges or add your user account to the i2c group: ```$ sudo adduser $USER i2c```

## I2C Address

If pin ```SDO/ALT ADDRESS``` is HIGH the 7-bit I2C address is 0x1D. If pin ```SDO/ALT ADDRESS``` is LOW the 7-bit I2C address is 0x53. The [Adafruit ADXL345 breakout board](https://www.adafruit.com/product/1231) is configured for 0x53. This pin floats by default so if you are using another breakout board be sure to determine if you need to wire this pin yourself.

## Example Code - Basic Use

```
const ADXL345 = require('adxl345-sensor');
const adxl345 = new ADXL345(); // defaults to i2cBusNo 1, i2cAddress 0x53

// Read ADXL345 three-axis acceleration, repeat
//
const getAcceleration = () => {
  adxl345.getAcceleration(true) // true for g-force units, else false for m/s²
    .then((data) => { 
      console.log(`data = ${JSON.stringify(data, null, 2)}`);
      setTimeout(getAcceleration, 1000);
    })
    .catch((err) => {
      console.log(`ADXL345 read error: ${err}`);
      setTimeout(getAcceleration, 2000);
    });
};

// Initialize the ADXL345 accelerometer
//
adxl345.init()
  .then(() => {
    console.log('ADXL345 initialization succeeded');
    getAcceleration();
  })
  .catch((err) => console.error(`ADXL345 initialization failed: ${err} `));
```

####Example Output

```
> sudo node ./examples/example-simple.js
Found ADXL345 device id 0xe5 on bus i2c-1, address 0x53
ADXL345 initialization succeeded
data = {
  "x": 0,
  "y": -0.004,
  "z": 0.9520000000000001,
  "units": "g"
}
```

## Example Code - Initialize and Configure

```
const ADXL345 = require('adxl345-sensor');

// The ADXL345 constructor options are optional.
//
// ADXL345.I2C_ADDRESS_ALT_GROUNDED() = 0x53
// ADXL345.I2C_ADDRESS_ALT_HIGH() = 0x1D
//
const options = {
  i2cBusNo   : 1, // defaults to 1
  i2cAddress : ADXL345.I2C_ADDRESS_ALT_GROUNDED() // defaults to 0x53
};

const adxl345 = new ADXL345(options);

// Read ADXL345 three-axis acceleration, repeat
//
const getAcceleration = () => {
  adxl345.getAcceleration(true) // true for g-force units, else false for m/s²
    .then((data) => { 
      console.log(`data = ${JSON.stringify(data, null, 2)}`);
      setTimeout(getAcceleration, 1000);
    })
    .catch((err) => {
      console.log(`ADXL345 read error: ${err}`);
      setTimeout(getAcceleration, 2000);
    });
};

// Initialize and configure the ADXL345 accelerometer
//
const measurementRange = ADXL345.RANGE_2_G();
const dataRate = ADXL345.DATARATE_100_HZ();

adxl345.init()
  .then(() => adxl345.setMeasurementRange(measurementRange))
  .then(() => adxl345.setDataRate(dataRate))
  .then(() => adxl345.setOffsetX(0)) // measure for your particular device
  .then(() => adxl345.setOffsetY(0)) // measure for your particular device
  .then(() => adxl345.setOffsetZ(0)) // measure for your particular device
  .then(() => adxl345.getMeasurementRange())
  .then((range) => {
    console.log(`Measurement range: ${ADXL345.stringifyMeasurementRange(range)}`);
    return adxl345.getDataRate();
  })
  .then((rate) => {
    console.log(`Data rate: ${ADXL345.stringifyDataRate(rate)}`);
    return adxl345.getOffsets();
  })
  .then((offsets) => {
    console.log(`Offsets: ${JSON.stringify(offsets, null, 2)}`);
    console.log('ADXL345 initialization succeeded');
    getAcceleration();
  })
  .catch((err) => console.error(`ADXL345 initialization failed: ${err} `));
```

####Example Output

```
> sudo node ./examples/example.js
Found ADXL345 device id 0xe5 on bus i2c-1, address 0x53
Measurement range: RANGE_2_G
Data rate: DATARATE_100_HZ
Offsets: {
  "x": 0,
  "y": 0,
  "z": 0
}
ADXL345 initialization succeeded
data = {
  "x": 0,
  "y": 0,
  "z": 0.9520000000000001,
  "units": "g"
}
```

##Example Wiring

For I2C setup on a Raspberry Pi, take a look at my [pi-weather-station](https://github.com/skylarstein/pi-weather-station) project.
