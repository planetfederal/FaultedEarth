=========
GeoEditor
=========

Running and deploying GeoEditor
-------------------------------

These instructions describe how to deploy GeoEditor assuming you have a copy
of the application archive (GeoEditor.zip).

1. Extract the archive to someplace in your web root.

    you@prompt:~/public_html$ unzip GeoEditor.zip

2. Load the application in your browser (e.g. http://localhost/~you/GeoEditor).

Note that the inital configuration for the application works off of a local WMS
and WFS. If you are using a remote WMS or WFS, you must configure a local proxy.
See the index.html source for detail on proxy configuration.


Changing which layers are displayed at startup
----------------------------------------------

Find the application configuration in index.html.  It should look something like
the code below (assuming you are running it with a local GeoServer)::

    var app = new GeoExplorer({
        wms: "/geoserver/wms",
        map: {
            layers: [{
                name: "topp:bluemarble",
                title: "Global Imagery"
            }],
            center: [-96.7, 37.6],
            zoom: 4
        }
        // ...
    });

If you want to add the "topp:states" layer to the layers that are initially
displayed, edit your application config to read something like the code below::

    var app = new GeoExplorer({
        wms: "/geoserver/wms",
        map: {
            layers: [{
                name: "topp:bluemarble",
                title: "Global Imagery"
            }, {
                name: "topp:states",
                title: "US States"
            }],
            center: [-96.7, 37.6],
            zoom: 4
        }
        // ...
    });


Getting the source
------------------

This application runs on Ext, OpenLayers, GeoExt, and custom application code.

Getting Ext JS
~~~~~~~~~~~~~~

The GeoEditor application runs off of hosted versions of Ext JS. See
http://extjs.com for details on getting the Ext JS source.

Getting OpenLayers, GeoExt, and GeoExplorer
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can get the sources for OpenLayers, GeoExt, and the application directly
from the OpenGeo subversion repository. This requires that you have subversion
installed::

    $ svn co http://svn.opengeo.org/tike/editor/trunk/ geoeditor
 
