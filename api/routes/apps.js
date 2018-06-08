const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const App = require('../models/App');
// storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}${file.originalname}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5 //5MB
  }
});

router.get('/', (req, res, next) => {
  App.find()
    .select('-__v')
    .exec()
    .then(results => {
      res.status(200).json({
        apps: results.map(result => {
          return result
        })
      });
    })
    .catch(err => console.log(err));
});

//POST route
router.post('/', upload.fields([{ name: 'FCMjson', maxCount: 1 }, { name: 'iOSCert', maxCount: 1 }, { name: 'iOSKey', maxCount: 1 }]), (req, res, next) => {
  for (var file in req.files) {
    console.log(req.files[file]);
  }

  App.find({ appId: req.body.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(result => {
      if (result.length > 0) {
        return res.status(409).json({
          message: 'app exists'
        });
      } else {
        const app = new App({
          organizationId: req.body.organizationId,
          name: req.body.name,
          appId: req.body.appId,
          osPlatform: req.body.osPlatform,
          FCMServerKey: req.body.FCMServerKey,
          FCMSenderId: req.body.FCMSenderId,
          iOSCertURL: req.body.iOSCertURL,
          iOSPassword: req.body.iOSPassword,
          supportBy: req.body.supportBy,
          supportNumber: req.body.supportNumber,
          supportEmail: req.body.supportEmail
        })
        app.save()
          .then(result => {
            res.status(201).json({
              message: 'app saved',
              result
            })
          })
          .catch(err => { res.status(500).json({ err }) });
      }
    })
    .catch(err => {
      res.status(500).json({ err: "hello" })
    });

});

//update
// todo - fix update items (status, osplatform, etc)
router.put('/:appId', (req, res, next) => {
  App.update({ _id: req.params.appId }, req.body, (err, result) => {
    if (err)
      res.json({ err });
    res.json({ result });
  });
});

//delete app route
//change to update status instead of delete
router.delete('/:appId', (req, res, next) => {
  App.find({ _id: req.params.appId })
    .exec()
    .then(result => {
      App.remove({ _id: req.params.appId })
      res.status(200).json({
        message: `${result[0].name} removed`
      });
    })
    .catch(err => {
      res.status(500).json({ err })
    });
});

module.exports = router;