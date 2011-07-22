FaultedEarth = Ext.extend(gxp.Viewer, {

    summaryId: null,
    
    constructor: function(config) {
        
        Ext.Window.prototype.shadow = false;
        
        // property names for FeatureEditor and FeatureGrid
        var propertyNames = {
            // custom fied names for the fault summary table
            "name": "Fault Name",
			"sec_name": "Fault Section Name"
            "episodi_is": "Episodic behaviour (yes/no)",
            "episodi_ac": "Episodic behaviour (active/inactive)",
            "length": "Length (km, pref, min, max)",
            "u_sm_d_min": "Upper seismogenic depth min (km)",
            "u_sm_d_max": "Upper seismogenic depth max (km)",
            "u_sm_d_pre": "Upper seismogenic depth pref (km)",
            "u_sm_d_com": "Upper seismogenic completeness (1, 2, 3, or 4)",
            "low_d_min": "Lower seismogenic depth min (km)",
            "low_d_max": "Lower seismogenic depth max (km)",
            "low_d_pref": "Lower seismogenic depth pref (km)",
            "low_d_com": "Lower seismogenic completeness (1, 2, 3, or 4)",
            "strike": "Strike (...\u00B0)",
            "dip_min": "Dip min (...\u00B0)",
            "dip_max": "Dip max (...\u00B0)",
            "dip_pref": "Dip pref (...\u00B0)",
            "dip_com": "Dip data completeness factor (1, 2, 3, or 4)",
            "dip_dir": "Dip direction (...\u00B0)",
            "down_thro": "Downthrown side (N, S, W, E or NW etc.)",
            "slip_typ": "Slip type (Reverse etc.)",
            "slip_com": "Slip type completeness (1, 2, 3, or 4)",
            "slip_r_min": "Slip rate min (mm/yr)",
            "slip_r_max": "Slip rate max (mm/yr)",
            "slip_r_pre": "Slip rate pref (mm/yr)",
            "slip_r_com": "Slip rate completeness (1, 2, 3, or 4)",
            "aseis_slip": "Aseismic-slip factor (0-1)",
            "aseis_com": "Aseismic-slip completeness (1, 2, 3, or 4)",
            "dis_min": "Displacement min (m)",
            "dis_max": "Displacement max (m)",
            "dis_pref": "Displacement pref (m)",
            "re_int_min": "Recurrence interval min (yr)",
            "re_int_max": "Recurrence interval max (yr)",
            "re_int_pre": "Recurrence interval pref (yr)",
            "mov_min": "Age of last movement min (yr BP)",
            "mov_max": "Age of last movement max (yr BP)",
            "mov_pref": "Age of last movement pref (yr BP)",
            "all_com": "Overall data completeness (1, 2, 3, or 4)",
            "created": "Date created (date)",
            "compiler": "Compiled by (name)",
            "contrib": "Contributed by (name)",
            // custom fied names for the observations table
            "observationType": "Observation Type",
            "slipType": "Slip Type",
            "hv_ratio": "H:V Ratio",
            "rake": "Rake (deg)",
            "net_slip_rate_min": "Net Slip Rate Min (mm/yr)",
            "net_slip_rate_max": "Net Slip Rate Max (mm/yr)",
            "net_slip_rate_pref": "Net Slip Rate Pref (mm/yr)",
            "dip_slip_rate_min": "Dip Slip Rate Min (mm/yr)",
            "dip_slip_rate_max": "Dip Slip Rate Max (mm/yr)",
            "dip_slip_rate_pref": "Dip Slip Rate Pref (mm/yr)",
            "marker_age": "Marker Age (yrs BP)",
            "slip_rate_category": "Slip Rate Category",
            "strike_slip_rate_min": "Strike Slip Rate Min (mm/yr)",
            "strike_slip_rate_max": "Strike Slip Rate Max (mm/yr)",
            "strike_slip_rate_pref": "Strike Slip Rate Pref (mm/yr)",
            "vertical_slip_rate_min": "Vertical Slip Rate Min (mm/yr)",
            "vertical_slip_rate_max": "Vertical Slip Rate Max (mm/yr)",
            "vertical_slip_rate_pref": "Vertical Slip Rate Pref (mm/yr)",
            "site": "Site",
            "notes": "Notes",
            "summary_id": "Fault Summary ID",
			// custom fied names for fault trace form
			"fault_name": "Fault Name",
			"loc_meth": "Location Method",
			"scale": "Scale",
			"accuracy": "Accuracy",
			"geomor_exp": "Geomorphic Expression",
			"notes": "Notes",
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
                        title: "Fault Section Summary Form",
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
                ptype: "app_observations",
                featureManager: "featuremanager",
                outputTarget: "observations"
            }]
        });

        FaultedEarth.superclass.constructor.apply(this, arguments);
    }

});
