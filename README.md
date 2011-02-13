# FaultedEarth #

A web based editor for managing earthquake related spatial data.

Developed by [OpenGeo](http://opengeo.org/) in support of the [Global Earthquake Model](http://www.globalquakemodel.org/).

## Development

Get set up for development with the following:

    git clone git@github.com:opengeo/FaultedEarth.git
    cd FaultedEarth
    git submodule init
    git submodule update

To run the application in development mode, run

    ant init # only needs to be run the first time
    ant debug

Navigate to http://localhost:8080/ to run the application in debug mode. By
default, `ant debug` will proxy `/geoserver` to 
http://gem.demo.opengeo.org/geoserver/. To run the application against a
different GeoServer instance, call

    ant debug -Dapp.proxy.geoserver=http://path/to/your/geoserver

To run the application on a different port than 8080 (e.g. 9080), run

    ant debug -Dapp.port=9080 

## Deployment

To create a war with the application, run

    ant static-war

The resulting artifact is `build/FaultedEarth.war`.

