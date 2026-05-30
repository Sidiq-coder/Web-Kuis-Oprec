# CBT Backend

Backend API for the Session-Based Exam Platform using Node.js, Express, and PostgreSQL.

## Setup

1. Install dependencies:

```
npm install
```

2. Configure environment:

```
cp .env.example .env
```

Update `DATABASE_URL` to point to your `webkuis` database if needed.

If you want project submissions to be copied to Google Drive, also set:

- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

The Drive root folder must be shared with the service account as an editor.

3. Run database migration and seed data:

```
npm run migrate
npm run seed
```

4. Start dev server:

```
npm run dev
```

## Default Admin

- Username: `admin`
- Password: `admin123`

You can change these via `ADMIN_DEFAULT_USERNAME` and `ADMIN_DEFAULT_PASSWORD` before seeding.

## API Base URL

- `http://localhost:4000/api`

## Scripts

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run start` - run compiled server
- `npm run migrate` - apply schema
- `npm run seed` - seed initial data
