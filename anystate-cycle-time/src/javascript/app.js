Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    groupField: 'ScheduleState',
    fromState: 'In-Progress',
    toState: 'Accepted',
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#message_box').update(this.getContext().getUser());
        Ext.create('AnystateCycleCalculator',{});
        this._createChart()
        
    },
    _createChart: function(){
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
                initial_state: this.fromState,
                final_state: this.toState,
                group_field: this.groupField
            },
            chartConfig: {
                chart: {
                    zoomType: 'xy',
                    type: 'line'
                },
                title: {
                    text: 'Defined to In-Progress'
                },
                xAxis: {
                    tickmarkPlacement: 'on',
                    tickInterval: 30,
                    title: {
                        text: 'Date Entered Final State'
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: 'Days'
                        }
                    }
                ]
            }
        });

    },
    _getStoreConfig: function(){
        var previous_value_group_field = '_PreviousValues.' + this.groupField;  
        
        return {
            find: {
                 Children: null,
                 _ProjectHierarchy: this.getContext().getProject().ObjectID,
                 _TypeHierarchy: {$in: ['HierarchicalRequirement']},
                 ScheduleState: {$in: [this.fromState, this.toState]}
     //            _ValidFrom: Rally.util.DateTime.add(new Date(),'day',-120)
            },
            fetch: ['ObjectID','ScheduleState','_ValidFrom','_ValidTo','_PreviousValues.ScheduleState'],
            hydrate: ['ScheduleState',"_PreviousValues.ScheduleState"],
            compress: true,
            sort: {
                _ValidFrom: 1
            },
            context: this.getContext().getDataContext(),
            limit: Infinity
        };
    }

});