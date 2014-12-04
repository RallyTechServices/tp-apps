
Ext.define('AnystateCycleCalculator', {
    extend: 'Rally.data.lookback.calculator.BaseCalculator',
    fromState: "In-Progress",
    toState:"Accepted",
    groupField: 'ScheduleState',
    
    runCalculation: function(snapshots) {
        var final_state = this.toState;
        var initial_state = this.fromState;
        console.log('blah',initial_state,final_state,snapshots);
        
        /* iterate over the snapshots (each of which represents a transition
         * 1.  Save the ones that are transitioning INTO the initial state in a hash by object id so that
         *     we can retrieve it for the cycle time
         * 2.  For the ones that are transitioning INTO the final state, find the _validfrom from the hash
         *     and calculate the cycle time
         *     
         */
         var dates_by_oid = {};
         var start_date = Rally.util.DateTime.add(new Date(), "year", 50);
         var end_date = Rally.util.DateTime.add(new Date(), "year", -50);
         
         Ext.Array.each(snapshots, function(snapshot){
            // _PreviousValues.ScheduleState == null means we got created right into the state
            // _PreviousValues.ScheduleState == undefined means this particular change wasn't a transition (so we'll look for > 0)
            // TODO: check for just after the initial_state?  skipping is a problem to solve.
            var state = snapshot[this.groupField];
            
            if (dates_by_oid[snapshot.ObjectID] == undefined){
                dates_by_oid[snapshot.ObjectID] = {_finalDate: null, _startDate: null};
            }
            if (state == final_state && snapshot._ValidFrom && snapshot._PreviousValues 
                    && snapshot._PreviousValues.ScheduleState != undefined){
                dates_by_oid[snapshot.ObjectID]._finalDate = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);  
                console.log('final',snapshot.ObjectID, dates_by_oid[snapshot.ObjectID]._finalDate);
                if (Rally.util.DateTime.getDifference(dates_by_oid[snapshot.ObjectID]._finalDate,end_date,'day') > 0){
                    end_date = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);  
                    console.log(end_date, snapshot.ObjectID);
                } 
            }
            console.log('snapshot',snapshot);
            if (state == initial_state && snapshot._ValidFrom && snapshot._PreviousValues 
                    && snapshot._PreviousValues.ScheduleState != undefined){
                dates_by_oid[snapshot.ObjectID]._startDate = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);
                if (Rally.util.DateTime.getDifference(dates_by_oid[snapshot.ObjectID]._startDate,start_date,'day') < 0){
                    start_date = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);  
                } 
            }
         }, this);
         console.log('dates_by_oid',dates_by_oid);
         console.log('start,end dates',start_date,end_date);
         
         var categories = this._getCategories(start_date, end_date, dates_by_oid);
         console.log('categories', categories);
         
         var series = this._getSeries(categories, dates_by_oid);  
         console.log('series',series);
         
        return {
            series: series,
            categories: categories
        }
    },
    _getDateKey: function(d){
        return Rally.util.DateTime.format(d, 'Y-m-d');  
    },
    _getCategories: function(start_date, end_date, dates_by_oid){
        var categories = [];
        var i = 0;
        for (var d=start_date; d < end_date; d = Rally.util.DateTime.add(d,"day",1)){
            categories[i] = this._getDateKey(d);  
            i++;
        }
        return categories;  
    },
    _getSeries: function(categories, dates_by_oid){
        var stats_by_date = {}; 
        
        Ext.Object.each(dates_by_oid, function(oid, dates){
            if (dates._startDate && dates._finalDate) {
                var diff = Rally.util.DateTime.getDifference(dates._finalDate, dates._startDate,'day');
                dates_by_oid[oid]._cycleTime = diff;
                var fd_key = this._getDateKey(dates._finalDate);
               
                if (stats_by_date[fd_key] == undefined){
                    stats_by_date[fd_key] = {sum: 0, count: 0}; 
                }
                stats_by_date[fd_key].sum += diff;
                stats_by_date[fd_key].count++; 
            }
        },this);
        console.log(dates_by_oid);
        
        var data = [];
        Ext.each(categories, function(c){
            for (var i=0; i<categories.length; i++){
                var date_key = categories[i];
                if (stats_by_date[date_key] && stats_by_date[date_key].count > 0){
                    data[i] = stats_by_date[date_key].sum/stats_by_date[date_key].count;
                } else {
                    data[i] = 0;
                }
            }
        },this);
        
        return [{
             name: 'Average Cycle Time (',
             data: data
         }];
    },
    _getSeriesName: function(){
        return Ext.String.format('Average Cycle Time ({0} to {1})',this.fromState, this.toState);   
    },
    _getSnapsByFinalDate: function(dates_by_oid) {
        var oids_by_date = {};
        Ext.Object.each(dates_by_oid, function(oid, snapshot) {
            if ( snapshot._final_date ) {
                var key_date = snapshot._final_date;
                var short_date = snapshot._final_date.replace(/T.*$/,'');
                if ( ! snaps_by_date[short_date] ) {
                    snaps_by_date[short_date] = [];
                }
                snaps_by_date[short_date].push(snapshot);
            }
        });
        
        return snaps_by_date;
    },
    _getCycleTimes: function(snaps_by_date){
        var cycle_times_by_date = {};
        
        Ext.Object.each( snaps_by_date, function( key_date, snapshots ) {
            var time_array = [];
            Ext.Array.each(snapshots,function(snapshot){
                var begin_time = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);
                var end_time = Rally.util.DateTime.fromIsoString(snapshot._final_date);
                var cycle_time = Rally.util.DateTime.getDifference(end_time,begin_time,'day');
                time_array.push(cycle_time);
            });
            cycle_times_by_date[key_date] = Ext.Array.mean(time_array) || null;
        });
        
        return cycle_times_by_date;
    },
    _orderAndFillDateHash: function(snaps_by_date){
        // put existing keys in order:
        var filled_snaps = {};
       
        var keys = Ext.Object.getKeys(snaps_by_date);
        if ( keys.length > 0 ) {
            var min = Ext.Array.min(keys);
            var first_date = Rally.util.DateTime.fromIsoString(min);
            var today = new Date();
            
            var check_date = first_date;
            while( check_date < today ) {
                var iso_date = Rally.util.DateTime.toIsoString(check_date).replace(/T.*$/,"");
                filled_snaps[iso_date] = [];
                if ( snaps_by_date[iso_date] ) {
                    filled_snaps[iso_date] = snaps_by_date[iso_date];
                }
                check_date = Rally.util.DateTime.add(check_date,'day',1);
            }
        }
        return filled_snaps;
    }
});