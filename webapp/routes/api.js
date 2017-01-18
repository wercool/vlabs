var models      = require('../models');
var express     = require('express');
var jwt         = require('jsonwebtoken');
var router      = express.Router();

router.post('/authenticate', function(req, res, next) {
    models.User.findOne({ where: {email: req.body.email, password: req.body.password} }).then(function(user){
        if (user === null)
        {
            res.json({});
        }
        else
        {
            // if user is found and password is right create a token
            var jwtToken = jwt.sign({id: user.id, email: user.email, password: user.password}, req.app.get('jwtSecret'), {
              expiresIn: 60*60*24 // expires in 24 hours
            });
            var authenticatedUser = {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                token: jwtToken
            };
            res.json(authenticatedUser);
        }
    });
});

router.get('/user', function(req, res, next) {
    models.User.findAll().then(function(users){
        res.json(users);
    });
});

router.get('/user/:id', function(req, res, next) {
    models.User.findOne({ where: {id: req.params.id} }).then(function(user){
        res.json(user === null ? {} : user);
    });
});

module.exports = router;
