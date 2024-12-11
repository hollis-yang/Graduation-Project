// import proj4 from 'proj4';

// // 定义EPSG:4326 (WGS84) 和 EPSG:32651 (UTM zone 51N) 的转换
// const wgs84 = 'EPSG:4326';
// const utm51n = 'EPSG:32651';

// proj4.defs(utm51n, '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs');

// export function getCameraProjection(position, settings) {
//   let [lon, lat, z] = position;
//   let [angle1, angle2, distance, heading, pitch] = settings;

//   // Convert lon/lat to UTM coordinates
//   let [x, y] = proj4(wgs84, utm51n, [lon, lat]);

//   // Convert angles to radians
//   heading = toRadians(heading);
//   pitch = toRadians(pitch);
//   angle1 = toRadians(angle1);
//   angle2 = toRadians(angle2);

//   // Calculate the half-angles
//   let halfAngle1 = angle1 / 2;
//   let halfAngle2 = angle2 / 2;

//   // Define the four corners in the camera's local coordinate system
//   let corners = [
//     [distance * Math.tan(halfAngle1), distance * Math.tan(halfAngle2), distance],
//     [-distance * Math.tan(halfAngle1), distance * Math.tan(halfAngle2), distance],
//     [-distance * Math.tan(halfAngle1), -distance * Math.tan(halfAngle2), distance],
//     [distance * Math.tan(halfAngle1), -distance * Math.tan(halfAngle2), distance],
//   ];

//   // Rotate and translate the corners
//   let rotatedCorners = corners.map((corner) => {
//     let [cx, cy, cz] = corner;

//     // Apply pitch rotation around the x-axis
//     let pcy = cy * Math.cos(pitch) - cz * Math.sin(pitch);
//     let pcz = cy * Math.sin(pitch) + cz * Math.cos(pitch);

//     // Apply heading rotation around the z-axis
//     let pcx = cx * Math.cos(heading) - pcy * Math.sin(heading);
//     pcy = cx * Math.sin(heading) + pcy * Math.cos(heading);

//     // Translate by camera position
//     return [x + pcx, y + pcy, z + pcz];
//   });

//   // Project the 3D points to the 2D ground plane (z=0)
//   let projection = rotatedCorners.map(([cx, cy, cz]) => {
//     if (cz <= 0) {
//       return null; // Ignore points behind the camera
//     }
//     let t = z / (z - cz); // Calculate the scaling factor
//     return [x + t * (cx - x), y + t * (cy - y)];
//   }).filter(point => point !== null); // Remove null points

//   // Convert the projected points back to lon/lat
//   let latLonProjection = projection.map(([px, py]) => proj4(utm51n, wgs84, [px, py]));

//   return latLonProjection;
// }

// function toRadians(degree) {
//   return degree * (Math.PI / 180);
// }

// function toDegrees(radian) {
//   return radian * (180 / Math.PI);
// }

export function getCameraProjection(position, settings) {
  const [longitude, latitude, height] = position;
  const [fov, aspectRatio, near, far, pitch] = settings;

  // 这里假设我们定义一个梯形，上底较短，下底较长
  const topWidth = 0.0005;  // 上底的宽度
  const bottomWidth = 0.002; // 下底的宽度
  const heightOffset = 0.001; // 梯形高度的偏移

  // 返回梯形的四个角的经纬度坐标
  return [
    [longitude - topWidth / 2, latitude + heightOffset],      // 上底左
    [longitude + topWidth / 2, latitude + heightOffset],      // 上底右
    [longitude + bottomWidth / 2, latitude - heightOffset],   // 下底右
    [longitude - bottomWidth / 2, latitude - heightOffset]    // 下底左
  ];
}
