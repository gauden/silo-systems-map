import type { Body } from "./protocol";
export function edgeGeometry(a: Body, b: Body, reciprocal: boolean) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dist = Math.hypot(dx, dy) || 1;
  const bend = reciprocal
    ? Math.min(75, dist * 0.28)
    : Math.min(48, dist * 0.16);
  const cx = (a.x + b.x) / 2 - (dy / dist) * bend,
    cy = (a.y + b.y) / 2 + (dx / dist) * bend;
  const boundary = (n: Body, x: number, y: number) => {
    const dX = x - n.x,
      dY = y - n.y;
    const t =
      1 /
      Math.max(
        Math.abs(dX) / (n.width / 2 + 4),
        Math.abs(dY) / (n.height / 2 + 4),
        0.001,
      );
    return [n.x + dX * t, n.y + dY * t];
  };
  const [sx, sy] = boundary(a, cx, cy),
    [tx, ty] = boundary(b, cx, cy);
  const at = (t: number) => ({
    x: (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * tx,
    y: (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ty,
  });
  return { d: `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`, at };
}
