(function () {
  'use strict';

  angular
    .module('spread') 
    .controller('SpreadController', SpreadController);
  
  SpreadController.$inject = ['$scope', '$rootScope', '$cookieStore', '$location', '$timeout', '$state', 'managersResolveGC', 'managersResolveRC', 'customerResolve', 'Authentication', 'SpreadService', 'DatesService', 'AdminService'];

  function SpreadController($scope, $rootScope, $cookieStore, $location, $timeout, $state, managersResolveGC, managersResolveRC, customerResolve, Authentication, SpreadService, DatesService, AdminService) {
    var self = this;
  
    self.authentication = Authentication;
    self.error = null;

    /**
     * Default filter values for dates
     */  
    var defaultDate = DatesService.getDefaultDate();

    /**
     * All page filters
     */  
    self.filters = { 
      dateStart: defaultDate.start,
      dateEnd: defaultDate.end, 
      managerId: null,
      userId: null,

      sortKey: 'date',
      sortDesc: true,

      limit: 10, 
      page: 1,

      offset: 0,
    }

    /**
     * All page filters palceholders that hold user and manager objects. 
     * These have IDs that will be passed into self.filters
     */ 
    self.filtersPlaceholder = {
      userIdOverride: null,
      userObject: null,
      managerObject: null
    };

    /**
     * Animation flags on this module, debugging
     */  
    self.ui = {
      mainLoader: false, 
      mainError: false,
      dateWarning: false,  
      shouldResetPage: false,
      dbug: false, 
      count: 0,
    } 

    /**
     * Table data
     */ 
    self.data = {
      managers: [], 
      reports: [],
    }

    /**
     * Function definitions 
     */ 
    self.filtersReset = filtersReset;
    self.setResetPage = setResetPage;
    self.filtersApply = filtersApply;
    self.sortingApply = sortingApply;
    self.getFitlerUserName = getFitlerUserName; 
    self.getIndexStart = getIndexStart;
    self.autocompleteRoute = autocompleteRoute; 
    self.setUserId = setUserId();
    self.getManagers = getManagers;
    self.setResetPageAndUserOverride = setResetPageAndUserOverride();
    
    
    /**
     * Main functions to kick everything off
     */ 
    ;(function(){

 
      // //populate all filters
      updateFromUrl(); 
      filtersApply();

      //preload managers 
      self.data.managers = {
        gc: managersResolveGC.rows, 
        rc: managersResolveRC.rows
      };  

      // self.data.managers.gc.unshift({
      //   name: 'No Manager',
      //   id: 'none'
      // }); 
      // self.data.managers.rc.unshift({
      //   name: 'No Manager',
      //   id: 'none'
      // }); 

      //preload customer, if the filter is set
      var userId = self.filters.userId || false; 
      var customer = customerResolve.rows[0] || false;
      self.filtersPlaceholder.userObject = (userId && customer) ? { originalObject: customer } : null;

      // $scope.$on('$locationChangeSuccess', function(event, newUrl, oldUrl){ 
         
      //   if($state.current.name=='spread.all'){

      //     updateFromUrl();
      //     filtersApply();  
      //   }
      // });


      $scope.$on('$reloadBrand', function(event, args) {

        // //populate all filters
        updateFromUrl(); 
        filtersReset();

        //preload managers 
        // self.data.managers.gc.unshift({
        //   name: 'No Manager',
        //   id: 'none'
        // }); 
        // self.data.managers.rc.unshift({
        //   name: 'No Manager',
        //   id: 'none'
        // }); 

        //preload customer, if the filter is set
        var userId = self.filters.userId || false; 
        var customer = customerResolve.rows[0] || false;
        self.filtersPlaceholder.userObject = (userId && customer) ? { originalObject: customer } : null;
 
      });
    })();

    /**
     * Display proper manager list by brand
     */ 
    function getManagers(){

      var database = $cookieStore.get('dashboardGcRc') ? $cookieStore.get('dashboardGcRc').database : 'gc'; 
      return self.data.managers[database];
    }

    /**
     * Read filters from the query string, and use them to replace the default filters
     * Note: this should be its own service
     */ 
    function updateFromUrl(){

      var temp = {}
      var query = $location.search();
      
      if(!Object.keys(query).length)
        return;

      for (var key in query){
        if (key in self.filters){ 
          
          var val = query[key];
          if(val == 'false') 
            temp[key] = false; 
          else if(val == 'true')  
            temp[key] = true; 
          else if(Number.isInteger(val))
            temp[key] = parseInt(val); 

          temp[key] = query[key]; 
        } 
      }  

      // this is retarded, i need to change the way that autocomplete directive parses model data
      if(!query.userId){ 
        self.filtersPlaceholder.userObject = false;
      }else{ 
        self.filtersPlaceholder.userIdOverride = query.userId;
        self.filtersPlaceholder.userObject = {
          originalObject: {
            id: query.userId
          }
        }
      }
      if(!query.managerId)
        self.filtersPlaceholder.managerObject = false; 
      else
        self.filtersPlaceholder.managerObject = {
          id: query.managerId
        }
        
      self.filters = temp; 
    }

    function setUserId(){

      self.filters.userId = self.filtersPlaceholder.userIdOverride;
    }

    /**
     * Reset dates, manager and user ids, reload notes table
     * Note: this should be its own service
     */ 
    function filtersReset(){
      
      //unset placeholder filters
      self.filtersPlaceholder = {
        userIdOverride: null,
        userObject: null,
        managerObject: null
      }
      //unset main filters
      self.filters = {
        dateStart: defaultDate.start,
        dateEnd: defaultDate.end, 
        managerId: null,
        userId: null,
        
        sortKey: 'date', 
        sortDesc: true,

        limit: 20, 
        page: 1,
      } 
      //clear autocomplete directive input
      $scope.$broadcast('angucomplete-alt:clearInput', 'angucomplete-customer');


      filtersApply();
    }

    /**
     * Mark a flag to reset the self.filters.page number if the date, manager, or user ids changed 
     */ 
    function setResetPage(key){
      
      self.ui.dbug && console.log('Reset by '+key); 
      self.ui.shouldResetPage = true;
    }
  

    /**
     * Mark a flag to reset the self.filters.page number if the date, manager, or user ids changed 
     * AND set the filter input for userId 
     */ 
    function setResetPageAndUserOverride(){
  
      self.ui.dbug && console.log('Reset by '+key); 
      self.ui.shouldResetPage = true; 
      if(self.filtersPlaceholder.userObject && self.filtersPlaceholder.userObject != 'false')
        self.filtersPlaceholder.userIdOverride = self.filtersPlaceholder.userObject.originalObject.id;
    }
 
 
    //get initial note list 
    function filtersApply(){

      //update old filters
      self.filters.page = self.ui.shouldResetPage ? 1 : self.filters.page;
      self.ui.shouldResetPage = false; 

      var startDateIsInvalid = DatesService.compare(self.filters.dateStart, self.filters.dateEnd) != -1;
      if(startDateIsInvalid){
        self.ui.dateWarning = true;
        $timeout(function(){ 
          self.ui.dateWarning = false;
        },5000);
      }
        

      self.ui.dateWarning = false;
      self.ui.mainLoader = false;
      self.ui.mainError = false;
      self.filters.page = parseInt(self.filters.page);

      //holds customer ID   
      if(self.filtersPlaceholder.userIdOverride)
        self.filters.userId = self.filtersPlaceholder.userIdOverride;
      else if(self.filtersPlaceholder.userObject && self.filtersPlaceholder.userObject != 'false')
        self.filters.userId = self.filtersPlaceholder.userObject.originalObject.id;   
      else if(!self.filters.userId){

        //clear autocomplete directive input
        $scope.$broadcast('angucomplete-alt:clearInput', 'angucomplete-customer');
        delete self.filters.userId;
      }
 
      //holds manager ID   
      if(self.filtersPlaceholder.managerObject && self.filtersPlaceholder.managerObject != '')
        self.filters.managerId = self.filtersPlaceholder.managerObject.id;   
      else if(!self.filters.managerId)
        delete self.filters.managerId;
         
      $location.search(self.filters); 
      SpreadService.getSpreads(self.filters, function(err, res) {
        
        self.ui.mainLoader = true;
        if(err)
          return self.ui.mainError = true;
 
        if(res.rows.length==0)
          self.ui.mainError = true;
        self.data.reports = res.rows;
      }); 
    }

    
    /**
     * Check which filter to use (date | user name | manager name), and if show de/ascending order
     * Note: need switch statements since url parameters are all passed as strings
     */ 
    function sortingApply(key){ 

      if(self.filters.sortKey==key){ 
        self.filters.sortDesc = self.filters.sortDesc ? false : true; 
      }else{
        self.filters.sortKey = key;
        self.filters.sortDesc = true; 
      }
      filtersApply(); 
    }

    /**
     * If userId exists, populate the user filter
     * Note: this needs to be patched by changing the way that autocomplete directive parses its results
     */ 
    function getFitlerUserName(){

      var user = self.filtersPlaceholder.userObject;
      if(user && user.originalObject && user.originalObject.first && user.originalObject.last)
        return user.originalObject.first + ' ' + user.originalObject.last;  
    }
  
    //to number rows, return current starting index for first row in the table
    function getIndexStart(index){

      return index + ((self.filters.page - 1) * self.filters.limit) + 1;
    }   

    function autocompleteRoute(){

        return '/api/'+$rootScope.ui.database+'/admin/customers?name=';
    }


    /**
     * Page animations and class functions
     */ 
    ;(function(){

      var panel = {
          collapsed: false
      }
 
      self.collapseToggle = collapseToggle; 
      self.collapseClassIcon = collapseClassIcon; 
      self.collapseClassPanel = collapseClassPanel; 
      self.sortingClass = sortingClass;  

      function collapseToggle(){
         
          panel.collapsed = !panel.collapsed;    
      }

      //get toggle class for collapsed table elements
      function collapseClassIcon(){

          if(panel.collapsed)
              return 'fa-angle-up';
          else
              return 'fa-angle-down'; 
      } 
      function collapseClassPanel(){

          if(panel.collapsed)
              return 'panel-toggled';  
      }   

      function sortingClass(key){

        if(self.filters.sortKey==key && self.filters.sortDesc)
          return 'active-down';
        else if(self.filters.sortKey==key && !self.filters.sortDesc)
          return 'active-up';
      } 
    
    })();
  }
 
}());