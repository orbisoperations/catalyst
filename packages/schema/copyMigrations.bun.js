import { readdir, copyFile, mkdir, stat } from 'fs';
import { join } from 'path';

const SQL_EXT = '.sql';
const PROJECT_ROOT = process.cwd();
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'prisma', 'migrations');
const DIST_DIR = join(PROJECT_ROOT, 'dist', 'migrations');

console.log('Migration directory:', MIGRATIONS_DIR);

async function makeDirectoryIfNotExists(path: string): Promise<void> {
    try {
        await mkdir(path, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error(`Error creating directory ${path}:`, error);
            process.exit(1);
        }
    }
}

async function copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
    await makeDirectoryIfNotExists(targetDir);

    const entryNames = await readdir(sourceDir);
    for (const entryName of entryNames) {
        const sourcePath = join(sourceDir, entryName);
        const targetPath = join(targetDir, entryName);
        const entryStat = await stat(sourcePath);

        if (entryStat.isDirectory()) {
            await copyDirectory(sourcePath, targetPath);
        } else if (entryStat.isFile() && sourcePath.endsWith(SQL_EXT)) {
            try {
                await copyFile(sourcePath, targetPath);
            } catch (error) {
                console.error(`Error copying file from ${sourcePath} to ${targetPath}:`, error);
            }
        }
    }
}

async function startCopying() {
    try {
        await copyDirectory(MIGRATIONS_DIR, DIST_DIR);
        console.log('Migrations have been successfully copied.');
    } catch (error) {
        console.error("An error occurred during the copy process:", error);
    }
}

startCopying();