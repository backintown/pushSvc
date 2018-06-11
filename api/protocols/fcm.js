const App = require('../models/App');
const Log = require('../models/Log');
const fetch = require('node-fetch');
const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send';
const { google } = require('googleapis');

const sendTopic = async function (payload, topic, app, trx) {
  // setup
  // get app info
  const [projectURL, authKey] = await App.findById(app)
    .then(app => {
      return [`https://fcm.googleapis.com/v1/projects/${app.FCMProjectId}/messages:send`, getAccessToken(app.FCMClientEmail, app.FCMPrivateKey)];
    })
    .catch(err => { console.log(err) });
  // configure notification
  if (!payload.data)
    payload.data = {};
  const notification = {
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
    body: JSON.stringify(notification),
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
        responseFlag: true,
        status: 200,
        result: data,
      }).save();
      return log; // return log id
    })
    .catch(err => {
      const log = new Log({
        transactionId: trx,
        sendFlag: false,
        responseFlag: false,
        status: err.status,
        result: err.error,
      }).save()
      return log; // return log id
    });
}

const send = async function (payload, devices, app, trx) {
  const [projectURL, authKey] = await App.findById(app)
    .then(app => {
      return [`https://fcm.googleapis.com/v1/projects/${app.FCMProjectId}/messages:send`, getAccessToken(app.FCMClientEmail, app.FCMPrivateKey)];
    })
    .catch(err => { console.log(err) });

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
        const log = new Log({
          transactionId: trx,
          deviceId: device.serialNumber,
          pushId: token,
          sendFlag: true,
          responseFlag: true,
          status: 200,
          result: data,
        }).save();
      })
      .catch(err => {
        const log = new Log({
          transactionId: trx,
          deviceId: device.serialNumber,
          pushId: token,
          sendFlag: false,
          responseFlag: false,
          status: err.status,
          result: err.error,
        }).save()
      });
  }
}

// const send_ = async function (payload, devices, app, trx) {
//   // setup
//   // get app info
//   const [projectURL, authKey] = await App.findById(app)
//     .then(app => {
//       return [`https://fcm.googleapis.com/v1/projects/${app.FCMProjectId}/messages:send`, getAccessToken(app.FCMClientEmail, app.FCMPrivateKey)];
//     })
//     .catch(err => { console.log(err) });

//   // construct notification payload
//   if (!payload.data)
//     payload.data = {};
//   let notification = {
//     message: {
//       android: {
//         notification: {
//           title: payload.title,
//           body: payload.message,
//           click_action: "OPEN_ACTIVITY_1",
//           sound: "default"
//         }
//       },
//       token: "",
//       data: payload.data
//     }
//   };

//   // send messages
//   //todo - handle send failure exception. try resend
//   const promises = [];
//   for (let device of devices) {
//     const token = device.pushId;
//     notification.message.token = token;
//     let reqBody = {
//       body: JSON.stringify(notification),
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Bearer ' + authKey
//       },
//       method: 'POST'
//     };
//     let promise = new Promise((resolve, reject) => {
//       fetch(projectURL, {
//         body: JSON.stringify(notification),
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': 'Bearer ' + authKey
//         },
//         method: 'POST'
//       })
//         .then(result => {
//           const status = result.status;
//           return result.json();
//         })
//         .then(data => {
//           let sent;
//           status !== 200 ? sent = false : sent = true;
//           const log = new Log({
//             transactionId: trx,
//             sendFlag: sent,
//             responseFlag: sent,
//             status: status,
//             result: data,
//           }).save();
//           resolve(data);
//         })
//         .catch(err => reject(err));
//     });
//     promises.push(promise);
//   }
//   return Promise.all(promises)
//     .then(data => {
//       return data;
//     });
// }

// const sendLegacy = async function (devices, app) {

//   let tokens = devices.map(device => {
//     return device.pushId
//   })
//   tokens = ['c9ds_XaiItw:APA91bExjCphE1CLayVQVqK37KNh1qYr2AVLUYZKe1-HRdwLbqyaDBUKKrGFH2_cdpT7xtMRHVL2lMkM2VuyEt2Be-J_2nWXWDQPS3jlGQxfO8WYIUCi2dvzNmmmlZ2YrcQcu13QFZSE', 'basdas', 'fdsf', 'sdf']
//   console.log(tokens)
//   const notification = {
//     registration_ids: tokens,
//     notification: {
//       title: 'hello',
//       body: 'test notification',
//       click_action: "OPEN_ACTIVITY_1"
//     }
//   }

//   // server key is per app, same for all devices
//   const serverKey = await App.find({ appId: devices[0].appId })
//     .exec()
//     .then(result => result[0].FCMServerKey)
//     .catch(result => console.log("serverkeyerr", result))

//   // serverKey = 'AAAAEUg4UqU:APA91bFeAs9kc91rDeIgqGbjblBRtsouJ49PuaZWee1DqRGHTEuQEBadlHQ2JriKCGP_m8CGQzVPoxMTazh50T3uY5H1AaardHG7XuT_v6cM9XGfdUuuHKZyzmwtW8Nz301x8ObarpEf'
//   // send notification
//   const response = await fetch(FCM_LEGACY_URL, {
//     body: JSON.stringify(notification),
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': 'key=' + serverKey
//     },
//     method: 'POST'
//   })
//     .then(result => {
//       return result.json()
//     })
//     .catch(err => {
//       console.log(err)
//     })
//   return response
// }

function getAccessToken(email, key) {
  const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']
  return new Promise(function (resolve, reject) {
    var jwtClient = new google.auth.JWT(
      email,
      null,
      key,
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