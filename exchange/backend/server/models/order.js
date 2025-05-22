const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const moment = require('moment');

let typesValid = {
    values: ['COMPRA', 'VENTA'],
    message: '{VALUE} not type valid'
};

let stateValid = {
    values: ['ACTIVE', 'INNACTIVE'],
    message: '{VALUE}  not type valid'
};

let Schema = mongoose.Schema;
let orderSchema = new Schema({
    merkat: {
      type: String
    },
    number: {
      type: Number
    },
    price: {
      type: Number
    },
    money: {
      type: String
    },
    type: {
      type: String,
      enum: typesValid
    },
    dateCreate: {
      type: Date,
      default: moment(),
    },
    state: {
      type: String,
      default: 'ACTIVE',
      enum: stateValid
    },
});

orderSchema.plugin(uniqueValidator, { message: '{PATH} debe de ser único' });
module.exports = mongoose.model('Orden', orderSchema);
