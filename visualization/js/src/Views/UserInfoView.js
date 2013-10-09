UserInfoView = Backbone.View.extend({

    initialize: function(options){
        this.user = options.user;
        this.listenTo(this.model, "sync", this.render);
        this.listenTo(this.model.get('data'), "sync", this.render);
        this.template = _.template($("#user_info_template").html());
    },
    
    render: function(){
        this.$el.html(this.template(_.extend(this.user.toJSON(), this.model.toJSON())));
        this.$el.attr('id', "article_info");
        return this.$el;
    }

});
