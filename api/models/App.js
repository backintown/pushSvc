const mongoose = require('mongoose');

const appSchema = mongoose.Schema({

  organizationId: { type: String },
  name: { type: String },
  appId: { type: String, required: true },
  osPlatform: { type: String, required: true },
  FCMjson: { type: String },
  FCMServerKey: { type: String },
  FCMProjectId: { type: String },
  FCMSenderId: { type: String },
  iOSCertURL: { type: String },
  iOSPassword: { type: String },
  status: { type: Number },
  supportBy: { type: String },
  supportNumber: { type: String },
  supportEmail: { type: String },
  createdBy: { type: String },
  createdOn: { type: Date, default: Date.now },
  modifiedBy: { type: String },
  modifiedOn: { type: Date, default: Date.now }

});
// each appId should only have one iOS and one Android version
appSchema.index({ appId: 1, osPlatform: 1 });
module.exports = mongoose.model('App', appSchema);