'use strict';

/* eslint-env mocha */
process.env.NODE_ENV = 'test';

const chai    = require('chai');
const ADXL345 = require('../ADXL345.js');
const expect  = chai.expect;
const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const i2c = require('i2c-bus');

describe('adxl345-sensor', () => {
  let i2cBus = null;
  beforeEach(() => {
    i2cBus = i2c.openSync(0);
  });

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
        i2cBus,
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
      let adxl345 = new ADXL345({i2cBus});
      let readStub = sinon.stub(i2cBus, 'readByte').yields(null, 0xE5);
      return adxl345.readByte('register').then((value) => {
        expect(value).to.equal(0xE5);
        expect(readStub.calledWith(adxl345.i2cAddress, 'register'));
      });
    });
    it('rejects on error', () => {
      let adxl345 = new ADXL345({i2cBus});
      sinon.stub(i2cBus, 'readByte').yields(Error('error'));
      return expect(adxl345.readByte('register')).to.eventually.be.rejectedWith(Error);
    });
  });

  describe('ADXL345#writeByte', () => {
    it('resolves after writing the value to a register', () => {
      let adxl345 = new ADXL345({i2cBus});
      let writeStub = sinon.stub(i2cBus, 'writeByte').yields(null);
      return adxl345.writeByte('register', 'value').then(() => {
        expect(writeStub.calledWith(adxl345.i2cAddress, 'register', 'value'));
      });
    });
    it('rejects on error', () => {
      let adxl345 = new ADXL345({i2cBus});
      sinon.stub(i2cBus, 'readByte').yields(Error('error'));
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
    it('enables measurement and resolves with device ID', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'getDevId').resolves(0xE5);
      let stub = sinon.stub(adxl345, 'setPowerCtl').resolves();
      return adxl345.init().then((id) => {
        expect(id).to.equal(0xE5);
        expect(stub.calledWith(0x08));
      });
    });
  });

  describe('ADXL345#getAcceleration', () => {
    it('gets valid sensor data (m/s² units)', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'readBlock').resolves(Buffer.from([0x10, 0x01, 0x20, 0x02, 0x30, 0x03]));
      return adxl345.getAcceleration().then((data) => {
        expect(data).to.have.all.keys('x', 'y', 'z', 'units');
        expect(data.units).to.be.equal('m/s²');
        expect(data.x).to.equal(0x0110 * adxl345.ADXL345_MG2G_SCALE_FACTOR * adxl345.EARTH_GRAVITY_MS2);
        expect(data.y).to.equal(0x0220 * adxl345.ADXL345_MG2G_SCALE_FACTOR * adxl345.EARTH_GRAVITY_MS2);
        expect(data.z).to.equal(0x0330 * adxl345.ADXL345_MG2G_SCALE_FACTOR * adxl345.EARTH_GRAVITY_MS2);
      });
    });

    it('gets valid sensor data (g-force units)', () => {
      let adxl345 = new ADXL345();
      sinon.stub(adxl345, 'readBlock').resolves(Buffer.from([0x10, 0x01, 0x20, 0x02, 0x30, 0x03]));
      return adxl345.getAcceleration(true).then((data) => {
        expect(data).to.have.all.keys('x', 'y', 'z', 'units');
        expect(data.units).to.be.equal('g');
        expect(data.x).to.equal(0x0110 * adxl345.ADXL345_MG2G_SCALE_FACTOR);
        expect(data.y).to.equal(0x0220 * adxl345.ADXL345_MG2G_SCALE_FACTOR);
        expect(data.z).to.equal(0x0330 * adxl345.ADXL345_MG2G_SCALE_FACTOR);
      });
    });
  });

  describe('ADXL345#setMeasurementRange', () => {
    it('sets measurement ranges', () => {
        let adxl345 = new ADXL345();
        sinon.stub(adxl345, 'readByte').resolves(0);
        let stub = sinon.stub(adxl345, 'writeByte').resolves();
        return adxl345.setMeasurementRange(ADXL345.RANGE_16_G()).then(() => {
          expect(stub.calledWith(0x31, 0b00001011)).to.equal(true);
          return adxl345.setMeasurementRange(ADXL345.RANGE_8_G());
        }).then(() => {
          expect(stub.calledWith(0x31, 0b00001010));
          return adxl345.setMeasurementRange(ADXL345.RANGE_4_G());
        }).then(() => {
          expect(stub.calledWith(0x31, 0b00001001));
          return adxl345.setMeasurementRange(ADXL345.RANGE_2_G());
        }).then(() => {
          expect(stub.calledWith(0x31, 0b00001000));
        });
    });
    it('rejects invalid measurement range (null)', () => {
      let adxl345 = new ADXL345();
      return expect(adxl345.setMeasurementRange(null)).to.eventually.be.rejectedWith('Invalid range');
    });
    it('it should fail to set invalid measurement range (0xffff)', () => {
      let adxl345 = new ADXL345();
      return expect(adxl345.setMeasurementRange(0xffff)).to.eventually.be.rejectedWith('Invalid range');
    });
  });

  describe('ADXL345#getMeasurementRange', () => {
    it('gets first two bits of DATA_FORMAT register', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'readByte').resolves(0b11111100);
      return adxl345.getMeasurementRange().then((range) => {
        expect(range).to.equal(0b00);
        expect(stub.calledWith(0x31));
      });
    });
  });

  describe('ADXL345#setDataRate', () => {
    it('sets data rate', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'writeByte').resolves();
      return adxl345.setDataRate(0b1111).then(() => {
        expect(stub.calledWith(0x2C, 0b1111));
      });
    });
    it('rejects if rate is null', () => {
      let adxl345 = new ADXL345();
      return expect(adxl345.setDataRate(null)).to.eventually.be.rejectedWith('Invalid data rate');
    });
  });

  describe('ADXL345#getDataRate', () => {
    it('gets data rate', () => {
      let adxl345 = new ADXL345();
      let stub = sinon.stub(adxl345, 'readByte').resolves(0b11110000);
      return adxl345.getDataRate().then((rate) => {
        expect(rate).to.equal(0b0000);
        expect(stub.calledWith(0x2C));
      });
    });
  });

  describe('ADXL345#setOffset[X|Y|Z]', () => {
    let adxl345 = null;
    let stub = null;
    beforeEach(() => {
      adxl345 = new ADXL345();
      stub = sinon.stub(adxl345, 'writeByte').resolves();
    });
    it('sets X offset', () => {
      return adxl345.setOffsetX(1).then(() => {
        expect(stub.calledWith(0x1E, 1));
      });
    });
    it('sets Y offset', () => {
      return adxl345.setOffsetY(2).then(() => {
        expect(stub.calledWith(0x1F, 2));
      });
    });
    it('sets Z offset', () => {
      return adxl345.setOffsetX(3).then(() => {
        expect(stub.calledWith(0x20, 3));
      });
    });
  });
});
