'use strict';

var currentPageIndex = 0;
var pages = [ { front : '', back : '' } ];

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
				if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
					var buf = xmlHttp.response;
					var bufView = new Uint8Array(buf);
					return deferred.resolve(bufView);
				}
			}
			xmlHttp.open("GET", file.result.downloadUrl, true);
			xmlHttp.responseType = "arraybuffer";
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
				db.run("INSERT INTO flipNoteDefault VALUES (0, 1, '', '');");
			
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
	
	function importFromDatabase(pages, db) {
		pages.length = 0;
        var stmt = db.prepare("SELECT isCurrent, contentFront, contentBack FROM flipNoteDefault ORDER BY pageIndex");
       	var seenCurrent = false;
        for (var pageIndex = 0; stmt.step(); pageIndex++)
        {
        	var row = stmt.getAsObject();
        	pages.push({ front: row.contentFront, back: row.contentBack });
        	if (row.isCurrent)
        	{
        		if (seenCurrent) {
		        	console.error("Multiple current pages set in the database (must be exactly one)");
        		}
        		currentPageIndex = pageIndex;
        		seenCurrent = true;
        	}
        }
        
        if (pages.length == 0) {
        	console.error("No pages in the database (must be at least one)");
        }
        if (!seenCurrent) {
        	console.error("No current page set in the database (must be exactly one)");
        }
	}

    return {
        syncDrive: function (callback) {
        	if (!db) {
				loadOrCreateApplicationFolder().then(function(directory) {
					loadOrCreateDatabase(directory).then(function(result) {
						dbFile = result.file;
						db = new SQL.Database(result.dbRawData);			
						importFromDatabase(pages, db);

						callback();
					});
				});
			}
			else {
				db = new SQL.Database();
				var sqlstr = "CREATE TABLE flipNoteDefault(pageIndex, isCurrent, contentFront, contentBack);";
				db.exec(sqlstr);
		        for (var pageIndex = 0; pageIndex < pages.length; pageIndex++)
		        {
		        	var stmt = db.prepare("INSERT INTO flipNoteDefault VALUES (?, ?, ?, ?)");
					stmt.run([ pageIndex, pageIndex == currentPageIndex ? 1 : 0,
						pages[pageIndex].front, pages[pageIndex].back ]);
				}
				var dbRawData = db.export();
				var blob = new Blob([dbRawData], { type: "application/octet-stream" });
				updateFile(blob, dbFile).then(function(file) {
					waitForFileToBecomeActive(dbFile.id);
				});
			}
		}
	}
});

