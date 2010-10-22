/**
 * Copyright (c) 2009 The Open Planning Project
 */

/**
 * Constructor: GeoExplorer
 * Create a new GeoExplorer application.
 *
 * Parameters:
 * config - {Object} Optional application configuration properties.
 *
 * Valid config properties:
 * map - {Object} Map configuration object.
 * wms - {String} WMS URL
 * alignToGrid - {boolean} if true, align tile requests to the grid enforced by
 *     tile caches such as GeoWebCache or Tilecache
 *
 * Valid map config properties:
 * layers - {Array} A list of layer configuration objects.
 * center - {Array} A two item array with center coordinates.
 * zoom - {Number} An initial zoom level.
 *
 * Valid layer config properties:
 * name - {String} Required WMS layer name.
 * title - {String} Optional title to display for layer.
 */
var GeoExplorer = Ext.extend(Ext.util.Observable, {
    
    /**
     * Property: map
     * {OpenLayers.Map} The application's map.
     */
    map: null,
    
    /**
     * Property: layers
     * {GeoExt.data.LayerStore} A store containing a record for each layer
     *     on the map.
     */
    layers: null,

    /**
     * Property: capabilities
     * {GeoExt.data.WMSCapabilitiesStore} A store containing a record for each
     *     layer on the server.
     */
    capabilities: null,

    /**
     * Property: mapPanel
     * {GeoExt.MapPanel} the MapPanel instance for the main viewport
     */
    mapPanel: null,

    /**
     * Property: alignToGrid
     * whether or not to restrict tile request to tiled mapping service recommendation
     */
    alignToGrid: false,

    /**
     * Property: capGrid
     * {<Ext.Window>} A window which includes a CapabilitiesGrid panel.
     */
    capGrid: null,
    
    /** api: property[featureStore]
     *  ``gxp.data.WFSFeatureStore``
     *  Set by the query panel when a query is issued.
     */
    featureStore: null,

    constructor: function(config) {

        var query = Ext.urlDecode(document.location.search.substr(1));
        var queryConfig = Ext.util.JSON.decode(query.q);
        
        this.initialConfig = Ext.apply({}, queryConfig, config);
        Ext.apply(this, this.initialConfig);

        // add any custom application events
        this.addEvents(
            /**
             * Event: ready
             * Fires when application is ready for user interaction.
             */
            "ready"
        );
        
        // pass on any proxy config to OpenLayers
        if(this.proxy) {
            OpenLayers.ProxyHost = this.proxy;
        }
        
        // global XHR error handling
        OpenLayers.Request.events.on({
            "failure": function(evt) {
                var request = evt.request;
                Ext.Msg.show({
                    title: "Request Failure",
                    msg: "Request to " + evt.requestUrl + 
                        " failed. The status code was " + request.status +
                        ", the response was '" + request.responseText + "'.",
                    icon: Ext.Msg.ERROR,
                    buttons: Ext.Msg.OK
                });
            },
            scope: this
        });
        
        this.load();
        
    },
    

    /**
     * Method: load
     * Called at the end of construction.  This initiates the sequence that
     *     prepares the application for use.
     */
    load: function() {
        gxp.util.dispatch(
            [
                function(done) {
                    // fetch wfs caps and create layout when dom ready
                    this.initFeatureTypes(function() {
                        Ext.onReady(function() {
                            this.createLayout();
                            done();
                        }, this);
                    });
                },
                // load capabilities immediately
                function(done) {
                    this.initCapabilities();
                    this.capabilities.load({
                        callback: done
                    });
                }
            ],
            // activate app when the above are both done
            this.activate, this
        );
    },
    
    /**
     * Method: initFeatureTypes
     */
    initFeatureTypes: function(callback) {
        var format = new OpenLayers.Format.WFSCapabilities();
        OpenLayers.Request.GET({
            // TODO: use ol method
            url: this.wfs + "?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetCapabilities",
            callback: function(request) {
                var doc = request.responseXML;
                var capabilities = format.read(doc);
                var list = capabilities.featureTypeList.featureTypes;
                var num = list.length;
                this.featureTypes = new Array(num);
                var ftype, parts;
                for (var i=0; i<num; ++i) {
                    ftype = list[i];
                    parts = ftype.name.split(":");
                    this.featureTypes[i] = {
                        title: ftype.title || parts[1],
                        name: parts[1],
                        namespace: doc.documentElement.getAttribute("xmlns:" + parts[0]),
                        url: this.wfs,
                        schema: this.wfs + "?version=1.1.0&request=DescribeFeatureType&typeName=" + ftype.name
                    };
                }
                callback.call(this);
            },
            scope: this
        });
    },
    
    /**
     * Method: initCapabilities
     */
    initCapabilities: function() {        
        var url;
        var args = {
            SERVICE: "WMS",
            REQUEST: "GetCapabilities"
        };
        var argIndex = this.wms.indexOf("?");
        if(argIndex > -1) {
            var search = this.wms.substring(this.wms.indexOf("?")+1);
            var url = this.wms.replace(search, Ext.urlEncode(Ext.apply(
                Ext.urlDecode(search), args
            )));
        } else {
            url = this.wms + "?" + Ext.urlEncode(args);
        }
        if(this.proxy) {
            url = this.proxy + encodeURIComponent(url);
        }
        
        this.capabilities = new GeoExt.data.WMSCapabilitiesStore({url: url});
    },
    
    /** private: method[createFeatureLayer]
     *  Create a vector layer and assign it to this.featureLayer
     */
    createFeatureLayer: function() {

        
        this.featureLayer = new OpenLayers.Layer.Vector(null, {
            displayInLayerSwitcher: false,
            styleMap: new OpenLayers.StyleMap({
                "default": new OpenLayers.Style(null, {
                    rules: [new OpenLayers.Rule({
                        symbolizer: {
                            "Point": {
                                pointRadius: 4,
                                graphicName: "square",
                                fillColor: "white",
                                fillOpacity: 1,
                                strokeWidth: 1,
                                strokeOpacity: 1,
                                strokeColor: "#333333"
                            },
                            "Line": {
                                strokeWidth: 4,
                                strokeOpacity: 1,
                                strokeColor: "#ff9933"
                            },
                            "Polygon": {
                                strokeWidth: 2,
                                strokeOpacity: 1,
                                strokeColor: "#ff6633",
                                fillColor: "white",
                                fillOpacity: 0.3
                            }
                        }
                    })]
                })
            })    
        });
        
    },
    
    /**
     * Method: createLayout
     * Create the various parts that compose the layout.
     */
    createLayout: function() {
        
        // create the map
        // TODO: check this.initialConfig.map for any map options
        this.map = new OpenLayers.Map({
            theme: null,
            allOverlays: true,
            controls: [new OpenLayers.Control.PanPanel(),
                       new OpenLayers.Control.ZoomPanel()],
            projection: this.initialConfig.map.projection,
            units: this.initialConfig.map.units,
            maxResolution: this.initialConfig.map.maxResolution,
            maxExtent: this.initialConfig.map.maxExtent && OpenLayers.Bounds.fromArray(this.initialConfig.map.maxExtent),
            numZoomLevels: this.initialConfig.map.numZoomLevels || 20
        });
        
        // add a vector layer for display of queried features
        this.createFeatureLayer();
        this.map.addLayer(this.featureLayer);

        // place map in panel
        var mapConfig = this.initialConfig.map || {};
        this.mapPanel = new GeoExt.MapPanel({
            layout: "anchor",
            border: true,
            region: "center",
            map: this.map,
            // TODO: update the OpenLayers.Map constructor to accept an initial center
            center: mapConfig.center && new OpenLayers.LonLat(mapConfig.center[0], mapConfig.center[1]),
            // TODO: update the OpenLayers.Map constructor to accept an initial zoom
            zoom: mapConfig.zoom,
            items: [
                {
                    xtype: "gx_zoomslider",
                    vertical: true,
                    height: 100,
                    plugins: new GeoExt.ZoomSliderTip({
                        template: "<div>Zoom Level: {zoom}</div>"
                    })
                },
                this.createMapOverlay()
            ]
        });
        
        // create layer store
        this.layers = this.mapPanel.layers;

        var addLayerButton = new Ext.Button({
            tooltip : "Add Layers",
            disabled: true,
            iconCls: "icon-addlayers",
            handler : this.showCapabilitiesGrid,
            scope: this
        });
        this.on("ready", function() {addLayerButton.enable();});
        
        // TODO: something similar could move to the layer container
        var getSelectedLayerRecord = function() {
            var node = layerTree.getSelectionModel().getSelectedNode();
            var record;
            if(node && node.layer) {
                var layer = node.layer;
                var store = node.layerStore;
                record = store.getAt(store.findBy(function(record) {
                    return record.get("layer") === layer;
                }));
            }
            return record;
        };

        var removeLayerAction = new Ext.Action({
            text: "Remove Layer",
            iconCls: "icon-removelayers",
            disabled: true,
            tooltip: "Remove Layer",
            handler: function() {
                var record = getSelectedLayerRecord();
                if(record) {
                    this.layers.remove(record);
                    removeLayerAction.disable();
                }
            },
            scope: this
        });
        
        var layerPropertiesDialog;
        var showPropertiesAction = new Ext.Action({
            text: "Layer Properties",
            iconCls: "icon-properties",
            disabled: true,
            tooltip: "Layer Properties",
            handler: function() {
                var record = getSelectedLayerRecord();
                if(record) {
                    if(layerPropertiesDialog) {
                        layerPropertiesDialog.close();
                    }
                    layerPropertiesDialog = new Ext.Window({
                        title: "Layer Properties: " + record.get("title"),
                        width: 250,
                        height: 250,
                        layout: "fit",
                        items: [{
                            xtype: "gx_wmslayerpanel",
                            layerRecord: record,
                            defaults: {style: "padding: 10px"}
                        }]
                    });
                    layerPropertiesDialog.show();
                }
            }
        });
        
        var layerTree = new Ext.tree.TreePanel({
            border: false,
            rootVisible: false,
            root: new GeoExt.tree.LayerContainer({
                text: 'Map Layers',
                layerStore: this.layers
            }),
            enableDD: true,
            selModel: new Ext.tree.DefaultSelectionModel({
                listeners: {
                    beforeselect: function() {
                        // allow removal if more than one non-vector layer
                        var count = this.mapPanel.layers.queryBy(function(r) {
                            return !(r.get("layer") instanceof OpenLayers.Layer.Vector);
                        }).getCount();
                        if(count > 1) {
                            removeLayerAction.enable();
                        }
                        showPropertiesAction.enable();
                    },
                    scope: this
                }
            }),
            listeners: {
                contextmenu: function(node, e) {
                    node.select();
                    var c = node.getOwnerTree().contextMenu;
                    c.contextNode = node;
                    c.showAt(e.getXY());
                },
                scope: this
            },
            contextMenu: new Ext.menu.Menu({
                items: [
                    {
                        text: "Zoom to Layer Extent",
                        iconCls: "icon-zoom-to",
                        handler: function() {
                            var node = layerTree.getSelectionModel().getSelectedNode();
                            if(node && node.layer) {
                                this.layers.each(function(r) {
                                    if(r.get("layer") === node.layer) {
                                        var extent = OpenLayers.Bounds.fromArray(
                                            r.get("llbbox")
                                        ).transform(
                                            new OpenLayers.Projection("EPSG:4326"),
                                            this.map.getProjectionObject()
                                        );
                                        this.map.zoomToExtent(extent, true);
                                        return false;
                                    }
                                }, this);
                            }
                        },
                        scope: this
                    },
                    removeLayerAction,
                    showPropertiesAction
                ]
            })
        });

        var layersContainer = new Ext.Panel({
            autoScroll: true,
            border: false,
            region: 'center',
            title: "Layers",
            items: [layerTree],
            tbar: [
                addLayerButton,
                Ext.apply(new Ext.Button(removeLayerAction), {text: ""}),
                Ext.apply(new Ext.Button(showPropertiesAction), {text: ""})
            ]
        });

        var legendContainer = new GeoExt.LegendPanel({
            title: "Legend",
            border: false,
            region: 'south',
            height: 200,
            collapsible: true,
            split: true,
            autoScroll: true,
            ascending: false,
            map: this.map,
            defaults: {cls: 'legend-item'}
        });

        var westPanel = new Ext.TabPanel({
            border: true,
            region: "west",
            width: 250,
            split: true,
            activeTab: 0,
            items: [
                layersContainer, legendContainer
            ]
        });
        
        var queryPanel = new gxp.QueryPanel({
            title: "Feature Query",
            region: "west",
            width: 390,
            autoScroll: true,
            bodyStyle: "padding: 10px",
            map: this.map,
            maxFeatures: 100,
            layerStore: new Ext.data.JsonStore({
                data: {layers: this.featureTypes},
                root: "layers",
                fields: ["title", "name", "namespace", "url", "schema"]
            }),
            bbar: ["->", {
                text: "Query",
                iconCls: "icon-find",
                disabled: true,
                handler: function() {
                    queryPanel.query();
                }
            }],
            listeners: {
                ready: function(panel, store) {
                    panel.getBottomToolbar().enable();
                    this.featureStore = store;

                    var control = this.map.getControlsByClass(
                        "OpenLayers.Control.DrawFeature")[0];
                    var button = toolbar.find("iconCls", "icon-addfeature")[0];
                    
                    var handlers = {
                        "Point": OpenLayers.Handler.Point,
                        "Line": OpenLayers.Handler.Path,
                        "Curve": OpenLayers.Handler.Path,
                        "Polygon": OpenLayers.Handler.Polygon,
                        "Surface": OpenLayers.Handler.Polygon
                    }
                    
                    var simpleType = panel.geometryType.replace("Multi", "");
                    var Handler = handlers[simpleType];
                    if(Handler) {
                        var active = control.active;
                        if(active) {
                            control.deactivate();
                        }
                        control.handler = new Handler(
                            control, control.callbacks,
                            Ext.apply(control.handlerOptions, {multi: (simpleType != panel.geometryType)})
                        );
                        if(active) {
                            control.activate();
                        }
                        button.enable();
                        // hack to avoid button being disabled again when
                        // app.ready is fired after queryPanel.ready
                        delete button.initialConfig.disabled
                    } else {
                        button.disable();
                    }
                },
                query: function(panel, store) {
                    featureGrid.setStore(store);
                    featureGrid.setTitle("Search Results (loading ...)");
                    new Ext.LoadMask(featureGrid.el, {msg: 'Please Wait...', store: store}).show();
                },
                storeload: function(panel, store, records) {
                    featureGrid.setTitle(this.getSearchResultsTitle(store.getTotalCount()));
                    store.on({
                        "remove": function() {
                            featureGrid.setTitle(this.getSearchResultsTitle(store.getTotalCount()-1));
                        },
                        scope: this
                    })
                },
                scope: this
            }
        });
        
        // create a SelectFeature control
        // "fakeKey" will be ignord by the SelectFeature control, so only one
        // feature can be selected by clicking on the map, but allow for
        // multiple selection in the featureGrid
        var selectControl = new OpenLayers.Control.SelectFeature(
            this.featureLayer, {clickout: false, multipleKey: "fakeKey"});
        selectControl.events.on({
            "activate": function() {
                selectControl.unselectAll(popup && popup.editing && {except: popup.feature});
            },
            "deactivate": function() {
                if(popup) {
                    if(popup.editing) {
                        popup.on("cancelclose", function() {
                            selectControl.activate();
                        }, this, {single: true})
                    }
                    popup.close();
                }
            }
        });
            
        var popup;
        
        this.featureLayer.events.on({
            "featureunselected": function(evt) {
                if(popup) {
                    popup.close();
                }
            },
            "beforefeatureselected": function(evt) {
                //TODO decide if we want to allow feature selection while a
                // feature is being edited. If so, we have to revisit the
                // SelectFeature/ModifyFeature setup, because that would
                // require to have the SelectFeature control *always*
                // activated *after* the ModifyFeature control. Otherwise. we
                // must not configure the ModifyFeature control in standalone
                // mode, and use the SelectFeature control that comes with the
                // ModifyFeature control instead.
                if(popup) {
                    return !popup.editing;
                }
            },
            "featureselected": function(evt) {
                var feature = evt.feature;
                if(selectControl.active) {
                    this._selectingFeature = true;
                    popup = new gxp.FeatureEditPopup({
                        collapsible: true,
                        feature: feature,
                        editing: feature.state === OpenLayers.State.INSERT,
                        schema: queryPanel.attributeStore,
                        allowDelete: true,
                        width: 200,
                        height: 250,
                        listeners: {
                            "close": function() {
                                if(feature.layer) {
                                    selectControl.unselect(feature);
                                }
                            },
                            "featuremodified": function(popup, feature) {
                                popup.disable();
                                this.featureStore.on({
                                    write: {
                                        fn: function() {
                                            if(popup) {
                                                popup.enable();
                                            }
                                        },
                                        single: true
                                    }
                                });                                
                                if(feature.state === OpenLayers.State.DELETE) {                                    
                                    /**
                                     * If the feature state is delete, we need to
                                     * remove it from the store (so it is collected
                                     * in the store.removed list.  However, it should
                                     * not be removed from the layer.  Until
                                     * http://trac.geoext.org/ticket/141 is addressed
                                     * we need to stop the store from removing the
                                     * feature from the layer.
                                     */
                                    var store = this.featureStore;
                                    store._removing = true; // TODO: remove after http://trac.geoext.org/ticket/141
                                    store.remove(store.getRecordFromFeature(feature));
                                    delete store._removing; // TODO: remove after http://trac.geoext.org/ticket/141
                                }
                                this.featureStore.save();
                            },
                            "canceledit": function(popup, feature) {
                                this.featureStore.commitChanges();
                            },
                            scope: this
                        }
                    });
                    popup.show();
                }
            },
            "beforefeaturesadded": function(evt) {
                if(featureGrid.store !== this.featureStore) {
                    featureGrid.setStore(this.featureStore);
                }
            },
            "featuresadded": function(evt) {
                var feature = evt.features.length === 1 && evt.features[0];
                if(feature && feature.state === OpenLayers.State.INSERT) {
                    selectControl.activate();
                    selectControl.select(feature);
                }
            },
            scope: this
        });
        this.map.addControl(selectControl);
        
        queryPanel.on({
            beforequery: function(panel) {
                if(popup && popup.editing) {
                    popup.on("close", panel.query, panel, {single: true});
                    popup.close();
                    return false;
                }
            }
        });

        var featureGrid = new gxp.grid.FeatureGrid({
            title: "Search Results (submit a query to see results)",
            region: "center",
            layer: this.featureLayer,
            sm: new GeoExt.grid.FeatureSelectionModel({
                selectControl: selectControl,
                singleSelect: false,
                autoActivateControl: false,
                listeners: {
                    "beforerowselect": function() {
                        if(selectControl.active && !this._selectingFeature) {
                            return false;
                        }
                        delete this._selectingFeature;
                    },
                    scope: this
                }
            }),
            autoScroll: true,
            bbar: ["->", {
                text: "Display on map",
                enableToggle: true,
                pressed: true,
                toggleHandler: function(btn, pressed) {
                    this.featureLayer.setVisibility(pressed);
                },
                scope: this
            }, {
                text: "Zoom to selected",
                iconCls: "icon-zoom-to",
                handler: function(btn) {
                    var bounds, geom, extent;
                    featureGrid.getSelectionModel().each(function(r) {
                        geom = r.get("feature").geometry;
                        if(geom) {
                            extent = geom.getBounds();
                            if(bounds) {
                                bounds.extend(extent);
                            } else {
                                bounds = extent.clone();
                            }
                        }
                    }, this);
                    if(bounds) {
                        this.map.zoomToExtent(bounds);
                    }
                },
                scope: this                
            }]
        });
        
        var southPanel = new Ext.Panel({
            layout: "border",
            region: "south",
            height: 250,
            split: true,
            collapsible: true,
            items: [queryPanel, featureGrid]
        });
        
        var toolbar = new Ext.Toolbar({
            xtype: "toolbar",
            region: "north",
            disabled: true,
            items: this.createTools()
        });
        this.on("ready", function() {
            // enable only those items that were not specifically disabled
            var disabled = toolbar.items.filterBy(function(item) {
                return item.initialConfig && item.initialConfig.disabled;
            });
            toolbar.enable();
            disabled.each(function(item) {
                item.disable();
            });
        });

        var viewport = new Ext.Viewport({
            layout: "fit",
            hideBorders: true,
            items: {
                layout: "border",
                deferredRender: false,
                items: [
                    toolbar,
                    this.mapPanel,
                    westPanel,
                    southPanel
                ]
            }
        });    
    },
    
    /**
     * Method: activate
     * Activate the application.  Call after application is configured.
     */
    activate: function() {
        
        // add any layers from config
        this.addLayers();

        // initialize tooltips
        Ext.QuickTips.init();
        
        this.fireEvent("ready");

    },
    
    /**
     * Method: addLayers
     * Construct the layer store to be used with the map (referenced as <layers>).
     */
    addLayers: function() {
        var mapConfig = this.initialConfig.map;

        if(mapConfig && mapConfig.layers) {
            var conf, id, record, layer, records = [];
            for(var i=0; i<mapConfig.layers.length; ++i) {
                conf = mapConfig.layers[i];
                id = this.capabilities.findExact("name", conf.name);
                if(id >= 0) {
                    /**
                     * If the same layer is added twice, it will get replaced
                     * unless we give each record a unique id.  In addition, we
                     * need to clone the layer so that the map doesn't assume
                     * the layer has already been added.  Finally, we can't
                     * simply set the record layer to the cloned layer because
                     * record.set compares String(value) to determine equality.
                     * 
                     * TODO: suggest record.clone
                     */
                    Ext.data.Record.AUTO_ID++;
                    record = this.capabilities.getAt(id).copy(Ext.data.Record.AUTO_ID);

                    // set layer max extent from capabilities
                    // TODO: make this SRS independent
                    // TODO: remove the redundancy in this and the code in CapabilitiesGrid
                    if (this.alignToGrid) {
                        layer = record.get("layer").clone();
                        layer.maxExtent = new OpenLayers.Bounds(-180, -90, 180, 90);
                    } else {
                        layer = record.get("layer");
                        var maxExtent = OpenLayers.Bounds.fromArray(
                            record.get("llbbox")
                        ).transform(
                            new OpenLayers.Projection("EPSG:4326"),
                            this.mapPanel.map.getProjectionObject()
                        );
                        // make sure maxExtent is valid (transform does not succeed for all llbbox)
                        if (!(1 / maxExtent.getHeight() > 0) || !(1 / maxExtent.getWidth() > 0)) {
                            // maxExtent has infinite or non-numeric width or height
                            // in this case, the map maxExtent must be specified in the config
                            maxExtent = undefined;
                        }
                        layer = new OpenLayers.Layer.WMS(
                            layer.name, layer.url,
                            {layers: layer.params["LAYERS"]},
                            {
                                buffer: 0,
                                tileSize: new OpenLayers.Size(512, 512),
                                attribution: layer.attribution,
                                maxExtent: maxExtent
                            }
                        );
                    }
                    record.data["layer"] = layer;

                    // set layer visibility from config
                    layer.visibility = ("visibility" in conf) ?
                        conf.visibility : true;
                    
                    // set layer title from config
                    if(conf.title) {
                        /**
                         * Because the layer title data is duplicated, we have
                         * to set it in both places.  After records have been
                         * added to the store, the store handles this
                         * synchronization.
                         */
                        layer.setName(conf.title);
                        record.set("title", conf.title);
                        //TODO revisit when discussion on
                        // http://trac.geoext.org/ticket/110 is complete
                    }
                    record.commit(true);

                    // set any other layer configuration
                    if("opacity" in conf) {
                        layer.opacity = conf.opacity;
                    }
                    if("format" in conf) {
                        layer.params.FORMAT = conf.format;
                    }
                    if("transparent" in conf) {
                        layer.params.TRANSPARENT = conf.transparent;
                    }
                    
                    records.push(record);
                }
            }
            
            // TODO: the layers store has one layer at this point (featureLayer),
            // we want to insert the layers from the config under that one.  This
            // should be handled in a different way.
            var index = this.mapPanel.layers.findBy(function(r) {
                return r.get("layer") instanceof OpenLayers.Layer.Vector;
            });
            if(index !== -1) {
                this.layers.insert(index, records);
            } else {
                this.layers.add(records);
            }
            
            // set map center
            if(this.mapPanel.center) {
                // zoom does not have to be defined
                this.map.setCenter(this.mapPanel.center, this.mapPanel.zoom);
            } else if (this.mapPanel.extent) {
                this.map.zoomToExtent(this.mapPanel.extent);
            } else {
                this.map.zoomToMaxExtent();
            }
            
        }
    },

    /**
     * Method: initCapGrid
     * Constructs a window with a capabilities grid.
     */
    initCapGrid: function(){

        var capGridPanel = new gxp.grid.CapabilitiesGrid({
            store: this.capabilities,
            mapPanel : this.mapPanel,
            layout: 'fit',
            region: 'center',
            autoScroll: true,
            alignToGrid: this.alignToGrid,
            listeners: {
                rowdblclick: function(panel, index, evt) {
                    panel.addLayers();
                }
            }
        });

        this.capGrid = new Ext.Window({
            title: "Available Layers",
            closeAction: 'hide',
            layout: 'border',
            height: 300,
            width: 600,
            items: [
                capGridPanel
            ],
            bbar: [
                "->",
                new Ext.Button({
                    text: "Add Layers",
                    iconCls: "icon-addlayers",
                    handler: function(){
                        capGridPanel.addLayers();
                    },
                    scope : this
                }),
                new Ext.Button({
                    text: "Done",
                    handler: function() {
                        this.capGrid.hide();
                    },
                    scope: this
                })
            ],
            listeners: {
                hide: function(win){
                    capGridPanel.getSelectionModel().clearSelections();
                }
            }
        });
    },

    /**
     * Method: showCapabilitiesGrid
     * Shows the window with a capabilities grid.
     */
    showCapabilitiesGrid: function() {
        if(!this.capGrid) {
            this.initCapGrid();
        }
        this.capGrid.show();
    },

    createMapOverlay: function() {
        var scaleLinePanel = new Ext.Panel({
            cls: 'olControlScaleLine overlay-element overlay-scaleline',
            border: false
        });

        scaleLinePanel.on('render', function(){
            var scaleLine = new OpenLayers.Control.ScaleLine({
                div: scaleLinePanel.body.dom
            });

            this.map.addControl(scaleLine);
            scaleLine.activate();
        }, this);

        var zoomStore = new GeoExt.data.ScaleStore({
            map: this.map
        });

        var zoomSelector = new Ext.form.ComboBox({
            emptyText: 'Zoom level',
            tpl: '<tpl for="."><div class="x-combo-list-item">1 : {[parseInt(values.scale)]}</div></tpl>',
            editable: false,
            triggerAction: 'all',
            mode: 'local',
            store: zoomStore,
            width: 110
        });

        zoomSelector.on('click', function(evt){evt.stopEvent();});
        zoomSelector.on('mousedown', function(evt){evt.stopEvent();});

        zoomSelector.on('select', function(combo, record, index) {
                this.map.zoomTo(record.data.level);
            },
            this
        );

        var zoomSelectorWrapper = new Ext.Panel({
            items: [zoomSelector],
            cls: 'overlay-element overlay-scalechooser',
            border: false });

        this.map.events.register('zoomend', this, function() {
            var scale = zoomStore.queryBy(function(record){
                return this.map.getZoom() == record.data.level;
            });

            if (scale.length > 0) {
                scale = scale.items[0];
                zoomSelector.setValue("1 : " + parseInt(scale.data.scale, 10));
            } else {
                if (!zoomSelector.rendered) {
                    return;
                }
                zoomSelector.clearValue();
            }
        });

        var mapOverlay = new Ext.Panel({
            // title: "Overlay",
            cls: 'map-overlay',
            items: [
                scaleLinePanel,
                zoomSelectorWrapper
            ]
        });


        mapOverlay.on("afterlayout", function(){
            scaleLinePanel.body.dom.style.position = 'relative';
            scaleLinePanel.body.dom.style.display = 'inline';

            mapOverlay.getEl().on("click", function(x){x.stopEvent();});
            mapOverlay.getEl().on("mousedown", function(x){x.stopEvent();});
        }, this);

        return mapOverlay;
    },

    createTools: function() {
        
        var selectControl = this.map.getControlsByClass(
            "OpenLayers.Control.SelectFeature")[0];

        var toolGroup = "toolGroup";

        // create a navigation control
        var navAction = new GeoExt.Action({
            tooltip: "Pan Map",
            iconCls: "icon-pan",
            enableToggle: true,
            pressed: true,
            allowDepress: false,
            control: new OpenLayers.Control.Navigation(),
            map: this.map,
            toggleGroup: toolGroup
        });
        
        var infoButton = new GeoExt.Action({
            tooltip: "Edit existing feature",
            iconCls: "icon-editfeature",
            toggleGroup: toolGroup,
            enableToggle: true,
            allowDepress: false,
            control: selectControl
        });
        
        var addFeatureButton = new GeoExt.Action({
            tooltip: "Create a new feature",
            iconCls: "icon-addfeature",
            toggleGroup: toolGroup,
            enableToggle: true,
            allowDepress: false,
            disabled: true,
            control: new OpenLayers.Control.DrawFeature(
                this.featureLayer,
                OpenLayers.Handler.Point
            ),
            map: this.map
        });

        // create a navigation history control
        var historyControl = new OpenLayers.Control.NavigationHistory();
        this.map.addControl(historyControl);

        // create actions for previous and next
        var navPreviousAction = new GeoExt.Action({
            tooltip: "Zoom to Previous Extent",
            iconCls: "icon-zoom-previous",
            disabled: true,
            control: historyControl.previous
        });
        
        var navNextAction = new GeoExt.Action({
            tooltip: "Zoom to Next Extent",
            iconCls: "icon-zoom-next",
            disabled: true,
            control: historyControl.next
        });
        
        // create split button for measure controls
        var activeIndex = 0;
        var measureSplit = new Ext.SplitButton({
            iconCls: "icon-measure-length",
            tooltip: "Measure",
            enableToggle: true,
            toggleGroup: toolGroup, // Ext doesn't respect this, registered with ButtonToggleMgr below
            allowDepress: false, // Ext doesn't respect this, handler deals with it
            handler: function(button, event) {
                // allowDepress should deal with this first condition
                if(!button.pressed) {
                    button.toggle();
                } else {
                    button.menu.items.itemAt(activeIndex).setChecked(true);
                }
            },
            listeners: {
                toggle: function(button, pressed) {
                    // toggleGroup should handle this
                    if(!pressed) {
                        button.menu.items.each(function(i) {
                            i.setChecked(false);
                        });
                    }
                },
                render: function(button) {
                    // toggleGroup should handle this
                    Ext.ButtonToggleMgr.register(button);
                }
            },
            menu: new Ext.menu.Menu({
                items: [
                    new Ext.menu.CheckItem(
                        new GeoExt.Action({
                            text: "Length",
                            iconCls: "icon-measure-length",
                            toggleGroup: toolGroup,
                            group: toolGroup,
                            allowDepress: false,
                            map: this.map,
                            control: this.createMeasureControl(
                                OpenLayers.Handler.Path, "Length"
                            )
                        })
                    ),
                    new Ext.menu.CheckItem(
                        new GeoExt.Action({
                            text: "Area",
                            iconCls: "icon-measure-area",
                            toggleGroup: toolGroup,
                            group: toolGroup,
                            allowDepress: false,
                            map: this.map,
                            control: this.createMeasureControl(
                                OpenLayers.Handler.Polygon, "Area"
                            )
                        })
                    )
                ]
            })
        });
        measureSplit.menu.items.each(function(item, index) {
            item.on({checkchange: function(item, checked) {
                measureSplit.toggle(checked);
                if(checked) {
                    activeIndex = index;
                    measureSplit.setIconClass(item.iconCls);
                }
            }});
        });
        
        var tools = [
            new Ext.Button({
                text: "GeoEditor",
                iconCls: "icon-geoexplorer",
                handler: this.displayAppInfo
            }),
            "-",
            new Ext.Button({
                tooltip: "Bookmark",
                handler: this.bookmark,
                scope: this,
                iconCls: "icon-save"
            }),
            "-",
            navAction,
            infoButton,
            addFeatureButton,
            measureSplit,
            "-",
            new Ext.Button({
                handler: function(){
                    this.map.zoomIn();
                },
                tooltip: "Zoom In",
                iconCls: "icon-zoom-in",
                scope: this
            }),
            new Ext.Button({
                tooltip: "Zoom Out",
                handler: function(){
                    this.map.zoomOut();
                },
                iconCls: "icon-zoom-out",
                scope: this
            }),
            navPreviousAction,
            navNextAction,
            new Ext.Button({
                tooltip: "Zoom to Visible Extent",
                iconCls: "icon-zoom-visible",
                handler: function() {
                    var bbox, bounds, extent;
                    this.layers.each(function(r) {
                        if(r.get("layer").getVisibility()) {
                            bbox = r.get("llbbox");
                            if(bbox) {
                                extent = OpenLayers.Bounds.fromArray(
                                    r.get("llbbox")
                                ).transform(
                                    new OpenLayers.Projection("EPSG:4326"),
                                    this.map.getProjectionObject()
                                );
                                if(bounds) {
                                    bounds.extend(extent);
                                } else {
                                    bounds = extent;
                                }
                            }
                        }
                    }, this);
                    if(bounds) {
                        this.map.zoomToExtent(bounds);
                    }
                },
                scope: this
            })
        ];

        return tools;
    },

    createMeasureControl: function(handlerType, title) {
        
        var styleMap = new OpenLayers.StyleMap({
            "default": new OpenLayers.Style(null, {
                rules: [new OpenLayers.Rule({
                    symbolizer: {
                        "Point": {
                            pointRadius: 4,
                            graphicName: "square",
                            fillColor: "white",
                            fillOpacity: 1,
                            strokeWidth: 1,
                            strokeOpacity: 1,
                            strokeColor: "#333333"
                        },
                        "Line": {
                            strokeWidth: 3,
                            strokeOpacity: 1,
                            strokeColor: "#666666",
                            strokeDashstyle: "dash"
                        },
                        "Polygon": {
                            strokeWidth: 2,
                            strokeOpacity: 1,
                            strokeColor: "#666666",
                            fillColor: "white",
                            fillOpacity: 0.3
                        }
                    }
                })]
            })
        });

        var cleanup = function() {
            if (measureToolTip) {
                measureToolTip.destroy();
            }   
        };

        var makeString = function(metricData) {
            var metric = metricData.measure;
            var metricUnit = metricData.units;
            
            measureControl.displaySystem = "english";
            
            var englishData = metricData.geometry.CLASS_NAME.indexOf("LineString") > -1 ?
            measureControl.getBestLength(metricData.geometry) :
            measureControl.getBestArea(metricData.geometry);

            var english = englishData[0];
            var englishUnit = englishData[1];
            
            measureControl.displaySystem = "metric";
            var dim = metricData.order == 2 ? 
            '<sup>2</sup>' :
            '';
            
            return metric.toFixed(2) + " " + metricUnit + dim + "<br>" + 
                english.toFixed(2) + " " + englishUnit + dim;
        };
        
        var measureToolTip; 
        var measureControl = new OpenLayers.Control.Measure(handlerType, {
            persist: true,
            handlerOptions: {layerOptions: {styleMap: styleMap}},
            eventListeners: {
                measurepartial: function(event) {
                    cleanup();
                    measureToolTip = new Ext.ToolTip({
                        html: makeString(event),
                        title: title,
                        autoHide: false,
                        closable: true,
                        draggable: false,
                        mouseOffset: [0, 0],
                        showDelay: 1,
                        listeners: {hide: cleanup}
                    });
                    if(event.measure > 0) {
                        var px = measureControl.handler.lastUp;
                        var p0 = this.mapPanel.getPosition();
                        measureToolTip.targetXY = [p0[0] + px.x, p0[1] + px.y];
                        measureToolTip.show();
                    }
                },
                measure: function(event) {
                    cleanup();                    
                    measureToolTip = new Ext.ToolTip({
                        target: Ext.getBody(),
                        html: makeString(event),
                        title: title,
                        autoHide: false,
                        closable: true,
                        draggable: false,
                        mouseOffset: [0, 0],
                        showDelay: 1,
                        listeners: {
                            hide: function() {
                                measureControl.cancel();
                                cleanup();
                            }
                        }
                    });
                },
                deactivate: cleanup,
                scope: this
            }
        });

        return measureControl;
    },

    /**
     * Method: bookmark
     * Creates a window that shows the user a URL that can be used to
     * reload the map in its current configuration.
     *
     * Returns:
     *{String} The URL displayed to the user.
     */ 
    bookmark: function(){

        var params = Ext.apply(
            OpenLayers.Util.getParameters(),
            {q: Ext.util.JSON.encode(this.extractConfiguration())}
        );
        
        // disregard any hash in the url, but maintain all other components
        var url =
            document.location.href.split("?").shift() +
            "?" + Ext.urlEncode(params);

        var win = new Ext.Window({
            title: "Bookmark URL",
            layout: 'form',
            labelAlign: 'top',
            modal: true,
            bodyStyle: "padding: 5px",
            width: 300,
            items: [{
                xtype: 'textfield',
                fieldLabel: 'Permalink',
                readOnly: true,
                anchor: "100%",
                selectOnFocus: true,
                value: url
            }]
        });

        win.show();
        win.items.first().selectText();

        return url;
    },
    
    /**
     * Method: extractConfiguration
     * Returns an object that represents the app's current configuration.
     *
     * Returns:
     *{Object} An object that represents the app's current configuration.
     */ 
    extractConfiguration: function(){
        var config = {};

        // Map configuration

        var center = this.map.getCenter();
        
        config.map = {
            center: [center.lon, center.lat],
            zoom: this.map.zoom
        };

        //Layers configuration
        config.map.layers = [];

        this.layers.each(function(layerRecord){
            var layer = layerRecord.get("layer");
            if(layer.displayInLayerSwitcher) {    
                var c = {
                    title: layerRecord.get("title"),
                    name: (layer.params && layer.params.LAYERS) || 
                        layerRecord.get("name"),
                    visibility: layerRecord.get("layer").getVisibility(),
                    format: layer.params.FORMAT,
                    opacity: layer.opacity || undefined,
                    transparent: layer.params.TRANSPARENT
                };
    
                config.map.layers.push(c);
            }
        });

        return config;
    },

    displayAppInfo: function() {
        var win = new Ext.Window({
            title: "About GeoEditor",
            html: "<iframe style=\"border: none; height: 100%; width: 100%\" src=\"about.html\"><a target=\"_blank\" href=\"about.html\">About GeoExplorer</a> </iframe>",
            modal: true,
            width: 300,
            height: 350
        });
        win.show();
    },
    
    getSearchResultsTitle: function(count) {
        var str = (count == 1 && "1 feature") ||
            (count > 1 && count + " features") ||
            "no features";
        return "Search Results (" + str + ")";
    }
});
