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
//todo - make transactions async
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
      // save transaction

      // const trxId = saveTransaction({
      //   message: req.body.notification.message,
      //   title: req.body.notification.title,
      //   appId: req.body.appId,
      //   osPlatform: req.body.osPlatform
      // });
      // //send message using fcm or apns depending on device platform
      // device.osPlatform !== 'iOS' ?
      //   FCM.send(req.body.notification, device, appUID, trxId) :
      //   APNS.send(req.body.notification, device, appUID, trxId);
      // return res.status(200).json({ trxId });
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

router.post('/test', (req, res, next) => {
  const note = {
    "message": {
      "notification": {
        "body": "hello2",
        "title": "FCM hello yeet"
      },
      "data": {},
      "android": {
        "notification": {
          "title": "hello2",
          "body": "testing yeet",
          "click_action": "OPEN_ACTIVITY_1",
          "sound": "default",
          "color": "#D2691E"
        }
      },
      "token": "test"
    }
  };
  let poop = {
    body: JSON.stringify(note),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ya29.c.ElrXBXViap6oQM_ENTwApxzrxnfpWAZ8gOJoOzYRzkgtwm5jgoZqJmUlCk9o7Flp7y9PUJ5U4errWaP25VGPBInvuhX4ngOxBPCLiHYkHvyW3LZJEqlPFtOdYzM'
    },
    method: 'POST'
  };
  FCM.requestFCM('https://fcm.googleapis.com/v1/projects/mytest-cc974/messages:send', poop, 5, 50).then(data => res.json(data)).catch(err => res.json({ err }));
  // const result = fetch('https://fcm.googleapis.com/v1/projects/mytest-cc974/messages:send',
  //   {
  //     body: JSON.stringify(note),
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': 'Bearer ya29.c.ElrXBRDK-SHlRms5SQcH1XY7PeBaCkXoTSwFrhuk1Fo9ALUWeopNCGJqRD-9zIn5Yfif5YeiArycC0S5enZNE0FV4Nx9YZmtTQeeLgOnSANISJVkUBbZ4LbhCs'
  //     },
  //     method: 'POST'
  //   }).then(result => { console.log(result.ok); return result.json(); }).then(data => res.json(data)).catch(err => res.json(err));

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

