// This script converts GeoJSON data to KML format for Google MyMaps
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define colors for each transport line
const transportColors = {
  DART: {
    color: 'ff0000ff', // Blue
    pinColor: 'blue',
  },
  'Luas Red Line': {
    color: 'ffff0000', // Red
    pinColor: 'red',
  },
  'Luas Green Line': {
    color: 'ff00ff00', // Green
    pinColor: 'grn',
  },
};

// Function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function rad2deg(rad) {
  return (rad * 180) / Math.PI;
}

// Function to generate circle coordinates
function generateCircleCoordinates(
  centerLat,
  centerLon,
  radiusKm,
  numPoints = 64
) {
  const coordinates = [];
  const R = 6371; // Earth's radius in kilometers

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i * 360) / numPoints;
    const bearingRad = deg2rad(bearing);

    // Calculate the latitude and longitude for this point on the circle
    const lat1 = deg2rad(centerLat);
    const lon1 = deg2rad(centerLon);
    const d = radiusKm / R;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
        Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
    );

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );

    coordinates.push([rad2deg(lon2), rad2deg(lat2)]);
  }

  return coordinates;
}

// Function to convert GeoJSON to KML
function convertToKML(
  name,
  geojsonData,
  style = { color: 'ff0000ff', pinColor: 'red' },
  isTransportLine = false
) {
  const features = geojsonData.features;

  // Start KML document
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <description>${name}</description>
    
    <!-- Style for the route -->
    <Style id="routeStyle">
      <LineStyle>
        <color>${style.color}</color>
        <width>4</width>
      </LineStyle>
    </Style>
    
    <!-- Style for the points -->
    <Style id="pointStyle">
      <IconStyle>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/${style.pinColor}-blank.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>

    <!-- Style for the circles -->
    <Style id="circleStyle">
      <LineStyle>
        <color>7f0000ff</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>1f0000ff</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>

    <!-- Folder for points -->
    <Folder>
      <name>${name} Points</name>
      <description>${name} Points</description>
      <styleUrl>#pointStyle</styleUrl>`;

  // Add points
  features.forEach((feature) => {
    const coordinates = feature.geometry.coordinates;
    const properties = feature.properties;
    const name = properties.name || 'Unnamed Point';
    const description = properties.description || '';

    kml += `
      <Placemark>
        <name>${name}</name>
        <description>${description}</description>
        <Point>
          <coordinates>${coordinates[0]},${coordinates[1]},0</coordinates>
        </Point>
      </Placemark>`;
  });

  kml += `
    </Folder>`;

  // Add circles for each point
  kml += `
    <Folder>
      <name>${name} Circles</name>
      <description>${name} Circles</description>
      <styleUrl>#circleStyle</styleUrl>`;

  features.forEach((feature) => {
    const coordinates = feature.geometry.coordinates;
    const properties = feature.properties;
    const name = properties.name || 'Unnamed Point';
    const circleCoordinates = generateCircleCoordinates(
      coordinates[1],
      coordinates[0],
      0.5
    );

    kml += `
      <Placemark>
        <name>${name} Circle</name>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${circleCoordinates
                .map((coord) => `${coord[0]},${coord[1]},0`)
                .join(' ')}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`;
  });

  kml += `
    </Folder>
  </Document>
</kml>`;

  return kml;
}

// Main function to process the data
async function main() {
  try {
    // Read the GeoJSON files
    const dartData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'dartStops.json'), 'utf8')
    );
    const luasRedData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'luasRedLineStops.json'), 'utf8')
    );
    const luasGreenData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'luasGreenLineStops.json'), 'utf8')
    );
    const dublinSpotsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'dublinSpots.json'), 'utf8')
    );

    // Convert each dataset to KML
    const dartKML = convertToKML('DART', dartData, transportColors.DART, true);
    const luasRedKML = convertToKML(
      'Luas Red Line',
      luasRedData,
      transportColors['Luas Red Line'],
      true
    );
    const luasGreenKML = convertToKML(
      'Luas Green Line',
      luasGreenData,
      transportColors['Luas Green Line'],
      true
    );
    const dublinSpotsKML = convertToKML(
      'Dublin Villages',
      dublinSpotsData,
      { color: 'ff0000ff', pinColor: 'red' },
      false
    );

    // Write the KML files
    fs.writeFileSync(path.join(__dirname, 'dart_stops.kml'), dartKML, 'utf8');
    fs.writeFileSync(
      path.join(__dirname, 'luas_red_stops.kml'),
      luasRedKML,
      'utf8'
    );
    fs.writeFileSync(
      path.join(__dirname, 'luas_green_stops.kml'),
      luasGreenKML,
      'utf8'
    );
    fs.writeFileSync(
      path.join(__dirname, 'dublin_villages.kml'),
      dublinSpotsKML,
      'utf8'
    );

    console.log('KML files have been generated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();
