var express     = require('express');
var router      = express.Router();
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "valterik",
  password: "valterik",
  database: "valterik"
});

con.connect(function(err) {
    console.log("Connected!");
    if (err) throw err;
});

router.post('/savejointstates', function(req, res, next) {
    var sql = "INSERT INTO rightArm " +
       "(eefX, eefY, eefZ, bodyYaw, bodyTilt, rightLimb, rightForearm, rightShoulder, rightArm)" +
       " VALUES (" +
        req.body.eefX + ", " +
        req.body.eefY + ", " +
        req.body.eefZ + ", " +
        req.body.bodyYaw + ", " +
        req.body.bodyTilt + ", " +
        req.body.rightLimb + ", " +
        req.body.rightForearm + ", " +
        req.body.rightShoulder + ", " +
        req.body.rightArm + ")";

        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log(sql);
        });

    return res.status(200).send({
      success: true,
      message: 'ok'
    });
});

module.exports = router;
