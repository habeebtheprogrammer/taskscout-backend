const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const { Schema } = mongoose;

const itemsSchema = new Schema(
  {
    isAvailable: {
      type: Boolean,
      default: true,
    },
    images: {
      type: [String],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "categories",
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    subText: {
      type: String,
      default: "",
    },
    tag: {
      type: Schema.Types.ObjectId,
      ref: "subtexts",
    },
    points: {
      type: Number,
      default: 0,
    },
    // locationId: {
    //   type: Schema.Types.ObjectId,
    //   ref: "locations",
    //   required: true,
    // },
    locationId: [
      {
        type: Schema.Types.ObjectId,
        ref: "locations",
        required: true,
      },
    ],
    upc: {
      type: String,
      unique: [true, "UPC already taken"],
      required: true,
    },
    noOfSales: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

itemsSchema.plugin(mongoosePaginate);

const Items = mongoose.model("items", itemsSchema);

module.exports = Items;
