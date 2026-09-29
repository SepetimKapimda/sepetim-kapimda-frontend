let cachedAudio: HTMLAudioElement | null = null;

// Kısa bir "ding" tonunu çalışma anında (harici bir ses dosyası olmadan) bir
// WAV blob'una render eder. Böylece panel sayfaları hiçbir statik asset'e
// bağımlı olmadan gerçek HTML5 `Audio` API'siyle bildirim sesi çalabilir.
function buildBeepDataUrl(): string {
  const sampleRate = 8000;
  const duration = 0.18;
  const frequency = 880;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const fade = 1 - i / numSamples;
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * fade;
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

// Yeni sipariş / durum değişikliği gibi olaylarda toast'a ek olarak çağrılır.
// Tarayıcının otomatik oynatma politikası engellerse (sayfa açıldıktan sonra
// hiç kullanıcı etkileşimi olmadıysa) sessizce yok sayılır — toast zaten yeterli.
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    if (!cachedAudio) {
      cachedAudio = new Audio(buildBeepDataUrl());
      cachedAudio.volume = 0.5;
    }
    cachedAudio.currentTime = 0;
    void cachedAudio.play().catch(() => {
      // Otomatik oynatma engellendi — sessizce yok say.
    });
  } catch {
    // Ses çalınamazsa görsel toast bildirimi zaten yeterli.
  }
}
