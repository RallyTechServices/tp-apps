Ext.define("LiveDefectCalculator", {
     extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",
     normalizationCoefficient: 100,
     runCalculation: function (snapshots) {
         var calculatorConfig = this._prepareCalculatorConfig(),
             seriesConfig = this._buildSeriesConfig(calculatorConfig);

         var calculator = this.prepareCalculator(calculatorConfig);
         calculator.addSnapshots(snapshots, this._getStartDate(snapshots), this._getEndDate(snapshots));
         
         
         return this._transformLumenizeDataToHighchartsSeries(calculator, seriesConfig);
     },
     getMetrics: function () {
         return [
             {
                 "field": "LivingDefects",
                 "as": "LiveDefects",
                 "display": "line",
                 "f": "sum"
             },{
                 "field": "StoryPoints",
                 "as": "DerivedStoryPoints",
                 "display": "line",
                 "f": "sum"
             }];
     },
     getDerivedStoryPoints: function(snapshot){
         if (Ext.Array.contains(snapshot._TypeHierarchy, 'HierarchicalRequirement') && (snapshot.ScheduleState == 'Live')){
             return snapshot.PlanEstimate || 0;
         }
         return 0;
     },
     getDerivedLivingDefects: function(snapshot){
         
         if (Ext.Array.contains(snapshot._TypeHierarchy, 'Defect') && (snapshot.ScheduleState != 'Live')){
             return 1; 
         }
         return 0;
     },
     getDerivedLivingDefectsPerNStoryPoints: function(snapshot,index,metrics,seriesData){
         console.log(index, metrics,seriesData);
         console.log(seriesData[index].LiveDefects,seriesData[index].DerivedStoryPoints,this.normalizationCoefficient);
         return seriesData[index].LiveDefects/seriesData[index].DerivedStoryPoints*100;
     },
     getDerivedFieldsOnInput: function(){
         return [{
             f: this.getDerivedStoryPoints,
             as: 'StoryPoints'
         },{
             f: this.getDerivedLivingDefects,
             as: 'LivingDefects'
         }];
     },
     getDerivedFieldsAfterSummary: function(){
         return [{
             f: this.getDerivedLivingDefectsPerNStoryPoints,
             as: 'DefectsPerNStoryPoints',
             display: 'line'
         }];
     }
 });