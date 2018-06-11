const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
  appId: { type: String, required: true },
  osPlatform: { type: String, required: true },
  accountId: { type: String },
  title: { type: String },
  message: { type: String },
  appointment: { type: Date, default: Date.now },
  expiredOn: { type: Date },
  createdOn: { type: Date, default: Date.now }

});

transactionSchema.index({ appId: 1 })
module.exports = mongoose.model('Transaction', transactionSchema);