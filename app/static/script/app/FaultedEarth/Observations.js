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
                }
            },
            "featureunselected": function(e) {
                if (!this.active && featureManager.layerRecord.get("name") == "geonode:fault_summary") {
                    this.output[0].ownerCt.disable();
                }
            },
            scope: this
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
    }
    
});

Ext.preg(FaultedEarth.Observations.prototype.ptype, FaultedEarth.Observations);