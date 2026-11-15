import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, history, records } = req.body || {};
    if (!message) {
      res.status(400).json({ error: "Pesan tidak boleh kosong" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      res.status(400).json({
        error: "Kunci API Gemini belum dikonfigurasi pada Vercel Environment Variables (GEMINI_API_KEY).",
      });
      return;
    }

    const data = Array.isArray(records) ? [...records] : [];
    data.sort((a: any, b: any) => String(b.tanggal || "").localeCompare(String(a.tanggal || "")));
    const recentRecords = data.slice(0, 7);

    const recordsText = recentRecords
      .map(
        (r: any) =>
          `- Tanggal: ${r.tanggal}, Penyinaran: ${r.lamaPenyinaran} jam, Suhu: ${r.suhuMin}°C s/d ${r.suhuMax}°C (Rata-rata: ${r.suhuRerata}°C), Kelembaban: ${r.kelembaban}%, Angin: ${r.kecepatanAngin} km/jam (Arah: ${r.arahAngin || "-"}), Hujan: ${r.curahHujan} mm, Evaporasi: ${r.evaporasi} mm. Catatan: ${r.catatan || "-"}`
      )
      .join("\n");

    const systemInstruction = `Anda adalah Asisten Klimatologi cerdas untuk Stasiun Klimatologi Pusat Penelitian Karet (Puslit Karet), khususnya di Balai Penelitian Sembawa.
Tugas Anda adalah membantu peneliti, staf lapangan, dan petani karet dalam menganalisis data cuaca/klimatologi lapangan serta memberikan rekomendasi budidaya karet yang relevan.

Berikut adalah data pengamatan klimatologi lapangan terbaru (7 hari terakhir):
${recordsText || "(Belum ada data pengamatan terbaru)"}

Berikan tanggapan yang profesional, informatif, ramah, dan solutif dalam Bahasa Indonesia yang baik dan benar.`;

    const ai = new GoogleGenAI({ apiKey });
    const formattedContents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        formattedContents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }],
        });
      }
    }
    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const modelsToTry = [
      { name: "gemini-4-hydrogen", config: { systemInstruction } },
      { name: "gemini-3.1-flash-lite", config: { systemInstruction, temperature: 0.7 } },
    ];

    let responseText: string | undefined;
    let lastError: any = null;

    for (const modelOption of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelOption.name,
          contents: formattedContents,
          config: modelOption.config,
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseText) {
      res.status(500).json({ error: lastError?.message || "Gagal memperoleh respon dari Gemini." });
      return;
    }

    res.status(200).json({ text: responseText });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Terjadi kesalahan pada server Asisten Gemini." });
  }
}
