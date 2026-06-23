// cloudinaryLoader.js
export default function cloudinaryLoader({ src, width, quality }) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  
  // If the URL already has transformations, we shouldn't break it, 
  // but for standard Cloudinary URLs, we inject the params.
  if (src.includes('/upload/')) {
    return src.replace('/upload/', `/upload/${params.join(',')}/`);
  }
  
  return src;
}