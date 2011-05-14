# FaultedEarth #

A web based editor for managing earthquake related spatial data.

Developed by [OpenGeo](http://opengeo.org/) in support of the [Global Earthquake Model](http://www.globalquakemodel.org/).

## Prerequisites

File uploads go into a temporary workspace on GeoServer. To make this work,
GeoServer needs to be configured with a workspace named "temp" and a namespace
uri of http://geonode.org/temporary.

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
http://184.106.119.223/geoserver-geonode-dev/. To run the application against a
different GeoServer instance, call

    ant debug -Dapp.proxy.geoserver=http://path/to/your/geoserver

To run the application on a different port than 8080 (e.g. 9080), run

    ant debug -Dapp.port=9080 

## Prepare App for Deployment

To create a static war servlet run the following:

    ant static-war

The servlet `FaultedEarth.war` will be assembled in the `build` directory.

To use a different path for the local GeoServer than `/geoserver-geonode-dev/`,
you can add the following option to the `ant static-war` command:

    -Dapp.deploy.geoserver=<geoserver_path>

where <geoserver_path> is e.g. `/geoserver/`