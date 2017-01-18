'use strict';

var dbFile;
var db = null;

angular.module('flipnote', [ ])
	.factory('driveSync', function ($q)
{
	var boundary = '-------314159265358979323846';
	var delimiter = "\r\n--" + boundary + "\r\n";
	var close_delim = "\r\n--" + boundary + "--";

	function createFolder() {
		return gapi.client.drive.files.insert(
		{
			'resource': {
				"title": flipNoteFolderName,
				"mimeType": "application/vnd.google-apps.folder"
			}
		});
	}

	function loadOrCreateFolder(folderName) {
		var query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
		return gapi.client.drive.files.list({ q: query }
		).then(function(output) {
			var directories = output.result.items;

			if (!directories.length) {
				return createFolder().then(function(output) {
					return output.result;
				});
			}
			else {
				for (var i = 0; i < directories.length; i++)
				{
					if (directories[i].title === folderName)
						return directories[i];
				}

				return createFolder().then(function(output) {
					return output.result;
				});
			}
		});
	}

	function loadOrCreateApplicationFolder() {
		var flipNoteFolderName = 'FlipNote_' + CLIENT_ID;	
		return loadOrCreateFolder(flipNoteFolderName);
	}

	function getFileIfExists(directory, filename) {
		var query = "'" + directory.id + "' in parents and title = '" + filename + "' and trashed = false";
		return gapi.client.drive.files.list({ q : query }).then(function(output) {
			var files = output.result.items;
			if (files.length) return files[0];
			return null;
		});
	}

	function waitForFileToBecomeActive(fileId) {
		var deferred = $q.defer();

		gapi.client.request({
			'path': '/drive/v2/files/' + fileId,
			'method': 'GET'
		}).then(function() {
			deferred.resolve();
		}, function() {
			setTimeout(function() {
				waitForFileToBecomeActive(fileId).then(function() {
					deferred.resolve();
				}, function(reason) {
					deferred.reject(reason);
				})
			}, 1000);
		});

		return deferred.promise;
	}

	function readFile(file) {
		var deferred = $q.defer();

		gapi.client.drive.files.get({
			fileId: file.id
		}).then(function(file) {
			var accessToken = gapi.auth.getToken().access_token;
			var xmlHttp = new XMLHttpRequest();
			xmlHttp.onreadystatechange = function() { 
				if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
					return deferred.resolve(xmlHttp.responseText);
			}
			xmlHttp.open("GET", file.result.downloadUrl, true);
			xmlHttp.setRequestHeader('Authorization', 'Bearer ' + accessToken);
			xmlHttp.send(null);

			return deferred.promise;
		}, function(reason) {
			deferred.reject(reason);
		});

		return deferred.promise;
	}

	function updateFile(fileData, file) {		
		return gapi.client.drive.files.get({ fileId: file.id }).then(function(output) {
			var deferred = $q.defer();

			var fileMetadata = {
				'title': output.result.title,
				'mimeType': output.result.mimeType,
				"parents": [{"id" : output.result.parents[0].id}]
			};

			var reader = new FileReader();
			reader.onload = function(e) {
				var contentType = fileData.type || 'application/octet-stream';

				var base64Data = btoa(reader.result);
				var multipartRequestBody =
					delimiter +
					'Content-Type: application/json\r\n\r\n' +
					JSON.stringify(fileMetadata) +
					delimiter +
					'Content-Type: ' + contentType + '\r\n' +
					'Content-Transfer-Encoding: base64\r\n' +
					'\r\n' +
					base64Data +
					close_delim;

				gapi.client.request({
					'path': '/upload/drive/v2/files/' + file.id,
					'method': 'PUT',
					'params': {'uploadType': 'multipart', 'alt': 'json'},
					'headers': {
					'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
					},
					'body': multipartRequestBody}).then(function(file) {
					return deferred.resolve(file.result);
				}, function(reason) {
					deferred.reject(reason);
				});
			};

			reader.readAsBinaryString(fileData);
	
			return deferred.promise;
		});
	}

	function createFile(fileData, filename, parentId) {
		var deferred = $q.defer();

		var reader = new FileReader();
		reader.onload = function (e) {
			var contentType = fileData.type || 'application/octet-stream';
			var metadata = {
				'title': filename,
				'mimeType': contentType,
				"parents": [{"id" : parentId}]
			};

			var base64Data = btoa(reader.result);
			var multipartRequestBody =
				delimiter +
				'Content-Type: application/json\r\n\r\n' +
				JSON.stringify(metadata) +
				delimiter +
				'Content-Type: ' + contentType + '\r\n' +
				'Content-Transfer-Encoding: base64\r\n' +
				'\r\n' +
				base64Data +
				close_delim;

			gapi.client.request({
				'path': '/upload/drive/v2/files',
				'method': 'POST',
				'params': {'uploadType': 'multipart'},
				'headers': {
					'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
				},
				'body': multipartRequestBody}).then(function(file) {
				return deferred.resolve(file.result);
			}, function(reason) {
				deferred.reject(reason);
			});
		};

		reader.readAsBinaryString(fileData);
	
		return deferred.promise;
	}
	
	function loadOrCreateDatabase(directory)
	{
		var filename = version + '.sqlite';
		return getFileIfExists(directory, filename).then(function(file) {
			if (file == null) {
				// Create a database
				var db = new SQL.Database();
				var sqlstr = "CREATE TABLE flipNoteDefault(pageIndex, isCurrent, contentFront, contentBack);";
				db.exec(sqlstr);
			
				var dbRawData = db.export();
				db.close();
				var blob = new Blob([dbRawData], { type: "application/octet-stream" });
				return createFile(blob, filename, directory.id).then(function(file) {
					waitForFileToBecomeActive(file.id);
					return { file: file, dbRawData: dbRawData };
				});
			}
			else
			{
				return readFile(file).then(function(result) {
					return { file: file, dbRawData: result };
				});
			}
		});
	}

    return {
        syncDrive: function () {
        	if (!db) {
				loadOrCreateApplicationFolder().then(function(directory) {
					loadOrCreateDatabase(directory).then(function(result) {
						dbFile = result.file;
						db = new SQL.Database(result.dbRawData);			
					});
				});
			}
			else {
				var dbRawData = db.export();
				var blob = new Blob([dbRawData], { type: "application/octet-stream" });
				updateFile(blob, dbFile).then(function(file) {
					waitForFileToBecomeActive(dbFile.id);
				});
			}
		}
	}
});

