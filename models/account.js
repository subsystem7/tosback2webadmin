var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var AccountSiteSchema = new Schema({
    domainName : String,
    date : { type: Date, default: Date.now },
    siteId : ObjectId
    });

var AccountSchema = new Schema({
	session : String,
	fullname : String,
	email : { type: String, unique: true },
    status : String,
    hashedPassword : String,
    changePasswordKey : String,
    changePasswordExpires : Date,
	note : String,
	date : { type: Date, default: Date.now },
	admin : Boolean,
	managedSites :[AccountSiteSchema]
	});

var Account = mongoose.model('Account', AccountSchema);

module.exports = {
	Account: Account
}
