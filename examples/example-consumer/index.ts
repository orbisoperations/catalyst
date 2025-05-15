import { Consumer } from './consumer';
import { getConfig } from './config';

const config = getConfig();
const consumer = new Consumer(config);

async function main() {
    console.log('getting sdl');
    const sdl = await consumer.doGraphqlQuery();
    console.log('sdl', JSON.stringify(sdl, null, 2));
}

try {
    main();
} catch (error) {
    console.error(error);
}
