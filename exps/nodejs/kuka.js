var express             = require("express");
var cors                = require("cors");
var bodyParser          = require("body-parser");
var app                 = express();
var mysql               = require("mysql");

var connection = mysql.createConnection({
  host     : "localhost",
  user     : "kuka",
  password : "q1w2e3r4t5",
  database : "kuka"
});

connection.connect(function(err){
  if(err){
    console.log("Error connecting to Db");
    return;
  }
  console.log("Connection established");
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var server = app.listen(11111, function () {
    console.log("Listening on port %s...", server.address().port);
});

app.post("/xyz", function(req, res) {
    var dataArr = req.body;
    connection.query("INSERT INTO ikxyz VALUES ?", [dataArr]);
    res.end();
});

app.post("/ikxyz", function(req, res) {
    var pos = req.body;

    var d = 0.02;
    var dxn, dxp, dyn, dyp, dzn, dzp;

    dxn = parseFloat(pos.x) - d;
    dxp = parseFloat(pos.x) + d;

    dyn = parseFloat(pos.y) - d;
    dyp = parseFloat(pos.y) + d;

    dzn = parseFloat(pos.z) - d;
    dzp = parseFloat(pos.z) + d;

    var clause = [dxn.toFixed(2), dxp.toFixed(2), dyn.toFixed(2), dyp.toFixed(2), dzn.toFixed(2), dzp.toFixed(2)];

    var result = [];
    var query = connection.query("SELECT * FROM ikxyz WHERE (x BETWEEN ? AND ?) AND (y BETWEEN ? AND ?) AND (z BETWEEN ? AND ?)", clause);

    query.on("result", function(row){
        result.push(row);
    });
    query.on("end", function(row){
        res.json(result);
        res.end();
    });
    query.on("error", function(err) {
        throw err;
        res.end();
    });
});
