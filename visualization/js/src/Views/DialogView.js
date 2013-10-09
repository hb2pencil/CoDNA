// ## DialogView
DialogView = Backbone.View.extend({
    
    // Reference to the jQueryUI Dialog
    dialog: null,
    // Options object for the dialog
    options: null,
    // Function to be called after the dialog is created
    onCreate: function(){},
    firstRender: true,

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
        if(this.firstRender){
            this.$el.html(this.template());  
            this.dialog = this.$el.children().dialog(this.options);
            this.onCreate(this.dialog);
        }
        this.firstRender = false;
        return this.$el; 
    }

});
