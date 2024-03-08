/**
 * The `fs` variable is used to access the file system module in Node.js.
 * It is obtained by requiring the 'fs' module and accessing the `promises` property.
 *
 * @type {Object}
 * @readonly
 * @namespace fs
 * @see {@link https://nodejs.org/api/fs.html|Node.js File System}
 */
const fs = require('fs').promises;
const path = require('path');

// Source directory where Prisma migration files are located
/**
 * The directory path for Prisma migrations.
 *
 * @type {string}
 */
const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
/**
 * Represents the target directory for storing migration files.
 *
 * @type {string}
 */
const targetDir = path.join(__dirname, 'dist', 'migrations');
/**
 * Copies SQL migration files from a source directory to a target directory,
 * optionally adding a prefix to the target filenames.
 *
 * @param {string} sourceDir - The path to the source directory containing the migration files.
 * @param {string} target - The path to the target directory where the migration files will be copied to.
 * @param {string} [prefix=''] - Optional prefix to be added to the target filenames.
 *
 * @return {Promise<void>} - A Promise that resolves when the migration files have been copied successfully,
 *                          or rejects with an error if an error occurred during the process.
 */
async function copyMigrations(sourceDir, target, prefix = '') {
    try {
        await fs.mkdir(target, { recursive: true });
        const entries = await fs.readdir(sourceDir, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry.name);
            if (entry.isDirectory()) {
                // If the entry is a directory, recurse into it and pass the directory name as a prefix
                await copyMigrations(sourcePath, target, entry.name + '_');
            } else if (entry.isFile() && sourcePath.endsWith('.sql')) {
                // Modify the target filename to include the prefix, ensuring uniqueness
                const targetFilename = prefix + entry.name;
                const targetPath = path.join(target, targetFilename);
                await fs.copyFile(sourcePath, targetPath);
            }
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

// Execute the function
copyMigrations(migrationsDir, targetDir)
    .then(() => console.log('Migrations copied.'))
    .catch(error => console.error("An error occurred:", error));