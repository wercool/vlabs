var models      = require('../models');
var express     = require('express');
var jwt         = require('jsonwebtoken');
var router      = express.Router();

var urlsNoTokenRequired = ['/api/user/register', '/api/role/Student'];

// non-tokenized routes
router.post('/authenticate', function(req, res, next) {
    models.User.findOne({
                            where: {email: req.body.email, password: req.body.password},
                            include:[{model:models.Role}]
                        }).then(function(user){
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
            // console.log(user);
            var authenticatedUser = {
                id:         user.id,
                email:      user.email,
                firstname:  user.firstname,
                lastname:   user.lastname,
                roles:      user.Roles,
                activated:  user.activated,
                blocked:    user.blocked,
                token:      jwtToken
            };
            res.json(authenticatedUser);
        }
    });
});

router.use(function(req, res, next) {
    var token = req.headers['x-access-token'];

    if (token)
    {
        // verifies secret and checks exp
        jwt.verify(token, req.app.get('jwtSecret'), function(err, decoded) {
            if (err) {
              return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
              // if everything is good, save to request for use in other routes
              req.decoded = decoded;
              next();
            }
        });
    }
    else
    {
        if (urlsNoTokenRequired.indexOf(req.originalUrl) > -1)
        {
            next();
        }
        else
        {
            // if there is no token
            // return an error
            return res.status(403).send({
              success: false,
              message: 'No token provided.'
            });
        }
    }
});

router.post('/user/register', function(req, res, next) {
    models.User.findOne({ where: {email: req.body.email} }).then(function(user){
        if (user === null)
        {
            models.User.create(req.body).then(function(user){
                return res.send({
                  success: true
                });
            });
        }
        else
        {
            return res.send({
              success: false,
              message: 'User with email ' + req.body.email + ' already exists in VLabs'
            });
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

router.get('/role/:title', function(req, res, next) {
    models.Role.findOne({ where: {title: req.params.title} }).then(function(role){
        res.json(role === null ? {} : role);
    });
});

module.exports = router;
