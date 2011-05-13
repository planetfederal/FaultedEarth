/*
 * @requires FaultedEarth.js
 */

FaultedEarth.SummaryForm = Ext.extend(gxp.plugins.Tool, {
    
    ptype: "app_summaryform",
    
    addOutput: function(config) {
        return FaultedEarth.SummaryForm.superclass.addOutput.call(this, {
            xtype: "form",
            labelWidth: 110,
            defaults: {
                anchor: "100%"
            },
            items: [{
                xtype: "container",
                layout: "hbox",
                cls: "composite-wrap",
                fieldLabel: "Create or edit faults",
                items: [{
                    id: this.id + "_tooltarget",
                    xtype: "container",
                    cls: "toolbar-spaced",
                    layout: "toolbar"
                }]
            }, {
                xtype: "container",
                layout: "hbox",
                cls: "composite-wrap",
                fieldLabel: "Upload faults",
                items: [{
                    xtype: "button",
                    text: "Import",
                    iconCls: "icon-import",
                    handler: function() {
                        new Ext.Window({
                            title: "Import Faults",
                            width: 300,
                            autoHeight: true,
                            items: [{
                                xtype: "gxp_layeruploadpanel",
                                border: false,
                                padding: 10,
                                url: this.target.localGeoServerUrl + "rest",
                                store: "faulted_earth",
                                workspace: "geonode",
                                crs: "EPSG:4326",
                                autoHeight: true
                            }]
                        }).show();
                    },
                    scope: this
                }]
            }]
        });
    }
    
});

Ext.preg(FaultedEarth.SummaryForm.prototype.ptype, FaultedEarth.SummaryForm);