const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, 'prisma', 'migrations');
const destDir = path.join(__dirname, 'dist/flat_migrations');

// Create the destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Function to copy files
const copyFiles = async () => {
    try {
        // Read directories within the source directory
        const migrationDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const dir of migrationDirs) {
            // Define the source file path
            const sourceFilePath = path.join(sourceDir, dir, 'migration.sql');
            // Define the destination file path
            const destFilePath = path.join(destDir, `${dir}_migration.sql`);

            // Check if the source file exists before copying
            if (fs.existsSync(sourceFilePath)) {
                // Copy the file to the destination directory
                fs.copyFileSync(sourceFilePath, destFilePath);
                console.log(`Copied: ${sourceFilePath} to ${destFilePath}`);
            }
        }
    } catch (error) {
        console.error('Error copying files:', error);
    }
};

// Execute the copy operation
copyFiles();
