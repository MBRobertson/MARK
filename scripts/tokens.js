(function(exports){
    
    //TokenVIP
    var TokenVIP = function(owner, x, y, game) {
        this.type = "TokenVIP";
        this.owner = owner
        this.targetable = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenVIP.prototype.capture = function() {
        this.game.captureToken(this);
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
    
    exports.TokenVIP = TokenVIP;
    
    //TokenBomber
    var TokenBomber = function(owner, x, y, game) {
        this.type = "TokenBomber";
        this.owner = owner
        this.targetable = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenBomber.prototype.capture = function() {
        for (var x = -1; x <= 1; x++) {
            for (var y = -1; y <= 1; y++) {
                var newX = this.x + x;
                var newY = this.y + y;
                
                if (this.game.isTokenAt(x, y)) {
                    //TODO FIX URGENTLY, fix recursion and overlapping tokens
                    this.game.getTokenAt(x, y).capture();
                }
            }
        }
        this.game.captureToken(this);
    };
    
    TokenBomber.prototype.tileTargetable = function(x, y) {
        for (var x = -1; x <= 1; x++) {
            for (var y = -1; y <= 1; y++) {
                var newX = this.x + x;
                var newY = this.y + y;
                
                if (this.game.isTokenAt(x, y)) {
                    return true
                }
            }
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
        this.owner = owner
        this.targetable = true;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenShooter.prototype.capture = function(x, y) {
        //TODO validated (tile targetable)
        this.game.captureToken(this.game.getTokenAt(x, y))
    };
    
    TokenShooter.prototype.tileTargetable = function(x, y) {
        //TODO
        return false;
    }
    
    TokenShooter.prototype.tileInRange = function(x, y) {
        //TODO
        return false;
    }
    
    exports.TokenShooter = TokenShooter;
    
    //TokenAssassin
    var TokenAssassin = function(owner, x, y, game) {
        this.type = "TokenAssassin";
        this.owner = owner
        this.targetable = true;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    TokenAssassin.prototype.capture = function(x, y) {
        //TODO validated (tile targetable)
        this.game.captureToken(this.game.getTokenAt(x, y))
    };
    
    TokenAssassin.prototype.tileTargetable = function(x, y) {
        //TODO
        return false;
    }
    
    TokenAssassin.prototype.tileInRange = function(x, y) {
        //TODO
        return false;
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
        this.owner = owner
        this.targetable = false;
        this.revealed = false;
        this.actionAvaliable = false;
        this.reference = "";
        this.x = x;
        this.y = y;
    }
    
    exports.TokenBlank = TokenBlank;

})(typeof exports === 'undefined'? this['tokens']={}: exports);