FaultedEarth = Ext.extend(gxp.Viewer, {
    constructor: function(config) {
        
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
                        id: 'summary_table',
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
                ptype: "gxp_featureeditor",
                featureManager: "featuremanager",
                actionTarget: "paneltbar"
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
