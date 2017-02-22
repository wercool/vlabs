var express     = require('express');
var router      = express.Router();

router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/vlabs/ph-mpd-fcm', function(req, res, next) {
    res.render('vlabs/ph-mpd-fcm.hbs');
});

router.get('/vlabs/valter-lab', function(req, res, next) {
    res.render('vlabs/valter-lab.hbs');
});

module.exports = router;
