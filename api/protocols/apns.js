const apn = require('apn');
const chunk = require('lodash.chunk');
const App = require('../models/App');
const Log = require('../models/Log');

const send = async function (payload, devices, appUID, trx) {
  // send 1000 notifications per connection

  const app = await App.findById(appUID)
    .then(app => app)
    .catch(err => console.log(err));

  const tokenChunks = chunk(devices.map(device => {
    return device.pushId;
  }), 1000);

  let notification = new apn.Notification();
  notification.title = payload.title;
  notification.body = payload.message;
  notification.badge = 10;
  notification.payload = payload.data;
  notification.topic = app.appId;

  tokenChunks.forEach(chunk => {
    const connection = new apn.Provider({
      cert: `../../${app.iOSCert}`,
      key: `../../${app.iOSKey}`
      // cert: `iOSCerts/${app}_cert.pem`,
      // key: `iOSKeys/${app}_key.pem`
    })
    connection.send(notification, chunk).then(response => {
      // response.sent: Array of device tokens to which the notification was sent succesfully
      // response.failed: Array of objects containing the device token (`device`) and either an `error`, or a `status` and `response
      response.sent.forEach(response => {
        const log = new Log({
          transactionId: trx,
          // deviceId: device.serialNumber,
          pushId: response.device,
          sendFlag: true,
          responseFlag: true,
          status: 200,
          result: JSON.stringify(response)
        }).save();
      });

      response.failed.forEach(response => {
        const log = new Log({
          transactionId: trx,
          // deviceId: device.serialNumber,
          pushId: response.device,
          sendFlag: false,
          responseFlag: false,
          status: response.status,
          result: JSON.stringify(response)
        }).save();
      })
    })

    connection.shutdown();
    return response
  })

}

module.exports = { send };