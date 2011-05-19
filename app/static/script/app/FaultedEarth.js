FaultedEarth = Ext.extend(gxp.Viewer, {
    constructor: function(config) {
        
        Ext.Window.prototype.shadow = false;
        
        // property names for FeatureEditor and FeatureGrid
        var propertyNames = {
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
            "contrib": "Contributed by",
            "modified": "Last updated"
        };
        
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
                       hideBorders: true,
                       autoScroll: true
                
                    },
                    items: [{
                        id: "tree",
                        title: "Layers"
                    }, {
                        id: 'summary',
                        title: "Summary Form",
                        padding: 10
                    }, {
                        id: 'observations',
                        title: "Observations",
                        layout: "fit",
                        autoScroll: false
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
                autoSetLayer: false,
                paging: false,
                maxFeatures: 100
            }, {
                ptype: "app_summaryform",
                id: "summaryform",
                featureManager: "featuremanager",
                featureEditor: "featureeditor",
                outputTarget: "summary"
            }, {
                ptype: "gxp_featureeditor",
                id: "featureeditor",
                featureManager: "featuremanager",
                actionTarget: "summaryform_tooltarget",
                createFeatureActionText: "Draw",
                editFeatureActionText: "Modify",
                outputConfig: {
                    propertyNames: propertyNames
                }
            }, {
                ptype: "gxp_featuregrid",
                alwaysDisplayOnMap: true,
                displayMode: "selected",
                featureManager: "featuremanager",
                outputTarget: "featuregrid",
                outputConfig: {
                    id: "grid",
                    propertyNames: propertyNames
                }
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
            }, {
                ptype: "app_observations",
                outputTarget: "observations"
            }]
        });

        FaultedEarth.superclass.constructor.apply(this, arguments);
    }

});
