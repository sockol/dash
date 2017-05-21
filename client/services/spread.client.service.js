(function () {
  'use strict';

  angular
    .module('spread.services')
    .factory('SpreadService', SpreadService);

  SpreadService.$inject = ['$http', '$resource', '$rootScope'];

  function SpreadService($http, $resource, $rootScope) { 

    var service = { 
      handleError: handleError, 
      getSpreads: getSpreads,
      getSpread: getSpread,  
      getTrades: getTrades,
      getSpreadResource: getSpreadResource,
    };  
    return service;
 
    function handleError(error) {
      // Log error
      console.log(error);
    }

    // get all notes, with filters if not empty
    function getSpreads(filters, callback){
      
      $http({
        url: '/api/'+$rootScope.ui.database+'/spread',
        params: filters
      }).then(function(res) {

          var data = res.data; 
          callback(null, data); 

      },function(err) {
          
          callback(err);
      });    
    } 

    function getTrades(filters, callback){

      $http({
        url: '/api/'+$rootScope.ui.database+'/trades/'+filters.userId,
        params: filters
      }).then(function(res) {

          var data = res.data; 
          callback(null, data); 

      },function(err) {
          
          callback(err);
      });    
    }

    function getSpread(id, callback){
 
      $http({
        url: '/api/'+$rootScope.ui.database+'/spread/'+id, 
      }).then(function(res) {

          var data = res.data; 
          callback(null, data); 

      },function(err) {
          
          callback(err);
      });    
    }   
    function getSpreadResource(){

      return $resource('api/:db/spread/:id', {
        db: '@_db',
        id: '@_id',
      }); 
    }
  }
}());
