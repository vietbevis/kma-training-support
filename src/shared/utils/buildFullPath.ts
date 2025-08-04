function buildFullPath(...segments: string[]) {
  // 1. Lọc bỏ các segment không phải string hoặc rỗng
  const validSegments = segments
    .filter((seg) => typeof seg === 'string' && seg.trim() !== '')
    .map((seg) => seg.trim());

  // 2. Bỏ tất cả dấu '/' ở đầu/cuối từng segment, rồi ghép chúng lại
  const joined = validSegments
    .map((seg) => seg.replace(/^\/+|\/+$/g, '')) // xóa slash đầu và cuối của mỗi segment
    .join('/'); // ghép bằng '/'

  // 3. Thêm slash dẫn đầu, loại bỏ slash thừa, xóa slash cuối
  return ('/' + joined) // đảm bảo có slash đầu
    .replace(/\/+/g, '/') // xóa slash thừa
    .replace(/\/$/, ''); // xóa slash cuối
}
export default buildFullPath;
