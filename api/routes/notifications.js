const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const App = require('../models/App')
const Transaction = require('../models/Transaction');
const Log = require('../models/Log');
const APNS = require('../protocols/apns');
const FCM = require('../protocols/fcm');
const fetch = require('node-fetch');

// send to user
router.post('/account', (req, res, next) => {
  if (!req.body.accountId || !req.body.appId || !req.body.osPlatform)
    return res.status(400).json({ err: "Missing params" });

  Device.find({ accountId: req.body.accountId, appId: req.body.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(devices => {
      if (devices.length < 1) {
        return res.status(404).json({
          message: "No devices exist for that account for that app."
        })
      }
      // find app uid for each version
      const appUID = App.find({ appId: req.body.appId, osPlatform: req.body.osPlatform })
        .exec()
        .then(result => {
          const appUID = result[0]._id;

          saveTransaction({
            message: req.body.notification.message,
            title: req.body.notification.title,
            appId: req.body.appId,
            osPlatform: req.body.osPlatform,
            accountId: req.body.accountId
          }).then(trxId => {
            req.body.osPlatform === 'iOS' ?
              APNS.send(req.body.notification, devices, appUID, trxId) :
              FCM.send(req.body.notification, devices, appUID, trxId);
            return res.status(200).json({ trxId }); // return trxId
          });
        })
        .catch(err => { console.log(err) });
    })
    .catch(err => { res.status(500).json({ err }) });
});


// send to all 
router.post('/app', (req, res, next) => {
  if (!req.body.appId || !req.body.osPlatform)
    return res.status(400).json({ err: "Missing params" });

  const topic = req.body.appId;
  Device.find({ appId: req.body.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(devices => {
      if (devices.length < 1) {
        return res.status(404).json({
          message: "No devices exist for that app."
        })
      }
      // find app uid 
      App.find({ appId: req.body.appId, osPlatform: req.body.osPlatform })
        .exec()
        .then(result => {
          const appUID = result[0]._id;

          saveTransaction({
            message: req.body.notification.message,
            title: req.body.notification.title,
            appId: req.body.appId,
            osPlatform: req.body.osPlatform
          }).then(trxId => {
            req.body.osPlatform === 'iOS' ?
              APNS.send(req.body.notification, devices, appUID, trxId) :
              FCM.sendTopic(req.body.notification, topic, appUID, trxId);
            return res.status(200).json({ trxId }); // return trxId
          });
        })
        .catch(err => { console.log(err) });
    })
    .catch(err => { res.status(500).json({ err }) });
});


// send to device
router.post('/device', (req, res, next) => {
  Device.find({ serialNumber: req.body.serialNumber })
    .exec()
    .then(devices => {
      if (devices.length < 1) {
        return res.status(404).json({
          message: "No device found."
        })
      }

      // get app uid
      const appUID = App.find({ appId: req.body.appId, osPlatform: devices[0].osPlatform })
        .exec()
        .then(result => {
          const appUID = result[0]._id;

          saveTransaction({
            message: req.body.notification.message,
            title: req.body.notification.title,
            appId: req.body.appId,
            osPlatform: req.body.osPlatform
          }).then(trxId => {
            req.body.osPlatform === 'iOS' ?
              APNS.send(req.body.notification, devices, appUID, trxId) :
              FCM.send(req.body.notification, devices, appUID, trxId);
            return res.status(200).json({ trxId }); // return trxId
          });
        })
        .catch(err => { console.log(err) });
    });
});

router.post('/list', (req, res, next) => {
  res.status(501).json({ error: 'Not available' });
  const devices = req.body.list;

  const iOSDevices = devices.filter(device => {
    device.osPlatform == 'iOS'
  });
  const androidTokens = devices.filter(device => {
    device.osPlatform == 'android'
  });

  const androidAppId = App.find({ appId: req.body.appId, osPlatform: 'android' }).exec().then(result => result[0]._id);
  const iOSAppId = androidAppId = App.find({ appId: req.body.appId, osPlatform: 'iOS' }).exec().then(result => result[0]._id);

  //send message
  FCM.send(req.body.notification, androidDevices, androidAppId)
    .then(result => {
      saveTransaction({
        message: req.body.notification.message,
        title: req.body.notification.title,
        appId: androidAppId,
        osPlatform: 'android',
        deviceId: androidDevices.map(device => {
          return device._id;
        }),
        pushId: androidDevices.map(device => {
          return device.pushId;
        })
      });
      return res.status(200).json({ result });
    });
  APNS.send(req.body.notification, iOSDevices, iOSAppId)
    .then(result => {
      saveTransaction({
        message: req.body.notification.message,
        title: req.body.notification.title,
        appId: iOSAppId,
        osPlatform: 'iOS',
        deviceId: iOSDevices.map(device => {
          return device._id;
        }),
        pushId: iOSDevices.map(device => {
          return device.pushId;
        })
      });
      return res.status(200).json({ result });
    });
});

router.get('/logs', (req, res, next) => {
  Log.find({ transactionId: req.body.transactionId })
    .exec()
    .then(logs => {
      if (logs.length < 1)
        return res.status(404).json({ err: 'No logs found' });
      return res.status(200).json({ logs });
    })
    .catch(err => res.status(500).json({ err }));
});


async function saveTransaction(data) {
  const transaction = await new Transaction({
    appId: data.appId,
    osPlatform: data.osPlatform,
    accountId: data.accountId,
    deviceId: data.deviceId,
    pushId: data.pushId,
    title: data.title,
    message: data.message
  }).save().then(result => result._id).catch(err => err);
  return transaction;
}
module.exports = router

