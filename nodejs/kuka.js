var express             = require("express");
var cors                = require('cors');
var bodyParser          = require("body-parser");
var app                 = express();
var mysql               = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'kuka',
  password : 'q1w2e3r4t5',
  database : 'kuka'
});

connection.connect(function(err){
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var server = app.listen(11111, function () {
    console.log("Listening on port %s...", server.address().port);
});

app.post("/ikxyz", function(req, res) {
    console.log(req.body);
    connection.query('INSERT INTO ikxyz SET ?', req.body);
    res.end();
});
