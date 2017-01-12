module.exports = function(User)
{
    var express     = require('express');
    var router      = express.Router();

    router.get('/', function(req, res){
        User.findAll().success(function (users) {
            res.send(users);
        });
    });

    return router;
}
