import 'dotenv/config';
import app from './app.js';
import { runMigration } from './db/migrate.js';
const port = Number(process.env.PORT) || 4000;

await runMigration();

app.listen(port, () => {
    console.log(`CBT backend running on port ${port}`);
});
