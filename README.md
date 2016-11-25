## osm-for-my-country (In-progress)
You are working on a project that require your map of your country and don't have much time to understand the OpenStreetMap data and map creation with it. Don't worry here is a completely automated solution to create OpenStreetMap map tiles of your region.

This project is stack of many libraries and framework stitched together to create map tiles of your region. You just specify the country name and required data is downloaded through scripts from different sources. Even all the dependent software modules and libraries are also installed in a single go. You only need a plain Linux machine. 

Main libraries, packages, data sources and framework those are part of this project are: OpenStreetMap data from [Overpass API][1] and [geofabrik][2], [osm2pgsql][3], [PostgreSQL][4] with [PostGIS][5], OpenStreetMap tools [osmconvert][6] and [osmfilter][7], [node.js][8] using [nvm][9], [pm2][10], [http-server][11], main mapping framework [Kosmtik][12] that is developed on [Mapnik][13] node.js bindings, [CartoCSS][15] based map style framework [openstreetmap-carto][14], [Google Noto Fonts][16] and many OpenStreetMap data related node.js modules [geosjon2poly][17], [osm-tile-list][18], [osmtogeojson][19], [simplify-geojson][20], [sphericalmercator][21].
  

## Installation
All the above mentioned packages would be installed with single scripts. 
```
git clone https://github.com/gagan-bansal/osm-for-my-country.git
cd osm-for-my-country
bash install.sh
```
Please go through `isntall.sh` to see what all the packages are being installed. 

## Usage
How does this project work? Basic flow is 
  - after installation first data is downloaded and processed for the country name you specify (command: **init**)
  - a map rendering engine is started (command: **start-kosmtik**)
  - all the map tiles are exported. Why all, can't we render dynamically and serve? No, idea of this project is to create a complete map cache then you can server map tiles with simple http server or even s3. With this stack you can achieve similar to [Mspbox export][22] (command: **export**)
  - exported map tiles are served with light weight [http-server][11] (command: **serve**)
Now the map can be previewed (command: **demo**). You can also easily update OpenStreetMap data and map tiles with single command with daily updates from [geofabrik][2] with single command(command: **update**). It's nice to keep update command as cron job.

Here are the required commands:
 
```
Usage: node index.js command

Commands:
  init           Initiate the data by downloading and inserting into postgres
                 and many more things
  start-kosmtik  Start kosmtik server with mapnik as map rendering engine
  export         Export map tiles
  serve          Serve map tiles at http port
  demo           Privew map tiles with help of Leaflet
  update         Update the OSM data and map tiles based on daily update.

```
Please go through [config/defualt.json](config/defualt.json) to change different project options. Recommended system is 4 core with 8GB memory otherwise in config/default.json please change `HASH_MEMORY` and `NUM_PROCESS` accordingly.

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
