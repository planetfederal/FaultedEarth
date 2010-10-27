/**
 * Copyright (c) 2009-2010 The Open Planning Project
 */

/**
 * Add transforms for EPSG:102113.  This is web mercator to ArcGIS 9.3.
 */
OpenLayers.Projection.addTransform(
    "EPSG:4326", "EPSG:102113",
    OpenLayers.Layer.SphericalMercator.projectForward
);
OpenLayers.Projection.addTransform(
    "EPSG:102113", "EPSG:4326",
    OpenLayers.Layer.SphericalMercator.projectInverse
);


/**
 * api: (define)
 * module = GeoExplorer
 * extends = Ext.Observable
 */

/** api: constructor
 *  .. class:: GeoExplorer(config)
 *     Create a new GeoExplorer application.
 *
 *     Parameters:
 *     config - {Object} Optional application configuration properties.
 *
 *     Valid config properties:
 *     map - {Object} Map configuration object.
 *     sources - {Object} An object with properties whose values are WMS endpoint URLs
 *     alignToGrid - {boolean} if true, align tile requests to the grid 
 *         enforced by tile caches such as GeoWebCache or Tilecache
 *
 *     Valid map config properties:
 *         projection - {String} EPSG:xxxx
 *         units - {String} map units according to the projection
 *         maxResolution - {Number}
 *         layers - {Array} A list of layer configuration objects.
 *         center - {Array} A two item array with center coordinates.
 *         zoom - {Number} An initial zoom level.
 *
 *     Valid layer config properties (WMS):
 *     name - {String} Required WMS layer name.
 *     title - {String} Optional title to display for layer.
 */
var GeoExplorer = Ext.extend(gxp.Viewer, {
    
    /**
     * private: property[mapPanel]
     * the :class:`GeoExt.MapPanel` instance for the main viewport
     */
    mapPanel: null,

    /** api: property[featureStore]
     *  ``gxp.data.WFSFeatureStore``
     *  Set by the query panel when a query is issued.
     */
    featureStore: null,

    /**
     * api: config[alignToGrid]
     * A boolean indicating whether or not to restrict tile request to tiled
     * mapping service recommendation.
     *
     * True => align to grid 
     * False => unrestrained tile requests
     */
    alignToGrid: false,
    
    /**
     * private: property[capGrid]
     * :class:`Ext.Window` The window containing the CapabilitiesGrid panel to 
     * use when the user is adding new layers to the map.
     */
    capGrid: null,

    /**
     * private: property[popupCache]
     * :class:`Object` An object containing references to visible popups so that
     * we can insert responses from multiple requests.
     *
     * ..seealso:: :method:`GeoExplorer.displayPopup()`
     */
    popupCache: null,
    
    constructor: function(config) {

        this.popupCache = {};
        this.mapItems = [{
            xtype: "gx_zoomslider",
            vertical: true,
            height: 100,
            plugins: new GeoExt.ZoomSliderTip({
                template: "<div>Zoom Level: {zoom}</div><div>Scale: 1:{scale}"
            })
        }];
        
        GeoExplorer.superclass.constructor.apply(this, arguments);
    }, 

    /**
     * Method: initFeatureTypes
     * TODO: use WFSCapabilitiesReader/Store instead
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
    
    loadConfig: function(config) {
        
        // TODO: add queue property to viewer with list of pre-init functions
        this.wfs = config.wfs;
        this.initFeatureTypes(function() {
            this.applyConfig(config);
        });
        
    },
    
    displayXHRTrouble: function(msg, status) {
        
        Ext.Msg.show({
            title: "Communication Trouble: Status " + status,
            msg: msg,
            icon: Ext.MessageBox.WARNING
        });
        
    },
    
    /** private: method[initPortal]
     * Create the various parts that compose the layout.
     */
    initPortal: function() {
        
        // add a vector layer for display of queried features
        this.createFeatureLayer();
        this.mapPanel.map.addLayer(this.featureLayer);
        
        // TODO: make a proper component out of this
        var mapOverlay = this.createMapOverlay();
        this.mapPanel.add(mapOverlay);
        
        var addLayerButton = new Ext.Button({
            tooltip : "Add Layers",
            disabled: true,
            iconCls: "icon-addlayers",
            handler : this.showCapabilitiesGrid,
            scope: this
        });
        this.on("ready", function() {addLayerButton.enable();});
        
        var getRecordFromNode = function(node) {
            if(node && node.layer) {
                var layer = node.layer;
                var store = node.layerStore;
                record = store.getAt(store.findBy(function(r) {
                    return r.get("layer") === layer;
                }));
            }
            return record;
        };

        var getSelectedLayerRecord = function() {
            var node = layerTree.getSelectionModel().getSelectedNode();
            return getRecordFromNode(node);
        };
        
        var removeLayerAction = new Ext.Action({
            text: "Remove Layer",
            iconCls: "icon-removelayers",
            disabled: true,
            tooltip: "Remove Layer",
            handler: function() {
                var record = getSelectedLayerRecord();
                if(record) {
                    this.mapPanel.layers.remove(record);
                    removeLayerAction.disable();
                }
            },
            scope: this
        });

        var treeRoot = new Ext.tree.TreeNode({
            text: "Layers",
            expanded: true,
            isTarget: false,
            allowDrop: false
        });
        treeRoot.appendChild(new GeoExt.tree.LayerContainer({
            text: "Overlays",
            iconCls: "gx-folder",
            expanded: true,
            loader: new GeoExt.tree.LayerLoader({
                store: this.mapPanel.layers,
                filter: function(record) {
                    return !record.get("group") &&
                        record.get("layer").displayInLayerSwitcher == true;
                },
                createNode: function(attr) {
                    var layer = attr.layer;
                    var store = attr.layerStore;
                    if (layer && store) {
                        var record = store.getAt(store.findBy(function(r) {
                            return r.get("layer") === layer;
                        }));
                        if (record && !record.get("queryable")) {
                            attr.iconCls = "gx-tree-rasterlayer-icon";
                        }
                    }
                    return GeoExt.tree.LayerLoader.prototype.createNode.apply(this, [attr]);
                }
            }),
            singleClickExpand: true,
            allowDrag: false,
            listeners: {
                append: function(tree, node) {
                    node.expand();
                }
            }
        }));
        
        treeRoot.appendChild(new GeoExt.tree.LayerContainer({
            text: "Base Layers",
            iconCls: "gx-folder",
            expanded: true,
            group: "background",
            loader: new GeoExt.tree.LayerLoader({
                baseAttrs: {checkedGroup: "background"},
                store: this.mapPanel.layers,
                filter: function(record) {
                    return record.get("group") === "background" &&
                        record.get("layer").displayInLayerSwitcher == true;
                },
                createNode: function(attr) {
                    var layer = attr.layer;
                    var store = attr.layerStore;
                    if (layer && store) {
                        var record = store.getAt(store.findBy(function(r) {
                            return r.get("layer") === layer;
                        }));
                        if (record) {
                            if (!record.get("queryable")) {
                                attr.iconCls = "gx-tree-rasterlayer-icon";
                            }
                            if (record.get("fixed")) {
                                attr.allowDrag = false;
                            }
                        }
                    }
                    return GeoExt.tree.LayerLoader.prototype.createNode.apply(this, arguments);
                }
            }),
            singleClickExpand: true,
            allowDrag: false,
            listeners: {
                append: function(tree, node) {
                    node.expand();
                }
            }
        }));
        
        var layerPropertiesDialog;
        var showPropertiesAction = new Ext.Action({
            text: "Layer Properties",
            iconCls: "icon-properties",
            disabled: true,
            tooltip: "Layer Properties",
            handler: function() {
                var record = getSelectedLayerRecord();
                if (record) {
                    var type = record.get("properties");
                    if (type) {
                        if(layerPropertiesDialog) {
                            layerPropertiesDialog.close();
                        }
                        layerPropertiesDialog = new Ext.Window({
                            title: "Layer Properties: " + record.get("title"),
                            width: 250,
                            height: 250,
                            layout: "fit",
                            items: [{
                                xtype: type,
                                layerRecord: record,
                                defaults: {style: "padding: 10px"}
                            }]
                        });
                        layerPropertiesDialog.show();
                    }
                }
            }
        });
        
        var updateLayerActions = function(sel, node) {
            if(node && node.layer) {
                // allow removal if more than one non-vector layer
                var count = this.mapPanel.layers.queryBy(function(r) {
                    return !(r.get("layer") instanceof OpenLayers.Layer.Vector);
                }).getCount();
                if(count > 1) {
                    removeLayerAction.enable();
                } else {
                    removeLayerAction.disable();
                }
                var record = getRecordFromNode(node);
                if (record.get("properties")) {
                    showPropertiesAction.enable();                    
                } else {
                    showPropertiesAction.disable();
                }
            } else {
                removeLayerAction.disable();
                showPropertiesAction.disable();
            }
        };

        var layerTree = new Ext.tree.TreePanel({
            root: treeRoot,
            rootVisible: false,
            border: false,
            enableDD: true,
            selModel: new Ext.tree.DefaultSelectionModel({
                listeners: {
                    beforeselect: updateLayerActions,
                    scope: this
                }
            }),
            listeners: {
                contextmenu: function(node, e) {
                    if(node && node.layer) {
                        node.select();
                        var c = node.getOwnerTree().contextMenu;
                        c.contextNode = node;
                        c.showAt(e.getXY());
                    }
                },
                beforemovenode: function(tree, node, oldParent, newParent, index) {
                    // change the group when moving to a new container
                    if(oldParent !== newParent) {
                        var store = newParent.loader.store;
                        var index = store.findBy(function(r) {
                            return r.get("layer") === node.layer;
                        });
                        var record = store.getAt(index);
                        record.set("group", newParent.attributes.group);
                    }
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
                                var map = this.mapPanel.map;
                                var extent = node.layer.restrictedExtent || map.maxExtent;
                                map.zoomToExtent(extent, true);
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
            map: this.mapPanel.map,
            defaults: {cls: 'legend-item'}
            // TODO: remove when http://trac.geoext.org/ticket/305 is fixed
            ,items: []
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
            map: this.mapPanel.map,
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

                    var control = this.mapPanel.map.getControlsByClass(
                        "OpenLayers.Control.DrawFeature")[0];
                    var button = this.toolbar.find("iconCls", "icon-addfeature")[0];
                    
                    var handlers = {
                        "Point": OpenLayers.Handler.Point,
                        "Line": OpenLayers.Handler.Path,
                        "Curve": OpenLayers.Handler.Path,
                        "Polygon": OpenLayers.Handler.Polygon,
                        "Surface": OpenLayers.Handler.Polygon
                    };
                    
                    var simpleType = panel.geometryType.replace("Multi", "");
                    var Handler = handlers[simpleType];
                    if (Handler) {
                        var active = control.active;
                        if (active) {
                            control.deactivate();
                        }
                        control.handler = new Handler(
                            control, control.callbacks,
                            Ext.apply(control.handlerOptions, {multi: (simpleType != panel.geometryType)})
                        );
                        if (active) {
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
        var popup;
        var selectControl = new OpenLayers.Control.SelectFeature(
            this.featureLayer, {clickout: false, multipleKey: "fakeKey"}
        );
        selectControl.events.on({
            "activate": function() {
                selectControl.unselectAll(popup && popup.editing && {except: popup.feature});
            },
            "deactivate": function() {
                if (popup) {
                    if (popup.editing) {
                        popup.on("cancelclose", function() {
                            selectControl.activate();
                        }, this, {single: true})
                    }
                    popup.close();
                }
            }
        });
            
        this.featureLayer.events.on({
            "featureunselected": function(evt) {
                if (popup) {
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
                if (popup) {
                    return !popup.editing;
                }
            },
            "featureselected": function(evt) {
                var feature = evt.feature;
                if (selectControl.active) {
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
                                if (feature.layer) {
                                    selectControl.unselect(feature);
                                }
                            },
                            "featuremodified": function(popup, feature) {
                                popup.disable();
                                this.featureStore.on({
                                    write: {
                                        fn: function() {
                                            if (popup) {
                                                popup.enable();
                                            }
                                        },
                                        single: true
                                    }
                                });                                
                                if (feature.state === OpenLayers.State.DELETE) {                                    
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
                if (featureGrid.store !== this.featureStore) {
                    featureGrid.setStore(this.featureStore);
                }
            },
            "featuresadded": function(evt) {
                var feature = evt.features.length === 1 && evt.features[0];
                if (feature && feature.state === OpenLayers.State.INSERT) {
                    selectControl.activate();
                    selectControl.select(feature);
                }
            },
            scope: this
        });
        this.mapPanel.map.addControl(selectControl);
        
        queryPanel.on({
            beforequery: function(panel) {
                if (popup && popup.editing) {
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
                        if (selectControl.active && !this._selectingFeature) {
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
                        if (geom) {
                            extent = geom.getBounds();
                            if (bounds) {
                                bounds.extend(extent);
                            } else {
                                bounds = extent.clone();
                            }
                        }
                    }, this);
                    if (bounds) {
                        this.mapPanel.map.zoomToExtent(bounds);
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

        this.toolbar = new Ext.Toolbar({
            xtype: "toolbar",
            region: "north",
            autoHeight: true,
            disabled: true,
            items: this.createTools()
        });
        this.on("ready", function() {
            // enable only those items that were not specifically disabled
            var disabled = this.toolbar.items.filterBy(function(item) {
                return item.initialConfig && item.initialConfig.disabled;
            });
            this.toolbar.enable();
            disabled.each(function(item) {
                item.disable();
            });
        });

        this.mapPanelContainer = new Ext.Panel({
            layout: "card",
            region: "center",
            defaults: {
                border: false
            },
            items: [
                this.mapPanel
            ],
            activeItem: 0
        });
        
        this.portalItems = [
            this.toolbar,
            this.mapPanelContainer,
            westPanel,
            southPanel
        ];
        
        GeoExplorer.superclass.initPortal.apply(this, arguments);        
    },
    
    /**
     * private: method[initCapGrid]
     * Constructs a window with a capabilities grid.
     */
    initCapGrid: function() {
        
        var source, data = [];        
        for (var id in this.layerSources) {
            source = this.layerSources[id];
            if (source.store) {
                data.push([id, this.layerSources[id].title || id]);                
            }
        }
        var sources = new Ext.data.ArrayStore({
            fields: ["id", "title"],
            data: data
        });

        var expander = new Ext.grid.RowExpander({
            tpl: new Ext.Template("<p><b>Abstract:</b> {abstract}</p>")
        });
        
        var addLayers = function() {
            var key = sourceComboBox.getValue();
            var layerStore = this.mapPanel.layers;
            var source = this.layerSources[key];
            var records = capGridPanel.getSelectionModel().getSelections();
            var record;
            for (var i=0, ii=records.length; i<ii; ++i) {
                record = source.createLayerRecord({
                    name: records[i].get("name"),
                    source: key
                });
                if (record) {
                    if (record.get("group") === "background") {
                        layerStore.insert(0, [record]);
                    } else {
                        layerStore.add([record]);
                    }
                }
            }
        };

        var capGridPanel = new Ext.grid.GridPanel({
            store: this.layerSources[data[0][0]].store,
            layout: "fit",
            region: "center",
            autoScroll: true,
            autoExpandColumn: "title",
            plugins: [expander],
            colModel: new Ext.grid.ColumnModel([
                expander,
                {id: "title", header: "Title", dataIndex: "title", sortable: true},
                {header: "Id", dataIndex: "name", width: 150, sortable: true}
            ]),
            listeners: {
                rowdblclick: addLayers,
                scope: this
            }
        });
        
        var sourceComboBox = new Ext.form.ComboBox({
            store: sources,
            valueField: "id",
            displayField: "title",
            triggerAction: "all",
            editable: false,
            allowBlank: false,
            forceSelection: true,
            mode: "local",
            value: data[0][0],
            listeners: {
                select: function(combo, record, index) {
                    var store = this.layerSources[record.get("id")].store;
                    capGridPanel.reconfigure(store, capGridPanel.getColumnModel());
                    // TODO: remove the following when this Ext issue is addressed
                    // http://www.extjs.com/forum/showthread.php?100345-GridPanel-reconfigure-should-refocus-view-to-correct-scroller-height&p=471843
                    capGridPanel.getView().focusRow(0);
                },
                scope: this
            }
        });
        
        var capGridToolbar = null;
        if (this.proxy || data.length > 1) {
            capGridToolbar = [
                new Ext.Toolbar.TextItem({
                    text: "View available data from:"
                }),
                sourceComboBox
            ];
        }
        
        if (this.proxy) {
            capGridToolbar.push("-", new Ext.Button({
                text: "Add a New Server",
                iconCls: "icon-addserver",
                handler: function() {
                    newSourceWindow.show();
                }
            }));
        }
        
        var newSourceWindow = new GeoExplorer.NewSourceWindow({
            modal: true,
            listeners: {
                "server-added": function(url) {
                    newSourceWindow.setLoading();
                    this.addLayerSource({
                        config: {url: url}, // assumes default of gx_wmssource
                        callback: function(id) {
                            // add to combo and select
                            var record = new sources.recordType({
                                id: id,
                                title: this.layerSources[id].title || "Untitled" // TODO: titles
                            });
                            sources.insert(0, [record]);
                            sourceComboBox.onSelect(record, 0);
                            newSourceWindow.hide();
                        },
                        fallback: function(source, msg) {
                            newSourceWindow.setError(
                                "Error getting WMS capabilities (" + msg + ").\nPlease check the url and try again."
                            );
                        },
                        scope: this
                    });
                },
                scope: this
            }
        });

        this.capGrid = new Ext.Window({
            title: "Available Layers",
            closeAction: "hide",
            layout: "border",
            height: 300,
            width: 450,
            modal: true,
            items: [capGridPanel],
            tbar: capGridToolbar,
            bbar: [
                "->",
                new Ext.Button({
                    text: "Add Layers",
                    iconCls: "icon-addlayers",
                    handler: addLayers,
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

    /** private: method[showCapabilitiesGrid]
     * Shows the window with a capabilities grid.
     */
    showCapabilitiesGrid: function() {
        if(!this.capGrid) {
            this.initCapGrid();
        }
        this.capGrid.show();
    },

    /** private: method[createMapOverlay]
     * Builds the :class:`Ext.Panel` containing components to be overlaid on the
     * map, setting up the special configuration for its layout and 
     * map-friendliness.
     */
    createMapOverlay: function() {
        var scaleLinePanel = new Ext.BoxComponent({
            autoEl: {
                tag: "div",
                cls: "olControlScaleLine overlay-element overlay-scaleline"
            }
        });

        scaleLinePanel.on('render', function(){
            var scaleLine = new OpenLayers.Control.ScaleLine({
                div: scaleLinePanel.getEl().dom
            });

            this.mapPanel.map.addControl(scaleLine);
            scaleLine.activate();
        }, this);

        var zoomStore = new GeoExt.data.ScaleStore({
            map: this.mapPanel.map
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

        zoomSelector.on({
            click: function(evt) {
                evt.stopEvent();
            },
            mousedown: function(evt) {
                evt.stopEvent();
            },
            select: function(combo, record, index) {
                this.mapPanel.map.zoomTo(record.data.level);
            },
            scope: this
        })

        var zoomSelectorWrapper = new Ext.Panel({
            items: [zoomSelector],
            cls: 'overlay-element overlay-scalechooser',
            border: false 
        });

        this.mapPanel.map.events.register('zoomend', this, function() {
            var scale = zoomStore.queryBy(function(record) {
                return this.mapPanel.map.getZoom() == record.data.level;
            }, this);

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
            scaleLinePanel.getEl().dom.style.position = 'relative';
            scaleLinePanel.getEl().dom.style.display = 'inline';

            mapOverlay.getEl().on("click", function(x){x.stopEvent();});
            mapOverlay.getEl().on("mousedown", function(x){x.stopEvent();});
        }, this);

        return mapOverlay;
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

    /** private: method[createTools]
     * Create the toolbar configuration for the main panel.  This method can be 
     * overridden in derived explorer classes such as :class:`GeoExplorer.Composer`
     * or :class:`GeoExplorer.Viewer` to provide specialized controls.
     */
    createTools: function() {
        
        var toolGroup = "toolGroup";

        var aboutButton = new Ext.Button({
            text: "Faulted Earth",
            iconCls: "icon-geoexplorer",
            handler: this.displayAppInfo,
            scope: this
        });

        // create a navigation control
        var navAction = new GeoExt.Action({
            tooltip: "Pan Map",
            iconCls: "icon-pan",
            enableToggle: true,
            pressed: true,
            allowDepress: false,
            control: new OpenLayers.Control.Navigation({zoomWheelEnabled: false}),
            map: this.mapPanel.map,
            toggleGroup: toolGroup
        });

        var infoButton = new GeoExt.Action({
            tooltip: "Edit existing feature",
            iconCls: "icon-editfeature",
            toggleGroup: toolGroup,
            enableToggle: true,
            allowDepress: false,
            control: this.mapPanel.map.getControlsByClass(
                "OpenLayers.Control.SelectFeature"
            )[0]
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
            map: this.mapPanel.map
        });

        // create a navigation history control
        var historyControl = new OpenLayers.Control.NavigationHistory();
        this.mapPanel.map.addControl(historyControl);

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
                            map: this.mapPanel.map,
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
                            map: this.mapPanel.map,
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
            aboutButton, 
            "-",
            navAction,
            infoButton,
            addFeatureButton,
            measureSplit,
            "-",
            new Ext.Button({
                handler: function(){
                    this.mapPanel.map.zoomIn();
                },
                tooltip: "Zoom In",
                iconCls: "icon-zoom-in",
                scope: this
            }),
            new Ext.Button({
                tooltip: "Zoom Out",
                handler: function(){
                    this.mapPanel.map.zoomOut();
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
                    var extent, layer;
                    for(var i=0, len=this.mapPanel.map.layers.length; i<len; ++i) {
                        layer = this.mapPanel.map.layers[i];
                        if(layer.getVisibility()) {
                            if(extent) {
                                extent.extend(layer.restrictedExtent);
                            } else {
                                extent = layer.restrictedExtent.clone();
                            }
                        }
                    }
                    if(extent) {
                        this.mapPanel.map.zoomToExtent(extent);
                    }
                },
                scope: this
            })
        ];

        return tools;
    },

    /** private: method[createMeasureControl]
     * :param: handlerType: the :class:`OpenLayers.Handler` for the measurement
     *     operation
     * :param: title: the string label to display alongside results
     *
     * Convenience method for creating a :class:`OpenLayers.Control.Measure` 
     * control
     */
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
            geodesic: true,
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

    /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     * :arg title: a String to use for the title of the results section 
     *     reporting the info to the user
     * :arg text: ``String`` Body text.
     */
    displayPopup: function(evt, title, text) {
        var popup;
        var popupKey = evt.xy.x + "." + evt.xy.y;

        if (!(popupKey in this.popupCache)) {
            var lonlat = this.mapPanel.map.getLonLatFromPixel(evt.xy);
            popup = new GeoExt.Popup({
                title: "Feature Info",
                layout: "accordion",
                lonlat: lonlat,
                map: this.mapPanel,
                width: 250,
                height: 300,
                listeners: {
                    close: (function(key) {
                        return function(panel){
                            delete this.popupCache[key];
                        };
                    })(popupKey),
                    scope: this
                }
            });
            popup.show();
            this.popupCache[popupKey] = popup;
        } else {
            popup = this.popupCache[popupKey];
        }

        // extract just the body content
        popup.add({
            title: title,
            layout: "fit",
            html: text,
            autoScroll: true,
            autoWidth: true,
            collapsible: true
        });
        popup.doLayout();
    },

    /** api: method[getBookmark]
     *  :return: ``String``
     *
     *  Generate a bookmark for an unsaved map.
     */
    getBookmark: function() {
        var params = Ext.apply(
            OpenLayers.Util.getParameters(),
            {q: Ext.util.JSON.encode(this.getState())}
        );
        
        // disregard any hash in the url, but maintain all other components
        var url = 
            document.location.href.split("?").shift() +
            "?" + Ext.urlEncode(params);
        
        return url;
    },

    /** private: method[displayAppInfo]
     * Display an informational dialog about the application.
     */
    displayAppInfo: function() {
        var appInfo = new Ext.Panel({
            title: "Faulted Earth",
            html: "<iframe style='border: none; height: 100%; width: 100%' src='about.html' frameborder='0' border='0'><a target='_blank' href='about.html'>About Faulted Earth</a> </iframe>"
        });

        var about = Ext.applyIf(this.about, {
            title: '', 
            "abstract": '', 
            contact: ''
        });

        var mapInfo = new Ext.Panel({
            title: "Map Info",
            html: '<div class="gx-info-panel">' +
                  '<h2>Title</h2><p>' + about.title +
                  '</p><h2>Description</h2><p>' + about['abstract'] +
                  '</p> <h2>Contact</h2><p>' + about.contact +'</p></div>',
            height: 'auto',
            width: 'auto'
        });

        var tabs = new Ext.TabPanel({
            activeTab: 0,
            items: [mapInfo, appInfo]
        });

        var win = new Ext.Window({
            title: "About this Map",
            modal: true,
            layout: "fit",
            width: 300,
            height: 300,
            items: [tabs]
        });
        win.show();
    }
});

