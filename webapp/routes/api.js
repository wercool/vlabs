var models      = require('../models');
var express     = require('express');
var jwt         = require('jsonwebtoken');
var router      = express.Router();

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
            var authenticatedUser = {
                id:         user.id,
                email:      user.email,
                firstname:  user.firstname,
                lastname:   user.lastname,
                Roles:      user.Roles,
                activated:  user.activated,
                blocked:    user.blocked,
                token:      jwtToken
            };
            res.json(authenticatedUser);
        }
    });
});

router.post('/user/register', function(req, res, next) {
    models.User.findOne({ where: {email: req.body.email} }).then(function(user){
        if (user === null)
        {
            models.User.create(req.body).then(function(user){
                req.body.Roles.forEach(function(role){
                    user.addRole(role.id);
                });
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

router.get('/role/:title', function(req, res, next) {
    models.Role.findOne({ where: {title: req.params.title} }).then(function(role){
        res.json(role === null ? {} : role);
    });
});

// Token required for the following routes

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
        // if there is no token
        // return an error
        return res.status(403).send({
          success: false,
          message: 'No token provided.'
        });
    }
});

router.get('/user', function(req, res, next) {
    models.User.findAll({include:[{model:models.Role}]}).then(function(users){
        res.json(users);
    });
});

router.get('/user/:id', function(req, res, next) {
    models.User.findOne({ where: {id: req.params.id},
                          include:[{model:models.Role}] }).then(function(user){
        res.json(user === null ? {} : user);
    });
});

router.put('/user/:id', function(req, res, next) {
    models.User.update(req.body, { where: {id: req.params.id} }).then(function(user){
        res.json(user === null ? {} : user);
    });
});

router.get('/role', function(req, res, next) {
    models.Role.findAll().then(function(roles){
        res.json(roles);
    });
});

module.exports = router;
