// ## Classification
Classification = Backbone.Model.extend({

    initialize: function(){
        $("<style type='text/css'> ." + this.get('id') + " { background:" + this.get('style') + "; fill:" + this.get('style') + "; } </style>").appendTo("head");
    },
       
    defaults: {
         'id': '',
         'manual': "",
         'codna': "",
         'factor': "",
         'weight': 0,
         'style': ""
    }

});

// ## ClassificationCollection
ClassificationCollection = Backbone.Collection.extend({
    
    url: "dbquery.php?" + "classifications",
    
    model: Classification
    
});
