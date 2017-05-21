'use strict';

/**
 * Module dependencies
 */
var acl = require('acl'); 
var path = require('path'),
    helpers = require(path.resolve('./config/lib/helpers'));



// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Notes Permissions
 */
exports.invokeRolesPolicies = function () {
  acl.allow([{
    roles: ['manager','admin','superadmin'],
    allows: [{
      resources: '/api/:db/spread',
      permissions: 'get'
    },{
      resources: '/api/:db/spread/count',
      permissions: 'get'
    }, {
      resources: '/api/:db/spread/:spreadID',
      permissions: 'get'
    }, {
      resources: '/api/:db/trades/:customerId',
      permissions: 'get'
    }]
  }]);
};


/**
 * Check If Notes Policy Allows
 */
exports.isAllowed = function (req, res, next) {
  var roles = (req.user) ? req.user.roles : ['guest'];
 
  var databaseAccess = (req.user) ? req.user.databaseAccess : ['gc'];
  var databaseFromRoute = (req.params) ? req.params.db : 'gc';
  
  // If user is not allowed access to this database
  var databaseAllowed = helpers.isInArray(databaseAccess, databaseFromRoute);
  if (!databaseAllowed) {
    return res.status(403).json({
      message: 'User is not authorized'
    });
  }

  // Check for user roles
  acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
    if (err) {
      // An authorization error occurred
      return res.status(500).send('Unexpected authorization error');
    } else {
      if (isAllowed) {
        // Access granted! Invoke next middleware
        return next();
      } else {
        return res.status(403).json({
          message: 'User is not authorized'
        });
      }
    }
  });
};
