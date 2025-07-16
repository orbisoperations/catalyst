import next from 'next';
import { Server } from 'socket.io';
import { Logger } from 'tslog';
import net from 'net';
import { listen } from 'listhen';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import { createStorageServer } from 'unstorage/server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const takHost = 'tak-server-2-broken-haze-8097.fly.dev';
const takPort = 8999;

const logger = new Logger({
    name: 'app',
});

// Configure a long-lived application storage backend
const dataStorageDirectory = process.env.APP_DATA_STORAGE_DIRECTORY ?? './.app/data';

// This sets up an instance of unstorage @ dataStorageDirectory
export const storage = createStorage({
    driver: fsDriver({ base: dataStorageDirectory }),
});
// Setup the server so we can communicate with it from the UI
const storageServer = createStorageServer(storage, {});

const app = next({ dev, hostname, port });
const nextHandler = app.getRequestHandler();
let io: Server;

const startServer = async () => {
    try {
        await app.prepare();

        // manages a next.js server on port 3000
        await listen(
            (req, res) => {
                if (req.url?.includes('/state/')) {
                    return storageServer.handle(req, res);
                }
                return nextHandler(req, res);
            },
            { port: 3000 }
        ).then((l) => {
            io = new Server(l.server);
            io.on('connection', onSocketConnection);

            const client = net.createConnection(takPort, takHost, onTakServerConnected);
            client.on('data', onTakServerData);
            client.on('error', onTakServerError);
            client.on('end', onTakServerDisconnected);
            logger.info(`> Next.js: ${l.url}`);
        });
    } catch (error) {
        logger.error(error);
        process.exit(1);
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onSocketConnection = (socket: any) => {
    logger.info(`Client Connected ${socket.id}`);
    // Add any additional socket event handlers here
};

const onTakServerConnected = () => {
    logger.info(`> TAK Server Connected: ${takHost}`);
    io.emit(`TAK Server: ${takHost}`);
};

const onTakServerData = (data: Buffer) => {
    io.emit('cot', data);
};

const onTakServerError = (error: Error) => {
    logger.error('Disconnected from TAK server');
    logger.error(error);
    io.emit('Tak Integration Status: Error');
    process.exit(1);
};

const onTakServerDisconnected = () => {
    logger.info('Disconnected from TAK server');
};

startServer();
