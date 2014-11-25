Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'selection_box',layout: {type: 'hbox'}, padding:10},
        {xtype:'container',itemId:'grid_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#selection_box').add({
            xtype: 'rallyportfolioitemtypecombobox',
            itemId: 'type-combo',
            fieldLabel: 'PortfolioItem Type',
            labelWidth: 100,
            labelAlign: 'right',
            margin: 10
        });
        
        this.down('#selection_box').add({
            xtype: 'rallybutton',
            text: 'Import...',
            margin: 10,
            scope: this,
            handler: this._startImport
        });

        this.down('#selection_box').add({
            xtype: 'rallybutton',
            text: 'Save',
            itemId: 'save-button',
            margin: 10,
            scope: this,
            handler: this._saveUpdates,
            disabled: true
        });    
    },
    _startImport: function(){
        this.logger.log('_startImport');
        
        var pi_type = this.down('#type-combo').getRecord().get('TypePath');
        var formatted_ids = ['F32','F33','F34'];
        var fetch_fields = ['FormattedID','c_Cities','c_Country','c_CountryText'];
        var imported_data = [
                             {'FormattedID':'F32','c_Cities':'Pittsburgh','c_Country':'USA', 'c_CountryText':'United States'},
                             {'FormattedID':'F33','c_Cities':'San Diego','c_Country':'USA', 'c_CountryText':'United States'},
                             {'FormattedID':'F34','c_Cities':'Helsinki','c_Country':'Finland', 'c_CountryText':'Finland'}
                             ];
        
        this._fetchItems(pi_type,formatted_ids, fetch_fields).then({
            scope: this,
            success: function(store){
                
                //update store with values to be saved
                this._updateValues(store,imported_data);
                
                
                this.down('#grid_box').add({
                    xtype: 'rallygrid',
                    itemId: 'update-grid',
                    store: store,
                    columnCfgs: this._getColumnCfgs(fetch_fields,this.down('#type-combo').getRecord())
                });
                this.down('#save-button').setDisabled(false);

            },
            failure: function(error){
                alert (error);
            }
        });

    },
    _updateValues: function(store, imported_data){
        this.logger.log('_updateValues');
        Ext.each(imported_data, function(d){
            var fid = d.FormattedID;
            var rec = store.findExactRecord('FormattedID',fid);
            Ext.each(Object.keys(d),function(key){
                if (key != 'FormattedID'){
                    rec.set(key,d[key]);
                }
            },this);
            
        },this);
    },
    _getColumnCfgs: function(fields,model){
        var gcolcfgs = [];
        Ext.each(fields, function(f){
            var colcfgs = {};
            colcfgs['dataIndex'] = f;
            colcfgs['text'] = f;
            gcolcfgs.push(colcfgs);
        });
        return gcolcfgs;
    },
    _saveUpdates: function(){
        this.logger.log('_saveUpdates');
        var updates_to_make = this.down('#update-grid').getStore().getUpdatedRecords();
        Ext.each(updates_to_make, function(rec){
            rec.save();
        },this);
        this.down('#save-button').setDisabled(true);
    },
    _fetchItems: function(type, formatted_ids, fetch_fields){
        this.logger.log('_fetchItems', type, formatted_ids, fetch_fields);
        var deferred = Ext.create('Deft.Deferred');
        
        //TODO may need to chunk
        var filter = null;
        Ext.each(formatted_ids, function(fid){
            if (filter == null){
                filter = Ext.create('Rally.data.wsapi.Filter', {
                     property: 'FormattedID',
                     value: fid
                });
            } else {
                filter = filter.or(Ext.create('Rally.data.wsapi.Filter', {
                     property: 'FormattedID',
                     value: fid}));
            }
        },this);
        
        Ext.create('Rally.data.wsapi.Store',{
            model: type,
            autoLoad: true, 
            fetch: fetch_fields,
            filters: [filter],
            listeners: {
                scope: this, 
                load: function(store, data, success) {
                    this.logger.log('store Loaded', store, data, success);
                    if (success){
                        deferred.resolve(store);
                    } else {
                        deferred.reject('_fetchItems failed to load PortfolioItems');
                    }
                }
            }
        });
        return deferred;
    }
});