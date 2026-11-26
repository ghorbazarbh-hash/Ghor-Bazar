# স্বপ্নের ঘর বাজার — E-commerce + Inventory & POS (Vite + React + Node সার্ভার)

## চালানোর নিয়ম (নিজের কম্পিউটারে)
    npm install
    npm run serve        # বিল্ড করে সার্ভার চালু → http://localhost:3001

ডেভেলপমেন্ট মোড (কোড বদলালে নিজে রিফ্রেশ): `npm run dev` → http://localhost:5173

## লগইন
- **একটাই লগইন পেজ:** `/#/login` — কাস্টমার নিজের ইমেইল-পাসওয়ার্ড দিলে নিজের অ্যাকাউন্টে ঢোকে,
  অ্যাডমিন ইমেইল-পাসওয়ার্ড দিলে অ্যাডমিন প্যানেল (`/#/admin`) খোলে।
- প্রথমবার অ্যাডমিন: `admin@swapnerghor.com` / `admin123` → লগইনের পর **User Management** থেকে বদলান।
- শুরুতেই নিজের তথ্য দিতে: `ADMIN_EMAIL=you@mail.com ADMIN_PASSWORD='শক্ত-পাসওয়ার্ড' npm start`

## ডেটা কোথায় থাকে
`data/` ফোল্ডারে: `store.json` (সব ডেটা), `uploads/` (ছবি), `backups/` (প্রতিদিন স্বয়ংক্রিয় কপি, ১৪ দিন)।
**পুরো `data/` ফোল্ডার মাঝে মাঝে আলাদা জায়গায় কপি করে রাখুন।** অন্য জায়গায় রাখতে: `DATA_DIR=/path npm start`

## ইন্টারনেটে চালু করা
Node.js চালানো যায় এমন হোস্টিং লাগবে (ডেটা স্থায়ী ডিস্কে থাকতে হবে):
- **VPS** (DigitalOcean/Contabo ইত্যাদি): কোড তুলে `npm install && npm run build`, তারপর `npx pm2 start server/index.js --name sgb`;
  নিরাপদ https এর জন্য Nginx/Caddy সামনে দিন, আর `TRUST_PROXY=true` সেট করুন।
- **Render/Railway:** Web Service বানান, Build: `npm install && npm run build`, Start: `npm start`,
  একটি Persistent Disk যুক্ত করে `DATA_DIR` সেই ডিস্কের পথে দিন (ডিস্ক ছাড়া রিস্টার্টে ডেটা মুছে যায়!)।
- পরিবেশ ভেরিয়েবল: `PORT`, `DATA_DIR`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (ঐচ্ছিক), `TRUST_PROXY`।

## অ্যাডমিনে যা পাবেন
Dashboard, POS, Sale/Purchase/Return/Damage/Stock, Product (টিক দিয়ে দৃশ্যমান/বিশেষ + বাল্ক অ্যাকশন), Category, Banner,
**Delivery Charge** (এলাকা অনুযায়ী চার্জ), **Payment Methods** (চালু/বন্ধ টিক), Online Orders (অটো আসে), Promotion (কুপন),
Reports (আজ/সাপ্তাহিক/মাসিক/বার্ষিক/নিজের তারিখ + প্রিন্ট/PDF), User Management (অ্যাডমিন লগইন + কাস্টমার অ্যাকাউন্ট)।

## POS (থার্মাল) প্রিন্টার ও মোবাইল
- Admin → Setting → "রশিদ / POS প্রিন্টার": ৫৮/৮০ মিমি, লোগো, ফুটার লেখা, অটো-প্রিন্ট।
- প্রিন্ট ডায়ালগে প্রিন্টার বেছে Margins = None দিন। ডায়ালগ ছাড়া প্রিন্ট: `chrome --kiosk-printing`।
- Online Orders → অর্ডার খুলে "🖨 অর্ডার স্লিপ" (কুরিয়ারের জন্য, COD হলে সংগ্রহের টাকা বড় করে)।
- মোবাইলে অ্যাডমিন: ☰ মেনু, নিচ থেকে ওঠা ডায়ালগ; ব্রাউজার থেকে "Add to Home screen" করলে অ্যাপের মতো চলবে।

## Tunnel (Cloudflare/ngrok) বা যেকোনো ডোমেইনে চালানো
`npm run dev` এ এখন যেকোনো হোস্টনাম অনুমোদিত। লাইভ/টানেলের জন্য সবচেয়ে ভালো: `npm run serve` (build + start) তারপর টানেল `http://localhost:3001` এ দিন।
