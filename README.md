# Bot Telegram Pacar Virtual (Gemini + Memori Jangka Panjang)

File: `bot.py` (kode), `persona.md` (kepribadian), `requirements.txt` (dependensi).

## Persiapan (sekali saja)

1. **Token Telegram**: buka @BotFather, ketik `/newbot`, ikuti langkahnya, simpan token.
2. **API key Gemini**: buka aistudio.google.com, login, pilih "Get API key", buat key. Ada kuota gratis, tapi cek ketentuan data tier gratis dan hindari mengirim info sensitif.
3. **ID Telegram-mu**: chat ke @userinfobot, catat angka "Id". Dipakai agar hanya kamu yang bisa memakai bot (melindungi kuota API).

## Variabel konfigurasi

| Nama | Wajib | Isi |
|---|---|---|
| `TELEGRAM_TOKEN` | ya | token dari BotFather |
| `GEMINI_API_KEY` | ya | key dari AI Studio |
| `ALLOWED_IDS` | disarankan | ID Telegram-mu (pisahkan koma jika lebih dari satu) |
| `GEMINI_MODEL` | tidak | default `gemini-2.5-flash`; ganti jika model itu sudah dipensiunkan, cek nama model terbaru di dokumentasi Gemini |
| `DB_PATH` | tidak | lokasi database, default `data/chat.db` |
| `TIMEZONE` | tidak | default `Asia/Jakarta` |

## Opsi A: Jalan di HP lewat Termux (gratis)

Bot hanya hidup selama HP menyala dan Termux terbuka.

1. Pasang **Termux dari F-Droid** (versi Play Store sudah usang).
2. Di Termux:
   ```
   pkg update && pkg upgrade
   pkg install python
   termux-setup-storage
   ```
3. Simpan `bot.py`, `persona.md`, `requirements.txt` ke folder Download HP, lalu:
   ```
   mkdir ~/rina && cd ~/rina
   cp ~/storage/downloads/{bot.py,persona.md,requirements.txt} .
   pip install -r requirements.txt
   ```
4. Buat skrip jalan: `nano run.sh`, isi:
   ```
   export TELEGRAM_TOKEN="isi_token_telegram"
   export GEMINI_API_KEY="isi_key_gemini"
   export ALLOWED_IDS="isi_id_telegram_kamu"
   python bot.py
   ```
   Simpan (di keyboard Termux: CTRL + X, lalu Y, Enter).
5. Jalankan:
   ```
   chmod +x run.sh
   termux-wake-lock
   ./run.sh
   ```
6. Biar tidak dimatikan Android: matikan optimasi baterai untuk Termux, dan biarkan notifikasi Termux tetap aktif.

## Opsi B: Deploy ke Railway (jalan terus, HP boleh mati)

Railway berbayar setelah kredit percobaan habis, jadi cek harga terbaru di railway.com.

1. Buat repo **GitHub private** (lewat browser atau app GitHub), upload `bot.py`, `persona.md`, `requirements.txt`. Jangan upload token atau key.
2. Di railway.com: **New Project, Deploy from GitHub repo**, pilih repo tadi.
3. Buka tab **Variables**, tambahkan `TELEGRAM_TOKEN`, `GEMINI_API_KEY`, `ALLOWED_IDS`, dan `DB_PATH=/data/chat.db`.
4. Tambahkan **Volume** dan arahkan mount path ke `/data`. Tanpa ini, memori hilang setiap redeploy.
5. Di **Settings, Deploy**, isi *Custom Start Command*: `python bot.py`.
6. Deploy. Cek tab **Logs**: harus muncul "Bot berjalan dengan model ...".

## Perintah di Telegram

- `/start`: sapaan awal.
- `/ingatan`: lihat fakta dan ringkasan yang tersimpan.
- `/lupakan ya`: hapus semua riwayat dan ingatan.

## Tips

- **Ganti kepribadian**: edit `persona.md` (nama, latar, gaya bicara), lalu restart bot. Kalau mengganti nama, ubah juga kalimat `SALAM` di `bot.py`.
- **Jangan jalankan dua instance sekaligus** (misalnya Termux dan Railway) dengan token yang sama, nanti muncul error "409 Conflict".
- **Cara kerja memori**: tiap pesan disimpan. Setelah sekitar 40 pesan, chat lama diringkas otomatis. Tiap 6 pesanmu, fakta penting diekstrak dan dicatat. Semuanya disisipkan ke prompt di tiap balasan.
- **Privasi**: riwayat chat tersimpan di file database di tempat bot berjalan dan dikirim ke Google untuk diproses.
- **Error 429**: kuota gratis habis atau terlalu cepat; tunggu sebentar atau ganti model.
