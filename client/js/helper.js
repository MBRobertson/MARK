/* global $, strings, bindActions */
var gameScale = 50;
var tokenOffset = 5;

function openMenu(query) {
    $(query).removeClass('hidden');
    setTimeout(function() {
        $(query).removeClass('toggled');
    }, 100);
}

function closeMenu(query) {
    $(query).addClass('toggled');
    $('.action-container>.action-sub-container').addClass('action-sub-container-post');
    setTimeout(function() {
        $('.action-sub-container-post').remove();
    }, 750);
    setTimeout(function() {
        if ($(query).hasClass('dynamic')) {
            $(query).remove()
        }
        else $(query).addClass('hidden');
    }, 300);
}

function createActionMenu(menuName, data) {
    $('.action-container>.action-sub-container').addClass('action-sub-container-post');
    setTimeout(function() {
        $('.action-sub-container-post').remove();
    }, 500);
    
    var container = $('<section class="container ' + menuName + ' dynamic action-sub-container action-sub-container-pre"></section>').appendTo('.action-container');
    
    if ('text' in data) {
        container.append('<p class="container-text">' + data.text + '</p>');
    }
    if ('buttons' in data) {
        var buttons = data.buttons
        for (var index = 0; index < buttons.length; index++) {
            var button = buttons[index];
            var classes = 'action-button';
            if ('other' in button) {
                classes = classes + ' ' + button.other
            }
            var buttonObj = container.append('<a class="'+classes+'">' + button.text + '</a>');
            buttonObj.mousedown(button.handler);
        }
    }
    
    setTimeout(function() {
        container.removeClass('action-sub-container-pre');
    }, 10);
}

function closeActionMenu() {
    $('.action-container>.action-sub-container').addClass('action-sub-container-post');
    setTimeout(function() {
        $('.action-sub-container-post').remove();
    }, 500);
}

function setMessage(message) {
    $('.info').addClass('info-post');
    if (!(message == "" || message == null)) {
        $('<h2 class="info info-pre">' + message + '</h2>').appendTo('.info-box');
        setTimeout(function() { $('.info-pre').removeClass('info-pre'); }, 10);
    }
    setTimeout(function() { $('.info-post').remove() }, 800);
}

function setupActions(token) {
    $('.action-container>.action-sub-container').addClass('action-sub-container-post');
    setTimeout(function() {
        $('.action-sub-container-post').remove();
    }, 500);
    var thing = $('.template>.action-init').clone().addClass('action-sub-container-pre').appendTo('.action-container');
    setTimeout(function() {
        thing.removeClass('action-sub-container-pre');
    }, 10);
    
    if (!token.revealed) {
        thing.find('.bind-reveal').html(strings.Generic.reveal)
    } else {
        thing.find('.bind-reveal').html(strings.Generic.hide)
    }
    thing.find('.bind-activate').html(strings[token.type].actionVerb);
    if (token.actionAvaliable && token.revealed) {
        thing.find('.bind-activate').removeClass('action-disabled').addClass('action-button');
    } else {
        thing.find('.bind-activate').addClass('action-disabled').removeClass('action-button');
    }
    //TODO condition shuffle
    if (token.type == 'TokenVIP') {
        thing.find('.bind-shuffle').removeClass('action-disabled').addClass('action-button').show();
    } else {
        thing.find('.bind-shuffle').addClass('action-disabled').removeClass('action-button').hide();
    }
    openMenu('.action-container');
    bindActions();
}

function $tile(x, y) {
    return $(".tile[data-x='" + x + "'][data-y='" + y + "']");
}

function $token(ref) {
    return $('.token[data-ref="'+ref+'"]');
}

function boardCoord(x, y) {
    return {
        'x': ((x*gameScale) + tokenOffset),
        'y': ((y*gameScale) + tokenOffset)
    }
}

function setScale(scale, offset) {
    gameScale = scale;
    tokenOffset = offset
}

function moveTo(obj, x, y) {
    obj.x = x;
    obj.y = y;
    var position = boardCoord(x, y);
    $token(obj.reference)
        .css('top', position.y)
        .css('left', position.x);
}