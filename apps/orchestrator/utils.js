import matter from 'gray-matter';
import toml from 'toml';
import fs from "fs";

export function readWranglerConfig(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: wranglerConfig, content, matter: m } = matter(

        // if you don't prefix it with ---toml it doesn't work
        `---toml\n${fileContent}`, {
        engines: {
            toml: toml.parse.bind(toml)
        }
    });
    // wranglerConfig contains the javascript object representation of the wrangler.toml
    const result = { wranglerConfig, content };

    return result;
}