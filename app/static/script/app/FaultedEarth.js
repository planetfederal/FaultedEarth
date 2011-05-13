FaultedEarth = Ext.extend(gxp.Viewer, {
    constructor: function(config) {
        
        Ext.Window.prototype.shadow = false;
        
        function adjustIframeSize(cmp) {
            cmp.body.setWidth(cmp.ownerCt.getWidth());
        }
        
        Ext.applyIf(config, {
            proxy: "/proxy?url=",
                
            mapItems: [{
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100
            }],
            portalItems: [{
                region: "center",
                layout: "border",
                tbar: {
                    id: "paneltbar",
                    items: ["-"]
                },
                items: [{
                    id: "west",
                    region: "west",
                    layout: "accordion",
                    width: 280,
                    split: true,
                    collapsible: true,
                    collapseMode: "mini",
                    header: false,
                    border: false,
                    defaults: {
                       padding: 10,
                       hideBorders: true,
                       autoScroll: true
                
                    },
                    items: [{
                        id: "tree",
                        title: "Layers",
                        padding: 0
                    }, {
                        id: 'summary',
                        title: "Summary Form"
                    }, {
                        id: 'observations',
                        title: "Observations",
                        padding: 0,
                        bodyCfg: {
                            tag: "iframe",
                            src: "/observations/obsform/",
                            style: {border: "0px none"}
                        },
                        listeners: {
                            "resize": adjustIframeSize,
                            "afterlayout": adjustIframeSize
                        }
                    }//, {
                        //id: "fault_source",
                        //title: "Fault Section"
                    //}
                    ]                    
                }, "map", {
                    id: "featuregrid",
                    layout: "fit",
                    region: "south",
                    border: false,
                    height: 200,
                    split: true,
                    collapseMode: "mini"
                }]
            }],
            
            tools: [{
                actionTarget: {target: "paneltbar", index: 0},
                outputAction: 0,
                outputConfig: {
                    title: "Faulted Earth",
                    width: 300,
                    height: 300,
                    modal: true,
                    bodyCfg: {
                        tag: "iframe",
                        src: "about.html",
                        style: {border: 0}
                    }
                },
                actions: [{
                    iconCls: "icon-geoexplorer",
                    text: "Faulted Earth"
                }]
            },{
                ptype: "gxp_layertree",
                outputTarget: "tree"
            }, {
                ptype: "gxp_featuremanager",
                id: "featuremanager",
                autoLoadFeatures: true,
                maxFeatures: 50,
                format: "JSON"
            }, {
                ptype: "app_summaryform",
                id: "summaryform",
                outputTarget: "summary"
            }, {
                ptype: "gxp_featureeditor",
                featureManager: "featuremanager",
                actionTarget: "summaryform_tooltarget",
                createFeatureActionText: "Draw",
                editFeatureActionText: "Modify",
                outputConfig: {
                    defaults: {
                        propertyNames: {
                            // custom fied names for the fault summary table
                            "name": "Name",
                            "is_episodi": "Episodic behaviour",
                            "length": "Length",
                            "u_sm_d_min": "Upper seismogenic depth min",
                            "u_sm_d_max": "Upper seismogenic depth max",
                            "u_sm_d_pre": "Upper seismogenic depth pref",
                            "low_d_min": "Lower seismogenic depth min",
                            "low_d_max": "Lower seismogenic depth max",
                            "low_d_pref": "Lower seismogenic depth pref",
                            "strike": "Strike",
                            "dip_min": "Dip min",
                            "dip_max": "Dip max",
                            "dip_pref": "Dip pref",
                            "dip_dir": "Dip direction",
                            "down_thro": "Downthrow side",
                            "slip_typ": "Slip type",
                            "slip_r_min": "Slip rate min",
                            "slip_r_max": "Slip rate max",
                            "slip_r_pre": "Slip rate pref",
                            "aseis_slip": " Aseismic-slip factor",
                            "dis_min": "Displacement min",
                            "dis_max": "Displacement max",
                            "dis_pref": "Displacement pref",
                            "re_int_min": "Recurrence interval min",
                            "re_int_max": "Recurrence interval max",
                            "re_int_pre": "Recurrence interval pref",
                            "mov_min": "Age of last movement min",
                            "mov_max": "Age of last movement max",
                            "mov_pref": "Age of last movement pref",
                            "completene": "Data completeness",
                            "compiler": "Compiled by",
                            "created": "Contributed by",
                            "modified": "Last updated"
                        }
                    }
                }
            }, {
                ptype: "gxp_featuregrid",
                outputConfig: {id: "grid"},
                alwaysDisplayOnMap: true,
                displayMode: "selected",
                featureManager: "featuremanager",
                outputTarget: "featuregrid"
            }, {
                ptype: "gxp_selectedfeatureactions",
                featureManager: "featuremanager",
                actions: [{
                    menuText: "Feature context demo",
                    text: "Feature context demo",
                    urlTemplate: "/geoserver/wms/reflect?layers={layer}&width=377&height=328&format=application/openlayers&featureid={fid}"
                }],
                actionTarget: ["grid.contextMenu", "grid.bbar"],
                outputConfig: {
                    width: 410,
                    height: 410
                }                    
            }]
        });

        FaultedEarth.superclass.constructor.apply(this, arguments);
    }

});
