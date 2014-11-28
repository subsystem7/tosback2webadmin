var settings = require('../settings');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var Account = require('../models/account').Account;
var nodemailer = require("nodemailer");
var jwt = require('jwt-simple');
//https://github.com/klughammer/node-randomstring
var randomstring = require("randomstring");

var U = settings.U;

var fromEmail = 'isoc@asahardcastle.com';
var fromName = 'ISOC TOSBack2 Manager';

var transport = nodemailer.createTransport("SMTP", {
    host: "mail.zenn.net",
    secureConnection: true,
    port: 465,
    auth: {
        user: fromEmail,
        pass: "isocr0ck5b1g"
    }
});


exports.findAccount = function(req, res){    
    var req_accountId = req.body.accountId;
    var req_email = req.body.email;    
    if(null!=req_email) req_email = req_email.toLowerCase();

    if(null!=req_accountId && req_accountId.length>0) {
        Account.findOne({ _id : req_accountId }, function(err, account) {
            if(null!=account) {
                res.end(JSON.stringify(account));
            } else if(null!=err) {
                res.end(JSON.stringify(err));
            } else {
                res.end('{ "status" : "error", "description" : "no account found" }');
            }
        });
    } else if(null!=req_email && req_email.length>0) {    
    	Account.findOne({ email : req_email }, function(err, account) {
    		if(null!=account) {
    			res.end(JSON.stringify(account));
    		} else if(null!=err) {
    			res.end(JSON.stringify(err));
    		} else {
    			res.end('{ "status" : "error", "description" : "no account found" }');
    		}
    	});
    }
};


exports.deleteAccount = function (req, res) {
    global.G_account.remove({}, function(err) {
        if (!err) {
            res.end('{ "status" : "success", "description" : "Account successfully deleted." }');            
        } else {
            res.end(JSON.stringify(err));
        }
    });    
};



exports.resetMyPasswordStepTwo  = function(req, res){
    var specialCode = req.body.specialCode;
    var password = req.body.password;                

    // required fields and validation
    req.assert('specialCode', 'required').notEmpty();
    req.assert('password', '6 to 20 characters required').len(6, 20);

    var errors = req.validationErrors();
    if (errors) {
        res.end('{ "status" : "error", "description" : "validation errors", "errorList" : '+JSON.stringify(errors)+' }');
        return;
    }

    Account.findOne({ changePasswordKey : specialCode }, function(err_find, account) {
        if(null!=account) {
            if (account.changePasswordExpires > Date.now()) {            
                bcrypt.genSalt(10, function(err_salt, salt) {
                    if(null!=salt) {
                        bcrypt.hash(password, salt, function(err_hash, hash) {
                            console.log('here');
                            console.log(err_hash);
                            if(null!=hash){
                                account.hashedPassword = hash;
                                account.changePasswordKey = "";
                                account.changePasswordExpires = null;                            
                                account.save(function (err_save) {
                                    console.log('here2');
                                    if(null==err_save) {
                                        res.json(JSON.parse('{ "status" : "success", "description" : "" }'));
                                    } else {
                                        U.sendErrorResponse(res, "", err_save);                    
                                    }
                                });
                            } else {
                                U.sendErrorResponse(res, "", err_hash);                      
                            }
                        });
                    } else {
                        U.sendErrorResponse(res, "", err_salt);                      
                    }
                });
            } else {
                U.sendErrorResponse(res, "Password request reset window has expired.");                      
            }
        } else if(null!=err_find) {
            U.sendErrorResponse(res, "", err_find);                      
        } else {
            U.sendErrorResponse(res, "no account found");                      
        }
    });
};




// sends an email with a secret code that you enter in order to change your password.
exports.resetMyPasswordStepOne = function(req, res){
    var req_email = req.body.email;
    if(null!=req_email) {
        // find account
        Account.findOne({ email : req_email }, function(err_find, account) {
            if(null!=account) {    
                console.log(account);
                if (null==account.changePasswordExpires || account.changePasswordExpires > Date.now()) {
                    account.changePasswordExpires = new Date(new Date().getTime() + 30*60000); // 30 minutes
                    account.changePasswordKey = randomstring.generate();
                    account.save(function (err_save) {
                        if(null==err_save) {                        
    
                            var message = {
                                from: fromName + '<'+fromEmail+'>',
                                to: account.fullname + '<'+account.email+'>',
                                subject: 'Password Reset Request',
                                text: 'Your secret code: ' + account.changePasswordKey
                            };
    
    
                            transport.sendMail(message, function(err_mail, response){   
                                if(null==err_mail){
                                    res.json(JSON.parse('{ "status" : "success", "description" : "reset email message sent" }'));                     
                                } else {
                                    U.sendErrorResponse(res, "Reset request failed to send an email", err_mail);                    
                                }    
                            });
                        } else {
                            U.sendErrorResponse(res, "Reset request failed", err_save);
                        }
                    });
                } else {
                    U.sendErrorResponse(res, "Password reset requests may only be made once every 30 minutes.");                
                }
            } else {
                U.sendErrorResponse(res, "Reset request failed", err_find);            
            }
        });
    } else {        
        U.sendErrorResponse(res, "Email address is required");            
    }

};





exports.updateAccount = function(req, res) {         
    // only update provided fields    
  	// res.writeHead(200, {'content-type': 'text/json','Access-Control-Allow-Origin' : '*'});

		if(null!=global.G_account) {        
            global.G_account.date = new Date();
            if(null!=req.body.fullname) global.G_account.fullname = req.body.fullname;
            global.G_account.save(function (err) {
				if(null==err) {
                    //req.session.accountId = account._id;
                    res.end('{ "status" : "success", "description" : "account updated", "account" : '+JSON.stringify(global.G_account)+' }');
				} else {
					res.end(JSON.stringify(err));
				}
			});			
		} else {
            res.end('{ "status" : "error", "description" : "Account not found" }');
            //req.session = null;
		}

};




exports.getStatus = function(req, res) {    
    if(global.G_account){
        res.end('{ "status" : "success", "description" : "", "user" : "'+global.G_account.fullname+'" }');
    } else {
        res.end('{ "status" : "success", "description" : ""}');
    }
};

exports.logout = function(req, res){
    if(null!=global.G_account) {
        global.G_account.session = null;
        global.G_account.save(function(err) {
            if(null==err) {
                res.json({ status : "success", description : "logout successful" });                    
            } else {
                res.end(JSON.stringify(err));                                            
            }
        });
    } else {
        res.json({ status : "success", description : "logout successful" });                    
    }
};

exports.login = function(req, res){
    console.log(req.body);

    var req_email = req.body.email;
    if(null!=req_email) req_email = req_email.toLowerCase();    
    var req_password = req.body.password;

    //console.log("(/account/login) req_email:"+req_email); 

    Account.findOne({ email : req_email }, function(err, account) {

        // ACCOUNT EXISTS
        if(null!=account) {
            console.log('account is cool');
            // check password
            bcrypt.compare(req_password, account.hashedPassword, function(err, success) {                                
                console.log(success);
                // successful auth
                if(success) {

                    // account pending authorization from an admin user
                    if(account.status=='pending'){
                        res.json({ status : "error", description : "Account pending administrator activation." });                            
                    } else {                        
                        // generate a session id
                        account.session = randomstring.generate();  
                        account.save(function (err) {
                            console.log(err);
                            if(null==err) {
                                var expires = new Date(new Date().getTime() + 30*60000); // 30 minutes
                                console.log('expires: '+expires);
                                var token = jwt.encode({
                                  iss: account.session,
                                  exp: expires
                                }, settings.JWT_SECRET );
                                console.log('token: '+token);
                                
                                res.json({
                                    status : "success",
                                    description : "",
                                    token : token,
                                    expires: expires,
                                    user: account.fullname/*,
                                    user: account.toJSON() */
                                });

                            } else {
                                res.end(JSON.stringify(err));                                
                            }
                        });
                    }
                // password failure
                } else {    
                    res.end('{ "status" : "error", "description" : "Username and/or password incorrect, or account does not exist." }');
                }
            });

        // ERROR            
        } else if(null!=err) {
            res.end(JSON.stringify(err));
        // NO ACCOUNT
        } else {
            res.end('{ "status" : "error", "description" : "Username and/or password incorrect, or account does not exist." }');            
        }
    });
};






exports.activateAccount = function(req, res){    
    if(global.G_account.admin) {
        var accountToActivateId = req.body.accountToActivateId;
        if(null!=accountToActivateId) {    
            Account.findOne({ _id : accountToActivateId }, function(err, accountToActivate) {
                if(null!=accountToActivate) {                    
                    accountToActivate.status = "activated";
                    accountToActivate.save(function (err) {
                        if(null==err) {
                            res.end('{ "status" : "success", "description" : "account activated" }');
                        } else {
                            res.end(JSON.stringify(err));
                        }
                    });
                } else if(null!=err) {
                    res.end(JSON.stringify(err));
                } else {
                    res.end('{ "status" : "error", "description" : "no account found" }');
                }            
            });
        } else {
            res.end('{ "status" : "error", "description" : "accountToActivateId required" }');
        }
    } else {
        res.end('{ "status" : "error", "description" : "authenticated account is not an administrator" }');                
    }
}; 



exports.deactivateAccount = function(req, res){    
    if(global.G_account.admin) {
        var accountToDeactivateId = req.body.accountToDeactivateId;
        if(null!=accountToDeactivateId) {    
            Account.findOne({ _id : accountToDeactivateId }, function(err, accountToDeactivate) {
                if(null!=accountToDeactivate) {                    
                    accountToDeactivate.status = "pending";
                    accountToDeactivate.save(function (err) {
                        if(null==err) {
                            res.end('{ "status" : "success", "description" : "account deactivated" }');
                        } else {
                            res.end(JSON.stringify(err));
                        }
                    });
                } else if(null!=err) {
                    res.end(JSON.stringify(err));
                } else {
                    res.end('{ "status" : "error", "description" : "no account found" }');
                }            
            });
        } else {
            res.end('{ "status" : "error", "description" : "accountToDeactivateId required" }');
        }
    } else {
        res.end('{ "status" : "error", "description" : "authenticated account is not an administrator" }');                
    }
}; 




// Create Account
exports.createAccount = function(req, res){    
       
    // required fields and validation
    req.assert('fullname', 'required').notEmpty();
    req.assert('email', 'required').notEmpty();
    req.assert('email', 'valid email required').isEmail();
    req.assert('password', '6 to 20 characters required').len(6, 20);

    var errors = req.validationErrors();
    if (errors) {
        res.end('{ "status" : "error", "description" : "validation errors", "errorList" : '+JSON.stringify(errors)+' }');
        return;
    }

    // after validation we can count on the post params

    var req_email = req.body.email.toLowerCase();
    var req_fullname = req.body.fullname;
    var req_password = req.body.password;
    
    console.log("(/account/create) req_email:"+req_email+" req_fullname:"+req_fullname); 
    
    Account.findOne({ email : req_email }, function(err, account) {
        
        // ACCOUNT EXISTS, send a false positive.
        if(null!=account) {
            res.json(JSON.parse('{ "status" : "success", "description" : "" }'));            
        
        // ERROR            
        } else if(null!=err) {
            res.end(JSON.stringify(err));

        // NEW ACCOUNT
        } else {
            //console.log("new account");

            //var pass = req.body.password;
            
            // bcrypt stores a unique per user salt with each hashed password
            bcrypt.genSalt(10, function(err, salt) {    

                bcrypt.hash(req_password, salt, function(err, hash) {

                    var account = new Account( { email : req_email, hashedPassword : hash, status : 'pending', fullname : req_fullname } );
                                                           
                    // rely on the schema to insure a unique user
                    account.save(function (err) {
                        if(null==err) {
                            res.end(JSON.parse('{ "status" : "success", "description" : "", "user" : "'+account.fullname+'" }'));
                        } else {
                            res.end(JSON.stringify(err));
                        }
                    });       
                });
            });      
        }
    });
};





function sendAnEmail(res, email) {
    transport.sendMail(email, function(err_tsmail, response){
        if(err_tsmail) {
            //console.log(err_tsmail);
            res.end('{ "status" : "error", "description" : "Email Failed" }');                                
            
        } else {
            //console.log("Message sent: " + response.message);
            res.end('{ "status" : "success", "description" : "Email Succeeded" }');                                
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
        
        //res.render('cart.jade', { account: account, title:'Review Your Order', order: order });
        //res.render('thanks.jade', {  title:'Thank You For Your Order' });
        
    }); // transport.sendMail

    //res.end('{ "Hello" : "Bubby" }');
}



exports.echo = function(req, res) {
    console.log(req.body); 

    // console.log(req.body);    
    //var val = req.body.json;    
    //var val_parsed = JSON.parse(val);
    res.end("echo");    
};


exports.jsonecho = function(req, res) {
    console.log(req.body.json);    
    var val = req.body.json;    
    var val_parsed = JSON.parse(val);
    res.end(JSON.stringify(val_parsed));    
};




