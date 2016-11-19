'use strict';

process.env.NODE_ENV = 'test';

const chai    = require('chai');
const ADXL345 = require('../ADXL345.js');
const expect  = chai.expect;

const validateAccelerationData = (data, range, units, done) => {
  console.log(`ADXL345 sensor data: ${JSON.stringify(data)}`);
  expect(data).to.have.all.keys('x', 'y', 'z', 'units');
  expect(data.x).to.be.within(-range, range);
  expect(data.y).to.be.within(-range, range);
  expect(data.z).to.be.within(-range, range);
  expect(data.units).to.be.equal(units);
  done();
};

describe('adxl345-sensor', () => {
  it('it should communicate with the device', () => {
    let adxl345 = new ADXL345();
    expect(adxl345).to.be.an.instanceof(ADXL345);
    return adxl345.init().then((deviceId) => {
      expect(deviceId).to.be.equal(ADXL345.DEVICE_ID());
    });
  });

  it('it should receive valid sensor data (m/s² units)', (done) => {
    let adxl345 = new ADXL345();
    expect(adxl345).to.be.an.instanceof(ADXL345);
    adxl345.init()
      .then((deviceId) => {
        expect(deviceId).to.be.equal(ADXL345.DEVICE_ID());
        let gForce = false;
        adxl345.readAcceleration(gForce)
          .then((data) => {
            validateAccelerationData(data, 156.9064, 'm/s²', done);
          })
          .catch((err) => {
            done(err);
          });
      })
      .catch((err) => {
        done(err);
      });
  });

  it('it should receive valid sensor data (g-force units)', (done) => {
    let adxl345 = new ADXL345();
    expect(adxl345).to.be.an.instanceof(ADXL345);
    adxl345.init()
      .then((deviceId) => {
        expect(deviceId).to.be.equal(ADXL345.DEVICE_ID());
        let gForce = true;
        adxl345.readAcceleration(gForce)
          .then((data) => {
            validateAccelerationData(data, 16, 'g', done);
          })
          .catch((err) => {
            done(err);
          });
      })
      .catch((err) => {
        done(err);
      });
  });

});
