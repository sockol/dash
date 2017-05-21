'use strict';



/**
 * Module dependencies
 */
var path = require('path'),
  sequelize = require(path.resolve('./config/lib/sequelize-postgres')),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

var Payload = function(){

  return {
    error: true,
    errorMessage: '',
    payload: null
  }
}
 
   
var getList = function(database, searchStr, replacements, filters, callback){

  var order = filters.sortDesc ? ' DESC ' : 
              ' ASC ';   
  var filterKey = filters.sortKey=='manager' ? 'ORDER BY minima.manager_name '+order : ' ORDER BY minima.received_at DESC'; 
  var expandSearchStr = filters.sortKey=='manager' ? 'AND WHERE minima.manager_name IS NOT NULL' : '';

  var reports = {};  
  var str = [  
      "SELECT",
        " minima.user_id" ,
        ",minima.received_at",
        ",minima.account_id",
        ",minima.user_name",
        ",minima.manager_name",
        ",minima.user_email",
        ",minima.manager_email",
        ",minima.customers_id",
        ",minima.manager_id",
      "FROM (",
        "SELECT DISTINCT ON (accounts.user_id) user_id",
          ",accounts.received_at",
          ",accounts.id AS account_id",
          ",customers.firstname || ' ' || customers.lastname AS user_name",
          ",managers.name AS manager_name",
          ",customers.email AS user_email",
          ",managers.email AS manager_email",

          ",customers.id AS customers_id",
          ",managers.id AS manager_id", 

        "FROM server.updated_account AS accounts",
        "LEFT JOIN server.customers AS customers ON (accounts.user_id=customers.id)",
        "LEFT JOIN server.users AS managers ON (accounts.manager=managers.id)",
        "WHERE 1=1",
          searchStr, 
          expandSearchStr,
        "ORDER BY accounts.user_id",
      ") AS minima",
      filterKey,
      "OFFSET "+filters.offset,
      "LIMIT "+filters.limit  
  ].join(" \n");  
     
  var res = new Payload();

  sequelize.getPostgres(database).query(str, {
      replacements: replacements,
      type: sequelize.getPostgres(database).QueryTypes.SELECT 
  }).then(function(results){

      var ids = []; 
      var reports = {};
      results.map(function(item){
        ids.push("'"+item.user_id+"'");  
        var result = {

          reportId: item.account_id,
          managerId: item.manager_id,
          userId: item.user_id,

          userName: item.user_name,
          userEmail: item.user_email,
          managerName: item.manager_name,
          managerEmail: item.manager_email,
          hasTransactions: false,
        }  
        reports[result.userId] = result;   
      }); 
      
      if(ids.length==0){

        res.error = false;
        res.payload = []; 
      
        if(callback)
          callback(res);
        return null; 
      }
     
      str = [
        "; WITH minima AS (",
 
            "SELECT p.* ",
            "FROM server.positions AS p ",
            "WHERE 1=1",
            "AND p.customer IN ("+ids+") ",
            "AND p.demo=FALSE",
        ") ",

        "SELECT DISTINCT ON (accounts.customer) customer", 
          ", accounts.customer AS user_id",
          ", (SELECT SUM(p.payout - p.amount) FROM minima AS p WHERE accounts.customer=p.customer) as sum", 
          
          ", (SELECT TO_CHAR(p.createdon, 'Mon DDth, YYYY') FROM minima as p WHERE accounts.customer=p.customer ORDER BY p.createdon ASC LIMIT 1) as createdon_start",
          ", (SELECT TO_CHAR(p.createdon, 'Mon DDth, YYYY') FROM minima as p WHERE accounts.customer=p.customer ORDER BY p.createdon DESC LIMIT 1) as createdon_end",
         
        "FROM minima AS accounts",  
      ].join(" \n");   
    
      sequelize.getPostgres(database).query(str, {
          replacements: replacements,
          type: sequelize.getPostgres(database).QueryTypes.SELECT 
      }).then(function(results){
         
        results.map(function(item){  
          var report = reports[item.user_id]; 

          //sometimes users have no transactions to report  
          if(report){

            report.hasTransactions = true;  

            report.sum = parseInt(item.sum) / 100; 
            report.author = null;
            report.date = {
              start: item.createdon_start,
              end: item.createdon_end,
            }; 
          }  
        });
  
        //copy reports object into a list
        var arr = [];
        for(var key in reports){
          var val = reports[key];

          //filter out no trades, for now
          if(val.hasTransactions)
            arr.push(val);
        } 
        
        res.error = false;
        res.payload = arr; 
      
        if(callback)
          callback(res);
        return null; 
      });  
      return null;

  }).catch(function(err) {
  
    res.errorMessage = err;
    if(callback)
      callback(res);
    return null; 
  }); 
}

var buildListQuery = function(parameters){

  var dateStart = parameters.dateStart || false; 
  var dateEnd = parameters.dateEnd || false;       
   
  var userId = parameters.userId || false;  
  var managerId = parameters.managerId && parameters.managerId != 'all' ? parameters.managerId : false;   
   
  var str = '';  
  if(userId && managerId && managerId != 'none')
    str += "AND accounts.user_id=:userId AND accounts.manager=:managerId ";
  else if(userId && managerId && managerId == 'none')
    str += "AND accounts.user_id=:userId AND accounts.manager IS NULL ";
  else if(userId)
    str += "AND accounts.user_id=:userId ";
  else if(managerId=='none')
    str += "AND accounts.manager IS NULL ";
  else if(managerId)
    str += "AND accounts.manager=:managerId ";
  
  var replacements = {
    dateStart: dateStart,
    dateEnd: dateEnd, 
    userId: userId,
    managerId: managerId,
  }
  return {
    str: str,
    replacements: replacements
  };
}

/**
 * List of Articles
 */
exports.list = function (req, res) {
   
  var parameters = req.query;

  var query = buildListQuery(parameters);
  var replacements = query.replacements;
  var str = query.str;
 
  var database = req.params ? req.params.db : 'gc'; 
  var limit = parameters.limit <= 50 ? parameters.limit : 10;
  var page = parameters.page || 1;
  var offset = limit * (page - 1);

  var filters = {
    limit: limit,
    offset: offset, 
    sortKey: parameters.sortKey || false,
    sortDesc: parameters.sortDesc=='false' ? false : true,
  } 

  var count = {
    payload:1,//always 1 because pagination only has prev/next   
    error:false
  } 
  function helper(count, rows){

    if(!count.error && !rows.error){ 

      res.json({
        count: count.payload,
        rows:  rows.payload
      });

    }else{  

      res.status(400).send({
        message: count.error ? count.errorMessage : rows.errorMessage
      }); 
    }
  }
 
  getList(database, str, replacements, filters, function(rows){ 
       
      helper(count, rows);
  }); 
};
 





  
var tradesByIDCount = function(database, replacements, callback){

  var str = [
      "SELECT",
        "COUNT(p.id)",
      "FROM server.positions AS p",
      "WHERE 1=1",
        "AND p.customer=:customerId",
        "AND p.demo=FALSE",
  ].join(" \n"); 

  var response = new Payload();

  sequelize.getPostgres(database).query(str, {
      replacements: replacements,
      type: sequelize.getPostgres(database).QueryTypes.SELECT 
  }).then(function(results){
 
      if(results && results[0]){ 

        response.error = false;
        response.payload = results[0].count; 
      } 

      if(callback)
        callback(response);
      return null;
  }).catch(function(err) {

      res.errorMessage = err;
      if(callback)
        callback(response);
      return null;
  }); 
}
 
var tradesByIDList = function(database, replacements, filters, callback){

  var str = [
      "SELECT",
        " p.*",    

        ", p.status AS transaction_status",

        ",(",
        "   DATE_PART('minute', NOW()::timestamp - p.received_at::timestamp)",
        " + (DATE_PART('hours', NOW()::timestamp - p.received_at::timestamp) * 60)",
        " + (DATE_PART('day', NOW()::timestamp - p.received_at::timestamp) * 60 * 24)",
        " + (DATE_PART('month', NOW()::timestamp - p.received_at::timestamp) * 60 * 24 * 30)",
        " + (DATE_PART('year', NOW()::timestamp - p.received_at::timestamp) * 60 * 24 * 30 * 365)",
        ") AS minutes ",    
 
        ",EXTRACT(EPOCH FROM p.received_at AT TIME ZONE 'UTC') AS timestamp",

        ",to_char(p.received_at, 'YYYY') AS year",
        ",to_char(p.received_at, 'MM') AS month",
        ",to_char(p.received_at, 'DD') AS day",

        ",to_char(p.received_at, 'HH24') AS hour",
        ",to_char(p.received_at, 'MI') AS minute",
        ",to_char(p.received_at, 'SS') AS second",

        ",to_char(p.received_at, 'FMMonth') AS month_fromatted",
        ",to_char(p.received_at, 'FMDDth') AS day_fromatted",

      "FROM server.positions AS p",  
      "WHERE 1=1",
        "AND p.customer=:customerId",
        "AND p.demo=FALSE",
      "ORDER BY p.received_at DESC",
      "OFFSET "+filters.offset,
      "LIMIT "+filters.limit  
    ].join(" \n");  
    
  var response = new Payload();

  sequelize.getPostgres(database).query(str, {
      replacements: replacements,
      type: sequelize.getPostgres(database).QueryTypes.SELECT 
  }).then(function(results){
      
    var arr = []; 
    var balance = 0;
    results.map(function(item){

      item.payout = item.payout || 0;
      item.amount = item.amount || 0;
      item.spread = item.spread || 0;
      item.amountbase = item.amountbase || 0;
      item.status = item.transaction_status || 0;  

      var win = parseInt(item.payout) - parseInt(item.amount);
      balance += win;

      arr.push({ 
        amount: parseInt(item.amount) / 100, 
        balance: balance / 100,  
        win: win / 100,  
        amountBase: parseInt(item.amountbase) / 100,
        spread: parseInt(item.spread) / 100,  
        assetName: item.assetname,  
        status: item.transaction_status,  

        date: {
          ago: item.minutes,
          timestamp: item.timestamp * 1000,
          formatted: item.month_fromatted + ' ' + item.day_fromatted + ', ' + item.year + ' ' + item.hour + ':' + item.minute,

          parts: {
            monthFromatted: item.month_fromatted, 
            dayFromatted: item.day_fromatted,

            year: parseInt(item.year),
            month: parseInt(item.month), 
            day: parseInt(item.day),
            hour: parseInt(item.hour),
            minute: parseInt(item.minute),
            second: parseInt(item.second),
          }, 
        },  
      }); 
    }); 
     
    response.error = false;
    response.payload = arr; 

    if(callback)
      callback(response);
    return null;

  }).catch(function(err) {
 
    response.errorMessage = err;
    if(callback)
      callback(response);
  }); 
}

/**
 * Article middleware
 */
exports.tradesByID = function(req, res){
 
  var database = req.params ? req.params.db : 'gc'; 
  var customerId = req.params ? req.params.customerId : ''; 

  var parameters = req.query;   
  var limit = parameters.limit <= 100 ? parameters.limit : 100;
  var page = parameters.page || 1;
  var offset = limit * (page - 1);

  var replacements = {
    customerId: customerId,  
  }
 
  var filters = {
    limit: limit,  
    offset: offset,  
  }
 
  function helper(count, rows){

    if(!count.error && !rows.error){ 

      res.json({
        count: count.payload,
        rows:  rows.payload
      });

    }else{  

      res.status(400).send({
        message: count.error ? count.errorMessage : rows.errorMessage
      }); 
    }
  }

  tradesByIDCount(database, replacements, function(count){
    tradesByIDList(database, replacements, filters, function(rows){
      helper(count, rows);
    });
  });  
}

exports.reportByID = function (req, res, next, reportId) {
  
  var database = req.params ? req.params.db : 'gc'; 
  sequelize.getPostgres(database).query([
    "SELECT",
      " accounts.id AS account_id",
      ",customers.firstname || ' ' || customers.lastname AS user_name",
      ",managers.name AS manager_name",
      ",customers.email AS user_email",
      ",managers.email AS manager_email",

      ",customers.id AS customers_id",
      ",managers.id AS manager_id", 

    "FROM server.updated_account AS accounts",
    "LEFT JOIN server.customers AS customers ON (accounts.user_id=customers.id)",
    "LEFT JOIN server.users AS managers ON (accounts.manager=managers.id)", 
    "WHERE 1=1",
    "  AND accounts.id=:reportId" 
  ].join(" \n"), {
      replacements: {
        reportId: reportId
      },
      type: sequelize.getPostgres(database).QueryTypes.SELECT 
  }).then(function(results){
      
      if(!results || results.length==0)
          return res.json({
            count: 0,
            rows:  []
          });

      var item = results[0];
      var report = {
          reportId: item.account_id, 
          managerId: item.manager_id,
          userId: item.customers_id,  
           
          userName: item.user_name,
          userEmail: item.user_email,
          managerName: item.manager_name,
          managerEmail: item.manager_email,
 
          author: null, 
      }; 
 
      sequelize.getPostgres(database).query([  
        
        "; WITH minima AS (",
 
            "SELECT p.* ",
            "FROM server.positions AS p ",
            "WHERE p.customer=:userId ",
        ") ",

        "SELECT DISTINCT ON (accounts.customer) customer", 
          ", accounts.customer AS user_id",
          // total $ won
          ", (SELECT SUM(NULLIF(p.payout,0) - NULLIF(p.amount,0)) FROM minima AS p WHERE accounts.customer=p.customer) as sum",
           
          ", (SELECT to_char(p.createdon, 'Day Mon, YYYY') FROM minima as p WHERE accounts.customer=p.customer ORDER BY p.createdon ASC LIMIT 1) as createdon_start",
          ", (SELECT to_char(p.createdon, 'Day Mon, YYYY') FROM minima as p WHERE accounts.customer=p.customer ORDER BY p.createdon DESC LIMIT 1) as createdon_end",
         
        "FROM minima AS accounts", 

      ].join(" \n"), {
          replacements: {
            userId: report.userId
          },
          type: sequelize.getPostgres(database).QueryTypes.SELECT 
      }).then(function(results){
            
          if(!results || results.length==0)
            return res.json({
              count: 0,
              rows:  []
            });

          item = results[0];
          report.sum = parseInt(item.sum) / 100; 
          report.date = {
            start: item.createdon_start,
            end: item.createdon_end,
          }; 
          
          res.json({
            count: 1,
            rows:  [report]
          });
        return null;

      }).catch(function(err) {
     
          res.status(400).send({
            message: err
          }); 
        return null;
      }); 
      return null;

  }).catch(function(err) {
 
      res.status(400).send({
        message: err
      }); 
      return null;
  }); 
}; 


