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
                        padding: null
                    }, {
                        id: 'summary_table',
                        title: "Summary Form"
                    }, {
                        id: 'observations',
                        title: "Observations"
                    }, {
                        id: "fault_source",
                        title: "Fault Section"
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
            }],
            
            defaultSourceType: "gxp_wmscsource",
            sources: {
                local: {
                    url: "/geoserver/ows",
                    version: "1.1.1",
                    title: "Local GeoServer"
                },
                osm: {
                    ptype: "gxp_osmsource"
                },
                google: {
                    ptype: "gxp_googlesource"
                },
                ol: {
                    ptype: "gxp_olsource"
                }
            },
            
            map: {
                id: "map",
                region: "center",
                projection: "EPSG:900913",
                units: "m",
                maxResolution: 156543.0339,
                maxExtent: [
                    -20037508.34, -20037508.34,
                    20037508.34, 20037508.34
                ],
                layers: [{
                    source: "google",
                    title: "Google Terrain",
                    name: "TERRAIN",
                    group: "background"
                }, {
                    source: "osm",
                    name: "mapnik",
                    group: "background",
                    visibility: false
                }, {
                    source: "ol",
                    group: "background",
                    fixed: true,
                    type: "OpenLayers.Layer",
                    args: [
                        "None", {visibility: false}
                    ]
                }, {
                    source: "local",
                    name: "gem:sources"
                }, {
                    source: "local",
                    name: "gem:faults"
                }, {
                    source: "local",
                    name: "gem:observed",
                    selected: true
                }],
                center: [0, 0],
                zoom: 2
            }
        });

        FaultedEarth.superclass.constructor.apply(this, arguments);
    }

});
