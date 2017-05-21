'use strict';

/**
 * Module dependencies
 */
var spreadPolicy = require('../policies/spread.server.policy'),
    spread = require('../controllers/spread.server.controller');

module.exports = function (app) {

    // X-Total-Count
    // need thsi for total count


  // spread collection routes 
  app.route('/api/:db/spread').all(spreadPolicy.isAllowed)
    .get(spread.list);
   
  // Single article routes
  app.route('/api/:db/spread/:spreadId').all(spreadPolicy.isAllowed)
    .get(spread.reportByID);

  app.route('/api/:db/trades/:customerId').all(spreadPolicy.isAllowed)
    .get(spread.tradesByID);

  // Finish by binding the article middleware
  app.param('spreadId', spread.reportByID);   
};
