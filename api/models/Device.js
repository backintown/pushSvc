const mongoose = require('mongoose');

const deviceSchema = mongoose.Schema({
  serialNumber: {type: String, required: true},
  accountId: { type: String, required: true },
  osPlatform: { type: String, required: true },
  osVersion: { type: String },
  appId: { type: String, required: true },
  appVersion: { type: String },
  //pushId = token
  pushId: { type: String, required: true, unique: true },
  status: { type: Number },
  createdOn: { type: Date, default: Date.now },
  modifiedOn: { type: Date, default: Date.now }

});
deviceSchema.index({ appId: 1, pushId: 1, accountId: 1 });
module.exports = mongoose.model('Device', deviceSchema);