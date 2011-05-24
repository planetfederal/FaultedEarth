/*
 * @requires FaultedEarth.js
 */

FaultedEarth.Observations = Ext.extend(gxp.plugins.Tool, {
    
    ptype: "app_observations",
    
    /** api: config[featureManager]
     *  ``String`` id of the FeatureManager to add uploaded features to
     */
    
    layerRecord: null,
    
    summaryId: null,
    
    filter: null,
    
    autoActivate: false,
    
    init: function(target) {
        var featureManager = target.tools[this.featureManager];
        
        featureManager.featureLayer.events.on({
            "featureselected": function(e) {
                if (featureManager.layerRecord.get("name") == "geonode:fault_summary") {
                    this.output[0].ownerCt.enable();
                    this.summaryId = e.feature.fid;
                    this.setIFrameUrl(
                        "/observations/obsform/new/?summary_id=" + e.feature.fid.split(".").pop()
                    );
                } else if (featureManager.layerRecord.get("name") == "geonode:observations_observations") {
                    this.setIFrameUrl(
                        "/observations/obsform/" + e.feature.fid.split(".").pop() +
                        "/?summary_id=" + this.summaryId.split(".").pop()
                    );
                }
            },
            "featureunselected": function(e) {
                if (!this.active && featureManager.layerRecord.get("name") == "geonode:fault_summary") {
                    this.output[0].ownerCt.disable();
                } else if (featureManager.layerRecord.get("name") == "geonode:observations_observations") {
                    this.setIFrameUrl(
                        "/observations/obsform/new/?summary_id=" + this.summaryId.split(".").pop()
                    );
                }
            },
            scope: this
        });
        
        this.filter = new OpenLayers.Filter.Comparison({
            property: "summary_id",
            value: -1,
            type: OpenLayers.Filter.Comparison.EQUAL_TO
        });

        FaultedEarth.Observations.superclass.init.apply(this, arguments);
    },
    
    addOutput: function(config) {
        
        function adjustIframeSize(cmp) {
            cmp.body.setHeight(cmp.ownerCt.getHeight() - cmp.el.getOffsetsTo(cmp.ownerCt.body)[1]);
            cmp.body.setWidth(cmp.ownerCt.getWidth());
        }

        return FaultedEarth.Observations.superclass.addOutput.call(this, {
            renderHidden: true,
            items: [{
                xtype: "box",
                style: "padding: 10px",
                autoEl: {
                    tag: "p",
                    cls: "x-form-item"
                },
                html: "<b>Create a new observation</b> below, or <b>select an existing one</b> from the grid at the bottom of the page."
            }, {
                xtype: "form",
                border: false,
                labelAlign: "top",
                style: "padding: 0 10px 10px 10px",
                items: [{
                    xtype: "combo",
                    anchor: "100%",
                    fieldLabel: "Filter observations in the grid",
                    store: new Ext.data.ArrayStore({
                        data: [
                            ["orphan", "not associated with any fault"],
                            ["mine", "associated with this fault"],
                            ["theirs", "associated with other faults"],
                            ["visible", "with location, visible on the map"]
                        ],
                        fields: ["name", "title"],
                        idIndex: 0
                    }),
                    value: "orphan",
                    displayField: "title",
                    valueField: "name",
                    editable: false,
                    mode: "local",
                    triggerAction: "all",
                    listeners: {
                        "select": this.updateFilter,
                        scope: this
                    }
                }]
            }, {
                ref: "iFrame",
                bodyCfg: {
                    tag: "iframe",
                    style: {border: "0px none"}
                },
                listeners: {
                    "added": function(ct, cmp) {
                        ct.on({
                            "resize": adjustIframeSize,
                            "afterlayout": adjustIframeSize
                        });
                    }
                }
            }],
            listeners: {
                "added": function(cmp, ct) {
                    ct.disable();
                    ct.on({
                        "expand": function() { this.activate(); },
                        "collapse": function() { this.deactivate(); },
                        scope: this
                    });
                },
                scope: this
            }
        });
    },
    
    activate: function() {
        if (FaultedEarth.Observations.superclass.activate.apply(this, arguments)) {
            var featureManager = this.target.tools[this.featureManager];
            featureManager.setLayer();
            if (!this.layerRecord) {
                this.target.createLayerRecord({
                    name: "geonode:observations_observations",
                    source: "local"
                }, function(record) {
                    this.layerRecord = record;
                    featureManager.setLayer(record);
                }, this);
            } else {
                featureManager.setLayer(this.layerRecord);
            }
            featureManager.on("layerchange", function(mgr, rec) {
                rec === this.layerRecord && featureManager.loadFeatures(this.filter);
            }, this);
        }
    },
    
    deactivate: function() {
        if (FaultedEarth.Observations.superclass.deactivate.apply(this, arguments)) {
            this.output[0].ownerCt.disable();
        }
    },
    
    setIFrameUrl: function(url) {
        var iFrame = this.output[0].iFrame;
        iFrame.rendered ?
            iFrame.body.dom.src = url :
            iFrame.bodyCfg.src = url;
    },
    
    updateFilter: function(field, rec) {
        var value = rec.get("name");
        this.target.mapPanel.map.events.unregister("moveend", this, this.updateBBOX);
        var filter;
        switch(value) {
            case "mine":
                filter = new OpenLayers.Filter.Comparison({
                    property: "summary_id",
                    value: this.summaryId.split(".").pop(),
                    type: OpenLayers.Filter.Comparison.EQUAL_TO
                });
                break;
            case "theirs":
                filter = new OpenLayers.Filter.Comparison({
                    property: "summary_id",
                    value: this.summaryId.split(".").pop(),
                    type: OpenLayers.Filter.Comparison.NOT_EQUAL_TO
                });
                break;
            case "orphan":
                filter = new OpenLayers.Filter.Comparison({
                    property: "summary_id",
                    value: -1,
                    type: OpenLayers.Filter.Comparison.EQUAL_TO
                });
                break;
            case "visible":
                filter = new OpenLayers.Filter.Spatial({
                    value: this.target.mapPanel.map.getExtent(),
                    type: OpenLayers.Filter.Spatial.BBOX
                });
                this.target.mapPanel.map.events.register("moveend", this, this.updateBBOX);
                break;
        }
        this.filter = filter;
        this.target.tools[this.featureManager].loadFeatures(filter);
    },
    
    updateBBOX: function() {
        this.target.tools[this.featureManager].loadFeatures(new OpenLayers.Filter.Spatial({
            value: this.target.mapPanel.map.getExtent(),
            type: OpenLayers.Filter.Spatial.BBOX
        }));
    }
    
});

Ext.preg(FaultedEarth.Observations.prototype.ptype, FaultedEarth.Observations);