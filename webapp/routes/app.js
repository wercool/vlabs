var models      = require('../models');
var express     = require('express');
var router      = express.Router();

router.get('/', function(req, res, next) {
    res.render('index');
    // models.User.findAll().then(function(users){
    //     console.log(res.json(users));
    // });
});

module.exports = router;
