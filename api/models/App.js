const mongoose = require('mongoose');

const appSchema = mongoose.Schema({

  organizationId: { type: String },
  name: { type: String },
  appId: { type: String, required: true }, // e.g. com.test.android
  osPlatform: { type: String, required: true },
  FCMjson: { type: String },
  // FCMPrivateKey: { type: String }, // for getting fcm auth
  // FCMClientEmail: { type: String }, // for getting fcm auth
  FCMServerKey: { type: String }, // for subscribing to topics
  FCMProjectId: { type: String }, // for fcm project url
  iOSCert: { type: String }, // path to file in local storage
  iOSKey: { type: String },
  status: { type: Number, default: 1 }, // {1, 0 - inactive}
  supportBy: { type: String },
  supportNumber: { type: String },
  supportEmail: { type: String },
  createdBy: { type: String },
  createdOn: { type: Date, default: Date.now },
  modifiedBy: { type: String },
  modifiedOn: { type: Date, default: Date.now }

}, { versionKey: false });
// each appId should only have one iOS and one Android version
appSchema.index({ appId: 1, osPlatform: 1 });
module.exports = mongoose.model('App', appSchema);