var config = require("./config.js");
var tokens = require("./tokens.js");
//Class game



var Game = function() {
    this.states = {
        "Waiting": 0,
        "Setup": 1,
        "Begin": 2,
        "Placing": 3,
        "Playing": 4
    }
    this.player1 = null;
    this.player2 = null;
    this.currentTurn = 1
    this.board = {};
    this.tokens = []
    this.genBoard();
    this.confirmed = false;
    this.confirmFunc = null;
    this.disconnected = false;
    this.state = this.states.Waiting;
    this.placementComplete = false;
}

Game.prototype.pid = function(player) {
    if (player == this.player1)
        return 1;
    else
        return 2
}

Game.prototype.getPlayer = function(pid) {
    if (pid == 1)
        return this.player1;
    else
        return this.player2;
}

Game.prototype.broadcast = function(message, data) {
    if (data != null) {
        if (this.player1 != null)
            this.player1.emit(message, data);
        if (this.player2 != null)
            this.player2.emit(message, data);
    }
    else {
        if (this.player1 != null)
            this.player1.emit(message);
        if (this.player2 != null)
            this.player2.emit(message);
    }
    
}

Game.prototype.setupPlayer = function(player) {
    var _this = this;
    player.on('confirm', function(data) {
        if (!_this.confirmed)
            _this.confirmed = true
        else
            _this.confirmFunc()
    });
    
    player.on('disconnect', function(data) {
        _this.disconnected = true;
        _this.broadcast('player-disconnect')
    })
};

Game.prototype.onConfirm = function(func) {
    this.confirmed = false
    this.confirmFunc = func
}

Game.prototype.setState = function(state) {
    this.state = state;
    var states = this.states
    var _this = this
    if (state == states.Setup) {
        this.onConfirm(function() {
            _this.setState(states.Begin);
        })
        this.broadcast('game-setup')
    } else if (state == states.Begin) {
        this.onConfirm(function() {
            _this.setState(states.Placing);
        })
        this.broadcast('game-begin', {turn: 1});
    } else if (state == states.Placing) {
        this.startPlacementRound();
    } else if (state == states.Playing) {
        this.startRound();
    }
}

Game.prototype.toggleTurn = function() {
    if (this.currentTurn == 1) {
        this.currentTurn = 2
    } else {
        this.currentTurn = 1
    }
    return this.currentTurn;
}

Game.prototype.startRound = function() {
    this.broadcast('game-turn', {turn: this.currentTurn});
    var _this = this;
    this.getPlayer(this.currentTurn).once('turn', function(data) {
        if (data.action == 'move') {
            var token = _this.getTokenAt(data.x1, data.y1)
            token.x = data.x2;
            token.y = data.y2;
            _this.broadcast('on-turn', data);
            _this.onConfirm(function() {
                _this.toggleTurn();
                _this.startRound();
            })
        }
        else if (data.action == 'reveal') {
            var token = _this.getTokenAt(data.x, data.y);
            if (token.revealed) {
                token.revealed = false;
                data['revealed'] = false;
            }
            else {
                data['revealed'] = true;
                token.revealed = true;
                data['type'] = token.type;
            }
            _this.broadcast('on-turn', data);
            _this.onConfirm(function() {
                _this.toggleTurn();
                _this.startRound();
            })
        }
    });
}

/*Game.prototype.createToken = function(owner, type, x, y) {
    var token = new tokens[type](owner, x, y, this);
    this.tokens.push(token);
}*/

Game.prototype.startPlacementRound = function() {
    this.broadcast('game-place', { turn: this.currentTurn })
    var _this = this
    this.getPlayer(this.currentTurn).once('placed-unit', function(data) {
        var t = tokens.deserialize(data.token);
        _this.tokens.push(t);
        var finished = false;
        if (data.finished) {
            if (_this.placementComplete) {
                finished = true;
            } else {
                _this.placementComplete = true;
            }
        }
        _this.broadcast('token-placed', { owner: _this.currentTurn, x: t.x, y: t.y })
        _this.onConfirm(function() {
            _this.toggleTurn();
            if (!finished)
                _this.startPlacementRound();
            else {
                _this.setState(_this.states.Playing);
            }
        })
    })
}

Game.prototype.ready = function() {
    if (this.player1 != null && this.player2 != null)
        return true;
    else
        return false;
}

Game.prototype.addPlayer = function(player) {
    this.setupPlayer(player);
    if (this.player1 == null) {
        this.player1 = player;
        this.player1.emit('assigned-game', { 'config': config, 'slot': 1, setup: false});
    }
    else {
        this.player2 = player;
        this.player2.emit('assigned-game', { 'config': config, 'slot': 2, setup: true});
        this.player1.emit('setup-game');
        this.setState(this.states.Setup);
    }
}

Game.prototype.genBoard = function() {
    this.board = {}
    for (var y = 0; y < config.board.width; y++) {
        var column = {}
        for (var x = 0; x < config.board.width; x++) {
            column[x] = null;
        }
        this.board[y] = column
    }
}

Game.prototype.captureToken = function(token) {
    //TODO: Capture tokens
}

Game.prototype.isTokenAt = function(x, y) {
    for (var i = 0; i < this.tokens.length; i++) {
        if (this.tokens[i].x == x && this.tokens[i].y == y)
            return true
    }
    return false;
}

Game.prototype.getTokenAt = function(x, y) {
    //console.log("("+x+", "+y+")")
    for (var i = 0; i < this.tokens.length; i++) {
        //console.log("Token ("+this.tokens[i].x+", "+this.tokens[i].y+")")
        if (this.tokens[i].x == x && this.tokens[i].y == y)
            return this.tokens[i];
    }
    return null;
}


//Export for node.js
module.exports = Game;