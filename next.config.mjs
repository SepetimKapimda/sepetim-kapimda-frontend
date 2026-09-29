// src/lib/apiConfig.ts'deki API_BASE_URL ile aynı env değişkeni ve varsayılanı
// kullanır; bu dosya src/ dışında olduğu için o sabiti import edemez, ikisi
// manuel senkron tutulmalı.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const apiUrl = new URL(apiBaseUrl);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: apiUrl.protocol.replace(":", ""),
        hostname: apiUrl.hostname,
        port: apiUrl.port || "",
      },
      // Supabase Storage (S3) — görseller artık
      // https://<proje-id>.supabase.co/storage/v1/object/public/... üzerinden sunuluyor.
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
