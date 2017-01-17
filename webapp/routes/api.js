var models      = require('../models');
var express     = require('express');
var router      = express.Router();

router.get('/user', function(req, res, next) {
    models.User.findAll().then(function(users){
        console.log(res.json(users));
    });
});

router.get('/user/:id', function(req, res, next) {
    models.User.findOne({ where: {id: req.params.id} }).then(function(user){
        res.json(user === null ? {} : user);
    });
});

module.exports = router;
