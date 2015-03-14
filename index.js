var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var md5 = require('MD5');
var db = require('./data.json');

var UrbanAirshipPush = require('urban-airship-push');
var config = {
    key: 'Yori1SnMSb29IuW559md_w',
    secret: 'R1ynS3rSQnet_mSJg0Qttg',
    masterSecret: 'XKjWkn2nSquZgG4CzTZomQ'
};
var urbanAirship = new UrbanAirshipPush(config);

app.get('/', function (req, res) {
    res.send('Hello World!')
});

function findObjectById(collection, id) {
    return db[collection].filter(function (auction) {
        return auction.id == id;
    })[0];
}

app.post('/push-tokens', function (req, res) {
    ['email', 'token', 'platform'].map(function (key) {
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

    var pushToken = db.pushTokens.filter(function (pushToken) {
        return pushToken.userId == friend.id;
    })[0];
    if (pushToken) {
        pushToken.token = req.body.token;
    } else {
        db.pushTokens.push({
            userId: friend.id,
            token: req.body.token,
            platform: req.body.platform
        });
    }
    pushToken = db.pushTokens.filter(function (pushToken) {
        return pushToken.userId == friend.id;
    })[0];

    console.log('\nRecieved push token: ' + req.body.token + ' email: ' + req.body.email + ' user id: ' + friend.id + ' platform: ' + req.body.platform);

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
    ['userId', 'auctionId', 'friendIds'].map(function (key) {
        if (!req.body.hasOwnProperty(key)) {
            res.status(400);
            res.send('Missing key: ' + key);
        }
    });

    var beggar = findObjectById('friends', req.body.userId);

    var auction = findObjectById('auctions', req.body.auctionId);
    if (!auction) {
        res.status(404);
        res.send('No auction for id: ' + req.body.auctionId);
        return;
    }

    req.body.friendIds.map(function (friendId) {
        var friend = findObjectById('friends', friendId);
        if (!friend) {
            res.status(404);
            res.send('No friend for id: ' + friendId);
        }
    });

    req.body.friendIds.map(function (friendId) {
        for (var i = 0; i < db.begs.length; i++) {
            var beg = db.begs[i];
            if (beg.auctionId == req.body.auctionId && beg.friendId == friendId) {
                return;
            }
        }
        db.begs.push({
            id: db.begs.length,
            auctionId: req.body.auctionId,
            friendId: friendId,
            beggarId: req.body.userId
        });
    });

    var begs = db.begs.filter(function (beg) {
        return beg.auctionId == req.body.auctionId;
    });

    req.body.friendIds.map(function (friendId) {
        console.log('\nTrying to push to user with id: ' + friendId);

        var pushToken = db.pushTokens.filter(function (pushToken) {
            return pushToken.userId == friendId;
        })[0];

        if (pushToken) {
            console.log('Push token found for user with id: ' + friendId);

            var audience;
            var deviceTypes;
            if (pushToken.platform == 'android') {
                audience = {"android_channel": pushToken.token};
                deviceTypes = ["android"];
            }

            var pushInfo = {
                device_types: deviceTypes,
                audience: audience,
                notification: {
                    alert: 'Give ' + auction.price/100.0 + 'zł to ' + beggar.name + ' for ' + auction.title + '?',
                    android: {
                        extra: {
                            request : JSON.stringify({
                                beggar: beggar,
                                donor: findObjectById('friends', friendId),
                                auction: auction,
                                numberOfDonors: req.body.friendIds.length
                            })
                        }
                    }
                }
            };

            console.log('Pushing stuff to user with id: ' + friendId + ' platform: ' + pushToken.platform);
            urbanAirship.push.send(pushInfo, function (err, data) {
            });
        } else {
            console.log('No push token for user with id: ' + friendId);
        }
    });

    res.status(200);
    res.send(begs);
});


app.post('/donations', function (req, res) {
    //donatorId
    //auctionId
    //amount

    //var begs = db.begs.filter(function (beg) {
    //    return beg.auctionId == req.body.auctionId;
    //});
    //
    //for (var i = 0; i < begs.length; ++i) {
    //    var beg = begs[i];
    //    if (beg.friendId == req.body.donatorId) {
    //        beg.donated = true;
    //    }
    //}



    var pushInfo = {
        "audience": "all",
        "notification": {
            "alert": "Alek Piotrowski has founded your item."
        },
        "device_types" : "all"
    };

    urbanAirship.push.send(pushInfo, function (err, data) {
        console.log(err);
        console.log(data    );
    });

    console.log('lol');

    res.sendStatus(200);
});


var server = app.listen(process.env.PORT || 8080, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port)
});

