import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JSON files
const luasGreenLineStops = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'luasGreenLineStops.json'), 'utf8')
);
const luasRedLineStops = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'luasRedLineStops.json'), 'utf8')
);
const dartStops = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dartStops.json'), 'utf8')
);
const dublinSpots = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dublinSpots.json'), 'utf8')
);

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

// Function to find a stop by name
function findStopByName(features, name) {
  return features.find((feature) => feature.properties.name.includes(name));
}

// Function to order stops along a route
function orderStopsAlongRoute(features, startName, endName) {
  // Find start and end points
  const startFeature = findStopByName(features, startName);
  const endFeature = findStopByName(features, endName);

  if (!startFeature || !endFeature) {
    console.warn(
      `Warning: Could not find ${startName} or ${endName} in the stops list`
    );
    return features;
  }

  // Create a copy of features without start and end
  const middleFeatures = features.filter(
    (f) => f !== startFeature && f !== endFeature
  );

  // Start with the starting feature
  const orderedFeatures = [startFeature];

  // If we have middle features, order them
  if (middleFeatures.length > 0) {
    let currentFeature = startFeature;
    const remainingFeatures = [...middleFeatures];

    // While there are remaining features
    while (remainingFeatures.length > 0) {
      // Get the current feature
      const [currentLon, currentLat] = currentFeature.geometry.coordinates;

      // Find the nearest feature
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remainingFeatures.length; i++) {
        const [lon, lat] = remainingFeatures[i].geometry.coordinates;
        const distance = calculateDistance(currentLat, currentLon, lat, lon);

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      // Add the nearest feature to the ordered list
      currentFeature = remainingFeatures[nearestIndex];
      orderedFeatures.push(currentFeature);

      // Remove the nearest feature from the remaining list
      remainingFeatures.splice(nearestIndex, 1);
    }
  }

  // Add the ending feature if it's not already included
  if (!orderedFeatures.includes(endFeature)) {
    orderedFeatures.push(endFeature);
  }

  return orderedFeatures;
}

// Function to create KML content for points
function createPointsKML(features, layerName) {
  const kml = [];
  kml.push('<?xml version="1.0" encoding="UTF-8"?>');
  kml.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
  kml.push('  <Document>');
  kml.push(`    <name>${layerName}</name>`);
  kml.push('    <Style id="pointStyle">');
  kml.push('      <IconStyle>');
  kml.push('        <Icon>');
  kml.push(
    '          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>'
  );
  kml.push('        </Icon>');
  kml.push('      </IconStyle>');
  kml.push('    </Style>');

  features.forEach((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    kml.push('    <Placemark>');
    kml.push(`      <name>${feature.properties.name}</name>`);
    kml.push('      <styleUrl>#pointStyle</styleUrl>');
    kml.push('      <Point>');
    kml.push(`        <coordinates>${longitude},${latitude},0</coordinates>`);
    kml.push('      </Point>');
    kml.push('    </Placemark>');
  });

  kml.push('  </Document>');
  kml.push('</kml>');

  return kml.join('\n');
}

// Function to create KML content for lines
function createLineKML(features, layerName, color) {
  const kml = [];
  kml.push('<?xml version="1.0" encoding="UTF-8"?>');
  kml.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
  kml.push('  <Document>');
  kml.push(`    <name>${layerName} Line</name>`);
  kml.push('    <Style id="lineStyle">');
  kml.push('      <LineStyle>');
  kml.push(`        <color>${color}</color>`);
  kml.push('        <width>4</width>');
  kml.push('      </LineStyle>');
  kml.push('    </Style>');
  kml.push('    <Placemark>');
  kml.push(`      <name>${layerName} Route</name>`);
  kml.push('      <styleUrl>#lineStyle</styleUrl>');
  kml.push('      <LineString>');
  kml.push('        <coordinates>');

  // Order the stops based on the route
  let orderedFeatures;
  if (layerName === 'Luas Green Line') {
    orderedFeatures = orderStopsAlongRoute(
      features,
      'Broombridge',
      'Sandyford'
    );
  } else if (layerName === 'Luas Red Line') {
    orderedFeatures = orderStopsAlongRoute(features, 'The Point', 'Kylemore');
  } else if (layerName === 'DART') {
    orderedFeatures = orderStopsAlongRoute(features, 'Howth', 'Blackrock');
  } else {
    orderedFeatures = features;
  }

  const coordinates = orderedFeatures
    .map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return `${longitude},${latitude},0`;
    })
    .join(' ');

  kml.push(`          ${coordinates}`);
  kml.push('        </coordinates>');
  kml.push('      </LineString>');
  kml.push('    </Placemark>');
  kml.push('  </Document>');
  kml.push('</kml>');

  return kml.join('\n');
}

// Filter DART stops to exclude Congriffin, Portmarnock and Malahide
const filteredDartStops = dartStops.features.filter((stop) => {
  const name = stop.properties.name.toLowerCase();
  return (
    !name.includes('congriffin') &&
    !name.includes('portmarnock') &&
    !name.includes('malahide')
  );
});

// Create KML files for each layer
const layers = [
  {
    name: 'Luas Green Line',
    points: luasGreenLineStops.features,
    color: 'ff00ff00', // Green
  },
  {
    name: 'Luas Red Line',
    points: luasRedLineStops.features,
    color: 'ff0000ff', // Red
  },
  {
    name: 'DART',
    points: filteredDartStops,
    color: 'ffff0000', // Blue
  },
  {
    name: 'Villages',
    points: dublinSpots.features,
    color: 'ff00ffff', // Yellow
  },
];

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'kml_ordered');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Generate KML files for each layer
layers.forEach((layer) => {
  // Create points KML
  const pointsKML = createPointsKML(layer.points, layer.name);
  fs.writeFileSync(
    path.join(outputDir, `${layer.name.replace(/\s+/g, '_')}_Points.kml`),
    pointsKML
  );

  // Create line KML (except for Villages)
  if (layer.name !== 'Villages') {
    const lineKML = createLineKML(layer.points, layer.name, layer.color);
    fs.writeFileSync(
      path.join(outputDir, `${layer.name.replace(/\s+/g, '_')}_Line.kml`),
      lineKML
    );
  }
});

console.log(
  'KML files have been generated successfully in the kml_ordered directory.'
);
