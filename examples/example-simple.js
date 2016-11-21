const ADXL345 = require('adxl345-sensor');
const adxl345 = new ADXL345(); // defaults to i2cBusNo 1, i2cAddress 0x53

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

// Initialize the ADXL345 accelerometer
//
adxl345.init()
  .then(() => {
    console.log('ADXL345 initialization succeeded');
    readAcceleration();
  })
  .catch((err) => console.error(`ADXL345 initialization failed: ${err} `));
