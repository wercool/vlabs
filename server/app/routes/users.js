var models  = require('../models');
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next){
    models.User.findAll().then(function(users){
        res.render('users', {users: users});
        // res.json(users);
    });
});

module.exports = router;
