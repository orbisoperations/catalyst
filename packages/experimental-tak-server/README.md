# @catalyst/tak-server

## Status:

Experimental but functional

#### Do not use this tak-server in production as it is untested and the license is weird

# Quickstart

###

This package is a sub-package of the Catalyst project. We use it to spin up ephemeral tak servers for development.

## License

This package uses goatak, which is licensed under the GNU Affero General Public License (GNU AGPL) version 3. The GNU AGPL is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software.

Under this license, if you modify goatak and make it available over a network, you must provide the complete source code of your modified version and license it under the same GNU AGPL v3.

As a user of goatak, this package inherits the terms of the GNU AGPL v3. The source code for this package, along with any modifications made to goatak, is available at [link to your project's source code repository].

For more details about the GNU AGPL v3, please refer to the [LICENSE](./LICENSE) file or visit the [GNU AGPL v3 web page](https://www.gnu.org/licenses/agpl-3.0.en.html).

## Prerequisites

Before using this package, make sure you have the following prerequisites installed:

- Node.js (version X.X.X or higher)
- Docker (version X.X.X or higher) (NEEDS TO BE RUNNING)

## Installation

To install the `@catalyst/tak-server` package, run the following command:

```
npm install @catalyst/tak-server
```

## Usage

1. Import the package in your Node.js script:

```javascript
const { createTakServer } = require('@catalyst/experimental-datachannel-tak-server');
```

2. Call the `createTakServer` function to create and start the goatak_server Docker container:

```javascript
createTakServer()
    .then(() => {
        console.log('goatak_server container created and started successfully');
    })
    .catch((error) => {
        console.error('Error creating or starting goatak_server container:', error);
    });
```

The `createTakServer` function pulls the `kdudkov/goatak_server:latest` Docker image, creates a container from it, and starts the container with the specified configuration.

3. The container exposes the following ports:

    - 8080 (TCP)
    - 8088 (TCP)
    - 8446 (TCP)
    - 8999 (TCP)
    - 8999 (UDP)

    Make sure these ports are available on your host machine.

4. The container logs will be streamed to the console output.

5. To stop and remove the container, you can send a SIGINT signal (e.g., by pressing `Ctrl+C`) or handle the process exit event in your script.

## Configuration

The `createTakServer` function uses the following default configuration:

- Docker image: `kdudkov/goatak_server:latest`
- Container options:
    - `AttachStdin`: false
    - `AttachStdout`: true
    - `AttachStderr`: true
    - `Tty`: false
    - `OpenStdin`: false
    - `StdinOnce`: false
- Port mappings:
    - 8080 (TCP) -> 8080 (host)
    - 8088 (TCP) -> 8088 (host)
    - 8446 (TCP) -> 8446 (host)
    - 8999 (TCP) -> 8999 (host)
    - 8999 (UDP) -> 8999 (host)

If you need to customize the configuration, you can modify the `createTakServer` function in the package source code.

## Error Handling

The `createTakServer` function returns a Promise that resolves when the container is created and started successfully. If an error occurs during the process, the Promise will be rejected with an error object.

Make sure to handle any errors appropriately in your script.
