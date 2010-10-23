# FaultedEarth #

A web based editor for managing earthquake related spatial data.

Developed by [OpenGeo](http://opengeo.org/) in support of the [Global Earthquake Model](http://www.globalquakemodel.org/).

## Running and deploying FaultedEarth

These instructions describe how to deploy GeoEditor assuming you have a copy of the application archive (GeoEditor.zip).

1. Extract the archive to someplace in your web root.

    you@prompt:~/public_html$ unzip FaultedEarth.zip

2. Load the application in your browser (e.g. http://localhost/~you/FaultedEarth).

Note that the inital configuration for the application works off of a local WMS and WFS. If you are using a remote WMS or WFS, you must configure a local proxy.  See the index.html source for detail on proxy configuration.


### Changing which layers are displayed at startup

Find the application configuration in index.html.  It should look something like the code below (assuming you are running it with a local GeoServer):

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

If you want to add the "topp:states" layer to the layers that are initially displayed, edit your application config to read something like the code below:

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

## Development

Get set up for development with the following:

    git clone git@github.com:opengeo/FaultedEarth.git
    cd FaultedEarth
    git submodule init
    git submodule update

