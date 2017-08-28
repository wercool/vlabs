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

router.post('/savejointstatesrarm', function(req, res, next) {
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
// console.log(sql);
        con.query(sql, function (err, result) {
            if (err) throw err;
            // console.log(sql);
        });

    return res.status(200).send({
      success: true,
      message: 'ok'
    });
});

router.post('/solverarmik', function(req, res, next) {

    var granularity = 1.0;

    // SELECT * FROM rightArm WHERE eefX > AND eefX < AND eefY > AND eefY < AND eefZ > AND eefZ <
    console.log([parseFloat(req.body.x), parseFloat(req.body.y), parseFloat(req.body.z)]);
    var sql = "SELECT * FROM rightArm " +
       "WHERE " +
       "eefX > " + parseFloat(req.body.x - granularity).toFixed(3) + " AND eefX < " + parseFloat(req.body.x + granularity).toFixed(3) + " AND " +
       "eefY > " + parseFloat(req.body.y - granularity).toFixed(3) + " AND eefY < " + parseFloat(req.body.y + granularity).toFixed(3) + " AND " +
       "eefZ > " + parseFloat(req.body.z - granularity).toFixed(3) + " AND eefZ < " + parseFloat(req.body.z + granularity).toFixed(3) + " " +
       "LIMIT 500";

    console.log(sql);

    con.query(sql, function (err, results) {
        if (err) throw err;
        var bestResultIdx = 0;
        var prevDist = 100;
        for (var resultIdx in results)
        {
            var resultVar = results[resultIdx];
            var dist = Math.sqrt(Math.pow((parseFloat(req.body.x) - resultVar.eefX), 2) + Math.pow((parseFloat(req.body.y) - resultVar.eefY), 2) + Math.pow((parseFloat(req.body.z) - resultVar.eefZ), 2));
            // console.log("Distance: " + dist);
            if (dist < prevDist)
            {
                bestResultIdx = resultIdx;
            }
            prevDist = dist;
        }
        var result = results[bestResultIdx];
        console.log(result);
        res.send(result);
    });
});

router.post('/rightarmikpcl', function(req, res, next) {
      var sql = "SELECT eefX, eefY, eefZ FROM rightArm";
      con.query(sql, function (err, results) {
          res.send(results);
      });
});

module.exports = router;
