const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, 'prisma', 'migrations');
const destDir = path.join(__dirname, 'dist/flat_migrations');

// Create the destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}
// Function to clear out the destination directory
const clearDestinationDir = () => {
    if (fs.existsSync(destDir)) {
        const files = fs.readdirSync(destDir);
        for (const file of files) {
            fs.unlinkSync(path.join(destDir, file));
        }
        console.log('Cleared out the flat_migrations directory.');
    }
};

// Create the destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
} else {
    // If it exists, clear it out
    clearDestinationDir();
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
