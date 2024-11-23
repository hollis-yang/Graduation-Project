function lonLatToXY(lon, lat) {
  const R = 6378137 // Earth's radius in meters
  let x = R * toRadians(lon)
  let y = R * Math.log(Math.tan(Math.PI / 4 + toRadians(lat) / 2))
  return [x, y]
}

function xyToLonLat(x, y) {
  const R = 6378137 // Earth's radius in meters
  let lon = toDegrees(x / R)
  let lat = toDegrees(2 * Math.atan(Math.exp(y / R)) - Math.PI / 2)
  return [lon, lat]
}

function toRadians(degree) {
  return degree * (Math.PI / 180)
}

function toDegrees(radian) {
  return radian * (180 / Math.PI)
}

export function getCameraProjection(position, settings) {
  let [lon, lat, z] = position;
  let [angle1, angle2, distance, heading, pitch] = settings;

  // Convert lon/lat to XY
  let [x, y] = lonLatToXY(lon, lat);

  // Convert angles to radians
  heading = toRadians(heading);
  pitch = toRadians(pitch);
  angle1 = toRadians(angle1);
  angle2 = toRadians(angle2);

  // Calculate the half-angles
  let halfAngle1 = angle1 / 2;
  let halfAngle2 = angle2 / 2;

  // Define the four corners in the camera's local coordinate system
  let corners = [
    [distance * Math.tan(halfAngle1), distance * Math.tan(halfAngle2), distance],
    [-distance * Math.tan(halfAngle1), distance * Math.tan(halfAngle2), distance],
    [-distance * Math.tan(halfAngle1), -distance * Math.tan(halfAngle2), distance],
    [distance * Math.tan(halfAngle1), -distance * Math.tan(halfAngle2), distance],
  ];

  // Rotate and translate the corners
  let rotatedCorners = corners.map((corner) => {
    let [cx, cy, cz] = corner;

    // Rotate around the x-axis by pitch
    let pcy = cy * Math.cos(pitch) - cz * Math.sin(pitch);
    let pcz = cy * Math.sin(pitch) + cz * Math.cos(pitch);

    // Rotate around the z-axis by heading
    let pcx = cx * Math.cos(heading) - pcy * Math.sin(heading);
    pcy = cx * Math.sin(heading) + pcy * Math.cos(heading);

    // Translate by camera position
    return [x + pcx, y + pcy, z + pcz];
  });

  // Project the 3D points to the 2D ground plane (z=0)
  let projection = rotatedCorners.map(([cx, cy, cz]) => {
    let t = z / (z - cz); // Calculate the scaling factor
    return [x + t * (cx - x), y + t * (cy - y)];
  });

  // Convert the projected points back to lon/lat
  let latLonProjection = projection.map(([px, py]) => xyToLonLat(px, py));

  // Flatten the array to [lon1, lat1, lon2, lat2, ...]
  return latLonProjection;
}
