var S = require('../settings');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var Account = require('../models/account').Account;
var D = require('../models/site');
var nodemailer = require("nodemailer");
var url = require('url');
var fs = require('fs');
var util = require('util');
var xml2js = require('xml2js');
var spawn = require('child_process').spawn;
 
var U = S.U;

// BASIC RULES
//
// 1. TOSBack2 XML Document is always treated as master. Loaded and saved when access is requested.
//
// <sitename name="addictinggames.com">
//  <docname name="Privacy Policy">
//    <url name="http://www.addictinggames.com/legal/privacy-policy.jsp">
// 	 <norecurse name="arbitrary"/>
//    </url>
//  </docname>
// </sitename>
//
// 2. The Database is used for maintaining the connective tissue between managers and live running rulesets
//
// 3. Additionally, the database stored suggestions
//
// 3. Document comments are stored on disk
//
// 4. Significance of a version is stored on disk
//
// 5. Any file processing rules are stored on disk
//

exports.findSite = function(req, res, next) {
	var re_domain_id = req.body.domainId;
	var re_domain_name = req.body.domainName;
	
	var missing_id = U.isEmpty(re_domain_id);
	var missing_name = U.isEmpty(re_domain_name);
	
	// Error, not enough info	
	if(missing_id && missing_name){
		U.sendErrorResponse(res, "one of domainId or domainName must be provided");		
	// Load from database based on ID
	} else if(missing_name){
		console.log("Loading site from database using id.");
		D.Site.findOne({ _id : re_domain_id }, function(err, site) {
			if(null!=site) {      
				global.G_site = site;
				return next(); 
			} else {
				U.sendErrorResponse(res, "Site not found", err);
			}
		});					
	} else {		
		console.log("Loading site from database uning domain name.");
		D.Site.findOne({ domainName : re_domain_name }, function(err, site) {
			if(null!=err) {
				U.sendErrorResponse(res, "", err);
			} else if(null!=site) {      
				global.G_site = site;
				return next(); 
			} else {
				// Load From Disk
				D.LoadSiteFromDisk(S.rules_path, re_domain_name, function(err, site){
					if(null!=site) {      
						global.G_site = site;
						return next(); 
					} else {
						U.sendErrorResponse(res, "Site not found", err);
					}			
				});					
			}
		});	
	}	
};


exports.analyze = function(req, res) {
	var ls = spawn('/Users/asa/.rbenv/shims/ruby', ['run_single.rb', global.G_site.domainName], { cwd: '/Users/asa/Documents/Clients/ISOC/TOSBack2/Analyzer' });
	
	//global.G_site.domainName
	
	ls.stdout.on('data', function (data) {
	  console.log('stdout: ' + data);
	});
	
	ls.stderr.on('data', function (data) {
	  console.log('stderr: ' + data);
	});
	
	ls.on('exit', function (code) {
	  console.log('child process exited with code ' + code);
	  res.end('{ "status" : "success", "description" : "" }');
	});
	
};


exports.listUserManaged =  function(req, res) {
	D.Site.find({ managerId : global.G_account._id },function(err, sites){
		if(err){
			res.end('{ "status" : "error", "description" : "", "details" : '+JSON.stringify(err)+' }');
		} else {
			res.end('{ "status" : "success", "description" : "", "domains" : '+JSON.stringify(sites)+' }');
		}
	}); 
};


// Returns a list of domains/documents with the status "suggested"
exports.listSuggested =  function(req, res) {
	D.Site.find({ status : "suggested" },function(err, sites){
		if(err){
			res.end('{ "status" : "error", "description" : "", "details" : '+JSON.stringify(err)+' }');
		} else {
			res.end('{ "status" : "success", "description" : "", "domains" : '+JSON.stringify(sites)+' }');
		}
	}); 
};


// Allows a manager to claim a site
exports.claimSite = function(req, res) {
	global.G_site.managerId = global.G_account._id;
	global.G_site.save(function(err){
		if(null!=err){
			U.sendErrorResponse(res, "Failed to claim site "+global.G_site._id, err);			
		} else {
			res.end('{ "status" : "success", "description" : "Site claimed", "site" : '+JSON.stringify(global.G_site)+' }');			
		}
	});		
};

// Allows a manager to release her claim to the site
exports.releaseSite = function(req, res) {
	global.G_site.managerId = null;
	global.G_site.save(function(err){
		if(null!=err){
			U.sendErrorResponse(res, "Failed to release claim on site "+global.G_site._id, err);			
		} else {
			res.end('{ "status" : "success", "description" : "Site claim released", "site" : '+JSON.stringify(global.G_site)+' }');			
		}
	});		
};


exports.findSnapshot = function(req, res, next) {

	var snapshotVersion = req.body.snapshotVersion;
	var policyName = req.body.policyName;
	
	if(U.isEmpty(snapshotVersion)) {
		U.sendErrorResponse(res, "snapshotVersion is a required field");
	} else if(U.isEmpty(policyName)) {
		U.sendErrorResponse(res, "policyName is a required field");			
	} else {
		// replace spaces in policy name with hyphens
		var policyFolderName = policyName.replace(/ /g, "-");		
		var snapshotFile = S.audit_live_base_path + "domains/" +global.G_site.domainName + "/" + policyFolderName + "/snapshots/" + snapshotVersion;
		
		console.log(snapshotFile);
		
		fs.exists(snapshotFile, function (exists) {
			if(!exists){
				U.sendErrorResponse(res, "snapshot "+snapshotVersion+" does not exist");
			} else {
				
				// find doc
				// check snapshots
				var doc = null;
				for(var d=0;d<global.G_site.docs.length;d++){					
					if(global.G_site.docs[d].docName == policyName){
						doc = global.G_site.docs[d];
						break;
					}					
				}
				
				if(null==doc) {
					U.sendErrorResponse(res, "document "+policyName+" does not exist");			
				} else {
					// find the snapshot,or create a new one
					var snapshot = null;
					for(var s=0;s<doc.snapshots.length;s++){					
						if(doc.snapshots[s].snapshot == snapshotVersion){
							snapshot = doc.snapshots[s];
							break;
						}	
					}					
					if(null==snapshot) {
						snapshot = new D.Snapshot({creatorId: global.G_account._id, snapshot: snapshotVersion });
						doc.snapshots.push(snapshot);
					} 
					
					global.G_snapshotFile = snapshotFile;
					global.G_snapshot = snapshot;
					
					next();												
				}				
			}
		});				
	}

};




/**
 *
 *
 *
 * /Library/WebServer/Documents/isoc_tosback2/audit/domains/addictinggames.com/Privacy-Policy/snapshots/1334505419.processingrules.xml
 *
 * <?xml version="1.0"?>
 * <ProcessingRule>
 * 	<Command><![CDATA[<div id="footerPageContent">{.}</div>]]></Command>
 * </ProcessingRule>
 *
 *	chained after findSite  
 */
exports.createProcessingRule = function(req, res) {

	var matchString = req.body.matchString; 
	
	if(U.isEmpty(matchString)) {
		U.sendErrorResponse(res, "matchString is a required field");			
	} else {
		global.G_snapshot.processingMethod = "xidel";
		global.G_snapshot.processingRule = matchString;									
		
		global.G_site.save(function (err) {
	        if(null==err) {
				var outputFilePath = global.G_snapshotFile + ".processingrules.xml";
				
				var exrule = { ProcessingRule: { Command: [ ] } };
				exrule.ProcessingRule.Command.push(matchString);
					
				U.SaveXMLFile(outputFilePath, exrule, function(err, result) {
					if(null!=err){
						U.sendErrorResponse(res, "", err);	
					} else {
						res.end('{ "status" : "success", "description" : "", "site" : '+JSON.stringify(result)+' }');
					}					
				}, true);
	        } else {
	            //res.end(JSON.stringify(err));
				U.sendErrorResponse(res, "", err);	
	        }
	    }); 								
	}
};

exports.deleteProcessingRule = function(req, res) {
	global.G_snapshot.processingMethod = "";
	global.G_snapshot.processingRule = "";									
	global.G_site.save(function (err) {
		if(err){
			U.sendErrorResponse(res, "", err);			
		} else {
			fs.unlink(global.G_snapshotFile+".processingrules.xml", function (err) {
				if (err) {
					U.sendErrorResponse(res, "unable to remove the processing rule file", err);					
				} else {
					res.end('{ "status" : "success", "description" : "" }');
				}
			});
		}
	});
};


exports.markSnaphotIgnored = function(req, res) {
	global.G_snapshot.ignore = true;
	var comment = req.body.comment; 	
	if(U.isEmpty(comment)) {
		comment = "";
	}
	global.G_snapshot.ignoreNote = comment;
	global.G_site.save(function (err) {
		if(err){
			U.sendErrorResponse(res, "", err);			
		} else {
			fs.writeFile(global.G_snapshotFile+".ignore", comment, function(err){
				if(err){
					U.sendErrorResponse(res, "", err);
				} else {
					res.end('{ "status" : "success", "description" : "" }');
				}
			});
		}
	});
};

exports.unmarkSnaphotIgnored = function(req, res) {
	global.G_snapshot.ignore = false;
	global.G_snapshot.ignoreNote = "";		
	global.G_site.save(function (err) {
		if(err){
			U.sendErrorResponse(res, "", err);			
		} else {
			fs.unlink(global.G_snapshotFile+".ignore", function (err) {
				if (err) {
					U.sendErrorResponse(res, "unable to remove the ignore file", err); 
				} else {
					res.end('{ "status" : "success", "description" : "" }');
				}
			});
		}
	});
};


exports.createBeginNewComparisonFile = function(req, res) {
	global.G_snapshot.beginAgain = true;
	var comment = req.body.comment; 	
	if(U.isEmpty(comment)) {
		comment = "";
	}
	global.G_snapshot.beginAgainNote = comment;	
	global.G_site.save(function (err) {
		if(err){
			U.sendErrorResponse(res, "", err);			
		} else {
			fs.writeFile(global.G_snapshotFile+".begin", comment, function(err){
				if(err){
					U.sendErrorResponse(res, "", err);
				} else {
					res.end('{ "status" : "success", "description" : "" }');
				}
			});
		}
	});
};

exports.deleteBeginNewComparisonFile = function(req, res) {
	global.G_snapshot.beginAgain = false;
	global.G_snapshot.beginAgainNote = "";	
	global.G_site.save(function (err) {
		if(err){
			U.sendErrorResponse(res, "", err);			
		} else {
			fs.unlink(global.G_snapshotFile+".begin", function (err) {
				if (err) {
					U.sendErrorResponse(res, "unable to remove the begin file", err); 
				} else {
					res.end('{ "status" : "success", "description" : "" }');
				}
			});
		}
	});
};




exports.createCommentary = function(req, res) {
	var comment = req.body.comment; 	
	if(U.isEmpty(comment)) {
		U.sendErrorResponse(res, "comment is a required field");			
	} else {
		global.G_snapshot.comment = comment;
		global.G_site.save(function (err) {
			if(err){
				U.sendErrorResponse(res, "", err);			
			} else {
				fs.writeFile(global.G_snapshotFile+".comment", comment, function(err){
					if(err){
						U.sendErrorResponse(res, "", err);
					} else {
						res.end('{ "status" : "success", "description" : "" }');
					}
				});
			}
		});
	}
};

exports.deleteCommentary = function(req, res) {
	global.G_snapshot.comment = "";
	global.G_site.save(function (err) {
		if(err){
			U.sendErrorResponse(res, "", err);			
		} else {
			fs.unlink(global.G_snapshotFile+".comment", function (err) {
				if (err) {
					U.sendErrorResponse(res, "unable to remove the comment file", err); 
				} else {
					res.end('{ "status" : "success", "description" : "" }');
				}
			});
		}
	});
};


/*
	A suggested policy document can be removed from the system.  If this is the last document listed 
	in the domain, then the domain is also removed.
*/
exports.removeSuggestion = function(req, res) {
	var doc_id = req.body.docId;
	if(doc_id && global.G_site.docs) {	
		global.G_site.docs.pull(doc_id);
		global.G_site.save(function (err_save) {
			if(null==err_save) {								
				if(0==global.G_site.docs.length){
					global.G_site.remove(function(err_delete){
						if(null==err_delete) {	
							res.json(JSON.parse('{ "status" : "success", "description" : "" }'));
						} else {
							U.sendErrorResponse(res, "", err_save);
						}
					});
				} else {	
					res.json(JSON.parse('{ "status" : "success", "description" : "" }'));
				}
			} else {
				U.sendErrorResponse(res, "", err_save);
			}
		});
	}
};





exports.updateDomain = function(req, res) {
	
};

// chained after findSite
exports.saveSiteToRuleFile = function(req, res) {
	var docId = req.body.docId;	
	var docURL = req.body.url;
	var docName = req.body.policyName;

	var found = false;

	if(docId && docURL && docName) {
		for(var i=0, ii=global.G_site.docs.length; i<ii; i++){		
			if(global.G_site.docs[i]._id==docId) {
				found = true;
				global.G_site.docs[i].status = 'live';
				global.G_site.docs[i].docURL = docURL;
				global.G_site.docs[i].docName = docName;
				D.SaveSiteDisk(S.rules_path, global.G_site, function(err, data){
					if(null!=err) {						
						U.sendErrorResponse(res, "", err);				        	
					} else {
						
						// if the site has no more suggestions, then mark it live
						var marklive = true;
						for(var j=0, jj=global.G_site.docs.length; j<jj; j++){
							if(global.G_site.docs[j].status=='suggested') {
								marklive = false;
								break;
							}
						}
						if(marklive) global.G_site.status = 'live';
						
						global.G_site.save(function (err_save) {
							if(null!=err_save) {
								U.sendErrorResponse(res, "", err_save);		
							} else {
								res.json(JSON.parse('{ "status" : "success", "description" : "" }'));
							}
						});									        	
					}
				});				
				break;
			}
		}
	}

	if(!found) U.sendErrorResponse(res, "", null);
};



exports.checkSite = function(req, res) {
	var req_tos_url = req.body.tos;
	console.log(req_tos_url);
	if(!U.isEmpty(req_tos_url)){
		req_tos_url = req_tos_url.toLowerCase();
		var tos_url = url.parse(req_tos_url);
		if(undefined != tos_url) {			
			D.LoadSiteFromDisk(S.rules_path, getDomainName(tos_url), function(err, site){
				if(null!=err){
					U.sendErrorResponse(res, "", err);
				} else {
					res.end('{ "status" : "success", "description" : "", "site" : '+JSON.stringify(site)+' }');
				}			
			});
		} else {
			U.sendErrorResponse(res, "tos must be a URL");			
		}
	} else {
		U.sendErrorResponse(res, "tos is a required field");
	}
};


exports.suggest = function(req, res) {
    var req_email = req.body.email.toLowerCase(); 
    var req_fullname = req.body.fullname;
    var req_tos_url = req.body.tos;

	if(null!=req_tos_url){
		var tos_url = url.parse(req_tos_url);
		if(undefined == tos_url)	{
			U.sendErrorResponse(res, "tos must be a URL");						
		} else {
			var domain = getDomainName(tos_url);
			D.Site.findOne({ domainName : domain }, function(err, site) {
	
				// SITE FOUND, now check for doc
				if(null!=site) {
					
					// TODO: READ FROM DISK IF STATUS IS LIVE
					
					// Find Document
					var found = false;
					for(var d=0; d<site.docs.length; d++){
						if(site.docs[d].docURL==req_tos_url){
							found = true;
							break;
						}
					}
					
					// Create a Document if one does not exist
					if(!found){
	
						var doc = new D.Doc( { docURL: req_tos_url, status: D.STATUS_SUGGESTED } );
	
						if(null!=global.G_account) {
							doc.creatorId = global.G_account._id;
						} else {						 
							if(null==req_email) doc.creatorEmail = req_email;			
							if(null==req_fullname) doc.creatorName = req_fullname;	
						}
						site.docs.push(doc);
	                		site.save(function (err) {
							if(null==err) {
								// TODO: WRITE TO DISK IF STATUS IS LIVE
								res.end('{ "status" : "success", "description" : "", "site" : '+JSON.stringify(site)+' }');
							} else {
								res.end(JSON.stringify(err));
							}
						});                		
					} else {
						res.end('{ "status" : "success", "description" : "Document is already in our database." }');
					}
				
				// ERROR	    
				} else if(null!=err) {
				    res.end(JSON.stringify(err));
			
				// NEW DOMAIN, YAY!
				} else {				
				    var site = new D.Site( { domainName: domain, status : D.STATUS_SUGGESTED } );
					var doc = new D.Doc( { docURL: req_tos_url, status: D.STATUS_SUGGESTED } );
	
					if(null!=global.G_account) {
						site.creatorId = global.G_account._id;
						doc.creatorId = global.G_account._id;
					} else {						 
						if(null==req_email) {
							site.creatorEmail = req_email;			
							doc.creatorEmail = req_email;			
						}
						if(null==req_fullname) {
							site.creatorName = req_fullname;	
							doc.creatorName = req_fullname;						
						}
					}
					
					site.docs.push(doc);
						
				    // rely on the schema to insure a unique user
				    site.save(function (err) {
					    	if(null==err) {
					    		res.end('{ "status" : "success", "description" : "", "domain" : '+JSON.stringify(site)+' }');
					    	} else {
					    		res.end(JSON.stringify(err));
					    	}
				    });       
				}
			});
		}
	}
};




function getDomainName(url){
	var hostname = url.hostname;
	var parts = hostname.split(".");
	if(parts.length>2) {
		hostname = parts[parts.length-2] + "." + parts[parts.length-1];
	}
	return hostname;
}




// Writes the string to the output path
var writeStringToDisk = function(str, output_path){
	
};




























