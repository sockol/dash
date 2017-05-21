(function () {
  'use strict';

  angular
    .module('spread')  
    .controller('SpreadSingleController', SpreadSingleController);
  
  SpreadSingleController.$inject = ['$scope', '$rootScope', '$timeout', '$state', '$location', '$stateParams', 'spreadResource', 'SpreadService'];

  function SpreadSingleController($scope, $rootScope, $timeout, $state, $location, $stateParams, spreadResource, SpreadService) {
    var self = this;

    //all animation flags on this module
    self.ui = {
      subLoader: false, 
      subError: false,
      mainLoader: false, 
      mainError: false,
      count: 0, 
      maxSize: 5,
      numPerPage: 10,  
      chart: null
    }  
 
    self.filters = { 
      page: 1,
      limit: 200, 
    }   

    self.data = {
      report: spreadResource.rows[0], //left column general info
      graph: null, //object to hold nvd3 graph

      trades: [], //full trades table
      tradesFiltered: [],//paginated trades table

      bars: [], //win/loss graph data
      lines: [], //total sum of win/loss graph data
    }

    $scope.slider = {
        minValue: 0,
        maxValue: 0,
        options: {
          onEnd: rebuildGraph,
          noSwitching: true,
          floor: 0,
          ceil: 100,
          getTickColor: function (){ return '#fff'; }, 
          getSelectionBarColor: function (){ return '#1caf9a'; }, 
          getPointerColor: function (){ return '#33414e'; }, 
          step: 1
        }
    }; 
   

    self.ui.mainLoader = true; 
    if(self.data.report){ 
      // self.data.report.reportAuthor = self.data.report.managerLeftNote ? 'Manager' : 'Customer'; 
    }else
      self.ui.mainError = true;
      
    self.getCurrentPage = getCurrentPage; 
    self.setCurrentPage = setCurrentPage; 
    self.isCurrentPage = isCurrentPage; 
    self.getPageCount = getPageCount; 

    self.filtersApply = filtersApply;  



    /**
     * Main functions to kick everything off
     */ 
    ;(function(){

 
      // //populate all filters
      updateFromUrl(); 
      filtersApply(); 
      $scope.$watch('currentPage', watchTrades);

      // $scope.$on('$locationChangeSuccess', function(event, newUrl, oldUrl){ 
         
      //   if($state.current.name=='spread.single'){

      //     updateFromUrl();
      //     filtersApply();  
      //   }
      // });
    })();


    /**
     * Main Pagination
     */  
    

    function getCurrentPage() {
      
      return self.filters.page;
    }

    function setCurrentPage(index) {
      var count = self.ui.count==0 ? 0 : Math.ceil(self.ui.count / self.filters.limit); 
      if(index > 0 && index <= count) 
        self.filters.page = index; 
      filtersApply();
    }

    function isCurrentPage(index) {

      return self.filters.page == index;
    }
    
    function getPageCount() {

      if(self.ui.count==0)
        return 0;

      return Math.ceil(self.ui.count / self.filters.limit);
    }  

    function filtersApply(){

      if(!self.data.report)
        return;

      $location.search(self.filters);
      SpreadService.getTrades({
        userId: self.data.report.userId, 
        page: self.filters.page,
        limit: self.filters.limit,  
      }, function(err, res){
         
        self.ui.subLoader = true;
        self.ui.count = res.count;

        if(err)
          self.ui.subError = true;

        buildData(res.rows); 
        buildGraph(); 
   
        $scope.currentPage = 1;; 
      }); 
      
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
          temp[key] = parseInt(val); 
        } 
      }  
      self.filters = temp; 
    }


    function buildData(rows){

      var balancePrev;
      var balanceCurr;  

      self.data.bars = [];
      self.data.lines = [];
      self.data.trades = []; 
  
      for(var key=0;key<rows.length;key++){ 
        var row = rows[key];

        balancePrev = key > 0 ? rows[key-1].balance : 0;
        balanceCurr = row.balance;
        var colorClass = row.status == 'won' ? 'text-success' : 
                         row.status == 'tie' ? 'text-warning' :
                         'text-danger';

        self.data.bars.push([row.date.timestamp, row.win]); 
        self.data.lines.push([row.date.timestamp, balanceCurr]);
        self.data.trades.push({
          win: row.win,
          balance: balanceCurr,
          date: row.date.formatted,
          spread: row.spread,
          class: colorClass,
          classChange: balancePrev < balanceCurr ? 'glyphicon-arrow-up '+colorClass : 
                       balancePrev > balanceCurr ? 'glyphicon-arrow-down '+colorClass :
                       '',
          balanceIsHidden: key == 0 || balanceCurr == balancePrev,
          assetName: row.assetName,
        });
      };
 
      $scope.slider.options.ceil = self.data.trades.length; 
      $scope.slider.maxValue = self.data.trades.length;  
    }

    function buildGraph(){

      self.data.graph = [{  
          key: 'Total Profit',
          color: '#333',
          values: self.data.lines.slice($scope.slider.minValue, $scope.slider.maxValue)
      },{ 
          key: 'Profit/Loss',
          bar: true,
          color: '#1caf9a',
          values: self.data.bars.slice($scope.slider.minValue, $scope.slider.maxValue) 
      }];


      nv.addGraph(function() {
            d3.selectAll("svg > *").remove();
            self.ui.chart = nv.models.linePlusBarChart()
                    .margin({top: 30, right: 60, bottom: 50, left: 70})
                    //We can set x data accessor to use index. Reason? So the bars all appear evenly spaced.
                    .x(function(d,i) { return i })
                    .y(function(d,i) {return d[1] });
                    
            // var tickMultiFormat = d3.time.format.multi([
            //     ["%-I:%M%p", function(d) { return d.getMinutes(); }], // not the beginning of the hour
            //     ["%-I%p", function(d) { return d.getHours(); }], // not midnight
            //     ["%b %-d", function(d) { return d.getDate() != 1; }], // not the first of the month
            //     ["%b %-d", function(d) { return d.getMonth(); }], // not Jan 1st
            //     ["%Y", function() { return true; }]
            // ]);

            // chart.xAxis
            //     .showMaxMin(false)
            //     // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
            //     .tickPadding(10)
            //     .tickFormat(function (d) { return tickMultiFormat(new Date(d)); })
            //     ;

            self.ui.chart.xAxis.tickFormat(function(d) {
                var dx = self.data.graph[0].values[d] && self.data.graph[0].values[d][0] || 0;
                return d3.time.format('%x')(new Date(dx));
                // return d3.time.format('%b %-d, %Y %I:%M%p')(new Date(dx)); 
            });

            self.ui.chart.y1Axis
                .tickFormat(d3.format(',f'));

            self.ui.chart.y2Axis
                .tickFormat(function(d) { return '$' + d3.format(',f')(d) });

            self.ui.chart.bars.forceY([0]);
            d3.select('#chart svg')
                .datum(self.data.graph)
                .transition()
                .duration(0)
                .call(self.ui.chart);


            // set up the tooltip to display full dates
            // var tsFormat = d3.time.format('%b %-d, %Y %I:%M%p');
            // var contentGenerator = chart.interactiveLayer.tooltip.contentGenerator();
            // var tooltip = chart.interactiveLayer.tooltip;
            // tooltip.contentGenerator(function (d) { d.value = d.series[0].data.x; return contentGenerator(d); });
            // tooltip.headerFormatter(function (d) { return tsFormat(new Date(d)); });


            nv.utils.windowResize(self.ui.chart.update);

            return self.ui.chart;
        }); 
    };

    function rebuildGraph(){

      self.data.graph[0].values = self.data.lines.slice($scope.slider.minValue, $scope.slider.maxValue);
      self.data.graph[1].values = self.data.bars.slice($scope.slider.minValue, $scope.slider.maxValue);
      
      // Update the SVG with the new data and call chart
      d3.select('#chart svg').datum(self.data.graph).transition().duration(500).call(self.ui.chart);
      nv.utils.windowResize(self.ui.chart.update);
    }

    function watchTrades(){
      
        var begin = (($scope.currentPage - 1) * self.ui.numPerPage)
        , end = begin + self.ui.numPerPage; 

        self.data.tradesFiltered = self.data.trades.slice(begin, end);  
    }



 
    /**
     * Panel animations and class functions
     */ 
    ;(function(){


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
    })(); 
   
  }
 
}());