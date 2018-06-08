const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Device = require('../models/Device');

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
    return res.status(400).json({ err: "No query" });

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
//todo - change find logic to use serial number
router.get('/:deviceId', (req, res, next) => {
  Device.findById(req.params.deviceId)
    .then(result => {
      res.status(200).json({ device: result });
    })
    .catch(err => {
      res.status(500).json({ err });
    });
});

//POST route
//todo - update status codes
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
          accountId: req.body.accountId,
          osPlatform: req.body.osPlatform,
          osVersion: req.body.osVersion,
          appVersion: req.body.appVersion,
          appId: req.body.appId,
          accountId: req.body.accountId,
          pushId: req.body.pushId
        });
        device.save()
          .then(result => {
            res.status(201).json({
              message: 'device saved',
              result
            });
          })
          .catch(err => { res.status(500).json({ err: "save err" }) });
        //subscript device to app
        subscribeToTopic(device, device.appId);
      }
    })
    .catch(err => {
      res.status(500).json({ err: err })
    });
})

//todo - fix fields
router.put('/:deviceId', (req, res, next) => {
  App.update({ _id: req.params.deviceId }, req.body, { $set: { modifiedOn: Date.now() } }, (err, result) => {
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
function subscribeToTopic(device, topic) {
  const url = `https://iid.googleapis.com/iid/v1/${device.token}/rel/topics/${topic}`;
  const app = App.find({ appId: device.appId, osPlatform: device.osPlatform })
    .exec()
    .then(result => result)
    .catch(err => { console.log(err) });
  fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '0',
      'Authorization': `key=${FCM_SERVER_KEY}`
    },
    method: 'POST'
  })
}
module.exports = router;