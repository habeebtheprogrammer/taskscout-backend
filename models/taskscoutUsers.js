const mongoose = require("mongoose");
var Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

var userSchema = mongoose.Schema({
  organisationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "organisation",
    required: true,
  },
  fullName: {
    type: String,
  },
  phone: {
    type: String,
    unique: [true, "Phone has already been taken"],
    required: [true, "Phone is required"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  otp: String,
  userType: {
    type: String,
    default: "user", //technician vendor admin subadmin
  },
}, {
  timestamps: true
});
userSchema.plugin(mongoosePaginate);
const User = mongoose.model("taskscoutorganisation", userSchema);
module.exports = User;
