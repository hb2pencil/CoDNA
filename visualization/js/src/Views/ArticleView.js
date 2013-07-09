// ## ArticleView
ArticleView = Backbone.View.extend({
    
    initialize: function(){
        this.template = _.template($("#main_container_template").html());
    },
    
    render: function(){
        this.$el.html(this.template());
        WIKIVIZ.init(this.model.get('title'));
        return this.$el;
    }
    
});
