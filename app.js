
require('enum').register();

// built on Connect, express provides a clean HTTPS interface
var express = require('express');
var https = require('https');
var http = require('http');
var bodyParser = require('body-parser')
var validator = require('express-validator');

//var serveStatic = require('serve-static')

// JWT (JSON Web Token)  "jot"  encode and decode module
// https://auth0.com/blog/2014/01/27/ten-things-you-should-know-about-tokens-and-cookies/
// https://www.npmjs.org/package/jwt-simple
//http://www.sitepoint.com/using-json-web-tokens-node-js/
var jwt = require('jwt-simple');

// file system access
var fs = require('fs');



// settings and database initialization
var settings = require('./settings');

// account functions are all managed in this file
var accountHandler = require('./request_handlers/accountHandler');
var siteHandler = require('./request_handlers/siteHandler');

var Account = require('./models/account').Account;


// Create the server
var options = { key: fs.readFileSync(settings.SSL_KEY), cert: fs.readFileSync(settings.SSL_CERT), passphrase: settings.SSL_PASSPHRASE };
var app = express();

app.use( express.static(__dirname + '/public') );
app.use( bodyParser() );
app.use( validator() );


var isAuthenticated = function(req, res, next) { 
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    // console.log(token);
    if (token) {
      try {
        var decoded = jwt.decode(token, settings.JWT_SECRET);
        if (decoded.exp <= Date.now()) {
            //res.end('Access token has expired', 400);
            res.end('{ "status" : "error", "description" : "expired token" }');
        } else {
            Account.findOne({ session: decoded.iss }, function(err, account) {
                
                // TODO: some method for session management to require reauth
                
                if(null!=account) {      
                    global.G_account = account;
                    return next(); 
                } else {
                    res.end('{ "status" : "error", "description" : "Account not found" }');
                    //req.session = null;
                }       
            });                        
        }
    
      } catch (err) {
        res.end('{ "status" : "error", "description" : "not authenticated" }');
      }
    } else {
      res.end('{ "status" : "error", "description" : "not authenticated" }');
    }
};


var isOptionallyAuthenticated = function(req, res, next) {    
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    if (token) {
        isAuthenticated(req, res, next);
    } else {
        next();
    }
};


app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "x-access-token, Content-Type"); //X-Requested-With");
  next();
});


// Echo
app.all('/jsonecho', accountHandler.jsonecho);

// Account System
app.post('/account/create', accountHandler.createAccount);
app.post('/account/login', accountHandler.login);
app.all('/account/logout', isOptionallyAuthenticated, accountHandler.logout);
app.all('/account/status', isAuthenticated, accountHandler.getStatus);
app.post('/account/update', isAuthenticated, accountHandler.updateAccount);
app.post('/account/password/reset/step1', accountHandler.resetMyPasswordStepOne);
app.post('/account/password/reset/step2', accountHandler.resetMyPasswordStepTwo);

app.post('/account/delete', isAuthenticated, accountHandler.deleteAccount);
app.post('/account/activate', isAuthenticated, accountHandler.activateAccount);
app.post('/account/deactivate', isAuthenticated, accountHandler.deactivateAccount);

// TOSBack2

app.post('/site/suggest', isOptionallyAuthenticated, siteHandler.suggest);
app.post('/site/suggested', isAuthenticated, siteHandler.listSuggested);
app.post('/site/check', isAuthenticated, siteHandler.checkSite);
app.post('/site/save', isAuthenticated, siteHandler.findSite, siteHandler.saveSiteToRuleFile);
// removes a doc, and a site if it is the only doc
app.post('/site/removesuggestion', isAuthenticated, siteHandler.findSite, siteHandler.removeSuggestion);


app.post('/site/analyze', isAuthenticated, siteHandler.findSite, siteHandler.analyze);

app.post('/site/managed', isAuthenticated, siteHandler.listUserManaged);
app.post('/site/claim', isAuthenticated, siteHandler.findSite, siteHandler.claimSite);
app.post('/site/release', isAuthenticated, siteHandler.findSite, siteHandler.releaseSite);




// ISOC

// creating processing rules for ISOC archive
app.post('/site/rule/create', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.createProcessingRule);
app.post('/site/rule/delete', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.deleteProcessingRule);

// create and remove ignore files
app.post('/site/snapshot/ignore', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.markSnaphotIgnored);
app.post('/site/snapshot/unignore', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.unmarkSnaphotIgnored);

// create and remove comments
app.post('/site/snapshot/comment', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.createCommentary);
app.post('/site/snapshot/uncomment', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.deleteCommentary);

// TODO: create and remove significant files
app.post('/site/snapshot/begin', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.createBeginNewComparisonFile);
app.post('/site/snapshot/unbegin', isAuthenticated, siteHandler.findSite, siteHandler.findSnapshot, siteHandler.deleteBeginNewComparisonFile);



// Start listening for requests
https.createServer(options, app).listen(settings.SERVER_PORT);
//app.listen(settings.SERVER_PORT);
console.log("ISOC TOSBack2 Server started on port "+settings.SERVER_PORT);






































