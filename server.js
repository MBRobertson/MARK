var Game = require('./scripts/game.js');

var http = require('http');
var path = require('path');

//var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use('/scripts', express.static(path.resolve(__dirname, 'scripts')));

router.get('/', function(req,res){
    res.sendfile(__dirname + '/client/index.html');
}); 

router.get('/map', function(req,res) {
    res.sendfile(__dirname + '/client/map.html');
})

var queue = new Game();
io.on('connection', function (socket) {
    if (queue.disconnected)
        queue = new Game();
    queue.addPlayer(socket);
    if (queue.ready())
        queue = new Game();
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    console.log("Mark listening at", addr.address + ":" + addr.port);
});
