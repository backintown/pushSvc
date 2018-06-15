const mongoose = require('mongoose');

const logSchema = mongoose.Schema({

  transactionId: { type: String, required: true },
  deviceId: { type: String },
  pushId: { type: String },
  sendFlag: { type: Boolean },
  responseFlag: { type: Boolean },
  sendOn: { type: Date, default: Date.now },
  responseOn: { type: Date, default: Date.now },
  status: { type: Number },
  result: { type: Object },
  createdOn: { type: Date, default: Date.now },
  modifiedOn: { type: Date, default: Date.now }

});

logSchema.index({ transactionId: 1 });
module.exports = mongoose.model('Log', logSchema);