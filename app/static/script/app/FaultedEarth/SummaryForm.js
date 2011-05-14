/*
 * @requires FaultedEarth.js
 */

FaultedEarth.SummaryForm = Ext.extend(gxp.plugins.Tool, {
    
    ptype: "app_summaryform",
    
    /** api: config[featureManager]
     *  ``String`` id of the FeatureManager to add uploaded features to
     */
    
    /** api: config[featureEditor]
     *  ``String`` id of the FeatureEditor to modify uploaded features
     */

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
                        var featureManager = this.target.tools[this.featureManager];
                        featureManager.on("clearfeatures", function() {
                            //TODO use a suitable GeoNode uploader instead,
                            // once it is available
                            var uploadWindow = new Ext.Window({
                                title: "Import Faults",
                                width: 300,
                                modal: true,
                                autoHeight: true,
                                items: [{
                                    xtype: "gxp_layeruploadpanel",
                                    ref: "uploadPanel",
                                    border: false,
                                    padding: 10,
                                    url: this.target.localGeoServerUrl + "rest",
                                    store: "",
                                    workspace: "geonode",
                                    autoHeight: true,
                                    listeners: {
                                        "uploadcomplete": this.handleUpload,
                                        scope: this
                                    }
                                }]
                            });
                            // hide title and abstract fields
                            uploadWindow.uploadPanel.items.get(0).hide();
                            uploadWindow.uploadPanel.items.get(1).hide();
                            uploadWindow.show();
                        }, this, {single: true});
                        featureManager.clearFeatures();
                    },
                    scope: this
                }]
            }]
        });
    },
    
    handleUpload: function(panel, details) {
        panel.ownerCt.close();
        new OpenLayers.Protocol.WFS({
            version: "1.1.0",
            srsName: this.target.mapPanel.map.getProjectionObject().getCode(),
            url: this.target.localGeoServerUrl + "wfs",
            featureType: details.layers[0].name.split(":").pop(),
            featureNS: "http://geonode.org/",
            outputFormat: "GML2"
        }).read({
            callback: function(response) {
                var extent = new OpenLayers.Bounds();
                var features = response.features;
                for (var i=features.length-1; i>=0; --i) {
                    extent.extend(features[i].geometry.getBounds());
                    features[i].fid = null;
                    features[i].state = OpenLayers.State.INSERT;
                }
                var featureManager = this.target.tools[this.featureManager];
                featureManager.featureLayer.addFeatures(features);
                featureManager.featureStore.save();
                
                var featureEditor = this.target.tools[this.featureEditor];
                featureEditor.actions[1].control.activate();
                this.target.mapPanel.map.zoomToExtent(extent);
            },
            scope: this
        });
        //TODO remove uploaded layer/store/style or call GeoNode updatelayers
    }
    
});

Ext.preg(FaultedEarth.SummaryForm.prototype.ptype, FaultedEarth.SummaryForm);