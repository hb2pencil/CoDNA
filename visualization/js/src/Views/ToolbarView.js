// ## ToolbarView
ToolbarView = Backbone.View.extend({

    initialize: function(options){
        this.template = _.template($("#toolbar_template").html());
        Backbone.Subviews.add(this);
        this.view = options.view;
    },
    
    subviewCreators:{
        "diag_cursor" : function(){
            return new DialogView({
                template: "diag_cursor_template",
                options: {
                    autoOpen: false,
                    width: 'auto',
                    resizable: false
                }
            });
        },
        "diag_options": function(){
            return new DialogView({
                template: "diag_options_template",
                options: {
                    autoOpen: false,
                    resizable: false
                }
            });
        },
        "diag_select": function(){
            var wikiviz = this.view.wikiviz;
            var article = this.view;
            return new DialogView({
                template: "diag_select_template",
                options: {
                    autoOpen: false,
                    width: 400,
                    resizable: false
                },
                onCreate: function(dialog){
                    $('#select_apply', dialog).button();
                    $('#d_select_tabs', dialog).tabs();
                    $('#d_select_groups_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // User group selection functionality.
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            var that = $(this);
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 1);
                            // Checkbox was unchecked
                            } else {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                    // Bind functionality to the select users dialog
                    // Note that the "Select By Group" checkboxes make changes to the selection
                    // in the Select By User list, so we really only need to grab the input from the select
                    // by user list.
                    $('input[name=userclassselect]', dialog).each(function (i,e) {
                        $(e).change(function () {
                            // Gather choices
                            var filt = Array();
                            $('input[name=userclassselect]:checked', dialog).each(function(i, el) {
                                filt.push($(el).val());
                            });
                            // Use choices to generate selection in Select By User
                            // User names are stored in the "value" property of the options in the select element.
                            $('#userselect option', dialog).each(function(i, e) {
                                if (Helper.isSubset([wikiviz.getGroupsByName($(e).val())], filt)) {
                                    $(e).attr('selected', true);
                                } else {
                                    $(e).attr('selected', false);
                                }
                                // Force visual update on stubborn browsers (Chrome !!!)
                                $(e).addClass('invisible');
                                $(e).removeClass('invisible');
                            });
                        });
                    });
                    // Clicking "Apply User Selection"
                    $('#select_apply', dialog).click(function() {
                        var users = Array();
                        $('#userselect option:selected', dialog).each(function() { users.push($(this).val()); });
                        article.viz.applyUserSelection(users);
                    });
                }
            });
        },
        "diag_articles": function(){
            var wikiviz = this.view.wikiviz;
            var article = this.view;
            return new DialogView({
                template: "diag_articles_template",
                options: {
                    autoOpen: false,
                    width: 400,
                    resizable: false
                },
                onCreate: function(dialog){
                    $('#select_apply', dialog).button();
                    $('#d_select_tabs', dialog).tabs();
                    $('#d_select_groups_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // User group selection functionality.
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            var that = $(this);
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 1);
                            // Checkbox was unchecked
                            } else {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                    // Bind functionality to the select users dialog
                    // Note that the "Select By Group" checkboxes make changes to the selection
                    // in the Select By User list, so we really only need to grab the input from the select
                    // by user list.
                    $('input[name=userclassselect]', dialog).each(function (i,e) {
                        $(e).change(function () {
                            // Gather choices
                            var filt = Array();
                            $('input[name=userclassselect]:checked', dialog).each(function(i, el) {
                                filt.push($(el).val());
                            });
                            // Use choices to generate selection in Select By User
                            // User names are stored in the "value" property of the options in the select element.
                            $('#userselect option', dialog).each(function(i, e) {
                                if (Helper.isSubset([wikiviz.getGroupsByName($(e).val())], filt)) {
                                    $(e).attr('selected', true);
                                } else {
                                    $(e).attr('selected', false);
                                }
                                // Force visual update on stubborn browsers (Chrome !!!)
                                $(e).addClass('invisible');
                                $(e).removeClass('invisible');
                            });
                        });
                    });
                    // Clicking "Apply User Selection"
                    $('#select_apply', dialog).click(function() {
                        var users = Array();
                        $('#userselect option:selected', dialog).each(function() { users.push($(this).val()); });
                        article.viz.applyUserSelection(users);
                    });
                }
            });
        },
        "diag_info": function(){
            return new DialogView({
                template: "diag_info_template",
                options: {
                    autoOpen: false,
                    resizable: false,
                    width: 400
                }
            });
        },
        "diag_data": function(){
            return new DialogView({
                template: "diag_data_template",
                options: {
                    autoOpen: false,
                    resizable: true,
                    width: 800,
                    height: 600
                }
            });
        },
        "diag_legend": function(){
            var wikiviz = this.view.wikiviz;
            var article = this.view;
            return new DialogView({
                template: "diag_legend_template",
                options: {
                    autoOpen: false,
                    resizable: false,
                    height: 'auto',
                    width: 400
                },
                onCreate: function(dialog){
                    $('#d_legend_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('.d_checkable h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // Mapping from checkbox value to visualization rectangle classes
                    var classMap = {
                        addrem: ['add', 'remove'],
                        edit: ['edit'],
                        reorganize: ['reorganize'],
                        cite: ['cite'],
                        unsure: ['unsure'],
                        vandunvand: ['vand', 'unvand']
                    };
                
                    // Legend selection functionality (by varyng opacity)
                    $('#d_legend_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                for (var i in classMap[$(this).val()]) {
                                    wikiviz.get('view').data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 1);
                                }
                            // Checkbox was unchecked
                            } else {
                                for (var i in classMap[$(this).val()]) {
                                    wikiviz.get('view').data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 0.2);
                                }
                            }
                        
                            var selected = new Array();
                            $('#d_legend_accordion input:checked', dialog).each(function(i, v) {
                                $.merge(selected, classMap[$(v).val()]);
                            });
                        
                            article.viz.navctl.bg.selectAll('rect').transition().duration(500).attr('opacity',
                                function(d) {
                                    var found = 0.2;
                                    $(selected).each(
                                        function(i, v) {
                                            if (d.wclass[v]) {
                                                found = 1;
                                                return 1;
                                            }
                                        }
                                    );
                                    return found;
                                }
                            );
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                }
            });
        },
        "diag_talk": function(){
            return new DialogView({
                template: "diag_talk_template",
                options: {
                    autoOpen: false,
                    resizable: false,
                    height: 'auto',
                    width: 400
                },
                onCreate: function(dialog){
                    $('#d_talk_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('.d_checkable h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // Talk page revision selection functionality.
                    // TODO: Make the "callouts" fade out if all of the contained elements are faded out.
                    $('#d_talk_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            var that = $(this);
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 1);
                            // Checkbox was unchecked
                            } else {
                                d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                }
            });
        }
    },
    
    // Init the buttons on the toolbar.
    createToolbar: function() {
        $('#t_cursor').button({
            icons: {
                primary: 'ui-icon-arrow-1-ne'
            },
            text: false
        });
        $('#t_options').button({
            icons: {
                primary: 'ui-icon-gear'
            },
            text: false
        });
        this.$('#t_select').button({
            icons: {
                primary: 'icon-users'
            },
            text: false
        });
        this.$('#t_articles').button({
            icons: {
                primary: 'icon-articles'
            },
            text: false
        });
        $('#t_info').button({
            icons: {
                primary: 'ui-icon-info'
            },
            text: false
        });
        this.$('#t_data').button({
            icons: {
                primary: 'icon-table'
            },
            text: false
        });
        this.$('#t_legend').button({
            icons: {
                primary: 'icon-categories'
            },
            text: false
        });
        this.$('#t_deselect').button({
            icons: {
                primary: 'icon-deselect'
            },
            text: false,
            disabled: true
        });
    
        this.$('#t_talk').button({
            icons: {
                primary: 'icon-talk'
            },
            text: false,
            disabled: true
        });
    },
    
    events: {
        "click #t_cursor":  function(){this.subviews.diag_cursor.open();},
        "click #t_options": function(){this.subviews.diag_options.open();},
        "click #t_select":  function(){this.subviews.diag_select.open();},
        "click #t_articles":function(){this.subviews.diag_articles.open();},
        "click #t_info":    function(){this.subviews.diag_info.open();},
        "click #t_data":    function(){this.subviews.diag_data.open();},
        "click #t_legend":  function(){this.subviews.diag_legend.open();},
        "click #t_deselect":function(){this.view.viz.clearAllSelections(true);},
        "click #t_talk":    function(){this.subviews.diag_talk.open();}
    },
    
    render: function(){
        this.$el.html(this.template(this.model));
        this.createToolbar();
        return this.$el;
    }
});
