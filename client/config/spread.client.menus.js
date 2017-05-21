(function () {
  'use strict';

  angular
    .module('spread')
    .run(menuConfig);

  menuConfig.$inject = ['menuService'];

  function menuConfig(menuService) {
    menuService.addMenuItem('topbar', {
      title: 'Spread Report',
      state: 'spread.all',
      class: 'fa fa-bar-chart-o',
      position: 4,
      roles: ['manager','admin','superadmin']
    }); 
  }
}());
