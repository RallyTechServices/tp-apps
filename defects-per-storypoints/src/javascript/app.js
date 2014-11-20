Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    MIN_DATE_RANGE_IN_DAYS: 15,
    items: [
        {xtype:'container',itemId:'date_box',layout: {type:'hbox'}, padding: 10},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    config: {
        defaultSettings: {
            N: 100,
            defaultDays: -30
        }
    },
    launch: function() {
        Ext.create('LiveDefectCalculator',{});

        
        this.down('#date_box').add({
            xtype: 'rallydatefield',
            fieldLabel: 'Start Date',
            labelWidth: 100,
            labelAlign: 'right',
            padding: 10,
            itemId: 'start-date-picker',
//            listeners: {
//                scope: this,
//                select: this._updateChart,
//                change: this._updateChart
//            }
        });
        
        this.down('#date_box').add({
            xtype: 'rallydatefield',
            fieldLabel: 'End Date',
            labelWidth: 100,
            padding: 10,
            labelAlign: 'right',
            itemId: 'end-date-picker',
//            listeners: {
//                scope: this,
//                select: this._updateChart,
//                change: this._updateChart
//            }
        });

        this.down('#date_box').add({
            xtype: 'rallynumberfield',
            fieldLabel: 'N',
            itemId: 'n-number',
            labelWidth: 100,
            padding: 10,
            value: Number(this.getSetting('N')),
            labelAlign: 'right',
            minValue: 1,
            maxValue: 1000
        });
        
        this.down('#date_box').add({
            xtype: 'rallybutton',
            text: 'Run',
            scope: this,
            itemId: 'run-button',
            margin: '10 10 10 50',
            handler: this._updateChart
        });

        
        this.down('#date_box').add({
            xtype: 'rallybutton',
            text: 'Export',
            scope: this,
            itemId: 'export-button',
            margin: '10 10 10 10',
            disabled: true,
            handler: this._exportProcessedData
        });
          
        this.down('#start-date-picker').setValue(Rally.util.DateTime.add(new Date(), 'day',this.getSetting('defaultDays')),true);
        this.down('#end-date-picker').setValue(new Date(),true);
        this._updateChart();
      
    },
    _exportProcessedData: function(){
        this.logger.log('_exportProcessedData');
        this.down('#export-button').setDisabled(true);
        //export
        var fileName = 'data.csv';
        var data = this.down('#rally-chart').getChartData();
        
        console.log(data);
        var text = Ext.String.format('Series Name,{0}\n', data.categories.join(','));
        Ext.each(data.series, function(dataset){
            text += Ext.String.format('{0},{1}\n',dataset.name,dataset.data.join(','));
        },this);

        Rally.technicalservices.FileUtilities.saveTextAsFile(text,fileName);
        
        this.down('#export-button').setDisabled(false);
    },
    _validateDateRange: function(newStartDate,newEndDate){
        this.logger.log('_validateDateRange', newStartDate, newEndDate);
        
        var currentStartDate = new Date(), currentEndDate = new Date();
        if (this.down('#rally-chart')){
            currentStartDate = this.down('#rally-chart').calculatorConfig.startDate, 
            currentEndDate = this.down('#rally-chart').calculatorConfig.endDate;
        }
        
        if (newStartDate && newEndDate && (Rally.util.DateTime.getDifference(newEndDate, newStartDate, 'day') > this.MIN_DATE_RANGE_IN_DAYS)){
            return true;
        }
        return false;
    },
    _updateChart: function(field, newValue){
        this.logger.log('_updateChart', newValue,this.down('#end-date-picker').getValue());
        this.down('#run-button').setDisabled(true);
        
        if (this._validateDateRange(this.down('#start-date-picker').getValue(), this.down('#end-date-picker').getValue())){
            this.down('#export-button').setDisabled(true);
            var newStartDate = Rally.util.DateTime.toIsoString(this.down('#start-date-picker').getValue(), true);
            var newEndDate = Rally.util.DateTime.toIsoString(this.down('#end-date-picker').getValue(),true); 
            var coefficient = this.down('#n-number').getValue(); //Number(this.getSetting('N'));

            this._createChart(newStartDate, newEndDate,coefficient);
            this.down('#run-button').setDisabled(false);
        }
    },
    _createChart: function(newStartDate, newEndDate, coefficient){
        if (this.down('#rally-chart')){
            this.down('#rally-chart').destroy();
        }
        
        this.down('#display_box').add({
            xtype: 'rallychart',
            itemId: 'rally-chart',
            calculatorType: 'LiveDefectCalculator',
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: this._getStoreConfig(),
            calculatorConfig: {
                startDate: newStartDate, //Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(new Date(), 'day', -60),true),
                endDate: newEndDate, //Rally.util.DateTime.toIsoString(new Date(),true)
                multiplier: coefficient
            },
            listeners: {
                scope: this,
                chartRendered: function(){
                    this.down('#export-button').setDisabled(false);
                }
            },
            chartConfig: {
                chart: {
                    zoomType: 'xy'
                },
                title: {
                    text: 'Live Defects Per ' + this.down('#n-number').getValue().toString() + ' Story Points'
                },
                xAxis: {
                    tickmarkPlacement: 'on',
                    tickInterval: 30,
                    title: {
                        text: ''
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: 'Story Points'
                        }
                    }
                ]
            }
        });

    },
    _getStoreConfig: function(){
        return {
            find: {
                $and: [{
                         Children: null,
                         _ProjectHierarchy: this.getContext().getProject().ObjectID,
                       },{
                           $or: [{
                               _TypeHierarchy: 'HierarchicalRequirement',
                               __At: 'current',
                               ScheduleState: 'Live'
                           },{
                               _TypeHierarchy: 'Defect',
                               ScheduleState: {$lt: 'Live'},
                           }]
                       }], 
//                 _TypeHierarchy: {$in: ['HierarchicalRequirement','Defect']},
            },
            fetch: ['ScheduleState','PlanEstimate','_TypeHierarchy','_ValidTo','_ValidFrom'],
            hydrate: ['ScheduleState','_TypeHierarchy'],
            compress: true,
            sort: {
                _ValidFrom: 1
            },
            context: this.getContext().getDataContext(),
            limit: Infinity
        };
    }
});