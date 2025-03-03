const mongoose = require("mongoose");
var Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

var organisationchema = mongoose.Schema({
  name: String,
  clients: Number, //remote clients
  plan: {
    type: String,
    default: "free", // basic //advance //professional //enterprise
  },
  archive: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "taskscoutusers",
  },
  stripeSubscriptionId: String,
  stripeCustomerId: String,
});

organisationchema.plugin(mongoosePaginate);
const Organisation = mongoose.model("taskscoutorganisation", organisationchema);
module.exports = Organisation;
