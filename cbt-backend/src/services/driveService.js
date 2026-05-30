import fs from 'fs';
import { google } from 'googleapis';
import { pipeline } from 'stream/promises';

const driveFolderCache = new Map();
let driveClientPromise = null;

function normalizeEnvValue(value) {
    return String(value || '')
        .trim()
        .replace(/^"([\s\S]*)"$/, '$1')
        .replace(/^'([\s\S]*)'$/, '$1');
}

function getDriveConfig() {
    const rootFolderId = normalizeEnvValue(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
    const clientEmail = normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    const keyFile = normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const privateKey = normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).replace(/\\n/g, '\n');
    // OAuth config (user account) may be provided instead of service account.
    const oauthClientId = normalizeEnvValue(process.env.GOOGLE_OAUTH_CLIENT_ID);
    const oauthClientSecret = normalizeEnvValue(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
    const oauthRefreshToken = normalizeEnvValue(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
    const oauthRedirectUri = normalizeEnvValue(process.env.GOOGLE_OAUTH_REDIRECT_URI);

    // At minimum we need a root folder ID configured.
    if (!rootFolderId) return null;

    // Validate service account key if present
    if (clientEmail && (!keyFile && !privateKey.includes('PRIVATE KEY'))) {
        console.warn('Google Drive service account private key appears invalid.');
    }

    return {
        rootFolderId,
        serviceAccount: { clientEmail: clientEmail || null, privateKey: privateKey || null, keyFile: keyFile || null },
        oauth: { clientId: oauthClientId || null, clientSecret: oauthClientSecret || null, refreshToken: oauthRefreshToken || null, redirectUri: oauthRedirectUri || null },
    };
}

function getDriveAuthMode(config) {
    if (!config) {
        return 'disabled';
    }
    if (config.oauth?.clientId && config.oauth?.clientSecret && config.oauth?.refreshToken) {
        return 'oauth';
    }
    if (config.serviceAccount?.clientEmail && (config.serviceAccount?.keyFile || config.serviceAccount?.privateKey)) {
        return 'service-account';
    }
    return 'misconfigured';
}

export function isDriveConfigured() {
    const cfg = getDriveConfig();
    if (!cfg) return false;
    const hasServiceAccount = Boolean(cfg.serviceAccount.clientEmail && (cfg.serviceAccount.keyFile || (cfg.serviceAccount.privateKey && cfg.serviceAccount.privateKey.includes('PRIVATE KEY'))));
    const hasOAuth = Boolean(cfg.oauth.clientId && cfg.oauth.clientSecret && cfg.oauth.refreshToken);
    return Boolean(cfg.rootFolderId && (hasServiceAccount || hasOAuth));
}

export function sanitizeDriveName(value, fallback = 'Untitled') {
    const cleaned = String(value || '')
        .replace(/[\\/\?%*:|"<>\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || fallback;
}

function escapeDriveQueryValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getDriveClient() {
    const config = getDriveConfig();
    if (!config) {
        console.warn('Google Drive is disabled because GOOGLE_DRIVE_ROOT_FOLDER_ID is missing.');
        return null;
    }
    if (!driveClientPromise) {
        driveClientPromise = (async () => {
            try {
                const authMode = getDriveAuthMode(config);
                console.log(`[Drive] Initializing Google Drive client using ${authMode} auth.`);

                // Prefer OAuth2 user credentials when provided (uses user's Drive/quota)
                if (config.oauth && config.oauth.clientId && config.oauth.clientSecret && config.oauth.refreshToken) {
                    const { clientId, clientSecret, refreshToken, redirectUri } = config.oauth;
                    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri || 'urn:ietf:wg:oauth:2.0:oob');
                    oauth2Client.setCredentials({ refresh_token: refreshToken });
                    // Ensure token is fresh
                    await oauth2Client.getAccessToken();
                    console.log('[Drive] OAuth2 client authorized successfully.');
                    return google.drive({ version: 'v3', auth: oauth2Client });
                }

                // Fallback to service account JWT
                const sa = config.serviceAccount || {};
                if (!sa.clientEmail || (!sa.keyFile && !sa.privateKey)) {
                    throw new Error('No usable Google Drive credentials (neither OAuth2 nor service account present)');
                }
                const auth = new google.auth.JWT({
                    email: sa.clientEmail,
                    key: sa.privateKey || undefined,
                    keyFile: sa.keyFile || undefined,
                    scopes: ['https://www.googleapis.com/auth/drive'],
                });
                await auth.authorize();
                console.log('[Drive] Service account authorized successfully.');
                return google.drive({ version: 'v3', auth });
            }
            catch (error) {
                driveClientPromise = null;
                console.warn('Google Drive authorization failed. Drive features will be disabled until the credentials are fixed.');
                console.warn(`Google Drive auth error: ${error?.message || 'Unknown error'}`);
                return null;
            }
        })();
    }
    return driveClientPromise;
}

export async function ensureDriveFolderPath(folderNames) {
    const config = getDriveConfig();
    if (!config) {
        return null;
    }
    const drive = await getDriveClient();
    if (!drive) {
        console.warn('[Drive] Folder path creation skipped because Drive client is unavailable.');
        return null;
    }

    try {
        console.log(`[Drive] Checking access to root folder: ${config.rootFolderId}`);
        await drive.files.get({
            fileId: config.rootFolderId,
            fields: 'id, name',
            supportsAllDrives: true,
        });
        console.log('[Drive] Root folder is accessible.');
    }
    catch (error) {
        console.warn(`Google Drive root folder cannot be accessed: ${config.rootFolderId}`);
        console.warn(`Google Drive root folder error: ${error?.message || 'Unknown error'}`);
        return null;
    }

    let parentId = config.rootFolderId;
    for (const folderName of folderNames) {
        const sanitizedName = sanitizeDriveName(folderName);
        const cacheKey = `${parentId}::${sanitizedName}`;
        if (driveFolderCache.has(cacheKey)) {
            console.log(`[Drive] Reusing cached folder for "${sanitizedName}" under ${parentId}.`);
            parentId = driveFolderCache.get(cacheKey);
            continue;
        }
        const escapedName = escapeDriveQueryValue(sanitizedName);
        console.log(`[Drive] Looking for folder "${sanitizedName}" under ${parentId}.`);
        const existing = await drive.files.list({
            q: `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${escapedName}' and '${parentId}' in parents`,
            fields: 'files(id, name)',
            spaces: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 10,
        });
        const existingFolder = existing.data.files?.[0];
        if (existingFolder?.id) {
            console.log(`[Drive] Found existing folder "${sanitizedName}" (${existingFolder.id}).`);
            driveFolderCache.set(cacheKey, existingFolder.id);
            parentId = existingFolder.id;
            continue;
        }
        console.log(`[Drive] Creating folder "${sanitizedName}" under ${parentId}.`);
        const created = await drive.files.create({
            requestBody: {
                name: sanitizedName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id',
            supportsAllDrives: true,
        });
        console.log(`[Drive] Created folder "${sanitizedName}" (${created.data.id}).`);
        driveFolderCache.set(cacheKey, created.data.id);
        parentId = created.data.id;
    }
    return parentId;
}

export async function uploadFileToDrive({ filePath, fileName, mimeType, parentFolderId }) {
    const drive = await getDriveClient();
    if (!drive) {
        console.warn('[Drive] Upload skipped because Drive client is unavailable.');
        return null;
    }
    const safeFileName = sanitizeDriveName(fileName, 'project-file');
    console.log(`[Drive] Uploading file "${safeFileName}" to folder ${parentFolderId}.`);
    const response = await drive.files.create({
        requestBody: {
            name: safeFileName,
            parents: [parentFolderId],
        },
        media: {
            mimeType: mimeType || 'application/octet-stream',
            body: fs.createReadStream(filePath),
        },
        fields: 'id, name, webViewLink, webContentLink, mimeType',
        supportsAllDrives: true,
    });
    console.log(`[Drive] Upload successful: ${response.data.id}`);
    return {
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink || response.data.webContentLink || null,
        folderId: parentFolderId,
    };
}

export async function deleteDriveFile(fileId) {
    const drive = await getDriveClient();
    if (!drive || !fileId) {
        return;
    }
    await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function downloadDriveFile(fileId, res, downloadName) {
    const drive = await getDriveClient();
    if (!drive) {
        throw new Error('Google Drive is not configured');
    }
    const metadata = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true,
    });
    const media = await drive.files.get(
        {
            fileId,
            alt: 'media',
            supportsAllDrives: true,
        },
        { responseType: 'stream' }
    );
    const fileName = downloadName || metadata.data.name || 'project-file';
    res.setHeader('Content-Type', metadata.data.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/"/g, '\\"')}"`);
    if (metadata.data.size) {
        res.setHeader('Content-Length', metadata.data.size);
    }
    await pipeline(media.data, res);
}