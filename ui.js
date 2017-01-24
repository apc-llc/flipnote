'use strict';

$(".svg-container").mousedown(function()
{
	$(this).css("background-color", "#3f75cf");
});

$(".svg-container").mouseup(function()
{
	$(this).css("background-color", "#4285f4");
});

$(".svg-container").click(function()
{
	var $this = $(this);

	if ($(document).find('.flip').find('.item').hasClass('flipped'))
	{
		$page.play();
		$(document).find('.flip').find('.item').removeClass('flipped');
	}
	$(document).find('.flip').find('.front').fadeOut(500, function() {	
		if ($this.parents('.record-selector-close').length)
		{
			pages.splice(currentPageIndex, 1);
			if (currentPageIndex == pages.length)
				currentPageIndex--;

			// If was the last record, insert empty record.
			if (!pages.length)
			{
				pages.length = 0;
				pages.push({ front : '', back : '' });
				currentPageIndex = 0;
			}

			angular.injector(['ng', 'flipnote']).get('driveSync').syncDrive();
		}
		else if ($this.parents('.record-selector-prev').length)
		{
			currentPageIndex = Math.max(0, currentPageIndex - 1);
		}	
		else if ($this.parents('.record-selector-next').length)
		{
			currentPageIndex = Math.min(currentPageIndex + 1, pages.length - 1);
		}
		else if ($this.parents('.record-selector-add').length)
		{
			// Add new page
			pages.splice(currentPageIndex + 1, 0, { front : '', back : '' });
			currentPageIndex++;
		}	

		loadIndices();
		loadFrontPage();
		loadBackPage();

		// Enforce textareas to redraw, otherwise they will use
		// old text height setting.
		$('.input-front').hide().trigger('change').show();
		$('.input-back').hide().trigger('change').show();
	}).fadeIn(500);
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

/*$('textarea').each(function () {
	this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
}).on('input', function () {
	this.style.height = 'auto';
	this.style.height = (this.scrollHeight) + 'px';
});*/

function loadIndices() {
	var $curr = $(document).find('.record-selector-index');
	var $prev = $(document).find('.record-selector-prev-index');
	var $next = $(document).find('.record-selector-next-index');

	$curr.text(currentPageIndex + 1);
	$prev.text("");
	$next.text("");

	if (currentPageIndex > 0)
		$prev.text(currentPageIndex);
	if (currentPageIndex < pages.length - 1)
		$next.text(currentPageIndex + 2);
}

function loadFrontPage() {
	document.getElementById("input-front").value = pages[currentPageIndex].front;
}

function loadBackPage() {
	document.getElementById("input-back").value = pages[currentPageIndex].back;
}

function saveFrontPage() {
	pages[currentPageIndex].front = document.getElementById("input-front").value;
	angular.injector(['ng', 'flipnote']).get('driveSync').syncDrive();
}

function saveBackPage() {
	pages[currentPageIndex].back = document.getElementById("input-back").value;
	angular.injector(['ng', 'flipnote']).get('driveSync').syncDrive();
}

