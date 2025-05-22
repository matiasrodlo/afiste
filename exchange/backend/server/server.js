require('./config/config');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors')
const app = express();
const bodyParser = require('body-parser');

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(require('./routes/usuario'));
app.use(require('./routes/orders'));

mongoose.connect(process.env.URLDB, { useNewUrlParser: true }, (err, res) => {
    if (err) throw err;
    console.log('Base de datos ONLINE');
});

app.listen(process.env.PORT, () => {
    console.log('Escuchando puerto: ', process.env.PORT);
});
