'use strict';

process.env.NODE_ENV = 'test';

const chai    = require('chai');
const ADXL345 = require('../ADXL345.js');
const expect  = chai.expect;

const readAndValidateAcceleration = (gForceUnits, range, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => {
      adxl345.readAcceleration(gForceUnits)
        .then((data) => {
          console.log(`ADXL345 sensor data: ${JSON.stringify(data)}`);
          expect(data).to.have.all.keys('x', 'y', 'z', 'units');
          expect(data.x).to.be.within(-range, range);
          expect(data.y).to.be.within(-range, range);
          expect(data.z).to.be.within(-range, range);
          expect(data.units).to.be.equal(gForceUnits ? 'g' : 'm/s²');
          done();
        })
        .catch((err) => {
          done(err);
        });
    })
    .catch((err) => {
      done(err);
    });
};

const setAndValidateRange = (range, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => {
      console.log(`Set range ${ADXL345.stringifyMeasurementRange(range)}`);
      adxl345.setMeasurementRange(range)
        .then(() => {
          adxl345.getMeasurementRange()
            .then((updatedRange) => {
              console.log(`Range updated to ${ADXL345.stringifyMeasurementRange(updatedRange)}`);
              expect(updatedRange).to.be.equal(range);
              done();
            })
            .catch((err) => {
              done(err);
            });
        })
        .catch((err) => {
          done(err);
        });
    })
    .catch((err) => {
      done(err);
    });
};

const setAndValidateDataRate = (dataRate, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => {
      console.log(`Set data rate ${ADXL345.stringifyDataRate(dataRate)}`);
      adxl345.setDataRate(dataRate)
        .then(() => {
          adxl345.getDataRate()
            .then((updatedDataRate) => {
              console.log(`Data rate updated to ${ADXL345.stringifyDataRate(updatedDataRate)}`);
              expect(updatedDataRate).to.be.equal(dataRate);
              done();
            })
            .catch((err) => {
              done(err);
            });
        })
        .catch((err) => {
          done(err);
        });
    })
    .catch((err) => {
      done(err);
    });
};

const expectInvalidRangeError = (range, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => {
      adxl345.setMeasurementRange(range)
        .then(() => {
          done(`Expected setMeasurementRange(${range}) to fail with invalid range`);
        })
        .catch((err) => {
          done();
        });
    })
    .catch((err) => {
      done(err);
    });
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
    readAndValidateAcceleration(false, 156.9064, done);
  });

  it('it should receive valid sensor data (g-force units)', (done) => {
    readAndValidateAcceleration(true, 16, done);
  });

  const measurementRanges = [ADXL345.RANGE_16_G(), ADXL345.RANGE_8_G(), ADXL345.RANGE_4_G(), ADXL345.RANGE_2_G()];

  measurementRanges.forEach((range) => {
    it(`it should set measurement range ${ADXL345.stringifyMeasurementRange(range)}`, (done) => {
      setAndValidateRange(range, done);
    });
  });

  it('it should fail to set invalid measurement range (null)', (done) => {
    expectInvalidRangeError(null, done);
  });

  it('it should fail to set invalid measurement range (0xffff)', (done) => {
    expectInvalidRangeError(0xffff, done);
  });

  const dataRates = [ADXL345.DATARATE_0_10_HZ(),
                     ADXL345.DATARATE_0_20_HZ(),
                     ADXL345.DATARATE_0_39_HZ(),
                     ADXL345.DATARATE_0_78_HZ(),
                     ADXL345.DATARATE_1_56_HZ(),
                     ADXL345.DATARATE_3_13_HZ(),
                     ADXL345.DATARATE_6_25HZ(),
                     ADXL345.DATARATE_12_5_HZ(),
                     ADXL345.DATARATE_25_HZ(),
                     ADXL345.DATARATE_50_HZ(),
                     ADXL345.DATARATE_200_HZ(),
                     ADXL345.DATARATE_400_HZ(),
                     ADXL345.DATARATE_800_HZ(),
                     ADXL345.DATARATE_1600_HZ(),
                     ADXL345.DATARATE_3200_HZ(),
                     ADXL345.DATARATE_100_HZ()]; // ending on 100HZ to leave the chip at the default reset value

  dataRates.forEach((dataRate) => {
    it(`it should set data rate ${ADXL345.stringifyDataRate(dataRate)}`, (done) => {
      setAndValidateDataRate(dataRate, done);
    });
  });

  it('it should fail to set invalid data rate (null)', (done) => {
    let adxl345 = new ADXL345();
    adxl345.init()
      .then(() => {
        adxl345.setDataRate(null)
          .then(() => {
            done('Expected setDataRate(null) to fail with invalid data rate');
          })
          .catch((err) => {
            done();
          });
      })
      .catch((err) => {
        done(err);
      });
  });

});
