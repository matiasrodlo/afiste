const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('underscore');
const Order = require('../models/order');
const app = express();

app.delete('/orders/delete/all', function(req, res) {
  Order.deleteMany({}, function (err, orders) {
    if (err) return res.status(400).json({ ok: false, err });
    res.json({
      deleteAll: true,
      deletedCount: orders.deletedCount,
    });
  });
});

app.get('/orderstest', function(req, res) {
  let desde = req.query.desde || 0;
  desde = Number(desde);
  let limite = req.query.limite || 50;
  limite = Number(limite);
  Order.find(null)
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          ok: false,
          err
        });
      }
      Order.count(null, (err, length) => {
        res.json({
          ok: true,
          orders,
          length
        });
      });
    });
});

app.post('/order', function(req, res) {
  let body = req.body;
  let orden = new Order({
      merkat: body.merkat,
      number: body.number,
      price: body.price,
      money: body.money,
      type: body.type
  });
  orden.save((err, ordenDB) => {
    if (err) {
      return res.status(400).json({
          ok: false,
          err
      });
    }
    res.json({
      ok: true,
      orden: ordenDB
    });
  });
});

module.exports = app;
