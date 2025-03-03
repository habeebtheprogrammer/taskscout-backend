const mongoose = require("mongoose");
var Schema = mongoose.Schema;

var locationSchema = mongoose.Schema({
  name: {
    type: String,
    // unique: [true, 'Name already used'],
  },
  address: {
    type: String,
  },
	locationAddressLine2: {
		type: String,
	},
  zipcode: {
    type: String,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
  },
  city: {
    type: String,
  },
  companyName: {
    type: String,
  },
  bankName: {
    type: String,
  },
  bankAddress: {
    type: String,
  },
	bankAddressLine2: {
    type: String,
  },
  bankCity: {
    type: String,
  },
  bankState: {
    type: String,
  },
  bankZipcode: {
    type: String,
  },
  accountNumber: {
    type: Number,
  },
  routingNumber: {
    type: Number,
  },
  startingCheckNumber: {
    type: Number,
  },
  storePhoneNumber: {
    type: Number,
  },
  bankPhoneNumber: {
    type: Number,
  },
  loc: {
    type: {type: String},
    coordinates: [Number]
  },
  // coordinate: {
  //   longitude: String,
  //   latitude: String,
  // },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  organisationId: {
    type: Schema.Types.ObjectId,
    ref: 'taskscoutorganisation'
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'taskscoutusers'
  },
  assignedTos: [{
    type: Schema.Types.ObjectId,
    ref: 'taskscoutusers'
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  permissionLevel: {
    type: Number,
    default: 1
  },
	likers: [
		{
			type: Schema.Types.ObjectId,
			ref: 'taskscoutusers'
		}
	],
});

locationSchema.index( { "loc" : "2dsphere" } )
const Location = mongoose.model('taskscoutlocations', locationSchema)
;

module.exports = Location;