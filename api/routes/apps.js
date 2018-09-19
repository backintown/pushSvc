const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const mv = require('mv');
const App = require('../models/App');
const Device = require("../models/Device");
// storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}_${file.originalname}`);
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
          result = result.toObject();
          if (result.osPlatform === 'iOS') {
            delete result.FCMjson;
            delete result.FCMServerKey;
            delete result.FCMProjectId;
          } else {
            delete result.iOSKey;
            delete result.iOSCert;
          }
          return result
        })
      });
    })
    .catch(err => console.log(err));
});

router.get('/:appId', (req, res, next) => {
  App.find({ appId: req.params.appId, osPlatform: req.query.osPlatform })
    .select('-__v')
    .exec()
    .then(results => {
      if (results.length < 1) res.status(404).json({ err: "app not found" });
      res.status(200).json({
        apps: results.map(result => {
          result = result.toObject();
          if (result.osPlatform === 'iOS') {
            delete result.FCMjson;
            delete result.FCMServerKey;
            delete result.FCMProjectId;
          } else {
            delete result.iOSKey;
            delete result.iOSCert;
          }
          return result
        })
      });
    })
    .catch(err => {
      console.log(err);
    });
});

//POST route
router.post('/', upload.fields([{ name: 'iOSCert', maxCount: 1 }, { name: 'iOSKey', maxCount: 1 }, { name: 'FCMjson', maxCount: 1 }]), (req, res, next) => {
  console.log("file", req.file)
  App.find({ appId: req.body.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(result => {
      if (result.length > 0) {
        // remove temp files
        if (req.files) {
          for (let file in req.files) {
            fs.unlink(req.files[file][0].path, err => {
              if (err)
                console.log(err);
            });
          }
        }
        return res.status(409).json({
          message: 'app exists'
        });
      } else {
        // move files
        console.log(req.files)
        const [certPath, keyPath, fcmPath] = moveFiles(req.files);
        // create app
        const app = new App({
          organizationId: req.body.organizationId,
          name: req.body.name,
          appId: req.body.appId,
          osPlatform: req.body.osPlatform,
          FCMjson: fcmPath,
          FCMPrivateKey: req.body.FCMPrivateKey,
          FCMClientEmail: req.body.FCMClientEmail,
          FCMServerKey: req.body.FCMServerKey,
          FCMProjectId: req.body.FCMProjectId,
          iOSCert: certPath,
          iOSKey: keyPath,
          supportBy: req.body.supportBy,
          supportNumber: req.body.supportNumber,
          supportEmail: req.body.supportEmail
        })

        app.save()
          .then(result => {

            result = result.toObject();
            console.log(result);
            if (result.osPlatform === 'iOS') {
              delete result.FCMjson;
              delete result.FCMServerKey;
              delete result.FCMProjectId;
            } else {
              delete result.iOSKey;
              delete result.iOSCert;
            }
            res.status(201).json({
              message: 'app saved',
              result
            })
          })
      }
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({ err: 'no payload' })
    });

});

//update
router.put('/:appId', upload.fields([{ name: 'iOSCert', maxCount: 1 }, { name: 'iOSKey', maxCount: 1 }, { name: 'FCMjson', maxCount: 1 }]), (req, res, next) => {
  console.log('hello')
  App.find({ appId: req.params.appId, osPlatform: req.query.osPlatform })
    .then(result => {
      if (result.length < 1) {
        return res.status(404).json({ err: "app not found" });
      } else {
        // move files and set updated paths in req.body
        [req.body.iOSCert, req.body.iOSKey, req.body.FCMjson] = moveFiles(req.files);
        console.log(req.body)
        req.body.status = null; // status should not be updated externally
        req.body.modifiedOn = Date.now(); // insert date into request object for modifiedOn
        App.findOneAndUpdate({ appId: req.params.appId, osPlatform: req.query.osPlatform }, req.body, (err, result) => {
          // result is the original record
          // remove old files
          console.log(result)
          if (req.body.iOSCert)
            fs.unlink(result.iOSCert, err => {
              if (err)
                console.log(err);
            });
          if (req.body.iOSKey)
            fs.unlink(result.iOSKey, err => {
              if (err)
                console.log(err);
            });
          if (req.body.FCMjson)
            fs.unlink(result.FCMjson, err => {
              if (err)
                console.log(err);
            })
          if (err)
            res.status(500).json({ err });
          else
            res.status(200).json({ result });
        });
      }
    })
    .catch(err => console.log(err))
});

//delete app route
//change to update status instead of delete
router.delete('/:appId', (req, res, next) => {
  App.find({ appId: req.params.appId, osPlatform: req.query.osPlatform })
    .exec()
    .then(result => {
      if (result.length < 1)
        return res.status(404).json({ err: "app not found" });
      App.findOneAndRemove({ _id: result[0]._id })
        .exec()
        .then(app => {
          if (app.iOSCert)
            fs.unlink(app.iOSCert, err => {
              if (err)
                console.log(err);
            });
          if (app.iOSKey)
            fs.unlink(app.iOSKey, err => {
              if (err)
                console.log(err);
            });
          if (app.FCMjson)
            fs.unlink(app.FCMjson, err => {
              if (err)
                console.log(err);
            })
          res.status(200).json({
            app,
            removed: true
          })
        })
    })
    .catch(err => {
      res.status(500).json({ err })
    });
});


/****
 * app + device combo routes
 ****/

// update device+app combo

router.get('/:appId/devices', (req, res, next) => {
  Device.find({ appId: req.params.appId, osPlatform: req.query.osPlatform })
    .exec()
    .then(result => {
      if (result.length < 1) {
        res.status(404).json({
          err: 'no device found'
        });
      } else {
        let devices = result.map(device => {
          return device;
        })
        return res.json({ devices });
      }
    })
})

router.get('/:appId/devices/:serialNumber', (req, res, next) => {
  Devince.find({ appId: req.params.appId, serialNumber: req.params.serialNumber })
    .select('-__v')
    .exec()
    .then(results => {
      if (results.length < 1) {
        res.status(404).json({ err: "device not found" });
      }
      res.status(200).json({
        device: results[0]
      });
    })
    .catch(err => {
      res.json({ err });
    })
});

router.put('/:appId/devices/:serialNumber', (req, res, next) => {
  req.body.modifiedOn = Date.now();
  Device.findOneAndUpdate({ appId: req.params.appId, serialNumber: req.params.serialNumber }, req.body, { new: true }, (err, result) => {
    if (err)
      res.json({ err });
    res.json({ result });
  });
});

// delete device+app combo
router.delete('/:appId/devices/:serialNumber', (req, res, next) => {
  Device.find({ appid: req.params.appId, serialNumber: req.params.serialNumber })
    .exec()
    .then(result => {
      if (result.length < 1) {
        res.status(404).json({
          err: 'device not found'
        });
      } else {
        Device.findOneAndRemove({ _id: result[0]._id })
          .then(result => {
            res.status(200).json({
              result,
              removed: true
            });
          })
          .catch(err => {
            res.status(500).json({ err })
          });
      }
    });
});

function moveFiles(files) {
  // move files
  let certPath = null, keyPath = null, fcmPath = null;
  if (files['iOSCert']) {
    const certFile = files['iOSCert'][0];
    certPath = `upload/iOSCert/${certFile.filename}`;
    mv(certFile.path, certPath, { mkdirp: true }, err => {
      if (err)
        res.status(500).json({ err: 'error with file upload, please try again later' });
    });
  }

  if (files['iOSKey']) {
    const keyFile = files['iOSKey'][0];
    keyPath = `upload/iOSKey/${keyFile.filename}`
    mv(keyFile.path, keyPath, { mkdirp: true }, err => {
      if (err)
        res.status(500).json({ err: 'error with file upload, please try again later' });
    });
  }

  if (files['FCMjson']) {
    const json = files['FCMjson'][0];
    fcmPath = `upload/FCMJSON/${json.filename}`
    mv(json.path, fcmPath, { mkdirp: true }, err => {
      if (err)
        res.status(500).json({ err: 'error with file upload, please try again later' });
    });
  }
  return [certPath, keyPath, fcmPath];
}
module.exports = router;