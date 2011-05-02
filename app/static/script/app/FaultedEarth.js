FaultedEarth = Ext.extend(gxp.Viewer, {
    
    constructor: function(config) {        
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
                    xtype: "tabpanel",
                    region: "west",
                    width: 200,
                    split: true,
                    collapseMode: "mini",
                    activeTab: 0,
                    items: [{
                        id: "tree",
                        title: "Layers",
                        xtype: "container",
                        layout: "fit"
                    }, {
                        title: "Legend",
                        xtype: "gx_legendpanel",
                        defaults: {style: {padding: "5px"}}
                    }]
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