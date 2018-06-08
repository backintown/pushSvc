const apn = require('apn');
const chunk = require('lodash.chunk');
const App = require('../models/App');

const send = async function (data, devices, app) {
  // send 500 notifications per connection
  const tokenChunks = chunk(devices.map(device => {
    return device.pushId
  }), 500)

  let notification = new apn.Notification()
  notification.title = data.title
  notification.body = data.message
  notification.badge = 10
  notification.topic = App.findById(app)

  tokenChunks.forEach(chunk => {
    const connection = new apn.Provider({
      cert: `iOSPushCert(dev).pem`,
      key: `iOSPushCert(dev).pem`
      // cert: `iOSCerts/${app}_cert.pem`,
      // key: `iOSKeys/${app}_key.pem`
    })
    const response = connection.send(notification, tokens)
    connection.shutdown();
    return response
  })







}

module.exports = { send };