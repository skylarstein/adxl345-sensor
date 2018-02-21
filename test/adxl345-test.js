'use strict';

/* eslint-env mocha */
process.env.NODE_ENV = 'test';

const chai    = require('chai');
const ADXL345 = require('../ADXL345.js');
const expect  = chai.expect;
const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const measurementRanges = [
  ADXL345.RANGE_16_G(),
  ADXL345.RANGE_8_G(),
  ADXL345.RANGE_4_G(),
  ADXL345.RANGE_2_G()
]; // ending on 2G to leave the chip at the default value

const dataRates = [
  ADXL345.DATARATE_0_10_HZ(),
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
  ADXL345.DATARATE_100_HZ()
]; // ending on 100HZ to leave the chip at the default value

const readAndValidateAcceleration = (gForceUnits, range, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => adxl345.getAcceleration(gForceUnits))
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
};

const setAndValidateRange = (range, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => {
      console.log(`Set range ${ADXL345.stringifyMeasurementRange(range)}`);
      return adxl345.setMeasurementRange(range);
    })
    .then(() => adxl345.getMeasurementRange())
    .then((updatedRange) => {
      console.log(`Range updated to ${ADXL345.stringifyMeasurementRange(updatedRange)}`);
      expect(updatedRange).to.be.equal(range);
      done();
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
      return adxl345.setDataRate(dataRate);
    })
    .then(() => adxl345.getDataRate())
    .then((updatedDataRate) => {
      console.log(`Data rate updated to ${ADXL345.stringifyDataRate(updatedDataRate)}`);
      expect(updatedDataRate).to.be.equal(dataRate);
      done();
    })
    .catch((err) => {
      done(err);
    });
};

const setAndValidateOffsets = (offsetX, offsetY, offsetZ, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => adxl345.setOffsetX(offsetX))
    .then(() => adxl345.setOffsetY(offsetY))
    .then(() => adxl345.setOffsetZ(offsetZ))
    .then(() => adxl345.getOffsets())
    .then((offsets) => {
      expect(offsets).to.have.all.keys('x', 'y', 'z');
      expect(offsets.x).to.be.equal(offsetX);
      expect(offsets.y).to.be.equal(offsetY);
      expect(offsets.z).to.be.equal(offsetZ);
      done();
    })
    .catch((err) => {
      done(err);
    });
};

const expectInvalidRangeError = (range, done) => {
  let adxl345 = new ADXL345();
  adxl345.init()
    .then(() => adxl345.setMeasurementRange(range))
    .then(() => done(`Expected setMeasurementRange(${range}) to fail with invalid range`))
    .catch(done);
};

describe('adxl345-sensor', () => {
  describe('ADXL345#constructor', () => {
    it('uses defaults', () => {
      let adxl345 = new ADXL345();
      expect(adxl345).to.be.an.instanceof(ADXL345);
      expect(adxl345).to.have.property('i2cBusNo', 1);
      expect(adxl345).to.have.property('i2cAddress', 0x53);
      expect(adxl345).to.have.property('i2cBus');
    });
    it('sets options', () => {
      let options = {
        i2cBus: require('i2c-bus').openSync(0),
        i2cBusNo: 123,
        i2cAddress: 456
      };
      let adxl345 = new ADXL345(options);
      expect(adxl345).to.have.property('i2cBusNo', 123);
      expect(adxl345).to.have.property('i2cAddress', 456);
    });
  });

  describe('ADXL345#readByte', () => {
    it('resolves with the value of a register', () => {
      let i2cBusStub = require('i2c-bus').openSync(0);
      let adxl345 = new ADXL345({i2cBus: i2cBusStub});
      let readStub = sinon.stub(i2cBusStub, 'readByte').yields(null, 0xE5);
      return adxl345.readByte('register').then((value) => {
        expect(value).to.equal(0xE5);
        expect(readStub.calledWith(adxl345.i2cAddress, 'register'));
      });
    });
    it('rejects on error', () => {
      let i2cBusStub = require('i2c-bus').openSync(0);
      let adxl345 = new ADXL345({i2cBus: i2cBusStub});
      sinon.stub(i2cBusStub, 'readByte').yields(Error('error'));
      return expect(adxl345.readByte('register')).to.eventually.be.rejectedWith(Error);
    });
  });

  describe('ADXL345#writeByte', () => {
    it('resolves after writing the value to a register', () => {
      let i2cBusStub = require('i2c-bus').openSync(0);
      let adxl345 = new ADXL345({i2cBus: i2cBusStub});
      let writeStub = sinon.stub(i2cBusStub, 'writeByte').yields(null);
      return adxl345.writeByte('register', 'value').then(() => {
        expect(writeStub.calledWith(adxl345.i2cAddress, 'register', 'value'));
      });
    });
    it('rejects on error', () => {
      let i2cBusStub = require('i2c-bus').openSync(0);
      let adxl345 = new ADXL345({i2cBus: i2cBusStub});
      sinon.stub(i2cBusStub, 'readByte').yields(Error('error'));
      return expect(adxl345.readByte('register')).to.eventually.be.rejectedWith(Error);
    });
  });

  describe('ADXL345#getDevId', () => {
    it('reads the device ID', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'readByte').resolves(0xE5);
      return adxl345.getDevId().then((id) => {
        expect(id).to.equal(0xE5);
        expect(stub.calledWith(0x00));
      });
    });
  });

  describe('ADXL345#setPowerCtl', () => {
    it('writes the POWER_CTL register', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'writeByte').resolves();
      return adxl345.setPowerCtl(0x08).then(() => {
        expect(stub.calledWith(0x2D, 0x08));
      });
    });
  });

  describe('ADXL345#init', () => {
    it('rejects on device ID mismatch', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'getDevId').resolves(0xFF);
      return expect(adxl345.init()).to.eventually.be.rejectedWith('Unexpected ADXL345 device ID: 0xff');
    });
    it('enabled measurement and resolves with device ID', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'getDevId').resolves(0xE5);
      let stub = sinon.stub(adxl345, 'setPowerCtl').resolves();
      return adxl345.init().then((id) => {
        expect(id).to.equal(0xE5);
        expect(stub.calledWith(0x08));
      });
    });
  });

  it('it should receive valid sensor data (m/s² units)', (done) => {
    readAndValidateAcceleration(false, 156.9064, done);
  });

  it('it should receive valid sensor data (g-force units)', (done) => {
    readAndValidateAcceleration(true, 16, done);
  });

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

  dataRates.forEach((dataRate) => {
    it(`it should set data rate ${ADXL345.stringifyDataRate(dataRate)}`, (done) => {
      setAndValidateDataRate(dataRate, done);
    });
  });

  it('it should fail to set invalid data rate (null)', (done) => {
    let adxl345 = new ADXL345();
    adxl345.init()
      .then(() => adxl345.setDataRate(null))
      .then(() => done('Expected setDataRate(null) to fail with invalid data rate'))
      .catch(done);
  });

  it('it should set and validate offsets (non-zero)', (done) => {
    setAndValidateOffsets(0x01, 0x02, 0x03, done);
  });

  it('it should set and validate offsets (zero)', (done) => {
    setAndValidateOffsets(0, 0, 0, done);
  });

});
