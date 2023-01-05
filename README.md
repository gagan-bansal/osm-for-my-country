## osm-for-my-country

**Note: This is a boilerplate combining many packages related to OSM.**

You are working on a project that require map of your country and don't have much time to understand the OpenStreetMap data and map creation with it. Don't worry here is a completely automated solution to create OpenStreetMap map tiles of your region.

This project is stack of many libraries and framework stitched together to create map tiles of your region. You just specify the country name and required data is downloaded through scripts from different sources. Even all the dependent software modules and libraries are also installed in a single go. You only need a plain Linux machine. 

Main libraries, packages, data sources and framework those are part of this project are: OpenStreetMap data from [Overpass API][1] and [geofabrik][2], [osm2pgsql][3], [PostgreSQL][4] with [PostGIS][5], OpenStreetMap tools [osmconvert][6] and [osmfilter][7], [node.js][8] using [nvm][9], [pm2][10], [http-server][11], main mapping framework [Kosmtik][12] that is developed on [Mapnik][13] node.js bindings, [CartoCSS][15] based map style framework [openstreetmap-carto][14], [Google Noto Fonts][16] and many OpenStreetMap data related node.js modules [geosjon2poly][17], [osm-tile-list][18], [osmtogeojson][19], [simplify-geojson][20], [sphericalmercator][21].
  
Consider this project as a boilerplate. You can learn all the components of a OSM project: map rendering, caching the tiles, updaating the OSM data and serving map tiles.

### Dependency

`python` command is required on shell prompt. If using `python3` create alias `python` for `python3`. 

## Installation

All the above mentioned packages would be installed with single scripts. 
```
git clone https://github.com/gagan-bansal/osm-for-my-country.git
cd osm-for-my-country
bash install.sh
```
Please go through `install.sh` to see what all the packages are being installed. 

## Usage
How does this project work? Basic flow is 
  - after installation first data is downloaded and processed for the country name you specify (command: **init**)
  - a map rendering engine is started (command: **start-kosmtik**)
  - all the map tiles are exported. Why all, can't we render dynamically and serve? No, idea of this project is to create a complete map cache then you can server map tiles with simple http server or even s3. With this stack you can achieve similar to [Mapbox export][22] (command: **export**)
  - exported map tiles are served with light weight [http-server][11] (command: **serve**)
Now the map can be previewed (command: **demo**). You can also easily update OpenStreetMap data and map tiles with single command with daily updates from [geofabrik][2] with single command(command: **update**). It's nice to keep update command as cron job.

Here are the required commands:

```
node index.js --help
```
```
Usage: node index.js <command> [options]

For command help:
node index-dev.js <command> --help

Commands:
  init           Initiate the data by downloading and inserting into postgres
                 and many more things
  start-kosmtik  Start kosmtik server with mapnik as map rendering engine
                 At this stage you can preview map with ksomtik at
                 http://127.0.0.1:6789/
                 You can make changes in CartoCSS and preview immediately.
  export         Export map tiles
                 By default all the options are read from
                 './config/default.json'
  serve          Serve map tiles at http
                 This will enable map tiles to be served at
                 http://127.0.0.1:4040/$z/$x/$y.png
  demo           Privew map tiles with help of Leaflet
                 Check your map at http://127.0.0.1:4141/
  update         Update the OSM data and map tiles based on daily update from
                 GEOFABRIK.
                 You can set this command in your cron job to update on daily
                 basis.

Options:
  -s, --save  save parameters to config file           [boolean] [default: true]
  -h, --help  Show help                                                [boolean]

```
#### init 
```
node index.js init --help
```

```
Usage:node index.js init [options]

Examples:
  node index.js init --region 'Asia, Nepal'

Options:
  -r, --region  Region to download with complete path as per GEOFABRIK
                like: --region 'Asia, Nepal'                            [string]
  -h, --help    Show help                                              [boolean]

``` 
#### start-kosmtik
```
node index.js start-kosmtik --help
```

```
Usage: node index.js start-kosmtik
You can preview your map at http://127.0.0.1:6789/

Options:
  -h, --help  Show help                                                [boolean]
```

#### export
```
node index.js export --help
```

```
Usage:node index.js export -u [str] -t [str] -o [str]
by default all these options are read from './config/default.json'

Options:
  -u, --tileServerURL  base url serving map tile                        [string]
  -t, --tileList       a file for tiles list                            [string]
  -o, --dir            output tile directory                            [string]
  -h, --help           Show help                                       [boolean]
```

#### serve
```
node index.js serve --help
```

```
Usage: node index.js serve
  Serve map tiles at http
  This will enable map tiles to be served at http://127.0.0.1:4040/$z/$x/$y.png

Options:
  -h, --help  Show help                                                [boolean]
```

#### demo
```
node index.js demo --help
```

```
Usage: node index.js demo
  Privew map tiles with help of Leaflet
  Check your map at http://127.0.0.1:4141/

Options:
  -h, --help  Show help                                                [boolean]
```

#### update
```
node index.js update --help
```

```
Usage: node index.js update
  Update the OSM data and map tiles based on daily update from GEOFABRIK
  You can set this command in your cron job to update on daily basis

Options:
  -h, --help  Show help                                                [boolean]
```

Please go through [config/defualt.json](config/defualt.json) to change different project options. Recommended minimum system required is 4 core with 8GB memory.

## TODO
  - skip installation if package is already installed
  - improve log

## License
This project is licensed under the terms of the MIT license.

[1]: http://wiki.openstreetmap.org/wiki/Overpass_API
[2]: http://download.geofabrik.de/
[3]: http://wiki.openstreetmap.org/wiki/Osm2pgsql
[4]: https://www.postgresql.org/
[5]: http://www.postgis.net/
[6]: https://wiki.openstreetmap.org/wiki/Osmconvert
[7]: http://wiki.openstreetmap.org/wiki/Osmfilter
[8]: https://nodejs.org/en/
[9]: https://github.com/creationix/nvm
[10]: https://github.com/Unitech/PM2/
[11]: https://github.com/indexzero/http-server
[12]: https://github.com/kosmtik/kosmtik
[13]: http://mapnik.org/
[14]: https://github.com/gravitystorm/openstreetmap-carto
[15]: http://wiki.openstreetmap.org/wiki/CartoCSS
[16]: https://www.google.com/get/noto/
[17]: https://github.com/gagan-bansal/geojson2poly
[18]: https://github.com/gagan-bansal/osm-tile-list/issues
[19]: https://github.com/tyrasd/osmtogeojson
[20]: https://github.com/maxogden/simplify-geojson
[21]: https://github.com/mapbox/node-sphericalmercator
[22]: https://www.mapbox.com/help/map-export/
