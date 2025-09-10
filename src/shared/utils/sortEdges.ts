export default function sortEdges(edges: string[]): string[] {
  // Xây dựng đồ thị
  const graph: Record<number, number[]> = {};
  const indegree: Record<number, number> = {};
  const edgeMap: Record<string, string> = {};

  for (const e of edges) {
    const [from, to] = e.split('->').map(Number);

    if (!graph[from]) graph[from] = [];
    graph[from].push(to);

    indegree[to] = (indegree[to] ?? 0) + 1;
    if (indegree[from] === undefined) indegree[from] = 0;

    // lưu mapping
    edgeMap[`${from}->${to}`] = e;
  }

  // Topological sort
  const queue: number[] = [];
  for (const node in indegree) {
    if (indegree[node as any] === 0) {
      queue.push(Number(node));
    }
  }

  const order: number[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);

    for (const v of graph[u] ?? []) {
      indegree[v]--;
      if (indegree[v] === 0) {
        queue.push(v);
      }
    }
  }

  // Sắp xếp lại edges theo thứ tự xuất hiện của node trong order
  const pos: Record<number, number> = {};
  order.forEach((n, i) => (pos[n] = i));

  return edges.sort((a, b) => {
    const [a1, a2] = a.split('->').map(Number);
    const [b1, b2] = b.split('->').map(Number);

    if (pos[a1] !== pos[b1]) return pos[a1] - pos[b1];
    return pos[a2] - pos[b2];
  });
}
