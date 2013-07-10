// ## ArticleView
ArticleView = Backbone.View.extend({
    
    template: _.template($("#main_container_template").html()),
    
    initialize: function(){
        
    },
    
    render: function(){
        this.$el.html(this.template());
        WIKIVIZ.init(this.model.get('title'));
        return this.$el;
    }
    
});
