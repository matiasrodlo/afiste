const mongoose = require('mongoose');

let Schema = mongoose.Schema;
let block = new Schema({
    id: {
      type: String
    },
    dateIn: {
      type: Date
    },
    dateIOut: {
      type: Date
    },
    beforeBlock: {
      type: String,
      default: ''
    },
    afterBlock: {
      type: String,
      default: ''
    },
});

module.exports = mongoose.model('block', block);
