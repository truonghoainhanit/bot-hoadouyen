var express = require('express');
var app = express();
var http = require("http");
var server = require('http').Server(app);
var io = require('socket.io')(server);
var logger = require('morgan');
var bodyParser = require('body-parser');
var request = require('request');
var router = express();
var serverbot = http.createServer(app);
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var Promise = require('promise');
var ObjectId = require('mongodb').ObjectID;
var keySim = '';
var url = 'mongodb://localhost:27017/dbfb';
var idUserBot = '103369500263135';
var fs  = require("fs");
var arrayKeySimsimi = fs.readFileSync(__dirname + "/keySim.txt").toString().split('\n');

var admin_online = true;
var access_token = 'EAAYkZCAfAgtIBAHvv9GnM5iAO9OZAJXJZAeArtNjNBLXDKYUHOb2YkaR1SQLqHVF4xj8BHSEWapoRzQHBGj3FIvi6B8elSbEzXZC1G3WMrNXwMZCU0ad2ulEhzsqZATm0IZBTLboTLWb3rxiEmX10UZCmJ9H8zDFsF5IACzJ7qSWZBfupjBpLrVXI3oERSuk9kQlNyCghTIVISwZDZD';
server.listen(process.env.PORT || 3001);

io.on('connection', function (socket) {
    console.log('New connection');
    socket.emit('new connection', { room: socket.id, message: 'Xin chào pé là bot Altamedia' });
    socket.join('room-' + socket.id);
    socket.on('send message', function (message) {
        console.log(message.room);
        getChatSimsimi(message.message).then(
            function (message_return) {
                io.sockets.to('room-' + socket.id).emit('new message', { name: 'BOT', message: message_return.response });
            }
        ).catch();
    });

    socket.on('LoginFacebookBack', function (message) {
        access_token = message.accessToken;
        console.log('New access token: ' + access_token);
    });
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.listen(process.env.PORT || 3000, function(){

  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
  getKeySimsimi();
});

function getKeySimsimi()
{
    keySim = '';
	if(arrayKeySimsimi.length >0)
	{
	 keySim = arrayKeySimsimi[0];
	 console.log('Key Simsimi: ' + keySim);

	}
}
function removeKeySimsimiError()
{
	if(arrayKeySimsimi.length >0)
	{
		arrayKeySimsimi.splice(0, 1);
		var textSave = arrayKeySimsimi.join('\n').toString();
		console.log(textSave);
		fs.writeFile(__dirname + '/keySim.txt', textSave , function (err) {
		  if (err) {
			console.log('Remove keySim ' + keySim + ' errror:' + err);
		  } else {
			console.log('Remove keySim: ' + keySim);
			getKeySimsimi();
		  }
		})
	}
}

app.get('/status', (req, res) => {
    admin_online = !admin_online;
    res.send("Admin Online: " + admin_online);
});

app.get('/', (req, res) => {
    res.send("Server chạy ngon lành.");
});

var r;
function randomRun() {

    getAllPostFB(1).then(function (result) {
        if (result) {
            var rw = Math.round(Math.random() * (120000 - 60000)) + 60000;
            setTimeout(SelectCommentWait, rw);
        }

    }).catch();

    r = Math.round(Math.random() *  (600000 - 180000)) + 180000;
    console.log('Sẽ chạy lại trong: ' + r / 60000 + ' phút');
    setTimeout(randomRun, r);
}


setTimeout(randomRun, 1000);
setTimeout(countdownTime, 1000);


var timer = 0;
function countdownTime() {
    setTimeout(countdownTime, 1000);
    timer++;
    if (timer >= 30) {
        console.log('-------------------');
        timer = 0;
    }
}

app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === 'altamedia2017') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong validation token');
});

// Đoạn code xử lý khi có người nhắn tin cho bot
app.post('/webhook', function (req, res) {

    if (admin_online == false) {
        var entries = req.body.entry;
        for (var entry of entries) {
            var messaging = entry.messaging;
            for (var message of messaging) {
                var senderId = message.sender.id;
                if (message.message) {
                    // Nếu người dùng gửi tin nhắn đến
                    if (message.message.text) {
                        var text = message.message.text;
                        if (text == 'hi' || text == "hello") {
                            sendMessage(senderId, "Bot: " + 'Xin Chào' + typeof (admin_online));
                        }
                        else { sendMessage(senderId, "Bot: " + "Xin lỗi, câu hỏi của bạn chưa có trong hệ thống, chúng tôi sẽ cập nhật sớm nhất."); }
                    }
                }
            }
        }
    }
    res.status(200).send("OK");
});


function getAllPostFB(limitPost) {

    return new Promise(function (resolve, reject) {
        try {
            console.log('Run getAllPostFB');
            request.get({ url: 'https://graph.facebook.com/v2.9/me/feed?limit=' + limitPost + '&access_token=' + access_token }, function (err, httpResponse, body) {
                var obj = JSON.parse(body);
                if (httpResponse.statusCode == 200) {
                    if (obj.data != null) {
                        if (obj.data.length > 0) {
                            for (var i = 0; i < obj.data.length; i++) {
                                getAllCommentFB(obj.data[i].id);
                            }
                        }
                    }
                }
                else {
                    io.sockets.emit('LoginFacebookGo', { code: 'loginfb' });
                    console.log('Lỗi request getAllPostFB: ' + body);
                }
            })
            resolve(true);
        } catch (e) {
            reject(false);
        }
    })

}

function getAllCommentFB(idComment) {

    request.get({ url: 'https://graph.facebook.com/v2.9/' + idComment + '/comments?access_token=' + access_token }, function (err, httpResponse, body) {
        if (httpResponse.statusCode == 200) {
            var obj = JSON.parse(body).data;

            if (obj != null) {
                if (obj.length > 0) {
                    for (var i = 0; i < obj.length; i++) {
                        var objInsert = obj[i];
                        checkInsertDB(objInsert, objInsert.id).then(
                            function (returnCheck, objback) {
                                if (returnCheck.result == false) {
                                    //insert new
                                    MongoClient.connect(url, function (err, db) {
									console.log(err);
                                        var col = db.collection('WaitComment');
                                        col.insertOne({ comment: returnCheck.objback, parentid: returnCheck.id }).then(function (r) {
                                            assert.equal(1, r.insertedCount);
                                            console.log('Thêm vào table WaitComment 1: ' + returnCheck.objback.id + '_' + returnCheck.objback.message);
                                        });
                                    });
                                }
                            }).catch(function () {
                                console.log("Promise Rejected: getAllCommentFB, idComment" + idComment);
                            });

							getAllCommentFBChild(objInsert).then(function(){}).catch(function (error) { console.log(error) });
                        
                    }
                }
            }
        }
        else {
            console.log('Lỗi request getAllCommentFB');
        }
    })
}

function getAllCommentFBChild(objInsert){

	return new Promise(function (resolve, reject) {
        try {
            request.get({ url: 'https://graph.facebook.com/v2.9/' + objInsert.id + '/comments?access_token=' + access_token }, function (err, httpResponse, bodychild) {
                            if (httpResponse.statusCode == 200) {
                                var objchild = JSON.parse(bodychild).data;
                                if (objchild != null) {
                                    if (objchild.length > 0) {
                                        for (var i = 0; i < objchild.length; i++) {
                                            var objInsertChild = objchild[i];

                                            checkInsertDB(objInsertChild, objInsert.id).then(
                                                function (returnCheck, objback) {
                                                    if (returnCheck.result == false) {
                                                        //insertnew
                                                        MongoClient.connect(url, function (err, db) {
                                                            var col = db.collection('WaitComment');
                                                            col.insertOne({ comment: returnCheck.objback, parentid: returnCheck.id }).then(function (r) {
                                                                assert.equal(1, r.insertedCount);
                                                                console.log('Thêm vào table WaitComment 2: ' + returnCheck.objback.id + '_' + returnCheck.objback.message);
                                                            });
                                                        });
                                                    }
                                                }).catch(function (error) { console.log(error) });

                                        }
                                    }
                                }
                            }
                            else {
                                console.log('Lỗi request getAllCommentFB');
                            }
                        })
        } catch (e) {
            reject(e);
        }
    });
}

function checkInsertDB(objInsert, idComment) {
    return new Promise(function (resolve, reject) {
        try {
		if(objInsert.from.id != idUserBot)
		{
			MongoClient.connect(url, function (err, db) {
                var col = db.collection('AllComment');
                col.findOne({ id: objInsert.id }, function (err, document) {
                    if (document == null) {
                        //kiếm tra trong waitcomment có không
                        var colwaitcomment = db.collection('WaitComment');
                        colwaitcomment.findOne({ "comment.id": objInsert.id }, function (err, documentwaitcomment) {
                            if (documentwaitcomment == null) {
                                resolve({ result: false, objback: objInsert, id: idComment });
                            }
                            else {
                                resolve({ result: true, objback: objInsert, id: idComment });
                            }
                        });
                    }
                    else {
                        resolve({ result: true, objback: objInsert, id: idComment });
                    }
                    db.close();
                });
            });
		}
         else
		{
			resolve({ result: true, objback: objInsert, id: idComment });
		}		 
        } catch (e) {
            reject(e);
        }
    });
}

function SelectCommentWait() {
    console.log('Run SelectCommentWait');
    try {
        MongoClient.connect(url, function (err, db) {
            var col = db.collection('WaitComment');
            var options = {
                "limit": 1,
            }

            col.find({}, options).toArray(function (err, docs) {

                if (docs != null) {
                    if (docs.length == 1) {
                        commentFB(docs[0].comment, docs[0].parentid);
                    }
                }
                db.close();
            });

        });
    } catch (e) {
        console.log('Connect DB error' + e);
    }
}

function commentFB(objInsert, idComment) {
    getChatSimsimi(objInsert.message).then(
        function (message_return) {
            request.post('https://graph.facebook.com/v2.9/' + idComment + '/comments?access_token=' + access_token,
                { form: { message: objInsert.from.name + ' ' + message_return.response } },

                function (error, response, body) {

                    var objRequest = JSON.parse(body);

                    if (response.statusCode == 200) {
                        console.log('Trả lời .' + objInsert.from.name + '.: ' + message_return.response + ' | Body request: ' + body);

                        MongoClient.connect(url, function (err, db) {
                            var col = db.collection('AllComment');
                            try {
                                col.insertOne(objInsert);
                                console.log('Thêm vào table AllComment: ' + objInsert.id);
                            } catch (e) {
                                console.log('Thêm vào table AllComment bị lỗi: ' + e);
                            }
                            db.close();
                        });


                        MongoClient.connect(url, function (err, db) {
                            var col = db.collection('AllComment');
                            try {
                                col.insertOne(objRequest);
                                console.log('Thêm vào table AllComment comment vừa trả lời: ' + objRequest.id);
                            } catch (e) {
                                console.log('Thêm vào table AllComment comment vừa trả lời bị lỗi: ' + e);
                            }
                            db.close();
                        });


                        MongoClient.connect(url, function (err, db) {
                            var colWaitComment = db.collection('WaitComment');
                            try {
                                colWaitComment.deleteMany({ 'comment.id': objInsert.id });
                                console.log('Xóa khỏi table CommentWait id: ' + objInsert.id + '_' + objInsert.message);
                            } catch (e) {
                                console.log('Xóa khỏi table CommentWait bị lỗi: ' + e);
                            }
                            db.close();
                        });
                    }
                    else {
                        if (objRequest.error.code == 190) {
                            io.sockets.emit('LoginFacebookGo', { code: 'loginfb' });
                        }
                        console.log('Request comment facebook error: ' + body);
                    }
                });

        }
    ).catch(function () {
        console.log("Promise Rejected: commentFB, idComment: " + idComment);
    });
}


function getChatSimsimi(message_input) {
    return new Promise(function (resolve, reject) {
        console.log('Lấy trả lời simsimi: ' + message_input);
        if (message_input.trim() == '') {
            resolve({ response: "Em không xem hình được đâu hiu hiu!!!", id: "57289532", result: 100, msg: "OK." });
        }
        else {
            request.get({ url: 'http://sandbox.api.simsimi.com/request.p?key=' + keySim + '&lc=vi&ft=1.0&text=' + encodeURIComponent(message_input) }, function (err, httpResponse, body) {
                var obj = JSON.parse(body);
                if (obj.result == 100) {
                    resolve(obj);
                    console.log('Simsimi trả lời: ' + obj.response);
                }
                else {
				   if(body.indexOf('Trial app is expired') >=0)
				   {
					removeKeySimsimiError();
				   }
                    console.log('getChatSimsimi error, body:' + body);
                    reject('getChatSimsimi: ' + body);
                }
            })
        }
    });
}


// Gửi thông tin tới REST API để Bot tự trả lời
function sendMessage(senderId, message) {
    request({
        url: 'https://graph.facebook.com/v2.9/me/messages',
        qs: {
            access_token: "EAAYkZCAfAgtIBAKCvp09UcrdUMagQvrzcpQxknnHojy8nrBZCmuttceT7Aah2NZCRkuyCKu1QubowEiauI0yxnNGxviZCl5w4LH653DXkhHefW3HZBnIaQxdr8yI9iTYGmW6VOE7iDQXsglcU99rcbxZCQnmZB8c0rhecCx6nVq0AZDZD",
        },
        method: 'POST',
        json: {
            recipient: {
                id: senderId
            },
            message: {
                text: message
            },
        }
    });
}