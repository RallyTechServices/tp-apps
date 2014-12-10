Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    groupField: 'ScheduleState',
    items: [
        {xtype:'container',itemId:'selector_box', layout: {type: 'hbox'}, padding:5, tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        Ext.create('AnystateCycleCalculator',{});
        
        this.down('#selector_box').add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-from-state',
            model: 'HierarchicalRequirement',
            field: 'ScheduleState',
            fieldLabel:  'Start',
            labelAlign: 'right',
            margin: 10
        });
        this.down('#selector_box').add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-to-state',
            model: 'HierarchicalRequirement',
            field: 'ScheduleState',
            fieldLabel:  'End',
            labelAlign: 'right',
            margin: 10
           
        });
        this.down('#selector_box').add({
            xtype: 'rallycombobox',
            itemId: 'cb-granularity',
            store: ['Week','Month'],
            fieldLabel:  'Granularity',
            labelAlign: 'right',
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
            xtype: 'rallybutton',
            itemId: 'btn-export',
            text: 'Export',
            scope: this,
            margin: 10,
            disabled: true, 
            handler: this._exportData
        });
        
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
        var export_text = this.down('#rally-chart').calculator.exportData;
        var file_name = Ext.String.format('cycletime-{0}-to-{1}.csv')
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
        
        var start_state = this._getStartState();
        var end_state = this._getEndState();
        if (start_state >= end_state){
            alert('The From State must come before the To State.');
            return;
        }
        
        var title_text = 'Average Cycle Time (Days) from ' + start_state + ' to ' + end_state;
        var granularity = this._getGranularity();
        var tick_interval = this._getTickInterval(granularity);  

            
        
        
        if (this.down('#rally-chart')){
            this.down('#rally-chart').destroy();
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
                 "_PreviousValues.ScheduleState": {$exists: true}
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
        var summary_tpl = new Ext.Template('<div align="center">Artifacts with No Start State: {noStartState}<br>Artifacts with no End State: {noEndState}<br> Artifacts with negative Cycle Time:  {negativeCycleTime}<br>Total Defects:  {Defect}<br>Total Stories:  {HierarchicalRequirement}<br>Total Artifacts:  {total}</div>');
        var summary = this.down('#display_box').add({
            xtype: 'container',
            tpl: summary_tpl,
            flex: 1
        });
        summary.update(summary_data);
    }

});