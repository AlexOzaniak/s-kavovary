# S-kávovary — web + booking backend

## Frontend
Statické súbory v `/frontend`. Otvorte `index.html` alebo servujte cez akýkoľvek statický server.
V `script.js` nastavte `API_BASE_URL` na adresu bežiaceho backendu (v produkcii ideálne rovnaká doména, napr. `/api`).

## Backend
```
cd backend
npm install
cp .env.example .env   # doplňte SMTP_USER a SMTP_PASS (Gmail App Password)
npm start
```
Server beží na `http://localhost:3000`. Endpoint pre objednávky: `POST /api/bookings`.

**Production deployment notes**

- Use environment variables (see `.env.example`) and never commit secrets.
- Run `npm ci` in CI and `npm start` to run the server. Consider a process
	manager like `pm2` or Docker for resilience.
- Serve the `frontend/` directory from the same host (backend now serves
	static files). Configure HTTPS (Let's Encrypt or your provider) and set
	`NODE_ENV=production`.
- For file-based booking logs, use an external log/DB in production or
	implement log rotation to avoid unbounded growth.

