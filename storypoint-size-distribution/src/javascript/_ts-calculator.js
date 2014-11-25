Ext.define("StorypointDistributionCalculator", {
     extend: "Rally.data.lookback.calculator.BaseCalculator",
     numStoriesOutOfCompliance: 0,
     config: {
         max: 21,
         useFibinacci: true                       
     },
     constructor: function (config) {
         this.mergeConfig(config);
         this.lumenize = Rally.data.lookback.Lumenize;
     },
    prepareChartData: function (store) {
         var snapshots = [];
         store.each(function (record) {
             snapshots.push(record.raw);
         });

         return this.runCalculation(snapshots);
     },
     runCalculation: function(snapshots) {
         var series_hash = {};
         this.max_story_size = 0;
         this.numStoriesOutOfCompliance = 0;
         var project_counter = 0;
         
         var buckets = this._getChartBuckets();
         Ext.each(snapshots, function(d){
             var bucket_index = this._getBucketIndex(buckets, d.PlanEstimate);
             if (Number(d.PlanEstimate) > this.max_story_size){
                 this.max_story_size = d.PlanEstimate; 
             }
             if (series_hash[d.ScheduleState]==undefined){
                 series_hash[d.ScheduleState]=this._initializeSeriesArray(buckets);
             }
             series_hash[d.ScheduleState][bucket_index] += 1;
         },this);

         var series_array = [];

         Ext.each(Object.keys(series_hash), function(series){
             series_array.push({name: series, data: series_hash[series]});
         },this);
         
         return {
             series: series_array,
             categories: buckets,
             maxStorySize: this.max_story_size,
             numStoriesOutOfCompliance: this.numStoriesOutOfCompliance
         };
     },
     _initializeSeriesArray: function(buckets){
         var arr = [];
         for (var i=0; i<buckets.length; i++){
             arr[i] =0;
         }
         return arr;
     },
     _getBucketIndex: function(buckets, number_to_bucket){
         if (!Ext.Array.contains([0,1,2,3,5,8,13,20,40,100], number_to_bucket)){
             console.log('outofcompliance',number_to_bucket);
             this.numStoriesOutOfCompliance++;
         }
         var num = Math.round(Number(number_to_bucket));
         for (var i=0; i<buckets.length; i++){
             if (num <= buckets[i]){
                 return i;
             }
         }
         return i-1;
     },
     _getChartBuckets: function(){
         var categories = [];
         if (this.useFibinacci){
             categories = [0,1,2,3,5,8,13,20];
             if (this.max > 20) {
                 categories.push(40);
                 if (this.max > 40){
                     categories.push(100);
                 }
             }
         } else {
             for(i=0; i<this.max;i++){
                 categories.push(i);
             }     
         }
         return categories;
     } 
});