'use strict';

$(".svg-container").mousedown(function()
{
	$(this).css("background-color", "#3f75cf");
});

$(".svg-container").mouseup(function()
{
	$(this).css("background-color", "#4285f4");
});

$('.svn-container').on('click', function(e)
{
	e.stopPropagation();
});

$(document).on('click', function (e)
{
	$(document).find('.svg-container').css("background-color", "#4285f4");
});

var $timeout = Math.floor(Date.now() / 1000);

$('.flip').swipeleft(function ()
{
	if ($(this).find('.item').hasClass('flipped'))
	{
	}
	else
	{
		var $newTimeout = Math.floor(Date.now() / 1000);

		if ($newTimeout > $timeout + 1)
		{
			$page.play();
			
			if ($(this).find('.item').hasClass('flipped'))
			{
				$(this).find('.item').removeClass('flipped');
				$(this).find('.input-front').blur();
			}
			else
			{
				$(this).find('.item').addClass('flipped');
				$(this).find('.input-back').blur();
			}

			$(this).find('textarea').blur();

			$timeout = Math.floor(Date.now() / 1000);
		}
	}
});

$('.flip').swiperight(function ()
{
	if ($(this).find('.item').hasClass('flipped'))
	{
		var $newTimeout = Math.floor(Date.now() / 1000);

		if ($newTimeout > $timeout + 1)
		{	
			$page.play();

			if ($(this).find('.item').hasClass('flipped'))
			{
				$(this).find('.item').removeClass('flipped');
				$(this).find('.input-front').blur();
			}
			else
			{
				$(this).find('.item').addClass('flipped');
				$(this).find('.input-back').blur();
			}

			$(this).find('textarea').blur();

			$timeout = Math.floor(Date.now() / 1000);
		}
	}
	else
	{
	}
});

$('textarea').each(function () {
	this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
}).on('input', function () {
	this.style.height = 'auto';
	this.style.height = (this.scrollHeight) + 'px';
});
