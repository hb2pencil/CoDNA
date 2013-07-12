ArticleInfoView = Backbone.View.extend({

    initialize: function(){
        this.listenTo(this.model, "sync", this.render);
        this.listenTo(this.model.get('data'), "sync", this.render);
        this.template = _.template($("#article_info_template").html());
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.attr('id', "article_info");
        return this.$el;
    }

});
