/*
 * @requires FaultedEarth.js
 */

FaultedEarth.Observations = Ext.extend(gxp.plugins.Tool, {
    
    ptype: "app_observations",
    
    /** api: config[featureManager]
     *  ``String`` id of the FeatureManager to add uploaded features to
     */
    
    autoActivate: false,
    
    addOutput: function(config) {
        
        function adjustIframeSize(cmp) {
            cmp.body.setHeight(cmp.ownerCt.getHeight() - cmp.el.getOffsetsTo(cmp.ownerCt.body)[1]);
            cmp.body.setWidth(cmp.ownerCt.getWidth());
        }

        return FaultedEarth.Observations.superclass.addOutput.call(this, {
            items: [{
                xtype: "box",
                style: "padding: 10px",
                autoEl: {
                    tag: "p",
                    cls: "x-form-item"
                },
                html: "<b>Create a new observation</b> below, or <b>select an existing one</b> from the grid at the bottom of the page."
            }, {
                flex: 1,
                bodyCfg: {
                    tag: "iframe",
                    src: "/observations/obsform/",
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
            }]
        });
    }
    
});

Ext.preg(FaultedEarth.Observations.prototype.ptype, FaultedEarth.Observations);