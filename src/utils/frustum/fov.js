export function calAspectRatio(hfov, vfov) {
  const hfovRad = (hfov * Math.PI) / 180
  const vfovRad = (vfov * Math.PI) / 180
  return 1 / (Math.tan(hfovRad / 2) / Math.tan(vfovRad / 2))
}
