(function(exports){
    
    //TokenVIP
    var TokenVIP = function(owner, x, y, game) {
        this.type = "TokenVIP";
        this.game = game;
        this.owner = owner
        this.captured = false;
        this.targetable = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenVIP.prototype.capture = function() {
        this.captured = true;
        this.game.turnActions.push({ action: 'capture', x: this.x, y: this.y });
    };
    
    TokenVIP.prototype.tileTargetable = function(x, y) {
        if (this.x == x && this.y == y)
            return true;
        else 
            return false;
    }
    
    TokenVIP.prototype.tileInRange = function(x, y) {
        if (this.x == x && this.y == y)
            return true;
        else 
            return false;
    }
    
    TokenVIP.prototype.activate = function() {
        this.game.turnActions.push({ action: 'capture', x: this.x, y: this.y });
        this.capture();
    }
    
    exports.TokenVIP = TokenVIP;
    
    //TokenBomber
    var TokenBomber = function(owner, x, y, game) {
        this.type = "TokenBomber";
        this.game = game;
        this.owner = owner;
        this.captured = false;
        this.targetable = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenBomber.prototype.capture = function() {
        this.game.turnActions.push({ action: 'animate', animation: 'explode', x: this.x, y: this.y });
        this.game.turnActions.push({ action: 'capture', x: this.x, y: this.y });
        this.captured = true;
        for (var i = 0; i < this.game.tokens.length; i++) {
            var token = this.game.tokens[i];
            if (this.tileInRange(token.x, token.y) && token.captured == false) {
                token.capture();
                token.captured = true;
            }
        }
    };
    
    TokenBomber.prototype.activate = function() {
        this.capture();
    }
    
    TokenBomber.prototype.tileTargetable = function(x, y) {
        if (this.game.isTokenAt(x, y) && this.tileInRange(x, y)) {
            return true
        }
        return false;
    }
    
    TokenBomber.prototype.tileInRange = function(x, y) {
        if (Math.ceil(Math.sqrt(Math.pow((x-this.x), 2) + Math.pow((y-this.y), 2))) <= 2) return true;
        else return false;
    }
    
    exports.TokenBomber = TokenBomber;
    
    //TokenShooter
    var TokenShooter = function(owner, x, y, game) {
        this.type = "TokenShooter";
        this.game = game;
        this.owner = owner
        this.targetable = true;
        this.captured = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenShooter.prototype.capture = function() {
        this.game.turnActions.push({ action: 'capture', x: this.x, y: this.y });
    };
    
    TokenShooter.prototype.tileTargetable = function(x, y, tokenList) {
        //Severside
        if (tokenList === undefined) {
            if (this.game.isTokenAt(x, y) && this.tileInRange(x, y)) {
                var target = this.game.getTokenAt(x, y);
                if (target.owner != this.owner)
                    return true;
            }
        }
        //Clientside
        else {
            for (var index = 0; index < tokenList.length; index++) {
                var token = tokenList[index];
                if (token.x == x && token.y == y)
                {
                    if (token.owner != this.owner && this.tileInRange(token.x, token.y, tokenList)) 
                        return true;
                }
            }
        }
        return false;
    }
    
    TokenShooter.prototype.tileInRange = function(x, y, tokenList) {
        
        if (!(x == this.x || y == this.y)) return false;
        if (this.x == x && this.y == y) return true;
        
        var x1  = Math.min(x, this.x);
        var x2 = Math.max(x, this.x);
        var y1 = Math.min(y, this.y);
        var y2 = Math.max(y, this.y);
    
        
        var obstructed = false;
        
        if (x1 == x1) {
            //Check along y
        } else if (y1 == y2) {
            //Check along x
            
        }
        
        if (x1 == x2) {
            //Along the Y axis, scan accordingly
            for (var yCoord = y1; yCoord < y2; yCoord++) {
                var xCoord = x;
                if (yCoord != this.y && yCoord != y) {
                    if (tokenList === undefined) {
                        //Serverside check
                        if (this.game.getTokenAt(xCoord, yCoord))
                            obstructed = true;
                    } else {
                        //Client side check
                        for (var index = 0; index < tokenList.length; index++) {
                            var token = tokenList[index];
                            if (token.x == xCoord && token.y == yCoord)
                            {
                                console.log('There is a token here, obstructed');
                                obstructed = true;
                            }
                        }
                    }
                }
            }
        } else if (y1 == y2) {
            //Along the X axis, scan accordingly
            for (var xCoord = x1; xCoord < x2; xCoord++) {
                var yCoord = y;
                if (xCoord != this.x && xCoord != x) {
                    if (tokenList === undefined) {
                        //Serverside check
                        if (this.game.getTokenAt(xCoord, yCoord))
                            obstructed = true;
                    } else {
                        //Clientside check
                        for (var index = 0; index < tokenList.length; index++) {
                            var token = tokenList[index];
                            if (token.x == xCoord && token.y == yCoord)
                            {
                                obstructed = true;
                            }
                        }
                    }
                }
            }
        }
        
        return !obstructed;
    }
    
    TokenShooter.prototype.activate = function(x, y) {
        this.actionAvaliable = false;
        this.game.turnActions.push({ action: 'fatigue', x: this.x, y: this.y});
        if (this.tileTargetable(x, y))
        {
            for (var index = 0; index < this.game.tokens.length; index++) {
                var t = this.game.tokens[index];
                if (t.owner != this.owner && t.x == x && t.y == y)
                    this.game.captureToken(t);
            }
        }
    }
    
    exports.TokenShooter = TokenShooter;
    
    
    //TokenAssassin
    var TokenAssassin = function(owner, x, y, game) {
        this.type = "TokenAssassin";
        this.game = game;
        this.owner = owner
        this.targetable = true;
        this.captured = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenAssassin.prototype.capture = function() {
        this.game.turnActions.push({ action: 'capture', x: this.x, y: this.y });
    };
    
    TokenAssassin.prototype.tileTargetable = function(x, y, tokenList) {
        if (tokenList === undefined) {
            if (this.game.isTokenAt(x, y) && this.tileInRange(x, y)) {
                var target = this.game.getTokenAt(x, y);
                if (target.owner != this.owner)
                    return true;
            }
        } else {
            for (var index = 0; index < tokenList.length; index++) {
                var token = tokenList[index]
                if (token.x == x && token.y == y)
                {
                    if (token.owner != this.owner && this.tileInRange(token.x, token.y)) 
                        return true;
                }
            }
        }
        return false;
    }
    
    TokenAssassin.prototype.tileInRange = function(x, y, tokenList) {
        var xDiff = Math.abs(this.x-x);
        var yDiff = Math.abs(this.y-y);
        if (xDiff <= 2 && yDiff <= 2) {
            return true;
        }
        return false;
    }
    
    TokenAssassin.prototype.activate = function(x, y) {
        this.actionAvaliable = false;
        this.game.turnActions.push({ action: 'fatigue', x: this.x, y: this.y});
        if (this.tileTargetable(x, y))
        {
            var xorig = this.x;
            var yorig = this.y
            this.x = x;
            this.y = y;
            
            for (var index = 0; index < this.game.tokens.length; index++) {
                var t = this.game.tokens[index];
                if (t.owner != this.owner && t.x == x && t.y == y)
                    this.game.captureToken(t);
            }
            this.game.turnActions.push({ action: 'move', x1: xorig, y1: yorig, x2: x, y2: y});
        }
    }
    
    exports.TokenAssassin = TokenAssassin;
    
    exports.serialize = function(token) {
        return {
            "type": token.type,
            "owner": token.owner,
            "revealed": token.revealed,
            "actionAvaliable": token.actionAvaliable,
            "reference": token.reference,
            "x": token.x,
            "y": token.y
        }
    }
    
    exports.deserialize = function(obj, game) {
        var token  = new exports[obj.type](obj.owner, obj.x, obj.y, game);
        token.revealed = obj.revealed;
        token.actionAvaliable = obj.actionAvaliable;
        token.reference = obj.reference;
        return token;
    }
    
    var TokenBlank = function(owner, x, y, game) {
        this.type = "TokenBlank";
        this.game = game;
        this.owner = owner
        this.targetable = false;
        this.captured = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    exports.TokenBlank = TokenBlank;

})(typeof exports === 'undefined'? this['tokens']={}: exports);