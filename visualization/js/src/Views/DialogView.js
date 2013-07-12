// ## DialogView
DialogView = Backbone.View.extend({
    
    dialog: null, // Reference to the jQueryUI Dialog
    options: null, // Options object for the dialog
    onCreate: function(){}, // Function to be called after the dialog is created

    initialize: function(options){
        this.template = _.template($("#" + options.template).html());
        this.options = options.options;
        if(_.isFunction(options.onCreate)){
            this.onCreate = options.onCreate;
        }
    },
    
    // Displays the dialog
    open: function(){
        this.dialog.dialog('open');
    },
    
    // Closes the dialog
    close: function(){
        this.dialog.dialog('close');
    },
    
    render: function(){
        this.$el.html(this.template());  
        this.dialog = this.$el.children().dialog(this.options);
        this.onCreate(this.dialog);
        return this.$el; 
    }

});
