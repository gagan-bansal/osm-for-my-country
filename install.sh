#!//bin/bash
echo "Installing postgres and postgis"
#if python -mplatform | grep -qi ubuntu; then
#fi
if python -mplatform | grep -qi centos; then
  sudo yum install gcc gcc-c++ -y
  sudo yum install zlib-devel -y
  sudo yum install unzip -y
  sudo yum install git -y
fi
if python -mplatform | grep -qi ubuntu; then
  sudo apt-get update
  #sudo apt-get install postgresql-9.5-postgis-2.2 pgadmin3 postgresql-contrib-9.5
  sudo apt-get install python -y
  sudo apt-get install gcc -y
  sudo apt-get install zlib1g-dev -y
  sudo apt-get install unzip -y
  sudo apt-get install git -y
  
  sudo apt-get install postgresql postgresql-contrib
  sudo apt-get install -y postgis postgresql-9.5-postgis-2.2
fi

# https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-centos-7
if python -mplatform | grep -qi centos; then
  sudo yum install epel-release -y
  sudo yum install postgresql-server postgresql-contrib -y
  sudo yum install postgis -y
  sudo postgresql-setup initdb 
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
fi

sudo -u postgres bash -c "psql -c \"CREATE EXTENSION adminpack;\""
sudo -u postgres bash -c "psql -c \"CREATE USER $USER WITH PASSWORD 'pgpass';\""
sudo -u postgres bash -c "psql -c \"CREATE DATABASE gis;\""
sudo -u postgres bash -c "psql -d gis -c \"CREATE EXTENSION postgis;\""
sudo -u postgres bash -c "psql -d gis -c \"create extension hstore;\""
sudo -u postgres bash -c "psql -d gis -c \"grant select on spatial_ref_sys to $USER;\""

echo "*:*:*:$USER:pgpass" > ~/.pgpass
chmod 0600 ~/.pgpass

echo "installing osm2pgsql ..."
if python -mplatform | grep -qi ubuntu; then
  sudo apt-get install osm2pgsql
fi

if python -mplatform | grep -qi centos; then
  sudo yum install osm2pgsql -y
fi
echo "Installed osm2pgsql."

echo "Installing OSM tool 'osmconvert' ..."
# http://wiki.openstreetmap.org/wiki/Osmconvert
wget -O - http://m.m.i24.cc/osmconvert.c | cc -x c - -lz -O3 -o osmconvert
echo "Installing OSM tool 'osmfilter' ..."
# http://wiki.openstreetmap.org/wiki/Osmfilter
wget -O - http://m.m.i24.cc/osmfilter.c |cc -x c - -O3 -o osmfilter

echo "Installing nvm ..."
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.4/install.sh | bash
export NVM_DIR="/home/$USER/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo "Installing node.js ..."
nvm install 4.4.7
echo "Installing pm2 ..."
npm install pm2 -g
echo "Installing http-server ..."
npm install http-server -g

echo "Installing kosmtik ..."
git clone https://github.com/kosmtik/kosmtik.git
cd kosmtik
# as mapnik ^3.5.13 is using GLIBCXX_3.4.20 or above
# check the OS version by `strings /lib64/libstdc++.so.6 | grep 'GLIBCXX'`
# if less than GLIBCXX_3.4.20 do these changes before `npm install`
  sed 's/mapnik": "\^3\.5\.13/mapnik": "3.5.13/' package.json -i
npm install
cd -
sudo ln -s $PWD/kosmtik/node_modules/mapnik/lib/binding/node-v46-linux-x64/shapeindex /usr/bin/shapeindex

echo "Installing openstreetmap-carto ..."
git clone https://github.com/gravitystorm/openstreetmap-carto.git
cd openstreetmap-carto
sh get-shapefiles.sh
cd -

echo "installing required fonts"
wget https://noto-website.storage.googleapis.com/pkgs/Noto-hinted.zip
unzip Noto-hinted.zip -d Noto-hinted
mkdir -p ~/.fonts
cp Noto-hinted/*otf Noto-hinted/*ttf ~/.fonts
fc-cache -f -v
echo "fonts installed"

source ~/.bashrc
echo "[myosm] Installation completed. Please logout and open again the terminal."
