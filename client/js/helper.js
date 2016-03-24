/* global strings */

function openMenu(query) {
    $(query).removeClass('hidden');
    setTimeout(function() {
        $(query).removeClass('toggled');
    }, 100);
}

function closeMenu(query) {
    $(query).addClass('toggled');
    setTimeout(function() {
        $(query).addClass('hidden');
    }, 300);
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
    if (!token.revealed) {
        $('.bind-reveal').html(strings.Generic.reveal)
    } else {
        $('.bind-reveal').html(strings.Generic.hide)
    }
    if (token.actionAvaliable && token.revealed) {
        $('.bind-activate').removeClass('action-disabled').addClass('action-button');
    } else {
        $('.bind-activate').addClass('action-disabled').removeClass('action-button');
    }
    //TODO condition shuffle
    if (false) {
        $('.bind-shuffle').removeClass('action-disabled').addClass('action-button');
    } else {
        $('.bind-shuffle').addClass('action-disabled').removeClass('action-button');
    }
    openMenu('.action-container');
}

function $tile(x, y) {
    return $(".tile[data-x='" + x + "'][data-y='" + y + "']");
}

function $token(ref) {
    return $('.token[data-ref="'+ref+'"]');
}

function boardCoord(x, y) {
    return {
        'x': ((x*50) + 5),
        'y': ((y*50) + 5)
    }
}

function moveTo(obj, x, y) {
    obj.x = x;
    obj.y = y;
    var position = boardCoord(x, y);
    $token(obj.reference)
        .css('top', position.y)
        .css('left', position.x);
}