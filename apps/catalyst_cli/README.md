oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g catalyst_cli_2
$ cctl COMMAND
running command...
$ cctl (--version)
catalyst_cli_2/0.0.0 linux-x64 node-v20.11.1
$ cctl --help [COMMAND]
USAGE
  $ cctl COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cctl data-channels`](#cctl-data-channels)
* [`cctl data-channels create ORGANIZATION NAME ENDPOINT`](#cctl-data-channels-create-organization-name-endpoint)
* [`cctl data-channels delete ORGANIZATION NAME`](#cctl-data-channels-delete-organization-name)
* [`cctl data-channels list [ORGANIZATION] [NAME]`](#cctl-data-channels-list-organization-name)
* [`cctl data-channels read ORGANIZATION NAME`](#cctl-data-channels-read-organization-name)
* [`cctl data-channels update ORGANIZATION NAME ENDPOINT`](#cctl-data-channels-update-organization-name-endpoint)
* [`cctl help [COMMANDS]`](#cctl-help-commands)
* [`cctl plugins`](#cctl-plugins)
* [`cctl plugins:install PLUGIN...`](#cctl-pluginsinstall-plugin)
* [`cctl plugins:inspect PLUGIN...`](#cctl-pluginsinspect-plugin)
* [`cctl plugins:install PLUGIN...`](#cctl-pluginsinstall-plugin-1)
* [`cctl plugins:link PLUGIN`](#cctl-pluginslink-plugin)
* [`cctl plugins:uninstall PLUGIN...`](#cctl-pluginsuninstall-plugin)
* [`cctl plugins reset`](#cctl-plugins-reset)
* [`cctl plugins:uninstall PLUGIN...`](#cctl-pluginsuninstall-plugin-1)
* [`cctl plugins:uninstall PLUGIN...`](#cctl-pluginsuninstall-plugin-2)
* [`cctl plugins update`](#cctl-plugins-update)
* [`cctl update [CHANNEL]`](#cctl-update-channel)

## `cctl data-channels`

Say hello

```
USAGE
  $ cctl data-channels

DESCRIPTION
  Say hello

EXAMPLES
  $ oex data-channels
```

_See code: [src/commands/data-channels/index.ts](https://github.com/OrbisOps/catalyst/blob/v0.0.0/src/commands/data-channels/index.ts)_

## `cctl data-channels create ORGANIZATION NAME ENDPOINT`

create a data channel

```
USAGE
  $ cctl data-channels create ORGANIZATION NAME ENDPOINT

ARGUMENTS
  ORGANIZATION  data channel organization
  NAME          data channel name
  ENDPOINT      data channel endpoint

DESCRIPTION
  create a data channel

EXAMPLES
  $ oex data channel upsert [organization] [name] [endpoint]
```

_See code: [src/commands/data-channels/create.ts](https://github.com/OrbisOps/catalyst/blob/v0.0.0/src/commands/data-channels/create.ts)_

## `cctl data-channels delete ORGANIZATION NAME`

delete a data channel

```
USAGE
  $ cctl data-channels delete ORGANIZATION NAME

ARGUMENTS
  ORGANIZATION  data channel organization
  NAME          data channel name

DESCRIPTION
  delete a data channel

EXAMPLES
  $ oex data channel delete org1 channel
          org1 channel
```

_See code: [src/commands/data-channels/delete.ts](https://github.com/OrbisOps/catalyst/blob/v0.0.0/src/commands/data-channels/delete.ts)_

## `cctl data-channels list [ORGANIZATION] [NAME]`

list data channels using prefix matching

```
USAGE
  $ cctl data-channels list [ORGANIZATION] [NAME]

ARGUMENTS
  ORGANIZATION  data channel organization prefix string
  NAME          data channel name prefix string

DESCRIPTION
  list data channels using prefix matching

EXAMPLES
  $ oex data-channels list
       Organization Name    Endpoint
       ──────────── ─────── ────────────────
       test         test    http://test.com/
       org1         channel http://test.com/
       org2         channel http://test.com/
       org-test     chan    http://test.com/

  $ oex data-channels list org1 chan
       Organization Name    Endpoint
       ──────────── ─────── ────────────────
       org1         channel http://test.com/

  $ oex data-channels list o channel
       Organization Name    Endpoint
       ──────────── ─────── ────────────────
       org1         channel http://test.com/
       org2         channel http://test.com/

  $ oex data-channels list o channels
       no data-channels found
```

_See code: [src/commands/data-channels/list.ts](https://github.com/OrbisOps/catalyst/blob/v0.0.0/src/commands/data-channels/list.ts)_

## `cctl data-channels read ORGANIZATION NAME`

get a data channel

```
USAGE
  $ cctl data-channels read ORGANIZATION NAME

ARGUMENTS
  ORGANIZATION  data channel organization prefix string
  NAME          data channel name prefix string

DESCRIPTION
  get a data channel

EXAMPLES
  $ oex data channel get org1 channel
          org1 channel
```

_See code: [src/commands/data-channels/read.ts](https://github.com/OrbisOps/catalyst/blob/v0.0.0/src/commands/data-channels/read.ts)_

## `cctl data-channels update ORGANIZATION NAME ENDPOINT`

update a data channel

```
USAGE
  $ cctl data-channels update ORGANIZATION NAME ENDPOINT

ARGUMENTS
  ORGANIZATION  data channel organization
  NAME          data channel name
  ENDPOINT      data channel endpoint

DESCRIPTION
  update a data channel

EXAMPLES
  $ oex data channel update [organization] [name] [endpoint]
```

_See code: [src/commands/data-channels/update.ts](https://github.com/OrbisOps/catalyst/blob/v0.0.0/src/commands/data-channels/update.ts)_

## `cctl help [COMMANDS]`

Display help for cctl.

```
USAGE
  $ cctl help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for cctl.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.12/src/commands/help.ts)_

## `cctl plugins`

List installed plugins.

```
USAGE
  $ cctl plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ cctl plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/index.ts)_

## `cctl plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ cctl plugins add plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ cctl plugins add

EXAMPLES
  $ cctl plugins add myplugin 

  $ cctl plugins add https://github.com/someuser/someplugin

  $ cctl plugins add someuser/someplugin
```

## `cctl plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ cctl plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ cctl plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/inspect.ts)_

## `cctl plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ cctl plugins install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ cctl plugins add

EXAMPLES
  $ cctl plugins install myplugin 

  $ cctl plugins install https://github.com/someuser/someplugin

  $ cctl plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/install.ts)_

## `cctl plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ cctl plugins link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ cctl plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/link.ts)_

## `cctl plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cctl plugins remove plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cctl plugins unlink
  $ cctl plugins remove

EXAMPLES
  $ cctl plugins remove myplugin
```

## `cctl plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ cctl plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/reset.ts)_

## `cctl plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cctl plugins uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cctl plugins unlink
  $ cctl plugins remove

EXAMPLES
  $ cctl plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/uninstall.ts)_

## `cctl plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cctl plugins unlink plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cctl plugins unlink
  $ cctl plugins remove

EXAMPLES
  $ cctl plugins unlink myplugin
```

## `cctl plugins update`

Update installed plugins.

```
USAGE
  $ cctl plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.2.2/src/commands/plugins/update.ts)_

## `cctl update [CHANNEL]`

update the cctl CLI

```
USAGE
  $ cctl update [CHANNEL] [-a] [--force] [-i | -v <value>]

FLAGS
  -a, --available        See available versions.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
      --force            Force a re-download of the requested version.

DESCRIPTION
  update the cctl CLI

EXAMPLES
  Update to the stable channel:

    $ cctl update stable

  Update to a specific version:

    $ cctl update --version 1.0.0

  Interactively select version:

    $ cctl update --interactive

  See available versions:

    $ cctl update --available
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.1.11/src/commands/update.ts)_
<!-- commandsstop -->
