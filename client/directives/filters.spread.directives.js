(function() {
    'use strict';

    angular.module('spread')
        .directive('spreadFilters', spreadFilters);

    spreadFilters.$inject = ['$rootScope', '$interpolate', '$state'];

    function spreadFilters($rootScope, $interpolate, $state) {
        var directive = {
            transclude: true,
            templateUrl:'modules/spread/client/views/spread/filters.spread.client.view.html',   
            restrict: 'EA',
            link: link,
            controller: controller
        };

        return directive;

        //this needs to be refactored since it's used in many places
        function controller($scope){

            //animations 
            var panel = {
                collapsed: false
            }

            //toggle class for collapsed table elements
            $scope.collapseToggle = function(){
               
                panel.collapsed = !panel.collapsed;    
            }

            //get toggle class for collapsed table elements
            $scope.collapseClassIcon = function(){

                if(panel.collapsed)
                    return 'fa-angle-up';
                else
                    return 'fa-angle-down'; 
            } 
            $scope.collapseClassPanel = function(){

                if(panel.collapsed)
                    return 'panel-toggled';  
            }  
           
        }

        function link(scope, element) {
            
            ;(function(){

                // Bootstrap datepicker  
                var $datepicker = $(".datepicker")
                if($datepicker.length) 
                    $datepicker.datepicker({
                        format: 'yyyy-mm-dd', 
                    }).on("change", function() {
                        
                        //don't do this at home. trigger model change
                        angular.element($datepicker).triggerHandler('input');
                    });

                // END Bootstrap datepicker
            })();  

            //need to find angular based datepicker, it doesnt feed info back into scope
        }
    }
}()); 