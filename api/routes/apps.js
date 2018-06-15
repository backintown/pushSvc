const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const mv = require('mv');
const App = require('../models/App');
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
          return result
        })
      });
    })
    .catch(err => console.log(err));
});

//POST route
router.post('/', upload.fields([{ name: 'iOSCert', maxCount: 1 }, { name: 'iOSKey', maxCount: 1 }, { name: 'FCMjson', maxCount: 1 }]), (req, res, next) => {

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
            res.status(201).json({
              message: 'app saved',
              result
            })
          })
          .catch(err => { res.status(500).json({ err }) });
      }
    })
    .catch(err => {
      res.status(500).json({ err })
    });

});

//update
router.put('/', upload.fields([{ name: 'iOSCert', maxCount: 1 }, { name: 'iOSKey', maxCount: 1 }, { name: 'FCMjson', maxCount: 1 }]), (req, res, next) => {

  // move files and set updated paths in req.body
  [req.body.iOSCert, req.body.iOSKey, req.body.FCMjson] = moveFiles(req.files);

  req.body.status = null; // status should not be updated externally
  req.body.modifiedOn = Date.now(); // insert date into request object for modifiedOn
  App.findOneAndUpdate({ appId: req.body.appId, osPlatform: req.body.osPlatform }, req.body, (err, result) => {
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
      res.json({ err });
    res.json({ result });
  });
});

//delete app route
//change to update status instead of delete
router.delete('/:appId', (req, res, next) => {
  App.find({ appId: req.params.appId, osPlatform: req.body.osPlatform })
    .exec()
    .then(result => {
      App.remove({ _id: result[0]._id })
      res.status(200).json({
        message: `${result[0].name} removed`
      });
    })
    .catch(err => {
      res.status(500).json({ err })
    });
});

function moveFiles(files) {
  // move files
  let certPath, keyPath, fcmPath;
  if (files['iOSCert']) {
    const certFile = files['iOSCert'][0];
    certPath = `upload/iOSCert/${certFile.filename}`;
    mv(certFile.path, certPath, err => {
      if (err)
        res.status(500).json({ err: 'error with file upload, please try again later' });
    });
  }

  if (files['iOSKey']) {
    const keyFile = files['iOSKey'][0];
    keyPath = `upload/iOSKey/${keyFile.filename}`
    mv(keyFile.path, keyPath, err => {
      if (err)
        res.status(500).json({ err: 'error with file upload, please try again later' });
    });
  }

  if (files['FCMjson']) {
    const json = files['FCMjson'][0];
    fcmPath = `upload/FCMJSON/${json.filename}`
    mv(json.path, fcmPath, err => {
      if (err)
        res.status(500).json({ err: 'error with file upload, please try again later' });
    });
  }
  return [certPath, keyPath, fcmPath];
}
module.exports = router;