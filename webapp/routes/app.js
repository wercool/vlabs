var express     = require('express');
var router      = express.Router();

router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/vlabs/ph-mpd-fcm', function(req, res, next) {
    res.render('vlabs/ph-mpd-fcm.hbs');
});

module.exports = router;
