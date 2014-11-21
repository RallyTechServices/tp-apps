Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    config: {
        defaultSettings: {
            maxBucket: 21
        }
    },
    launch: function() {
        console.log(this._getChartBuckets(21));
        //        this.down('#display_box').add({
//            xtype: 'rallychart',
//            loadMask: false,
//            chartData: this._getChartData(),
//            chartConfig: this._getChartConfig()
//        });
    },

    /**
     * Generate x axis categories and y axis series data for the chart
     */
    _getChartData: function() {
        var max = Number(this.getSetting('maxBucket'));  
        return {
            categories: this._getChartBuckets(max),
            series: [
                {
                    name: 'Tokyo',
                    data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4]

                },
                {
                    name: 'New York',
                    data: [83.6, 78.8, 98.5, 93.4, 106.0, 84.5, 105.0, 104.3, 91.2, 83.5, 106.6, 92.3]

                },
                {
                    name: 'London',
                    data: [48.9, 38.8, 39.3, 41.4, 47.0, 48.3, 59.0, 59.6, 52.4, 65.2, 59.3, 51.2]

                },
                {
                    name: 'Berlin',
                    data: [42.4, 33.2, 34.5, 39.7, 52.6, 75.5, 57.4, 60.4, 47.6, 39.1, 46.8, 51.1]

                }
            ]
        };
    },
    _getChartSeries: function(){
        //Series is an array of hashes that have StateName: Number of Stories that are bucketed in the fibinacci number on the x axis
        this._getRawData().then({
            scope:this,
            success: function(data){
                
            },
            failure: function(error, success){
                
            }
        });
        //bucket the data
    },
    _getChartBuckets: function(max){
        var categories = [];
        var x=0;
        for(i=0,j=1; x<max;i=j,j=x){
            x=i+j;
            categories.push(x);
        }        
        return categories;
    },
    _getRawData: function(){
        var deferred = Ext.create('Deft.Deferred');
        
        Ext.create('Rally.data.wsapi.Store', {
            model: 'User Story',
            autoLoad: true, 
            listeners: {
                load: function(store, data, success) {
                    if (success) {
                        deferred.resolve(data);
                    } else {
                        deferred.reject('Error loading story data', success);
                    }
                }
            },
            fetch: ['Name', 'ScheduleState','PlanEstimate'],
        });
        return deferred; 
    },
    _getChartConfig: function() {
        return {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Monthly Average Rainfall'
            },
            subtitle: {
                text: 'Source: WorldClimate.com'
            },
            xAxis: {
            },
            yAxis: {
                min: 0,
                    title: {
                    text: 'Rainfall (mm)'
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                    pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                    '<td style="padding:0"><b>{point.y:.1f} mm</b></td></tr>',
                    footerFormat: '</table>',
                    shared: true,
                    useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                        borderWidth: 0
                }
            }
        };
    }
});