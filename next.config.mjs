/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations (stable features only)
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
}

export default nextConfig;
