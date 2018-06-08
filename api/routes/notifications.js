const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const App = require('../models/App')
const Transaction = require('../models/Transaction');
const Log = require('../models/Log');
const APNS = require('../protocols/apns');
const FCM = require('../protocols/fcm');

//todo - notification data option for fcm
//todo - change save transaction order
//todo - make transactions async
router.post('/account', (req, res, next) => {
  Device.find({ accountId: req.body.accountId, appId: req.body.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(devices => {
      if (devices.length < 1) {
        return res.status(404).json({
          message: "No devices exist for that account for that app."
        })
      }
      // find app uid for each version
      const appUID = App.find({ appId: req.body.appId, osPlatform: req.body.osPlatform }).exec().then(result => result[0]._id);
      // save transaction
      const trxId = saveTransaction({
        message: req.body.notification.message,
        title: req.body.notification.title,
        appId: req.body.appId,
        osPlatform: req.body.osPlatform,
        accountId: req.body.accountId,
        deviceId: devices,
        pushId: devices.map(device => {
          return device.pushId;
        })
      });
      //send message
      req.body.osPlatform === 'iOS' ?
        APNS.send(req.body.notification, devices, appUID, trxId) :
        FCM.send(req.body.notification, devices, appUID, trxId);
      return res.status(200).json({ trxId }); // return trxId
    })
    .catch(err => { res.status(500).json({ err }) });
});

//todo - change logic to include os platform
router.post('/app', (req, res, next) => {
  Device.find({ appId: req.body.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(devices => {
      if (devices.length < 1) {
        return res.status(404).json({
          message: "No devices exist with that app."
        })
      } else {
        //construct token arrays for iOS and android
        const iOSDevices = devices.filter(device => {
          device.osPlatform == 'iOS'
        });
        const androidDevices = devices.filter(device => {
          device.osPlatform == 'android'
        });
        //get app uid for each platform
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
      }
    });
});

//change logic to include appId and os platform
router.post('/device', (req, res, next) => {
  Device.find({ _id: req.body.deviceId })
    .exec()
    .then(device => {
      if (device.length < 1) {
        return res.status(404).json({
          message: "No device found."
        })
      } else {
        // get app uid
        const appId = App.find({ appId: req.body.appId, osPlatform: device[0].osPlatform }).exec().then(result => {
          if (result.length < 1)
            return res.json(404).json({
              message: "No devices exist for that app or no app for that platform"
            })
          return result[0]._id;
        });
        //send message using fcm or apns depending on device platform
        device[0].osPlatform === 'android' ?
          FCM.send(req.body.notification, device[0], appId)
            .then(result => {
              saveTransaction({
                message: req.body.notification.message,
                title: req.body.notification.title,
                appId: androidAppId,
                osPlatform: 'android',
                deviceId: device[0]._id,
                pushId: device[0].pushId
              });
              return res.status(200).json({ result });
            })
          :
          APNS.send(req.body.notification, device[0], appId)
            .then(result => {
              saveTransaction({
                message: req.body.notification.message,
                title: req.body.notification.title,
                appId: iOSAppId,
                osPlatform: 'iOS',
                deviceId: device[0]._id,
                pushId: device[0].pushId
              });
              return res.status(200).json({ result });
            });
      }
    });
});

router.post('/list', (req, res, next) => {
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

function saveTransaction(data) {
  const transaction = new Transaction({
    appId: data.appId,
    osPlatform: data.osPlatform,
    accountId: data.accountId,
    deviceId: data.deviceId,
    pushId: data.pushId,
    title: data.notificationTitle,
    message: data.notificationMessage
  }).save().then(result => { return result._id }).catch(err => err);
}
module.exports = router

