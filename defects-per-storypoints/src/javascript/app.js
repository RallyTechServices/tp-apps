Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#message_box').update(this.getContext().getUser());
 
        var calculator = Ext.create('LiveDefectCalculator',{});
        var now = new Date();
        this.down('#display_box').add({
            xtype: 'rallychart',
            calculatorType: 'LiveDefectCalculator',
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: this._getStoreConfig(),
            calculatorConfig: {
                startDate: Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(now, 'day', -60),true),
                endDate: Rally.util.DateTime.toIsoString(new Date(),true)
            },
            chartConfig: {
                chart: {
                    zoomType: 'xy'
                },
                title: {
                    text: 'Live Defects Per Story Points'
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
                 _TypeHierarchy: {$in: ['HierarchicalRequirement','Defect']},
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