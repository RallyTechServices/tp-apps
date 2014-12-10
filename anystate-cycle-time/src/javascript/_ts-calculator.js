
Ext.define('AnystateCycleCalculator', {
    extend: 'Rally.data.lookback.calculator.BaseCalculator',
    groupField: 'ScheduleState',
    
    runCalculation: function(snapshots) {
        var final_state = this.endState;
        var initial_state = this.startState;
        
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
                var object_type = snapshot._TypeHierarchy.slice(-1)[0];
                dates_by_oid[snapshot.ObjectID] = {_finalDate: null, _startDate: null, _type: object_type};
            }
            if (state == final_state && snapshot._ValidFrom && ((snapshot._PreviousValues 
                    && snapshot._PreviousValues.ScheduleState != undefined) ||  (snapshot._SnapshotNumber == 0))){

                dates_by_oid[snapshot.ObjectID]._finalDate = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);  

                if (Rally.util.DateTime.getDifference(dates_by_oid[snapshot.ObjectID]._finalDate,end_date,'day') > 0){
                    end_date = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);  

                } 
            }

            if (state == initial_state && snapshot._ValidFrom && ((snapshot._PreviousValues 
                    && snapshot._PreviousValues.ScheduleState != undefined) || (snapshot._SnapshotNumber == 0))){ //0 means that this is the first snapshot
                var diff = 0; 
                if (dates_by_oid[snapshot.ObjectID]._startDate){
                    var diff = Rally.util.DateTime.getDifference(new Date(dates_by_oid[snapshot.ObjectID]._startDate), new Date(snapshot._ValidFrom),'day');
                }
                if (diff >= 0){  //we want the earliest date this transitioned into the start state
                    dates_by_oid[snapshot.ObjectID]._startDate = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);
                }

                if (Rally.util.DateTime.getDifference(dates_by_oid[snapshot.ObjectID]._startDate,start_date,'day') < 0){
                    start_date = Rally.util.DateTime.fromIsoString(snapshot._ValidFrom);  
                } 
            }
         }, this);
         
         var categories = this._getCategories(start_date, end_date, dates_by_oid, this.granularity);
   //      console.log('categories', categories);

         var series = [];
         series.push(this._getSeries(categories, dates_by_oid, this.granularity));  
         series.push(this._getSeries(categories, dates_by_oid, this.granularity,'HierarchicalRequirement'));  
         series.push(this._getSeries(categories, dates_by_oid, this.granularity,'Defect'));  
 //        console.log('series',series);
         
        return {
            series: series,
            categories: categories
        }
    },
    _getDateKey: function(d, granularity){
        switch(granularity){
            case 'Week':
                return 'Week' + Rally.util.DateTime.format(d, 'W y');
            case 'Month':
                return Rally.util.DateTime.format(d, 'M y');
            default:
        }
        return Rally.util.DateTime.format(d, 'Y-m-d');  
    },
    
    _getCategories: function(start_date, end_date, dates_by_oid, granularity){
        var categories = [];
        for (var d=start_date; d < end_date; d = Rally.util.DateTime.add(d,"day",1)){
            var date_key = this._getDateKey(d, granularity);  
            if (!Ext.Array.contains(categories, date_key)){
                categories.push(date_key);
            }
        }
        return categories;  
    },
    
    _getSeries: function(categories, dates_by_oid, granularity, type){
        var stats_by_date = {}; 
        var summary = {noStartState: 0, noEndState: 0, negativeCycleTime: 0, total: 0, Defect: 0, HierarchicalRequirement: 0};

        Ext.Object.each(dates_by_oid, function(oid, dates){
            if (dates._startDate && dates._finalDate && (type == undefined || dates._type == type )) {
                var diff = Rally.util.DateTime.getDifference(dates._finalDate, dates._startDate,'day');
                dates_by_oid[oid]._cycleTime = diff;
                var fd_key = this._getDateKey(dates._finalDate, granularity);

                if (diff < 0){
                    summary.negativeCycleTime++;
                }
                    
                if (stats_by_date[fd_key] == undefined ){
                    stats_by_date[fd_key] = []; 
                }
                stats_by_date[fd_key].push(diff)
            } else {
                if (dates._startDate == null) {
                    summary.noStartState++;
                }
                if (dates._finalDate == null){
                    summary.noEndState++;
                }
            }
            summary.total++; 
            summary[dates._type]++;
        },this);
        
        var data = [];
        var export_data ='';  
            for (var i=0; i<categories.length; i++){
                var date_key = categories[i];
                data[i]=0;
                var sdev = 0;
                var count = 0;
                if (stats_by_date[date_key] && stats_by_date[date_key].length > 0){
                    count = stats_by_date[date_key].length;
                    sdev = this._getStandardDeviation(stats_by_date[date_key]);
                    data[i] = Math.max(Ext.Array.mean(stats_by_date[date_key]),0); 
                } 
                if (export_data.length == 0){
                    export_data = "Date,Avg Cycle Time,Artifact Count,Standard Deviation\n";
                }
                export_data += Ext.String.format("{0},{1},{2},{3}\n",date_key,data[i], count, sdev);
            }
        
        if (type == undefined){
            this.exportData = export_data;
            this.summary = summary;  
        }
        
        return {
             name: this._getSeriesName(type),
             data: data,
             display: 'line'
         };
    },
    _getStandardDeviation: function(vals){
        var avg = Ext.Array.mean(vals);
        
        var sq_diff_array = vals.map(function(v){
          var diff = v - avg;
          var sq_diff = diff * diff;
          return sq_diff;
        });
        var avg_sq_diff = Ext.Array.mean(sq_diff_array);
       
        var sdev = Math.sqrt(avg_sq_diff);
        return sdev;        
    },
    _getSeriesName: function(type){
        var type_text = "Combined";
        if (type) {
            type_text = type;
            if (type == 'HierarchicalRequirement'){
                type_text = "User Story";
            }
        }
        return Ext.String.format(type_text);   
    },

});