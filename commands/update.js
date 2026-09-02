const { exec } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs-extra'); 
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const chalk = require('chalk');

const REPO_OWNER = 'Mickeydeveloper';
const REPO_NAME = 'Mickey-Glitch-2';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

/**
 * @project: MICKEY GLITCH
 * @command: UPDATE (Full Replace Edition)
 */

async function extractZipFile(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);
            console.log(chalk.green('✓ Extracted using AdmZip'));
            return resolve(true);
        } catch (admErr) {
            console.log(chalk.yellow('⚠ AdmZip JS extraction failed, trying native unzip/7z...'), admErr.message);
        }

        exec(`unzip -o "${zipPath}" -d "${extractPath}"`, (err) => {
            if (!err) {
                console.log(chalk.green('✓ Extracted using unzip'));
                return resolve(true);
            }

            console.log(chalk.yellow('⚠ unzip failed, trying 7z...'));

            exec(`7z x "${zipPath}" -o"${extractPath}" -y`, (err2) => {
                if (!err2) {
                    console.log(chalk.green('✓ Extracted using 7z'));
                    return resolve(true);
                }

                console.log(chalk.yellow('⚠ 7z failed, trying tar...'));

                exec(`tar -xzf "${zipPath}" -C "${extractPath}"`, (err3) => {
                    if (!err3) {
                        console.log(chalk.green('✓ Extracted using tar'));
                        return resolve(true);
                    }

                    reject(new Error(
                        'EXTRACTION_FAILED: AdmZip, unzip, 7z, na tar zote hazifanyi kazi.'
                    ));
                });
            });
        });
    });
}

function gatherSourceFiles(baseDir, ignoreSet) {
    const files = new Set();
    const dirs = new Set();

    const walk = (currentDir) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(baseDir, fullPath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                dirs.add(relativePath);
                walk(fullPath);
            } else {
                files.add(relativePath);
            }
        }
    };

    walk(baseDir);
    return { files, dirs };
}

function syncExtractedRepo(sourceRoot, targetRoot, ignoreSet) {
    const deletedFiles = [];
    const { files: sourceFiles, dirs: sourceDirs } = gatherSourceFiles(sourceRoot, ignoreSet);

    const walkTarget = (currentDir) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(targetRoot, fullPath).split(path.sep).join('/');

            if (entry.isDirectory()) {
                const hasMatchingDir = sourceDirs.has(relativePath);
                const hasMatchingChild = Array.from(sourceFiles).some((file) => file.startsWith(relativePath + '/'));

                if (!hasMatchingDir && !hasMatchingChild) {
                    fs.removeSync(fullPath);
                    deletedFiles.push(relativePath + '/');
                    continue;
                }

                walkTarget(fullPath);
                continue;
            }

            if (!sourceFiles.has(relativePath)) {
                fs.removeSync(fullPath);
                deletedFiles.push(relativePath);
            }
        }
    };

    const walkSource = (currentDir) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreSet.has(entry.name)) continue;

            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(sourceRoot, fullPath).split(path.sep).join('/');
            const targetPath = path.join(targetRoot, relativePath);

            if (entry.isDirectory()) {
                fs.ensureDirSync(targetPath);
                walkSource(fullPath);
            } else {
                fs.ensureDirSync(path.dirname(targetPath));
                fs.copySync(fullPath, targetPath, { overwrite: true });
            }
        }
    };

    walkTarget(targetRoot);
    walkSource(sourceRoot);

    return deletedFiles;
}

function restartBot(delayMs = 2500) {
    console.log(chalk.yellow(`[Restart] Restarting bot in ${delayMs}ms...`));

    if (typeof process.send === 'function') {
        try {
            process.send('restart');
        } catch (e) {}
    }

    if (process.env.pm2 || process.env.npm_lifecycle_event === 'start') {
        exec('pm2 restart ecosystem.config.js --env production', (err) => {
            if (err) {
                console.error(chalk.red('PM2 restart failed:'), err.message);
                setTimeout(() => process.exit(1), delayMs);
            }
        });
        return;
    }

    setTimeout(() => {
        process.exit(1);
    }, delayMs);
}

async function updateCommand(sock, chatId, message, zipUrl) {
    try {
        const isOwner = message.key.fromMe;
        if (!isOwner) return;

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const rawZipUrl = typeof zipUrl === 'string'
            ? zipUrl
            : (zipUrl && typeof zipUrl === 'object' && typeof zipUrl.url === 'string'
                ? zipUrl.url
                : '');

        const normalizedZipUrl = String(rawZipUrl || '').trim();
        let updateZipUrl = normalizedZipUrl && normalizedZipUrl.startsWith('http')
            ? normalizedZipUrl
            : `${REPO_URL}/archive/refs/heads/main.zip`;

        console.log(chalk.blue(`[Update] Link inayotumika: ${updateZipUrl}`));

        const tmpDir = path.join(process.cwd(), 'temp_update');
        const zipPath = path.join(tmpDir, 'bot_update.zip');
        const extractPath = path.join(tmpDir, 'extracted');

        if (fs.existsSync(tmpDir)) fs.removeSync(tmpDir);
        fs.ensureDirSync(tmpDir);

        const response = await axios({ 
            method: 'get', 
            url: updateZipUrl, 
            responseType: 'stream',
            timeout: 60000 
        }).catch(err => {
            throw new Error(`Imeshindwa kupata file: ${err.message}`);
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        await sock.sendMessage(chatId, { text: "📦 *Mchakato wa ku-update zote umeanza...*" });

        try {
            await extractZipFile(zipPath, extractPath);

            const folders = fs.readdirSync(extractPath);
            if (folders.length === 0) {
                throw new Error('Extracted folder is empty');
            }

            const rootFolder = path.join(extractPath, folders[0]);
            const repoRoot = fs.existsSync(path.join(rootFolder, 'package.json'))
                ? rootFolder
                : fs.readdirSync(rootFolder).find(item => {
                    const itemPath = path.join(rootFolder, item);
                    return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'package.json'));
                })
                    ? path.join(rootFolder, fs.readdirSync(rootFolder).find(item => {
                        const itemPath = path.join(rootFolder, item);
                        return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'package.json'));
                    }))
                    : rootFolder;

            // ⚠️ IGNORING ONLY SENSITIVE RUNTIME/SESSION FOLDERS AND SYSTEM DATA
            // Files kama config.js, .env, main.js sasa hivi ZITAKUA UPDATED kikamilifu!
            const ignore = new Set([
                'node_modules',
                'session',
                'auth_info',
                'auth_info_baileys',
                '.git',
                'temp_update'
            ]);

            const deletedFiles = syncExtractedRepo(repoRoot, process.cwd(), ignore);

            fs.removeSync(tmpDir);

            const filteredDeleted = deletedFiles.filter(file => {
                const normalized = String(file).replace(/\\/g, '/').toLowerCase();
                return !normalized.includes('session') && !normalized.includes('auth_info');
            });

            const deletedSummary = filteredDeleted.length > 0
                ? `\n\n🗑️ *Files zilizofutwa (zilizondolewa kwe repo):*\n${filteredDeleted.slice(0, 10).map(f => `• ${f}`).join('\n')}${filteredDeleted.length > 10 ? '\n... na zaidi' : ''}`
                : '';

            await sock.sendMessage(chatId, { text: `✅ *Update ya Fayil ZOTE imekamilika!*\n\nBot inajizima na kuwaka upya.${deletedSummary}` });
            console.log(chalk.green.bold('📢 FULL UPDATE SUCCESSFUL!'));

            restartBot(3000);
        } catch (extractErr) {
            console.error(chalk.red('Extraction Error:'), extractErr.message);
            fs.removeSync(tmpDir);

            const errorMsg = `❌ *Extraction Imefeli:* ${extractErr.message}`;
            await sock.sendMessage(chatId, { text: errorMsg }).catch(() => {});
        }

    } catch (err) {
        console.error(chalk.red("Update Error:"), err.message);
        await sock.sendMessage(chatId, { text: `❌ *Update Imefeli:* ${err.message}` }).catch(() => {});
    }
}

module.exports = updateCommand;
