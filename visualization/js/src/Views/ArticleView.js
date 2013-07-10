// ## ArticleView
ArticleView = Backbone.View.extend({
    
    template: _.template($("#main_container_template").html()),
    firstRender: true,
    
    initialize: function(){
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
    },
    
    render: function(){
        if(topTabs.getSelected() != null && topTabs.getSelected().get('mainView') == this){
            this.$el.css('display', 'block');
        }
        else{
            this.$el.css('display', 'none');
        }
        if(this.firstRender){
            this.$el.html(this.template());
            WIKIVIZ.init(this.model.get('title'));
        }
        this.firstRender = false;
        return this.$el;
    }
    
});
