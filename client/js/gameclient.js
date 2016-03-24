/* global io */
/* global tokens */
/* global strings */
/* global setMessage */
/* global openMenu */
/* global closeMenu */
/* global $token, $tile, boardCoord, moveTo, setupActions */
var socket = null;
var states = {
    "Waiting": 0,
    "Setup": 1,
    "Begin": 2,
    "Placing": 3,
    "Playing": 4
}

var playerId = 0;
var state = states.Waiting;
var turn = 1;
var config = {};
var tokenList = [];
var inputLocked = false;
var transitioning = false;
var referenceCount = 0;

function animate(func, expectedDuration) {
    inputLocked = true;
    transitioning = true;
    func();
    if (expectedDuration != null) 
    {
        setTimeout(function() {
            inputLocked = false;
            transitioning = false;
        }, expectedDuration);
    } else {
        inputLocked = false;
        transitioning = false;
    }
}



function generatePlacement() {
    $('.placement-sub-container').empty();
    for (var i = 0; i < config.defaultTokens.length; i++) {
        var x = (5 + (50 * i)).toString();
        $('.template>.'+config.defaultTokens[i]).clone()
            .appendTo('.placement-sub-container')
            .css('top', '5px')
            .css('left', x + 'px')
            .addClass('placement-token')
    }
    $('.placement-token').mousedown(function() {
        onTokenSelected($(this))
    })
}

function setState(newState) {
    state = newState
    if (state == states.Setup) {
        $('.game').fadeOut(0);
        genBoard(config.board.width, config.board.height);
        generatePlacement();
        socket.emit('confirm');
        //Notify bubble
    }
    else if (state == states.Begin) {
        animate(function() {
            setTimeout(function() {
                $('.title').addClass('titleToggled');
                $('.info-box').addClass('info-box-toggled');
                $('.game').fadeIn(500); 
                socket.emit('confirm'); 
            }, 500)
        }, 1000);
    }
    else if (state == states.Placing) {
        startPlacementRound();
    }
    else if (state == states.Playing) {
        startRound();
    }
}

function genBoard(width, height) {
    $('.board').remove();
    $('.game').append('<table class="board"></table>');
    for (var y = 0; y < height; y++) {
        var element = "";
        for (var x = 0; x < width; x++) {
            element = element + '<td class="tile tileTransition'+Math.floor(1 + Math.random() * 4)+'" data-x="'+x+'" data-y="'+y+'"></td>';
        }
        element = '<tr>' + element + '</tr>';
        $('.board').append(element);
    }
    $('.tile').mousedown(function() {
        if (!inputLocked) {
            var x = parseInt($(this).data('x'));
            var y = parseInt($(this).data('y'));
            onTileClick(x, y);
        }
    });
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow((x1-x2), 2) + Math.pow((y1-y2), 2));
}

function createToken(owner, type, x, y) {
    referenceCount = referenceCount + 1;
    var token = new tokens[type](owner, x, y, null);
    var position = boardCoord(x, y);
    token.reference = '#'+referenceCount;
    tokenList.push(token);
    var instance = $('.template>.'+type).clone().appendTo('.board').attr('data-ref', '#'+referenceCount)
        .css('top', position.y)
        .css('left', position.x);
    instance.mousedown(function() {
        onTokenClick(token.x, token.y, token);
    })
    if (owner != playerId)
        instance.addClass('enemy');
    if (!token.revealed)
        instance.addClass('fogged');
    return token;
}

function modify(token, data) {
    var obj = $token(token.reference);
    console.log(token);
    console.log(data);
    console.log(obj);
    if ("type" in data) {
        var newType = data['type'];
        token.type = newType;
        var oldType = obj.data('type');
        obj.attr("data-type", newType);
        obj.html($('.template>.'+newType).html());
        obj.removeClass(oldType);
        obj.addClass(newType);
    }
    if ("revealed" in data) {
        token.revealed = data['revealed'];
        if (token.revealed) {
            obj.removeClass('fogged');
        } else {
            obj.addClass('fogged');
            if (token.owner != playerId) {
                modify(token, {type: 'TokenBlank'});
            }
        }
    }
    if ("actionAvaliable" in data) {
        token.actionAvaliable = data['actionAvaliable'];
        //TODO display action avaliable
    }
}

function getTokenAt(x, y) {
    for (var i = 0; i < tokenList.length; i++) {
        if (tokenList[i].x == x && tokenList[i].y == y)
            return tokenList[i];
    }
    return null;
}

function highlightBoard(criteria, info) {
    for (var y = 0; y < config.board.height; y++) {
        for (var x = 0; x < config.board.width; x++) {
            var data = criteria(x, y, info);
            if (data.paint) {
                clearClasses($tile(x, y)).addClass(data.class);
            }
        }
    }
}

function flicker() {
    $('.tile').addClass('flicker');
    setTimeout(function() {
        $('.tile').removeClass('flicker').removeClass('tileTransition1').removeClass('tileTransition2').removeClass('tileTransition3').removeClass('tileTransition4')
            .each(function() {
                $(this).addClass('tileTransition'+Math.floor(1 + Math.random() * 4));
            });
    }, 150);
}

function clearClasses(tile) {
    return tile.removeClass('selected')
        .removeClass('selectable')
        .removeClass('illegal')
        .removeClass('movable')
        .removeClass('highlight');
}

function clearBoard() {
    for (var y = 0; y < config.board.height; y++) {
        for (var x = 0; x < config.board.width; x++) {
            clearClasses($tile(x, y));
        }
    }
}

function isPlacementIllegal(x, y) {
    if (getTokenAt(x, y) != null) {
        return true
    } 
    else {
        for (var i = 0; i < tokenList.length; i++) {
            if (distance(x, y, tokenList[i].x, tokenList[i].y) < 2 && tokenList[i].owner != playerId) {
                return true;
            }
        }
    }
    return false;
}

function onTileClick(x, y) {
    if (turn == playerId) {
        if (state == states.Placing && selectedToken != null) {
            var type = selectedToken.data('type');
            if (!isPlacementIllegal(x, y)) {
                selectedToken.remove();
                selectedToken = null;
                $('.placement-token').removeClass('placement-token-selected');
                var token = createToken(playerId, type, x, y)
                clearBoard();
                finalizePlacement(token);
            }
        
        }
        if (state == states.Playing && selection != null) {
            if (distance(x, y, selection.x, selection.y) < 2 && getTokenAt(x, y) == null) {
                finalizeMovement(selection, x, y);
            }
        }
    }
}

function finalizePlacement(token) {
    turn = -1;
    closeMenu('.placement-container')
    setMessage('Ending turn...')
    var finished = false;
    if ($('.placement-token').size() <= 0)
        finished = true;
    socket.emit('placed-unit', {token: tokens.serialize(token), finished: finished});
}

function finalizeMovement(token, x, y) {
    turn = -1;
    closeMenu('.action-container')
    socket.emit('turn', {
        action: 'move',
        x1: selection.x,
        y1: selection.y,
        x2: x,
        y2: y
    })
    setMessage('Submitting move...')
    clearBoard();
    highlightBoard(function(x, y, info) {
        if ((x == info.x && y == info.y)) { // || (x == info.x2 && y == info.y2)
            return {
                paint: true,
                class: 'movable'
            }
        }
        return {
            paint: false
        }
    },  {x: x, y: y, x2: selection.x, y2: selection.y})
    selection = null;
}

var selectedToken = null;
var placementMode = "Select"
function onTokenSelected(token) {
    if (token.hasClass('placement-token-selected')) {
        selectedToken = null;
        $('.placement-token').removeClass('placement-token-selected');
        clearBoard();
        setMessage("It's your turn to place a unit")
    } else {
        $('.placement-token').removeClass('placement-token-selected');
        token.addClass('placement-token-selected');
        //if (selectedToken != null)
        flicker();
        selectedToken = token;
        setMessage('Select a location to place your ' + strings[token.data('type')].namelower);
        //TODO highlight board
        highlightBoard(function(x, y, info) {
            return {
                'paint': true,
                'class': 'selectable'
            }
        });
        highlightBoard(function(x, y, info) {
            if (isPlacementIllegal(x, y)) 
                return { paint: true, class: 'illegal' }
            else
                return { paint: false }
        })
    }
}

function startPlacementRound() {
    if (state == states.Placing) {
        if (turn == playerId) {
            setMessage("It's your turn to place a unit");
            openMenu('.placement-container');
        } else {
            setMessage("It's your opponents turn to place a unit");
            closeMenu('.placement-container');
        }
    }
}

function movementHighlight(x, y, info) {
    if (getTokenAt(x, y) == null || (x == info.x && y == info.y)) {
        if (distance(x, y, info.x, info.y) < 2) {
            return {
                paint: true,
                class: 'movable'
            }
        }
    }
    return {
        paint: false
    }
}

var selection = null
function onTokenClick(x, y, token) {
    //Let the magic begin
    if (turn == playerId && state == states.Playing) {
        var tokenObj = $token(token.reference);
        if (token.owner == playerId) {
            if (selection != null) {
                if (selection == token) {
                    $('.token').removeClass('highlight');
                    selection = null;
                    clearBoard();
                    $('.action-container').addClass('toggled');
                } else {
                    selection = token
                    //CHANGED SELECTION
                    $('.token').removeClass('highlight');
                    tokenObj.addClass('highlight');
                    clearBoard();
                    highlightBoard(movementHighlight, {x: x, y: y});
                    $('.action-container').addClass('toggled');
                    setTimeout(function() {
                        setupActions(token);
                    }, 800);
                }
            } else {
                //NEW SELECTION
                selection = token
                $('.token').removeClass('highlight');
                tokenObj.addClass('highlight');
                highlightBoard(movementHighlight, {x: x, y: y});
                setupActions(token);
                $('.action-container').addClass('toggled');
                setTimeout(function() {
                    setupActions(token);
                }, 800);
            }
        }
        
    }
    
}

function onReveal() {
    turn = -1;
    closeMenu('.action-container')
    socket.emit('turn', {
        action: 'reveal',
        x: selection.x,
        y: selection.y
    })
    setMessage('Submitting move...')
    clearBoard();
    highlightBoard(function(x, y, info) {
        if ((x == info.x && y == info.y)) { // || (x == info.x2 && y == info.y2)
            return {
                paint: true,
                class: 'movable'
            }
        }
        return {
            paint: false
        }
    },  {x: selection.x, y: selection.y})
    selection = null;
}

function onActivate() {
    
}

function onShuffle() {
    
}

function startRound() {
    closeMenu('.action-container')
    if (turn == playerId) {
        setMessage("It's your turn");
    }
    else
        setMessage("It's your opponents turn");
}

function processTurn(data) {
    setMessage('Processing turn...')
    if (data.action == 'move') {
        var token = getTokenAt(data.x1, data.y1);
        animate(function() {
            moveTo(token, data.x2, data.y2);
        }, 450);
    }
    else if (data.action == 'reveal') {
        var token = getTokenAt(data.x, data.y)
        if (data.revealed) {
            modify(token, {
                type: data.type,
                revealed: data.revealed,
                actionAvaliable: true
            });
        } else {
            modify(token, {
                type: data.type,
                revealed: data.revealed
            });
        }
        //TODO flash 'token'
    }
    clearBoard();
    $('.token').removeClass('highlight');
    socket.emit('confirm');
}

function run() {
    socket = io.connect()
    setMessage('Connecting to server...');
    socket.on('assigned-game', function(data) {
        playerId = data.slot;
        config = data.config;
        if (data.setup) {
            setMessage('Setting up game...');
            setState(states.Setup);
        }
        else
            setMessage('Waiting for opponent...');
    });
    socket.on('setup-game', function(data) {
        setMessage('Setting up game...');
        setState(states.Setup);
    });
    socket.on('game-begin', function(data) {
        turn = data.turn;
        setMessage(null);
        setState(states.Begin);
    });
    socket.on('game-place', function(data) {
        turn = data.turn;
        setState(states.Placing);
    })
    socket.on('player-disconnect', function(data) {
        animate(function() {
            $('.game').fadeOut(500);
            $('.title').removeClass('titleToggled');
            $('.info-box').removeClass('info-box-toggled');
            closeMenu('.placement-container');
        }, 500);
        setMessage('Your opponent has disconnected');
    })
    socket.on('token-placed', function(data) {
        if (data.owner != playerId) {
            createToken(data.owner, "TokenBlank", data.x, data.y);
        }
        setMessage('Finalizing turn...');
        socket.emit('confirm');
    })
    socket.on('game-turn', function(data) {
        turn = data.turn;
        setState(states.Playing);
    });
    socket.on('on-turn', function(data) {
        processTurn(data);
    });
}

$(document).ready(function() {
    $('#startButton').click(function() {
        $('#startButton').fadeOut(400);
        setTimeout(function() {
            run();
        }, 500);
    });
    $('.bind-reveal').click(function() {
        if (turn == playerId && !$(this).hasClass('action-disabled')) {
            onReveal();
        }
    });
    $('.bind-activate').click(function() {
        if (turn == playerId && !$(this).hasClass('action-disabled')) {
            onActivate();
        }
    });
    $('.bind-shuffle').click(function() {
        if (turn == playerId && !$(this).hasClass('action-disabled')) {
            onShuffle();
        }
    })
});