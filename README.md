TOSBack2 Web Administrator Server
=================================

An user account system for managing TOSBack2.


Account System
--------------

#### Create Account
This POST will create an account, although an administrator will need to activate the account in order to grant
access to the management features.  
- POST 'email' 'password' (6-20 characters) 'fullname'
- endpoint /account/create

#### Login
On success returns a JWT token for use with other queries.  
* POST 'email' 'password'
* endpoint /account/create

#### Logout
Invalidates the JWT token.     
* requires X-Access-Token header
* Any HTTP method 
* endpoint /account/logout

#### Status
Responds with an indication of whether the user is currently logged in or not.  
* requires X-Access-Token header
* Any HTTP method 
* endpoint /account/status

#### Update Account
Change name associated with account.  
* POST 'fullname'
* requires X-Access-Token header
* endpoint /account/update

#### Reset Password (step 1)
Sends a special code to the specified email to be used in step 2.  
* POST 'email' 
* endpoint /account/password/reset/step1

#### Reset Password (step 2)
This step actually resets the password.  
* POST 'email' 'specialCode' 'password' (6-20 characters)
* endpoint /account/password/reset/step2

#### Delete Account
Deletes a user account.  
* requires X-Access-Token header
* POST
* endpoint /account/delete

#### Activate Account
Only admin users may activate accounts.  
* requires X-Access-Token header
* POST 'accountToActivateId'
* endpoint /account/activate


#### Deactivate Account
Only admin users may deactivate accounts.  
* requires X-Access-Token header
* POST 'accountToDeactivateId'
* endpoint /account/deactivate



TOSBack2 Management System
--------------------------

#### Suggest a site
Adds a policy document based on a URL to the suggested site list.  
* optional X-Access-Token header
* POST 'tos'(url to a policy document)  'email' (optional) 'fullname' (optional)
* endpoint /site/suggest

#### List Suggested Sites
Lists all of the suggested policies by site.  
* requires X-Access-Token header
* POST
* endpoint /site/suggested

#### Check Site
Checks for the existence of a tracked policy, returning the associated site file.  
* requires X-Access-Token header
* POST 'tos' (url to a policy document) 
* endpoint /site/check

#### Save Site
Saves a rule file.
* requires X-Access-Token header
* POST 'domainId||domainName' 'docId' 'url' 'policyName'
* endpoint /site/save

#### Remove Policy Suggestion
Removes a doc, and a site if it is the only doc.  
* requires X-Access-Token header
* POST 'domainId||domainName' 'docId'
* endpoint /site/removesuggestion

#### Trigger Analysis of Site
Does a clean analysis of the policies associated with a site.  
* requires X-Access-Token header
* POST 'domainId||domainName'
* endpoint /site/analyze

#### List Managed Sites
Returns a list of sites managed by the authenticated user.  
* requires X-Access-Token header
* POST
* endpoint /site/managed

#### Claim a site
Allows a manager to claim a site.
* requires X-Access-Token header
* POST 'domainId||domainName' 
* endpoint /site/claim

#### Release a Claim to a site
Allows a manager to release a claim on a site.
* requires X-Access-Token header
* POST 'domainId||domainName' 
* endpoint /site/release


ISOC Web Audit System Management
--------------------------------

#### Create Xidel Template
Creates a file EPOCH_TIMESTAMP.processingrules.xml documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName' 'comment' (optional) 
* requires X-Access-Token header
* endpoint /site/rule/create

#### Remove Xidel Template
Removes a file EPOCH_TIMESTAMP.processingrules.xml documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName'
* requires X-Access-Token header
* endpoint /site/rule/delete

#### Create Ignore File
Creates a file EPOCH_TIMESTAMP.ignore documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName' 'comment' (optional) 
* requires X-Access-Token header
* endpoint /site/snapshot/ignore

#### Remove Ignore File
Removes a file EPOCH_TIMESTAMP.ignore documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName'
* requires X-Access-Token header
* endpoint /site/snapshot/unignore

#### Create Comment File
Creates a file EPOCH_TIMESTAMP.comment documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName' 'comment'
* requires X-Access-Token header
* endpoint /site/snapshot/comment

#### Remove Comment File
Removes a file EPOCH_TIMESTAMP.comment documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName'
* requires X-Access-Token header
* endpoint /site/snapshot/uncomment


#### Create Comment File
Creates a file EPOCH_TIMESTAMP.begin documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName' 'comment' (optional)
* requires X-Access-Token header
* endpoint /site/snapshot/begin

#### Remove Comment File
Removes a file EPOCH_TIMESTAMP.begin documented
in the [Audit API Documentation](https://docs.google.com/document/d/1IOij45-aDX7Emb1WOaWzDZGe2-NrlOYZbgk3zZ-qM8I/edit?pli=1#heading=h.463tn0w0jtoj)
* POST 'snapshotVersion' 'policyName' 'domainId||domainName'
* requires X-Access-Token header
* endpoint /site/snapshot/unbegin





Dependencies
------------

* [node.js](http://nodejs.org/)
* [MongoDB](http://www.mongodb.org/)