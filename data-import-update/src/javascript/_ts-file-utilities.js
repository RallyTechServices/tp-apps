Ext.define('Rally.technicalservices.FileUtilities', {
    singleton: true,
    logger: new Rally.technicalservices.Logger(),
    
    saveTextAsFile: function(textToWrite, fileName)
    {
        var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
        var fileNameToSaveAs = fileName;

        var downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        if (window.webkitURL != null)
        {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        }
        else
        {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
        }
        downloadLink.click();
    },
    
    destroyClickedElement: function(event)
    {
        document.body.removeChild(event.target);
    },
    CSVtoArray: function(text) {
        var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
        // Return NULL if input string is not well formed CSV string.
        if (!re_valid.test(text)) return null;

        var a = [];                     // Initialize array to receive values.
        var rows = text.split(/\r\n?|\n/g);
        Ext.each(rows, function(row){
            var split_row = this._splitRow(row);
            if (split_row.length > 0){
                a.push(split_row);
            }
        },this);
        console.log(a);
        return a; 
    },
    _splitRow: function(row){
        /*
         * http://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript
         */
        var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
        var a = [];
        row.replace(re_value, // "Walk" the string using replace with callback.
                function(m0, m1, m2, m3) {
                    console.log('split',row,m0,m1,m2,m3)
                // Remove backslash from \' in single quoted values.
                if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
                // Remove backslash from \" in double quoted values.
                else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
                else if (m3 !== undefined) a.push(m3);
                return ''; // Return empty string.
         });
         // Handle special case of empty last value.
         if (/,\s*$/.test(row)) a.push('');
         return a;
    },
    CSVtoDataHash: function(text){
        var rows = Rally.technicalservices.FileUtilities.CSVtoArray(text);
        var keys = rows[0];
        var data = []; 
        for (var i=1; i< rows.length; i++){
            var data_row = {};
            for (var j=0; j<keys.length; j++){
                data_row[keys[j]]=rows[i][j];
            }
            data.push(data_row);
        }
        return data; 
    }
});
