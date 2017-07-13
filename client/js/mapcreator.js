/* global $, config */

function genBoard(width, height) {
    $('.board').remove();
    $('.game').append('<table class="board"></table>');
    for (var y = 0; y < height; y++) {
        var element = "";
        for (var x = 0; x < width; x++) {
            element = element + '<td class="tile " data-x="'+x+'" data-y="'+y+'"></td>';
        }
        element = '<tr>' + element + '</tr>';
        $('.board').append(element);
    }
    $('.tile').mousedown(function() {
        //On tile click
        $(this).toggleClass('tileBlocked');
    });
}

genBoard(10, 10);