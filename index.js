var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var md5 = require('MD5');
var db = require('./data.json');

app.get('/', function (req, res) {
    res.send('Hello World!')
});

function findObjectById(collection, id) {
    return db[collection].filter(function (auction) {
        return auction.id == id;
    })[0];
}

app.post('/push-tokens', function (req, res) {
    ['email', 'token'].map(function (key) {
        if (!req.body.hasOwnProperty(key)) {
            res.status(400);
            res.send('Missing key: ' + key);
        }
    });

    var friend = db.friends.filter(function (friend) {
        return friend.email == req.body.email;
    })[0];
    if (!friend) {
        res.status(404);
        res.send('No friend for email: ' + req.body.email);
    }

    var pushToken = db.pushTokens.filter(function(pushToken){
        return pushToken.userId == friend.id;
    })[0];
    if (pushToken) {
        pushToken.token = req.body.token;
    } else {
        db.pushTokens.push({
            userId: friend.id,
            token: req.body.token
        });
    }
    pushToken = db.pushTokens.filter(function(pushToken){
        return pushToken.userId == friend.id;
    })[0];

    res.send(pushToken);
});

app.get('/auctions', function (req, res) {
    res.send(db.auctions);
});

app.get('/auctions/:id', function (req, res) {
    var auction = findObjectById('auctions', req.params.id);
    auction ? res.send(auction) : res.sendStatus(404);
});

app.get('/friends', function (req, res) {
    var friends = db.friends.map(function (friend) {
        friend.imageUrl = 'http://www.gravatar.com/avatar/' + md5(friend.email) + '.jpg?s=500';
        return friend;
    });
    res.send(friends);
});

app.post('/begs', function (req, res) {
    ['auctionId', 'friendsId'].map(function (key) {
        if (!req.body.hasOwnProperty(key)) {
            res.status(400);
            res.send('Missing key: ' + key);
        }
    });

    var auction = findObjectById('auctions', req.body.auctionId);
    if (!auction) {
        res.status(404);
        res.send('No auction for id: ' + req.body.auctionId);
        return;
    }

    req.body.friendsId.map(function (friendId) {
        var friend = findObjectById('friends', friendId);
        if (!friend) {
            res.status(404);
            res.send('No friend for id: ' + friendId);
        }
    });

    req.body.friendsId.map(function (friendId) {
        for (var i = 0; i < db.begs.length; i++) {
            var beg = db.begs[i];
            if (beg.auctionId == req.body.auctionId && beg.friendId == friendId) {
                return;
            }
        }
        db.begs.push({
            id: db.begs.length,
            auctionId: req.body.auctionId,
            friendId: friendId
        });
    });

    var begs = db.begs.filter(function (beg) {
        return beg.auctionId == req.body.auctionId;
    });

    res.send(begs);
});


var server = app.listen(process.env.PORT || 8080, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port)
});

