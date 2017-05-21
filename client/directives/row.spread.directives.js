(function() {
    'use strict';

    angular.module('spread')
        .directive('spread', spread); 

    spread.$inject = ['$rootScope', '$interpolate', '$state'];

    function spread($rootScope, $interpolate, $state) {
        var directive = { 
            replace: false,
            templateUrl:'modules/spread/client/views/spread/row.spread.client.view.html',   
            restrict: 'A',
            scope: { 
                data: '=data', 
                index: '@'
            }, 
            link: link
        };

        function link(scope){
            
            scope.data.authorExists = !!scope.data.author;
            scope.data.getClassNumber = scope.data.sum <  0 ? 'text-danger' :
                                        scope.data.sum > 0 ? 'text-success' :
                                        'text-primary'; 
        }

        return directive; 
    }
}()); 