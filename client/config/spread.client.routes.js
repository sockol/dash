(function () {
  'use strict';

  angular
    .module('spread.routes', ['ncy-angular-breadcrumb'])
    .config(routeConfig);

  routeConfig.$inject = ['$stateProvider', '$urlRouterProvider'];
 

  function routeConfig($stateProvider, $urlRouterProvider) {
            

    $stateProvider
      .state('spread', {
        abstract: true,
        url: '/spread',
        templateUrl: 'modules/core/client/views/core.client.view.html', 
        data: {
            pageTitle: 'Dashboard'
        }
      })

      .state('spread.all', { 
        url: '',
        templateUrl: 'modules/spread/client/views/spread.client.view.html',
        controller: 'SpreadController',
        controllerAs: 'rCtrl',
        data: {
          pageTitle: 'Spread'
        },
        ncyBreadcrumb: {
          label: 'Spread'
        },
        resolve: {
          managersResolveGC: getManagersGC,
          managersResolveRC: getManagersRC,
          customerResolve: getCustomer, 
        }
      })

      .state('spread.single', { 
        url: '/:spreadId',
        templateUrl: 'modules/spread/client/views/spread.single.client.view.html',
        controller: 'SpreadSingleController',
        controllerAs: 'rsCtrl',
        data: {
          pageTitle: 'Spread'
        },
        ncyBreadcrumb: {
          label: 'Spread'
        },
        resolve: {
          spreadResource: getSpread, 
        }
      });  
  }
  

  function getManagers(db, AdminService) { 
 
    return AdminService.getManagersResource().get({
      db: db
    }).$promise; 
  }  

  getManagersGC.$inject = ['AdminService']; 
  function getManagersGC(AdminService){

    return getManagers('gc', AdminService);
  }
  getManagersRC.$inject = ['AdminService']; 
  function getManagersRC(AdminService){

    return getManagers('rc', AdminService);
  }

  getCustomer.$inject = ['$location', '$rootScope', 'AdminService'];
  function getCustomer($location, $rootScope, AdminService) { 
    
    var userId = $location.search().userId; 
    return AdminService.getCustomerResource().get({
      db: $rootScope.ui.database,
      id: userId,
    }).$promise; 
  }  

  getSpread.$inject = ['$stateParams', '$rootScope', 'SpreadService'];
  function getSpread($stateParams, $rootScope, SpreadService) { 
    
    return SpreadService.getSpreadResource().get({
      db: $rootScope.ui.database, 
      id: $stateParams.spreadId
    }).$promise; 
  } 
 
  
}());
