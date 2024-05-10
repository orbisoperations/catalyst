import { createServer } from 'node:http';
import next from 'next';
import {Server} from 'socket.io';
import { Logger } from 'tslog';
import net from 'net';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const takHost = 'tak-server-2-broken-haze-8097.fly.dev';
const takPort = 8999;

const logger = new Logger({
    name: 'run.js',
});

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
let io: Server;

const startServer = async () => {
    try {
        await app.prepare();

        const httpServer = createServer(handler);
        io = new Server(httpServer);

        io.on('connection', onSocketConnection);

        const client = net.createConnection(takPort, takHost, onTakServerConnected);
        client.on('data', onTakServerData);
        client.on('error', onTakServerError);
        client.on('end', onTakServerDisconnected);

        httpServer.listen(port, () => {
            logger.info(`> Ready on http://${hostname}:${port}`);
        });
    } catch (error) {
        logger.error(error);
        process.exit(1);
    }
};

const onSocketConnection = (socket: any) => {
    logger.info(`Client Connected ${socket.id}`);
    // Add any additional socket event handlers here
};

const onTakServerConnected = () => {
    logger.info(`TAK Connected: ${takHost}`);
    io.emit(`TAK Connected: ${takHost}`);
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