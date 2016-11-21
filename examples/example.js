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
const readAcceleration = () => {
  adxl345.readAcceleration(true) // true for g-force units, else false for m/s²
    .then((data) => { 
      console.log(`data = ${JSON.stringify(data, null, 2)}`);
      setTimeout(readAcceleration, 1000);
    })
    .catch((err) => {
      console.log(`ADXL345 read error: ${err}`);
      setTimeout(readAcceleration, 2000);
    });
};

// Initialize and configure the ADXL345 accelerometer
//
const measurementRange = ADXL345.RANGE_2_G();
const dataRate = ADXL345.DATARATE_100_HZ();

adxl345.init()
  .then(() => adxl345.setMeasurementRange(measurementRange))
  .then(() => adxl345.setDataRate(dataRate))
  .then(() => {
    console.log('ADXL345 initialization succeeded');
    console.log(`Measurement range: ${ADXL345.stringifyMeasurementRange(measurementRange)}`);
    console.log(`Data rate: ${ADXL345.stringifyDataRate(dataRate)}`);
    readAcceleration();
  })
  .catch((err) => console.error(`ADXL345 initialization failed: ${err} `));
