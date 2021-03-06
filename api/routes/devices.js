const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Device = require('../models/Device');
const App = require('../models/App');

//get all devices
//todo - add filter
router.get('/', (req, res, next) => {
  if (req.query.appId && req.query.accountId)
    query = { appId: req.query.appId, accountId: req.query.accountId };
  else if (req.query.appId)
    query = { appId: req.query.appId };
  else if (req.query.accountId)
    query = { accountId: req.query.accountId };
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
        subscribeToTopic(device, device.appId)
          .then(result => {
            device.save()
              .then(result => {
                res.status(201).json({
                  message: 'device saved',
                  result
                });
              })
              .catch(err => { res.status(500).json({ err }) });
          })
          .catch(err => {
            res.status(400).json({ err });
          })
      }
    })
    .catch(err => {
      res.status(500).json({ err })
    });
})


// router.put('/:appId/devices/:serialNumber', (req, res, next) => {
//   req.body.modifiedOn = Date.now();
//   Device.findOneAndUpdate({ serialNumber: req.params.serialNumber }, req.body, { new: true }, (err, result) => {
//     if (err)
//       res.json({ err });
//     res.json({ result });
//   });
// });

//delete device route
//change to update status instead of delete
// router.delete('/:appId/devices/:serialNumber', (req, res, next) => {
//   Device.find({ appid: req.params.appId, serialNumber: req.params.serialNumber })
//     .exec()
//     .then(result => {
//       if (result.length < 1) {
//         res.status(404).json({
//           message: 'device not found'
//         });
//       } else {
//         Device.findOneAndRemove({ _id: result[0]._id })
//           .then(result => {
//             res.status(200).json({
//               result,
//               removed: true
//             });
//           })
//           .catch(err => {
//             res.status(500).json({ err })
//           });
//       }
//     });
// });

//for sending notification to all devices
async function subscribeToTopic(device, topic) {
  // set app info
  return new Promise((resolve, reject) => {
    const url = `https://iid.googleapis.com/iid/v1/${device.pushId}/rel/topics/${topic}`;

    App.find({ appId: device.appId, osPlatform: device.osPlatform })
      .exec()
      .then(result => {
        const serverKey = result[0].FCMServerKey;
        fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${serverKey}`
          },
          method: 'POST'
        })
          .then(response => {
            if (response.status === 400) {
              reject('Invalid FCM token');
            }
            resolve(response);
          })
          .catch(err => console.log(err));
      })
      .catch(err => { console.log(err) });
  })
}
module.exports = router;