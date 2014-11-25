Ext.define("LiveDefectCalculator", {
     extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",
     config: {
         multiplier: 1
     },
     constructor: function(config) {
         this.initConfig(config);
         this.callParent(arguments);
     },
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
                 "field": "OpenDefects",
                 "as": "OpenDefects",
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
         return seriesData[index].OpenDefects/seriesData[index].DerivedStoryPoints*this.multiplier;
     },
     getDerivedFieldsOnInput: function(){
         return [{
             f: this.getDerivedStoryPoints,
             as: 'StoryPoints'
         },{
             f: this.getDerivedLivingDefects,
             as: 'OpenDefects'
         }];
     },
     getDerivedFieldsAfterSummary: function(){
         var field_name = Ext.String.format('DefectsPer{0}StoryPoints', this.multiplier);
         return [{
             f: this.getDerivedLivingDefectsPerNStoryPoints,
             as: 'DefectsPerNStoryPoints',
             display: 'line',
             multiplier: this.multiplier
         }];
     }
 });