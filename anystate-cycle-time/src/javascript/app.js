Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    groupField: 'ScheduleState',
    items: [
        {xtype:'container',itemId:'selector_box', layout: {type: 'hbox'}, padding:5, flex: 1},
        {xtype:'container',itemId:'display_box'},
    ],
    
    launch: function() {
        
        this._validateProject().then({
            scope: this,
            success: function(){
              this._initializeApp(); 
            },
            failure: function(error){
                alert(error);
            }
        });
        
    },
    _initializeApp: function(){
        this.logger.log('_initializeApp');
        
        Ext.create('AnystateCycleCalculator',{});

        this.down('#selector_box').add({
            xtype: 'tsinfolink',
            title: 'Anystate Cycle Time App',
            informationHtml: this._getAppInformation()
        });
        this.down('#selector_box').add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-from-state',
            model: 'HierarchicalRequirement',
            field: 'ScheduleState',
            fieldLabel:  'Start',
            labelAlign: 'right',
            labelWidth: 50,
            margin: 10
        });
        this.down('#selector_box').add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-to-state',
            model: 'HierarchicalRequirement',
            field: 'ScheduleState',
            fieldLabel:  'End',
            labelAlign: 'right',
            labelWidth: 50,
            margin: 10
           
        });
        this.down('#selector_box').add({
            xtype: 'rallycombobox',
            itemId: 'cb-granularity',
            store: ['Week','Month'],
            fieldLabel:  'Granularity',
            labelAlign: 'right',
            labelWidth: 75,
            margin: 10
        });
        this.down('#selector_box').add({
            xtype: 'rallybutton',
            itemId: 'btn-update',
            text: 'Update',
            scope: this,
            margin: 10,
            handler: this._createChart
        });
        this.down('#selector_box').add({
            xtype: 'rallycombobox',
            itemId: 'cb-export-format',
            store: ['Combined','User Stories','Defects','Raw Data'],
            fieldLabel: 'Series to Export',
            labelWidth: 125,
            labelAlign: 'right',
            margin: 10
        });
        this.down('#selector_box').add({
            xtype: 'rallybutton',
            itemId: 'btn-export',
            text: 'Export',
            scope: this,
            margin: 10,
            disabled: true, 
            handler: this._exportData
        });        
    },
    _validateProject: function(){
        var deferred = Ext.create('Deft.Deferred');
        var project = this.getContext().getProject();
        var me = this; 
        Rally.data.ModelFactory.getModel({
            type: 'Project',
            success: function(model) {
                scope: this,
                model.load(project.ObjectID, {
                    fetch: ['Children'],
                    callback: function(result, operation){
                        me.logger.log('_validateProject',result,operation);
                        if (operation.wasSuccessful()){
                            if (result.get('Children').Count > 0 ){
                                me.logger.log('_validateProject failed due to children',result.get('Children').Count);
                                deferred.reject('Currently selected Team contains children.  Please select a Team with no children from the Project selector.');
                            } else {
                               deferred.resolve(); 
                            }
                        } else {
                            me.logger.log('_validateProject failed due to error',operation);

                            deferred.reject ('Unable to validate project due to an error loading the project.');
                        }
                    }
                });
            }
        });

        return deferred; 
    },
    _getStartState: function(){
        return this.down('#cb-from-state').getValue();
    },
    _getEndState: function(){
        return this.down('#cb-to-state').getValue();
    },
    _getGranularity: function(){
        return this.down('#cb-granularity').getValue();
    },
    _getTickInterval: function(granularity){
        var tick_interval = 30;
        if (granularity == 'Week') {tick_interval = 5;}
        if (granularity == 'Month'){ tick_interval = 1;}
        return tick_interval;  
    },
    _exportData: function(){
        this.logger.log('_exportData');
        var export_data_type = this.down('#cb-export-format').getValue();
        var export_text = this.down('#rally-chart').calculator.exportData[export_data_type];
        var file_name = Ext.String.format('{0}-cycletime-{1}-to-{2}.csv',export_data_type, this._getStartState(), this._getEndState());
        Rally.technicalservices.FileUtilities.saveTextAsFile(export_text, file_name);
    },
    _validateSelectedStates: function(){
        var from_cb = this.down('#cb-from-state');
        var to_cb = this.down('#cb-to-state');
        
        var from_idx = from_cb.getStore().findExact(from_cb.getValueField(),from_cb.getValue());
        var to_idx = to_cb.getStore().findExact(to_cb.getValueField(),to_cb.getValue());
        
        return from_idx < to_idx;
    },
    _createChart: function(){
        this.logger.log('_createChart');
        
        var start_state = this.down('#cb-from-state').getValue();
        var end_state = this.down('#cb-to-state').getValue();

        if (!this._validateSelectedStates()){
            alert('The From State must come before the To State.');
            return;
        }
        
        var title_text = 'Average Cycle Time (Days) from ' + start_state + ' to ' + end_state;
        var granularity = this._getGranularity();
        var tick_interval = this._getTickInterval(granularity);  
        
        if (this.down('#rally-chart')){
            this.down('#rally-chart').destroy();
        }
        if (this.down('#summary-box')){
            this.down('#summary-box').destroy();
        }
        
        this.down('#display_box').add({
            xtype: 'rallychart',
            itemId: 'rally-chart',
            calculatorType: 'AnystateCycleCalculator',
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: this._getStoreConfig(),
            calculatorConfig: {
                startState: this._getStartState(),
                endState: this._getEndState(),
                granularity: granularity
            },
            chartConfig: {
                chart: {
                    zoomType: 'xy',
                    type: 'line'
                },
                title: {
                    text: title_text
                },
                xAxis: {
//                    tickmarkPlacement: 'on',
                    tickInterval: tick_interval,
                    title: {
                        text: 'Date Entered ' + end_state
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: 'Days'
                        }
                    }
                ],
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false
                        }
                    }
                },
            },
            listeners: {
                scope: this,
                readyToRender: function(chart){
                    this.down('#btn-export').setDisabled(false);
                    this._updateSummary(chart.calculator.summary);
                }
            }
        });

    },
    _getStoreConfig: function(){
       var start_state = this._getStartState();
       var end_state = this._getEndState(); 
        return {
            find: {
                 "Children": null,
                 "_ProjectHierarchy": this.getContext().getProject().ObjectID,
                 "_TypeHierarchy": {$in: ['HierarchicalRequirement','Defect']},
                 "ScheduleState": {$in: [start_state, end_state]},
                 "$or": [{"_PreviousValues.ScheduleState": {$exists: true}},
                      {"_SnapshotNumber": 0}]
                 },
            fetch: ['ObjectID','ScheduleState','_ValidFrom','_ValidTo','_PreviousValues.ScheduleState','_SnapshotNumber','_TypeHierarchy'],
            hydrate: ['ScheduleState',"_PreviousValues.ScheduleState", '_TypeHierarchy'],
            compress: true,
            sort: {
                _ValidFrom: 1
            },
            context: this.getContext().getDataContext(),
            limit: Infinity
        };
    },
    _updateSummary: function(summary_data){
        var summary_tpl = new Ext.Template('<div align="center">Artifacts that did not transition into the Start State: {noStartState}<br>Artifacts that did not transition into End State: {noEndState}<br> Artifacts with negative Cycle Time:  {negativeCycleTime}<br>Total Defects:  {Defect}<br>Total Stories:  {HierarchicalRequirement}<br>Total Artifacts:  {total}</div>');
        var summary = this.down('#display_box').add({
            xtype: 'container',
            itemId: 'summary-box',
            tpl: summary_tpl,
            flex: 1
        });
        summary.update(summary_data);
    },
    _getAppInformation: function(){
        return '<li>The selected Start ScheduleState must fall before the selected End ScheduleState in the workflow' +  
        '<li>Granularity:  If Week is selected, then cycle time will be aggregated for the week starting on the date shown on the x-axis.  Each week begins on a Monday.  If Month is selected, then cycle times will be aggregated for the Month.'  +
        '<li>Cycle time for an artifact is calculated in days.  Cycle time will be calculated from the first time the artifact enters the Start ScheduleState until the last time the artifact enters the End ScheduleState.' +
        '<li>Cycle time is only calculated for artifacts that have transitioned into the  Start ScheduleState and into the End ScheduleState.  If an artifact transitions into one of the selected states but not both, it will not be included into cycle time calculations.' +
        '<li>If an artifact transitions into the End ScheduleState before it transitions into the Start ScheduleState and never transitions back into the End ScheduleState, it will have a negative cycle time.  Negative cycle times are not included in cycle time calculations.' +
        '<li>Series data can be exported in CSV format using the Export button.' +
        '<li>The Raw Data export will export the individual cycle time values for each point of the selected granularity.'
    }

});