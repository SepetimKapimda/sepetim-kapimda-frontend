"use client";

import { SWRConfig } from "swr";
import { apiClient } from "@/lib/apiClient";

// Panel sayfaları arasında geçiş yaparken (sekmeler) her seferinde tam
// sayfalık bir spinner görünmesin diye paylaşılan bir SWR cache'i:
// - Aynı anahtarla (`useSWR` çağrısı) daha önce veri çekildiyse, sayfa yeniden
//   mount olduğunda (rota değişince component'ler yeniden monte olur) veri
//   ÖNCE cache'den anında gösterilir, ardından arka planda sessizce yenilenir.
// - `dedupingInterval`: aynı anahtara kısa süre içinde art arda düşen
//   isteklerin (ör. hızlı sekme değiştirme) tek bir ağ isteğine indirgenmesi.
export function fetcher<T>(path: string): Promise<T> {
  return apiClient.get<T>(path);
}

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 4000,
        // Operasyonel veri (sipariş/stok vb.) sık değiştiğinden cache'i sonsuza
        // kadar "taze" saymıyoruz — sekmeye dönüldüğünde arka planda otomatik
        // yenilenir, ama önce cache'deki son veri anında gösterilir.
        revalidateOnFocus: true,
        revalidateIfStale: true,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
