'use strict';

var CLIENT_ID = '50950290046-8evmug0398geq2q4nmfgrhn1gojt2mj9.apps.googleusercontent.com';
var SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Check if current user has authorized this application.
 */
function checkAuth() {
	gapi.auth.authorize(
		{
			'client_id': CLIENT_ID,
			'scope': SCOPES.join(' '),
			'immediate': true
		}, handleAuthResult);
}

/**
 * Handle response from authorization server.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
	var splashDiv = document.getElementById('splash-div');		
	var loginDiv = document.getElementById('login-div');
	var onlineDiv = document.getElementById('online-div');
	if (authResult && !authResult.error) {
		// Synchronize with Google Drive and unlock the main screen.
		syncDrive(unlockUserMode);
		onlineDiv.style.display = 'inline';
	}
	else {
		// Show auth UI, allowing the user to initiate authorization by
		// clicking authorize button.
		loginDiv.style.display = 'inline';
	}
}

/**
 * Initiate auth flow in response to user clicking authorize button.
 *
 * @param {Event} event Button click event.
 */
function handleAuthClick(event) {
	gapi.auth.authorize(
		{ client_id: CLIENT_ID, scope: SCOPES, immediate: false },
		handleAuthResult);
	return false;
}

var $page = new Audio('page.mp3');

/**
 * Unlock the main UI screen.
 */
function unlockUserMode() {
	loadIndices();
	loadFrontPage();
	loadBackPage();
	$page.play();	
	var item = document.getElementById("item");
	item.className += " flipped";
}

/**
 * Load Drive API client library.
 */
function syncDrive(callback) {
	gapi.client.load('drive', 'v2').then(function () {
		angular.injector(['ng', 'flipnote']).get('driveSync').syncDrive(callback);
	});
}

