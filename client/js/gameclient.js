/* global io */
/* global tokens */
/* global strings */
/* global setMessage */
/* global openMenu */
/* global closeMenu, createActionMenu, closeActionMenu, gameScale, tokenOffset */
/* global $token, $tile, boardCoord, moveTo, setupActions, $, setScale */
var socket = null;
var states = {
    "Waiting": 0,
    "Setup": 1,
    "Begin": 2,
    "Placing": 3,
    "Playing": 4,
    "Confirmation": 8,
    "Targeting": 9,
    "Shuffling": 10
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
    tokenList = [];
    $('.placement-sub-container').empty();
    for (var i = 0; i < config.defaultTokens.length; i++) {
        var x = (5 + (gameScale * i)).toString();
        $('.template>.'+config.defaultTokens[i]).clone()
            .appendTo('.placement-sub-container')
            .css('top', 5+'px')
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
    else if (state == states.Targeting) {
        //TODO TARGETING INFORMATION
        createActionMenu('temp-container', {
            text: 'Select a target to ' + strings[selection.type].actionVerb.toLowerCase(),
            buttons: [
                { 
                    text: 'Cancel',
                    handler: function() { 
                        //setState(states.Playing); 
                        clearBoard();
                        state = states.Playing;
                        highlightBoard(movementHighlight, {x: selection.x, y: selection.y});
                        setupActions(selection);
                    }
                }
            ]
        });
        highlightBoard(function(x, y, info) {
            if (info.tileInRange(x, y, tokenList))
                return { paint: true, class: 'targetable' }
        }, selection);
        highlightBoard(function(x, y, info) {
            if (info.tileTargetable(x, y, tokenList))
                return { paint: true, class: 'selectable' }
        }, selection);
    }
    else if (state == states.Shuffling) {
        highlightBoard(function(x, y, info) {
            var token = getTokenAt(x, y);
            if (token != null && token != selection) {
                if (token.owner == playerId && !token.revealed) {
                    return { paint: true, class: 'selectable' }
                }
            }
        });
        
        createActionMenu('temp-container', {
            text: 'Select a target to swap positions with',
            buttons: [
                { 
                    text: 'Cancel',
                    handler: function() { 
                        //setState(states.Playing); 
                        clearBoard();
                        state = states.Playing;
                        highlightBoard(movementHighlight, {x: selection.x, y: selection.y});
                        setupActions(selection);
                    }
                }
            ]
        });
    }
    else if (state == states.Confirmation) {
        highlightBoard(function(x, y, info) {
            if (info.tileInRange(x, y, tokenList)) {
                return {
                    paint: true,
                    class: 'targetable'
                }
            } else {
                return {
                    paint: false
                }
            }
        }, selection);
        //SHOW CONFIRMATION DIALOG
        $('.action-container>.action-sub-container').addClass('action-sub-container-post');
        setTimeout(function() {
            $('.action-sub-container-post').remove();
        }, 500);
        var thing = $('.template>.action-confirm').clone().addClass('action-sub-container-pre').appendTo('.action-container');
        setTimeout(function() {
            thing.removeClass('action-sub-container-pre');
        }, 10);
        thing.find('.confirm-text').html(strings[selection.type].confirmation);
        thing.find('.bind-confirm').html(strings[selection.type].actionVerb).click(function() {
            finalizeAction(selection);
        });
        thing.find('.bind-cancel').click(function() {
            $('.action-container>.action-sub-container').addClass('action-sub-container-post');
            setTimeout(function() {
                $('.action-sub-container-post').remove();
            }, 500);
            //setState(states.Playing);
            var tokenObj = $token(selection);
            clearBoard();
            state = states.Playing;
            highlightBoard(movementHighlight, {x: selection.x, y: selection.y});
            //$('.action-container').addClass('toggled');
            setupActions(selection);
        });
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
    log(logToken(token) + ' placed at ' + logPosition(x, y));
    return token;
}

function modify(token, data) {
    var obj = $token(token.reference);
    if ("type" in data && data.type !== undefined) {
        var newType = data['type'];
        token.type = newType;
        var oldType = obj.data('type');
        obj.attr("data-type", newType);
        obj.addClass('flip'); 
        setTimeout(function() { 
            obj.removeClass('flip');
            obj.html($('.template>.'+newType).html());
            obj.removeClass(oldType);
            obj.addClass(newType);
        }, 300);
        
    }
    if ("revealed" in data && data.revealed !== undefined) {
        token.revealed = data['revealed'];
        obj.addClass('flip')
        if (token.revealed) {
            setTimeout(function() { 
                obj.removeClass('flip');
                obj.removeClass('fogged');
            }, 300);
        } else {
            setTimeout(function() { 
                obj.addClass('fogged');
                obj.removeClass('flip');
            }, 300);
            if (token.owner != playerId) {
                modify(token, {type: 'TokenBlank'});
            }
        }
    }
    if ("actionAvaliable" in data && data.actionAvaliable !== undefined) {
        token.actionAvaliable = data['actionAvaliable'];
        if (token.revealed && !token.actionAvaliable) {
            obj.addClass('fatigued');
        } else {
            obj.removeClass('fatigued');
        }
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
            if (data == null) data = { paint: false };
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
        .removeClass('highlight')
        .removeClass('targetable');
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

function finalizeShuffle(vip, target) {
    turn = -1;
    closeMenu('.action-container');
    socket.emit('turn', {
        action: 'shuffle',
        x1: vip.x,
        y1: vip.y,
        x2: target.x,
        y2: target.y
    });
    
    setMessage('Submitting move...')
    clearBoard();
}

function finalizeAction(token, target) {
    turn = -1;
    closeMenu('.action-container')
    if (target != null) {
        socket.emit('turn', {
            action: 'activate',
            x1: token.x,
            y1: token.y,
            x2: target.x,
            y2: target.y
        });
    } else {
        socket.emit('turn', {
            action: 'activate',
            x1: token.x,
            y1: token.y
        });
    }
    setMessage('Submitting move...')
    clearBoard();
    highlightBoard(function(x, y, info) {
        if ((x == info.x && y == info.y)) { // || (x == info.x2 && y == info.y2)
            return {
                paint: true,
                class: 'targetable'
            }
        }
        return {
            paint: false
        }
    },  {x: selection.x, y: selection.y, x2: selection.x, y2: selection.y})
    selection = null;
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
    
    var valid = true;
    if (getTokenAt(x, y) != null) {
        if (getTokenAt(x, y).owner == playerId)
            return true;
    }
    
    if (valid || (x == info.x && y == info.y)) {
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
                    //setTimeout(function() {
                        setupActions(token);
                    //}, 800);
                }
            } else {
                //NEW SELECTION
                selection = token
                $('.action-container>.action-sub-container').remove()
                $('.token').removeClass('highlight');
                tokenObj.addClass('highlight');
                highlightBoard(movementHighlight, {x: x, y: y});
                $('.action-container').addClass('toggled');
                setupActions(token);
                //setTimeout(function() {
                //    setupActions(token);
                //}, 800);
            }
        }
        else {
            if (state == states.Playing && selection != null) {
                if (distance(x, y, selection.x, selection.y) < 2) {
                    finalizeMovement(selection, x, y);
                }
            }
        }
        
    }
    else if (turn == playerId && state == states.Targeting) {
        if (selection.tileTargetable(x, y, tokenList)) {
            finalizeAction(selection, token);
        }
    }
    else if (turn == playerId && state == states.Shuffling) {
        if (!token.revealed && token.owner == playerId && selection.type == "TokenVIP") {
            finalizeShuffle(selection, token)
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
    if (selection != null) {
        clearBoard();
        if (selection.targetable)
            setState(states.Targeting);
        else 
            setState(states.Confirmation);
    }
}

function onShuffle() {
    if (selection != null)
    {
        clearBoard();
        setState(states.Shuffling);
    }
    
}

function startRound() {
    clearBoard();
    //$('.token').removeClass('highlight');
    //selection = null;
    log('---');
    closeMenu('.action-container')
    if (turn == playerId) {
        setMessage("It's your turn");
    }
    else
        setMessage("It's your opponents turn");
}

function purgeCaptured() {
    var purgeList = [];
    for (var index = 0; index < tokenList.length; index++) {
        if (tokenList[index].captured) {
            var token = tokenList[index]
            var tokenObj = $token(token.reference);
            tokenObj.remove();
            purgeList.push(token);
        }
    }
    for (var index = 0; index < purgeList.length; index++) {
        tokenList.splice(tokenList.indexOf(purgeList[index]), 1);
    }
}

function processTurn(data) {
    setMessage('Processing turn...')
    if (data.action == 'move') {
        var token = getTokenAt(data.x1, data.y1);
        animate(function() {
            moveTo(token, data.x2, data.y2);
        }, 450);
        log(logToken(token) + ' moved from ' + logPosition(data.x1, data.y1) + ' to ' + logPosition(data.x2, data.y2));
    }
    else if (data.action == 'reveal') {
        var token = getTokenAt(data.x, data.y)
        if (data.revealed) {
            modify(token, {
                type: data.type,
                revealed: data.revealed,
                actionAvaliable: true
            });
            log(logToken(token) + ' was revealed');
        } else {
            modify(token, {
                type: data.type,
                revealed: data.revealed,
                actionAvaliable: false
            });
            log(logToken(token) + ' was hidden');
        }
        //TODO flash 'token'
    }
    else if (data.action == 'shuffle') {
        if (data.player == playerId) {
            var vip = getTokenAt(data.vipx, data.vipy);
            var token = getTokenAt(data.x, data.y);
            
            moveTo(vip, data.x, data.y);
            moveTo(token, data.vipx, data.vipy);
            
            log('Swapped positions of ' + logToken(vip) + logPosition(data.vipx, data.vipy) + ' and ' + logToken(token) + logPosition(data.x, data.y));
        } else {
            log('Enemy VIP was swapped from ' + logPosition(data.vipx, data.vipy));
            
            var t = getTokenAt(data.vipx, data.vipy);
            var tobj = $token(t.reference);
            
            console.log(t);
            console.log(tobj);
            
            tobj.addClass('log-view');
            
            setTimeout(function() {
                tobj.removeClass('log-view');
            }, 600);
        }
    }
    else if (data.action == 'chain') {
        for (var i = 0; i < data.steps.length; i++) {
            var action = data.steps[i];
            if (action.action == 'animate') {
                var token = getTokenAt(action.x, action.y)
                if (action.animation == 'explode') {
                    var tokenObj = $token(token.reference);
                    tokenObj.addClass('block-anim').addClass('explode-anim');
                    log(logToken(token) + ' exploded at ' + logPosition(action.x, action.y));
                }
            } else if (action.action == 'capture')
            {
                var token = getTokenAt(action.x, action.y)
                token.captured = true;
                var tokenObj = $token(token.reference)
                if (!tokenObj.hasClass('block-anim'))
                    tokenObj.addClass('block-anim').addClass('capture-anim');
                log(logToken(token) + ' was captured at ' + logPosition(action.x, action.y));
            } else if (action.action == 'move') {
                var token = getTokenAt(action.x1, action.y1);
                animate(function() {
                    moveTo(token, action.x2, action.y2);
                }, 450);
                log(logToken(token) + ' moved from ' + logPosition(action.x1, action.y1) + ' to ' + logPosition(action.x2, action.y2));
            } else if (action.action == 'fatigue') {
                var token = getTokenAt(action.x, action.y);
                token.actionAvaliable = false;
                modify(token, {
                    actionAvaliable: false
                });
                log(logToken(token) + ' was activated');
            }
        }
        setTimeout(function() {
            purgeCaptured();
        }, 500)
        
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
    });
    socket.on('game-win', function(data) {
        var winner = data.winner;
        setTimeout(function() {
            $('.game').fadeOut(500);
            $('.title').removeClass('titleToggled');
            $('.info-box').removeClass('info-box-toggled');
            closeMenu('.placement-container');
        }, 1500);
        if (winner == 0) {
            setMessage('The game was a draw!');
            log('')
            log('The game was a draw');
        } else if (winner == playerId) {
            setMessage('You won the game!');
            log('')
            log('You won the game!');
        } else {
            setMessage('You lost the game!');
            log('')
            log('You lost the game!');
        }
    })
    socket.on('player-disconnect', function(data) {
        animate(function() {
            $('.game').fadeOut(500);
            $('.title').removeClass('titleToggled');
            $('.info-box').removeClass('info-box-toggled');
            closeMenu('.placement-container');
        }, 500);
        setMessage('Your opponent has disconnected');
    });
    socket.on('token-placed', function(data) {
        if (data.owner != playerId) {
            createToken(data.owner, "TokenBlank", data.x, data.y);
        }
        setMessage('Finalizing turn...');
        socket.emit('confirm');
    });
    socket.on('game-turn', function(data) {
        turn = data.turn;
        setState(states.Playing);
    });
    socket.on('on-turn', function(data) {
        processTurn(data);
    });
}

function bindActions() {
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
}

$(document).ready(function() {
    $('#startButton').click(function() {
        $('#startButton').fadeOut(400);
        setTimeout(function() {
            run();
        }, 500);
    });
    $('#close-log').click(function() {
        $('.combat-log').addClass('combat-log-hidden');
    });
    $('#open-log').click(function() {
        $('.combat-log').removeClass('combat-log-hidden');
    })
    bindActions();
    
    if ($(window).width() < 500) {
        if (gameScale != 30) {
            setScale(30, 2)
        }
    } else {
        if (gameScale != 50) {
            setScale(50, 5);
        }
    }
    
    $(document).resize(function() {
        if ($(window).width() < 500) {
            if (gameScale != 30) {
                setScale(30, 2)
            }
        } else {
            if (gameScale != 50) {
                setScale(50, 5);
            }
        }
    })
});


//Combat Log Functions
function log(string) {
    var element = $('<span class="log">' + string + '</span>').appendTo('.log-container');
    element.find('.position-reference').mouseenter(function() {
        clearHighlights();
        var x = $(this).data('x');
        var y = $(this).data('y');
        $tile(x, y).addClass('log-view');
    }).mouseleave(function() {
        clearHighlights();
    })
    
    element.find('.token-reference').mouseenter(function() {
        clearHighlights();
        var ref = $(this).data('ref');
        $token(ref).addClass('log-view');
    }).mouseleave(function() {
        clearHighlights();
    })
}

function logPosition(x, y) {
    return '<span class="log-int position-reference" data-x="'+ x +'" data-y="' + y + '">('+x+', '+y+')</span>';
}

function logToken(token) {
    var type = strings[token.type].name;
    var append = "";
    if (token.owner != playerId)
        append += "ref-enemy";
    else
        append += "ref-friend";
    return '<span class="log-int token-reference '+append+'" data-ref="' + token.reference + '">(' + type + ')</span>';
}

function clearHighlights() {
    $('.token').removeClass('log-view');
    $('.tile').removeClass('log-view');
}