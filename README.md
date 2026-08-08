# S-kávovary — produkčný web

## Lokálne spustenie

```sh
cd backend
npm ci
npm run dev
```

Web bude dostupný na `http://localhost:3000`.

## Produkčné nasadenie

Backend slúži aj celý frontend. Pred spustením vytvorte `backend/.env` z `backend/.env.example` a nastavte skutočnú HTTPS adresu:

```dotenv
NODE_ENV=production
PORT=3000
PUBLIC_SITE_URL=https://www.vasa-domena.sk
```

`PUBLIC_SITE_URL` je povinná v produkcii. Používa sa pre canonical URL, Open Graph meta tagy, `robots.txt` a `sitemap.xml`.

### Docker

```sh
docker build -t s-kavovary .
docker run --env-file backend/.env -p 3000:3000 s-kavovary
```

Aplikácia obsahuje endpoint `GET /api/health` pre health checky. Pred verejným nasadením nastavte HTTPS reverzným proxy alebo platformou hostingu.