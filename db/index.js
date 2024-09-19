const dbConfig = require('./config');
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.url = dbConfig.url;
db.mongoose = mongoose;
db.mornitoringToken = require("./MonotoringTokens.model")(mongoose);
db.monitoringLps = require("./MonotoringLPs.model")(mongoose);
db.activityOfLps = require("./AcitivyOfLPs.model")(mongoose);
db.holders = require("./TokenHolders.model")(mongoose);
module.exports = db;
