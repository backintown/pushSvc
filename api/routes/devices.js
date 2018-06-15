const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Device = require('../models/Device');
const App = require('../models/App');

//get all devices
//todo - add filter
router.get('/', (req, res, next) => {
  if (req.body.appId && req.body.accountId)
    query = { appId: req.body.appId, accountId: req.body.accountId };
  else if (req.body.appId)
    query = { appId: req.body.appId };
  else if (req.body.accountId)
    query = { accountId: req.body.accountId };
  else
    return res.status(400).json({ err: "No filter" });

  Device.find(query)
    .select('-__v')
    .exec()
    .then(results => {
      res.status(200).json({
        devices: results.map(result => {
          return result;
        })
      });
    })
    .catch(err => console.log(err));
});

//get device
router.get('/:serialNumber', (req, res, next) => {
  Device.find({ serialNumber: req.params.serialNumber })
    .then(device => {
      res.status(200).json({ device });
    })
    .catch(err => {
      res.status(500).json({ err });
    });
});

//POST route
router.post('/', (req, res, next) => {
  Device.find({ appId: req.body.appId, pushId: req.body.pushId })
    .exec()
    .then(result => {
      if (result.length > 0) {
        return res.status(409).json({
          message: 'device exists'
        });
      } else {
        const device = new Device({
          serialNumber: req.body.serialNumber,
          accountId: req.body.accountId,
          osPlatform: req.body.osPlatform,
          osVersion: req.body.osVersion,
          appVersion: req.body.appVersion,
          appId: req.body.appId,
          pushId: req.body.pushId
        });
        device.save()
          .then(result => {
            res.status(201).json({
              message: 'device saved',
              result
            });
          })
          .catch(err => { res.status(500).json({ err }) });
        //subscript device to app
        subscribeToTopic(device, device.appId);
      }
    })
    .catch(err => {
      res.status(500).json({ err: err })
    });
})


router.put('/:serialNumber', (req, res, next) => {
  req.body.modifiedOn = Date.now();
  Device.findOneAndUpdate({ serialNumber: req.params.serialNumber }, req.body, (err, result) => {
    if (err)
      res.json({ err });
    res.json({ result });
  });
});

//delete device route
//change to update status instead of delete
router.delete('/:deviceId', (req, res, next) => {
  Device.find()
    .exec()
    .then(result => {
      if (result.length < 1) {
        res.status(404).json({
          message: 'device not found'
        });
      } else {
        Device.remove({ deviceId: req.params.deviceId })
          .then(result => {
            res.status(200).json({
              message: `${req.params.deviceId} removed`
            });
          })
          .catch(err => {
            res.status(500).json({ err })
          });
      }
    });
});

//for sending notification to all devices
async function subscribeToTopic(device, topic) {
  // set app info
  const url = `https://iid.googleapis.com/iid/v1/${device.pushId}/rel/topics/${topic}`;
  const serverKey = await App.find({ appId: device.appId, osPlatform: device.osPlatform })
    .exec()
    .then(result => result[0].FCMServerKey)
    .catch(err => { console.log(err) });

  // subscribe  
  fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${serverKey}`
    },
    method: 'POST'
  })
    .then(response => {
      // delete device if invalid token
      if (response.error === "InvalidToken") {
        Device.deleteOne(device._id);
        res.status(400).json({ err: 'Invalid FCM Token' });
      }
    })
    .catch(err => console.log(err));
}
module.exports = router;