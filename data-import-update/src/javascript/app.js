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
            xtype: 'filefield',
            fieldLabel: 'Import File',
            itemId: 'file-import',
            labelWidth: 100,
            labelAlign: 'right',
            msgTarget: 'side',
            allowBlank: false,
            margin: 10,
            buttonText: 'Import...',
            listeners: {
                scope: this,
                change: this._uploadFile
            }
        });        

        this.down('#selection_box').add({
            xtype: 'rallybutton',
            text: 'Save',
            itemId: 'save-button',
            margin: '10 10 10 100',
            scope: this,
            handler: this._saveUpdates,
            disabled: true
        });
        
        this.down('#selection_box').add({
            xtype: 'container',
            itemId: 'error_box',
            padding: 25,
            tpl: '<tpl for="."><font color="red">Error: {Msg}</error><br></tpl>'
        });
    },
    _uploadFile: function(fld, val){
        this.down('#error_box').update('');
        if (val.length == 0){
            return;
        }
        var newValue = val.replace(/C:\\fakepath\\/g, '');
        fld.setRawValue(newValue);

        var upload_file = document.getElementById(fld.fileInputEl.id).files[0].slice();
       var me = this; 
        var reader = new FileReader();
        reader.addEventListener("loadend", function() {
           // reader.result contains the contents of blob as a typed array
            me._startImport(reader.result);
        });
        reader.readAsText(upload_file);
        
    },
    _getImportedData: function(textData){
        this.logger.log('_getImportedData',textData);
        var this_data = {};
        
        //Validate FormattedID field exists
        //Vaidate other fields, values and correct format 
        var data = Rally.technicalservices.FileUtilities.CSVtoDataHash(textData);
        this_data['importedData'] = data; 
        this_data['fetchFields']  = Object.keys(data[0]);
        var fids = [];
        Ext.each(data, function(d){
            fids.push(d['FormattedID']);
        });
        this_data['formattedIds'] = fids;
        return this_data;  
    },
    _startImport: function(file_contents){
        this.logger.log('_startImport', file_contents);
        
        var pi_type = this.down('#type-combo').getRecord().get('TypePath');
        
        var data = this._getImportedData(file_contents);
        
        this._fetchItems(pi_type,data.formattedIds, data.fetchFields).then({
            scope: this,
            success: function(store){
                
                //update store with values to be saved
                this._updateValues(store,data.importedData);
                if (this.down('#update-grid')){
                    this.down('#update-grid').destroy();
                }
                this.down('#grid_box').add({
                    xtype: 'rallygrid',
                    itemId: 'update-grid',
                    store: store,
                    showRowActionsColumn: false,
                    columnCfgs: this._getColumnCfgs(data.fetchFields,this.down('#type-combo').getRecord())
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
        var errors = [];
        Ext.each(imported_data, function(d){
            var fid = d.FormattedID;
            var rec = store.findExactRecord('FormattedID',fid);
            if (rec == null){
                errors.push({'FormattedID': d.FormattedId, 'Msg':Ext.String.format("FormattedID {0} does not exist.",d['FormattedID'])});
            }
            Ext.each(Object.keys(d),function(key){
                if (rec) {
                    if (key != 'FormattedID'){
                        var val = d[key];
                        if (!isNaN(val)){
                            val = Number(val);
                        }
                        rec.set(key,val);
                    } 
                }
            },this);
            
        },this);
        
        this.down('#error_box').update(errors);
    },
    _getColumnCfgs: function(fields,model){
        var gcolcfgs = [];
        gcolcfgs.push({ 
            text: 'Status',
            xtype: 'templatecolumn', 
            tpl: '<tpl switch="status"><tpl case="ERROR"><font color="red">Error</font><tpl case="SAVED"><font color="green">Saved</font></tpl>'
        });
        Ext.each(fields, function(f){
            var colcfgs = {};
            colcfgs['dataIndex'] = f;
            colcfgs['text'] = f;
            gcolcfgs.push(colcfgs);
        });
        return gcolcfgs;
    },
    _updateSavedStatus: function(rec,operation,success){
        this.logger.log('_updateSavedStatus',rec,operation,success);
        if (success) {
            rec.set('status','SAVED');
        } else {
            rec.set('status','ERROR');
            var error = Ext.String.format('Error updating {0}: {1}',rec.get('FormattedID'),operation.error.errors[0]);
            Rally.ui.notify.Notifier.showError({message: error});
        }
    },
    _saveUpdates: function(){
        this.logger.log('_saveUpdates');
        var updates_to_make = this.down('#update-grid').getStore().getUpdatedRecords();
        Ext.each(updates_to_make, function(rec){
            rec.save({
                scope: this,
                callback: this._updateSavedStatus
            });
        },this);
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
                },
                update: function(store, record,operation,modifiedFieldNames, options){
                    console.log('update',store,record,operation,modifiedFieldNames,options);
                }
            }
        });
        return deferred;
    }
});