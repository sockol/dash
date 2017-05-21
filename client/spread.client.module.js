(function (app) {
  'use strict';
   
  app.registerModule('spread', ['core','angucomplete-alt','ui.bootstrap']);// The core module is required for special route handling; see /core/client/config/core.client.routes
  app.registerModule('spread.services');
  app.registerModule('spread.routes', ['ui.router', 'spread.services']);
}(ApplicationConfiguration));
