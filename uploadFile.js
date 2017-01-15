gapi.client.drive.files.create({ "name" : "savefile.txt" }).execute(function(file) { console.log("Created file " + file.name + " id: " + file.id); });

function uploadFile(id, text)                                                                                                                                                          
{
  var auth_token = gapi.auth.getToken().access_token;

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  var metadata = { 
      description : 'savefile for my game',
      'mimeType': 'application/json'
  };  

  var multipartRequestBody =
    delimiter +  'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter + 'Content-Type: application/json\r\n\r\n' +
    text +
    close_delim;

  gapi.client.request
    ( { 
     'path': '/upload/drive/v3/files/'+id,
     'method': 'PATCH',
     'params': {'fileId': id, 'uploadType': 'multipart'},
     'headers': { 'Content-Type': 'multipart/form-data; boundary="' + boundary + '"', 'Authorization': 'Bearer ' + auth_token, },
     'body': multipartRequestBody 
     }).execute(function(file) { console.log("Wrote to file " + file.name + " id: " + file.id); }); 
}

