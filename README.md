# The Attic

The Attic is a React application for sharing sketches. PostgreSQL (through Sequelize) stores users and sketches; MongoDB (through Mongoose) stores real-time discussion messages.

## Run locally

1. Configure the existing PostgreSQL settings in `config/config.json` and set `MONGO_URI` and `JWT_SECRET` in the server environment.
2. Start the API and Socket.IO server from the project root with `npm run dev`.
3. Start the React client from `client` with `npm run dev`. The local API default is `http://127.0.0.1:3000`; set `VITE_API_URL` if the API is elsewhere, and optionally set `VITE_SOCKET_URL` if Socket.IO uses a different origin.

The server uses the configured PostgreSQL database for authentication and sketch records. MongoDB must be available for message history.

## Run with Docker Compose

The Compose setup runs the React client behind Nginx, the Node.js API, PostgreSQL, and MongoDB. Nginx serves the frontend and proxies API requests and Socket.IO to the backend.

1. Copy `.env.example` to `.env` and set a private `JWT_SECRET`.
2. From the project root, run:

   ```sh
   docker compose up --build
   ```

3. Open `http://localhost`. The API is also available directly at `http://localhost:3000`; `http://localhost/health` reports whether both databases are connected.

The backend runs Sequelize migrations before starting. PostgreSQL and MongoDB data persist in named volumes. Stop the services with `docker compose down`; `docker compose down -v` also deletes database data. Set `FRONTEND_PORT` or `BACKEND_PORT` in `.env` to change the published host ports.

The images use `node:22-alpine` because the current Vite toolchain requires a newer Node.js than Node 18. Docker pulls `postgres:15-alpine`, `mongo:7`, and `nginx:alpine` from Docker Hub. If Docker Hub is inaccessible, configure a registry mirror in the Docker daemon or use an accessible registry.

## Real-time sketch discussions

Each sketch detail page has a separate Socket.IO discussion room. Anyone can join and read the latest 100 messages; sending a message requires a valid login token. Discussion messages are stored in MongoDB and broadcast to users in that sketch's room. Presence counts and join/leave notifications are also sent in real time.

The authenticated **Сообщения** page provides private one-to-one conversations. Contacts come from PostgreSQL; personal message history is stored separately in MongoDB and delivered to the matching conversation room.
Each signed-in user can remove a contact from their own list. This does not delete the account or the message history; the preference is stored in PostgreSQL.
Authentication is stored per browser tab, so each tab can use a separate account. After updating from a version that used shared local storage, sign in again in each tab.

Profiles have a public page with an avatar, short bio, and the author's publications. Click the signed-in user's name in the header to open your profile; click an author's name on a publication to open theirs. From a public profile, authenticated users can start a private conversation.

The private **Профиль** page lets authenticated users edit their name, email, bio, and avatar URL. Email addresses are normalized to lowercase and checked for duplicates. Profile fields are added by the migration below.

To create the updated sample authors and eight themed sketches, run the additive migration and the idempotent demo seed script:

```sh
npx sequelize-cli db:migrate
npm run seed:attic
```

The demo seeder adds four fictional authors with local illustrated avatars. It does not delete existing users or publications.

Socket events:

- Client → server: `sketch:join` with `{ sketchId }`; `sketch:message` with `{ content }` and an acknowledgement callback.
- Server → client: `sketch:history`, `sketch:message`, `sketch:presence`, `sketch:user-joined`, `sketch:user-left`, and `sketch:error`.

Post titles are limited to 3–100 characters, body text to 10–10,000 characters, and image links to valid HTTP(S) URLs. Reading time is calculated on the server. Chat message content is limited to 2,000 characters; the server keeps the most recent 100 messages in each history response.

Run the focused publication validation tests with `npm test`.
