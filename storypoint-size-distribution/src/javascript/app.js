Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'selection_box'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    title: 'Storypoint Distribution',
    launch: function() {

        this.down('#display_box').add({
            xtype: 'container',
            itemId: 'chart-stats',
            tpl: 'Max Story Size: <tpl>{maxStorySize}<br>Number of Stories out of compliance: {numStoriesOutOfCompliance}</tpl>'
        });

        var cb = this.down('#selection_box').add({
           xtype: 'rallycombobox',
           fieldLabel: 'Max Bucket',
           store: [20,40,100],
           listeners: {
               scope: this,
               change: this._updateChart
           }
       }); 
       cb.setValue(20);
       
    },
    _updateChart: function(cb, newValue){
        if (this.down('#rally-chart')){
            this.down('#rally-chart').destroy();
        }
        
        this.down('#display_box').add({
            xtype: 'rallychart',
            itemId: 'rally-chart',
            loadMask: false,
            chartConfig: this._getChartConfig(),
            calculatorType: 'StorypointDistributionCalculator',
            calculatorConfig: {
                max: newValue,
                useFibinacci: true
            },
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: {
                    _TypeHierarchy: 'HierarchicalRequirement',
                    Children:null,
                    __At: "current",
                    _ProjectHierarchy: this.getContext().getProject().ObjectID
               },
               fetch: ['ScheduleState', 'PlanEstimate'],
               hydrate: ['ScheduleState']
            },
            listeners: {
                scope: this,
                chartRendered: function(chart){
                    console.log(chart.getChart());
                    this.down('#chart-stats').update(chart.chartData)
                }
            }
       });

    },
    _getChartConfig: function() {
        return {
            chart: {
                type: 'column'
            },
            title: {
                text: this.title
            },
            xAxis: {
                title: {
                    text: 'PlanEstimate'
                }
            },
            yAxis: {
                min: 0,
                    title: {
                    text: 'Number of Stories'
                }
            },
            subtitle: {
                text: 'subtitle'
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                    pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                    '<td style="padding:0"><b>{point.y:0f} stories</b></td></tr>',
                    footerFormat: '</table>',
                    shared: true,
                    useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                        borderWidth: 0,
                        stacking: 'normal'
                }
            }
        };
    }
});