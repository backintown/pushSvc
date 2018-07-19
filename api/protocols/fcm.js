const App = require('../models/App');
const Log = require('../models/Log');
const fetch = require('node-fetch');
const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send';
const { google } = require('googleapis');

const sendTopic = async function (payload, topic, appUID, trx) {
  // setup
  // get app info
  const app = await App.findById(appUID)
    .then(app => app)
    .catch(err => res.status(500).json({ err }));

  const authKey = await getAccessToken(app.FCMjson)
    .then(token => token)
    .catch(err => err);

  if (!authKey) {
    return new Promise((resolve, reject) => {
      reject("FCM json file not found. Please update app");
    });
  }
  return new Promise((resolve, reject) => {

    const projectURL = `https://fcm.googleapis.com/v1/projects/${app.FCMProjectId}/messages:send`;

    // configure notification

    if (!payload.data)
      payload.data = {};
    const note = {
      message: {
        android: {
          notification: {
            title: payload.title,
            body: payload.message,
            click_action: "OPEN_ACTIVITY_1",
            sound: "default"
          }
        },
        topic: topic,
        data: payload.data
      }
    };
    const reqBody = {
      body: JSON.stringify(note),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authKey
      },
      method: 'POST'
    };
    requestFCM(projectURL, reqBody, 5, 100)
      .then(data => {
        const log = new Log({
          transactionId: trx,
          sendFlag: true,
          status: 200,
          result: data,
        }).save().then(log => resolve(log)).catch(err => reject(err));
      })
      .catch(err => {
        const log = new Log({
          transactionId: trx,
          sendFlag: false,
          status: err.status,
          result: err.error,
        }).save().then(log => resolve(log)).catch(err => reject(err))
      });
  })
}

const send = async function (payload, devices, appUID, trx) {

  const app = await App.findById(appUID)
    .then(app => app)
    .catch(err => { console.log(err) });

  const authKey = await getAccessToken(app.FCMjson).then(token => token);

  if (!authKey) {
    return new Promise((resolve, reject) => {
      reject("FCM json file not found. Please update app");
    });
  }

  const projectURL = `https://fcm.googleapis.com/v1/projects/${app.FCMProjectId}/messages:send`;
  // construct notification payload
  if (!payload.data)
    payload.data = {};
  let notification = {
    message: {
      android: {
        notification: {
          title: payload.title,
          body: payload.message,
          click_action: "OPEN_ACTIVITY_1",
          sound: "default"
        }
      },
      token: "",
      data: payload.data
    }
  };

  for (let device of devices) {
    notification.message.token = device.pushId;
    let reqBody = {
      body: JSON.stringify(notification),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authKey
      },
      method: 'POST'
    };

    requestFCM(projectURL, reqBody, 5, 100)
      .then(data => {
        console.log(data)
        const log = new Log({
          transactionId: trx,
          deviceId: device.serialNumber,
          pushId: device.pushId,
          sendFlag: true,
          status: 200,
          result: JSON.stringify(data)
        }).save();
      })
      .catch(err => {
        const log = new Log({
          transactionId: trx,
          deviceId: device.serialNumber,
          pushId: device.pushId,
          sendFlag: false,
          status: err.status,
          result: err.error,
        }).save()
      });
  }
}

function getAccessToken(json) {

  const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']
  return new Promise(function (resolve, reject) {
    let key;
    try {
      key = require(`../../${json}`);
    } catch (e) {
      reject(false);
      return;
    }

    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES,
      null
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

function requestFCM(url, data, retries, delay /*ms*/) {
  return new Promise((resolve, reject) => {
    fetch(url, data)
      .then(result => {
        if (result.ok)
          return result.json();
        else
          throw new Error(result.status)
      })
      .then(data => resolve(data))
      .catch(err => {
        // reject client side errors
        err.status = err.message;
        if (err.message === '401') {
          err.error = 'Unable to authenticate, update FCM credentials.';
          reject(err);
        }
        else if (err.message === '400') { // error with syntax or token
          err.error = 'Invalid token, update device token.';
          reject(err);
        }
        // if errors with FCM, retry
        else if (retries > 0) {
          setTimeout(() => {
            resolve(requestFCM(url, data, retries - 1, delay * 2));
          }, delay);
        }
        else {
          err.error = "Possible problem with FCM servers, try again later.";
          reject(err);
        }
      });
  });
}

module.exports = { send, sendTopic, requestFCM };