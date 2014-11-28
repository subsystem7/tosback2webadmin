var fs = require('fs');
var util = require('util');
var xml2js = require('xml2js');

var DEBUG = false;

var setDebug = function(b) { DEBUG = b; };

var isEmpty = function(val) {
	return undefined==val || null==val || val.length==0;
};


var sendErrorResponse = function(res, desc, err){
	var errorResponse = { status : 'error', description : null };
	if(null!=desc){
		errorResponse.description = desc;		
	}
	if(null!=err && DEBUG){
		errorResponse.err = err;
	}
	res.json(errorResponse);
};


var LoadXMLFile = function(path, callback) {
	fs.readFile(path, function(err, data) {
		if(null!=err){				
			callback(err,null);
		} else {
			var parser = new xml2js.Parser();
			parser.parseString(data, function (err, result) {			
				callback(err,result);
			});
		}
	});
};


var SaveXMLFile = function(path, json, callback, fixLTGT) {
	var builder = new xml2js.Builder();
	var xml = builder.buildObject(json);
	
	// POST PROCESS CDATA
	// var cdata_start = "&lt;![CDATA[";
	// var cdata_end = "]]&gt;";
	// 
	// xml = xml.replace(/&lt;!\[CDATA\[/g,"<![CDATA[" );
	// xml = xml.replace(/]]&gt;/g,"]]>" );
	if(fixLTGT){
		xml = xml.replace(/&lt;/g,"<" );
		xml = xml.replace(/&gt;/g,">" );
	}
	
	//console.log(xml);	
		
	fs.writeFile(path, xml, function(err){
		if(err){
			callback(err, null);
		} else {
			callback(null, json);
		}
	});
};


exports.isEmpty = isEmpty;
exports.sendErrorResponse = sendErrorResponse;
exports.setDebug = setDebug;
exports.LoadXMLFile = LoadXMLFile;
exports.SaveXMLFile = SaveXMLFile;

exports.DEBUG = DEBUG;