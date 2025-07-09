/* eslint-env node, es2021 */
/* global process */
/* global console */
/* global require */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docker = require('dockerode');

/**
 * Initializes a new instance of the Docker class.
 * @constructor
 * @param {Object} options - The configuration options for the Docker instance.
 * @param {string} options.socketPath - The path to the Docker socket file.
 */
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Represents the Docker image for the goatak_server.
 *
 * @type {string}
 */
const takImage = 'kdudkov/goatak_server:latest';

docker.pull(takImage, {}, (err, stream) => {
    if (err) {
        console.error('Error pulling image:', err);
        process.exit(1);
    }

    docker.modem.followProgress(stream, (err) => {
        if (err) {
            console.error('Error pulling image:', err);
            process.exit(1);
        }

        console.log('Image pulled successfully:', takImage);

        createAndStartContainer();
    });
});

function createAndStartContainer() {
    docker.createContainer(
        {
            Image: takImage,
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            OpenStdin: false,
            StdinOnce: false,
            Args: ['--debug'],
            HostConfig: {
                PortBindings: {
                    '8080/tcp': [{ HostPort: '8080' }],
                    '8088/tcp': [{ HostPort: '8088' }],
                    '8446/tcp': [{ HostPort: '8446' }],
                    '8999/tcp': [{ HostPort: '8999' }],
                    '8999/udp': [{ HostPort: '8999' }],
                },
            },
        },
        function (err, container) {
            if (err) {
                console.error('Error creating container:', err);
                process.exit(1);
            }

            container.attach({ stream: true, stdout: true, stderr: true }, function (err, stream) {
                if (err) {
                    console.error('Error attaching to container:', err);
                    removeContainerAndExit(container);
                }

                stream.pipe(process.stdout);
            });

            container.start(function (err) {
                if (err) {
                    console.error('Error starting container:', err);
                    removeContainerAndExit(container);
                }

                console.log('Container started successfully');
            });

            process.on('SIGINT', function () {
                console.log('Received SIGINT signal');
                removeContainerAndExit(container);
            });

            process.on('uncaughtException', function (err) {
                console.error('Caught exception:', err);
                removeContainerAndExit(container);
            });
        }
    );
}

function removeContainerAndExit(container) {
    container.remove({ force: true }, function (err) {
        if (err) {
            console.error('Error removing container:', err);
            process.exit(1);
        }

        console.log('Container removed successfully');
        process.exit(0);
    });
}
