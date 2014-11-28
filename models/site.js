var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var url = require('url');
var fs = require('fs');
var util = require('util');
var xml2js = require('xml2js');
var U = require('../utilities');


var STATUS_SUGGESTED = "suggested";
var STATUS_PENDING = "pending";
var STATUS_STAGED = "staged";
var STATUS_LIVE = "live";

var SnapshotSchema = new Schema({
	date : { type: Date, default: Date.now },
	creatorId : ObjectId,
	snapshot : String,
	ignore : Boolean,
	ignoreNote : String,
	beginAgain : Boolean,
	beginAgainNote : String,
	comment : String,	
	processingMethod : String,
	processingRule : String
	});

var DocSchema = new Schema({
	status : String, 
    date : { type: Date, default: Date.now },
	creatorId : ObjectId,
    docName : String,
    docURL : String,
    creatorName : String,
    creatorEmail : String,
    snapshots : [SnapshotSchema]
    });

var SiteSchema = new Schema({
    status : String,
    date : { type: Date, default: Date.now },
	creatorId : ObjectId,
    managerId : ObjectId,
    creatorName : String,
    creatorEmail : String,
    domainName : String,
    docs: [DocSchema]
});

var Site = mongoose.model('Site', SiteSchema);
var Doc = mongoose.model('Doc', DocSchema);
var Snapshot = mongoose.model('Snapshot', SnapshotSchema);


// NOTE: in order to get the template to serialize the JSON back to the original XML format, simply console.log the 
// result from the parser


/****
 *	Attempts to load the XML configuration file from the TOSBack2 rules folder.  Returns
 *	a Site and Docs.
 */
var LoadRule = function(rules_path, domain, callback) {
	U.LoadXMLFile(rules_path + domain + '.xml', function(err, result) {
		if(null!=err){
			callback(err, null);
		} else {
			var site = new Site({ domainName : result.sitename.$.name, status : STATUS_LIVE, docs : [] });
			for(var i=0; i<result.sitename.docname.length;i++){
				var doc = new Doc( { docName: result.sitename.docname[i].$.name, docURL: result.sitename.docname[i].url[0].$.name, status: STATUS_LIVE } );
				site.docs.push(doc);
			}										
			callback(null,site);		
		}
	});
};

/****
*	Takes a Site and Docs and writes it to disk
*
*/
var SaveRule = function(rules_path, site, callback) {

	var ruleFileAsJSON = { sitename: { '$': { name: site.domainName }, docname: [ ] } };	
	for(var i=0;i<site.docs.length;i++){		
		var docName = site.docs[i].docName;
		if(U.isEmpty(docName)) docName = "Agreement";
		var doc = { '$': { name: docName }, url: [ { '$': { name: site.docs[i].docURL }, norecurse: [ { '$': { name: 'arbitrary' } } ] } ] };
		ruleFileAsJSON.sitename.docname.push(doc);
	}

	var builder = new xml2js.Builder();
	var xml = builder.buildObject(ruleFileAsJSON);
	fs.writeFile(rules_path + site.domainName + '.xml', xml, function(err){
		if(err){
			callback(err, null);
		} else {
			callback(null, ruleFileAsJSON);
		}
	});
};



module.exports = {
	LoadSiteFromDisk: LoadRule,
	SaveSiteDisk: SaveRule,
	Site: Site,
	Doc: Doc,
	Snapshot: Snapshot,	
	STATUS_PENDING: STATUS_PENDING,
	STATUS_STAGED: STATUS_STAGED,
	STATUS_LIVE: STATUS_LIVE,
	STATUS_SUGGESTED: STATUS_SUGGESTED
}
