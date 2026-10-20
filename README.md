<div align="center">
  <h1>Dodecagon</h1>
  <p><strong>A lightweight, self-hosted real-time communication platform</strong></p>

  [![Version](https://img.shields.io/github/v/release/RND332/sharkord)](https://github.com/RND332/sharkord/releases)
  [![License](https://img.shields.io/github/license/RND332/sharkord)](LICENSE)
  [![Last Commit](https://img.shields.io/github/last-commit/RND332/sharkord)](https://github.com/RND332/sharkord/commits)

  [![Bun](https://img.shields.io/badge/Bun-v1.3.14-green.svg)](https://bun.sh)
  [![Mediasoup](https://img.shields.io/badge/Mediasoup-v3.19.19-green.svg)](https://mediasoup.org)
</div>

## What is Dodecagon?

> [!NOTE]
> Dodecagon is in alpha stage. Bugs, incomplete features and breaking changes are to be expected.

Dodecagon is a self-hosted communication platform for small groups. Voice, video, screen sharing and text channels stay on your own infrastructure, without the bloat or surveillance.

Dodecagon is a fork of [Sharkord](https://github.com/Sharkord/sharkord), maintained by RND332.

## Features

- **Voice channels** with video and screen sharing, over a built-in mediasoup SFU
- **Text channels** grouped into categories, with threads, replies, reactions, pins and search
- **Direct messages** between members
- **Roles and permissions**, with per-channel overrides for individual roles and users
- **Custom emoji**, mentions and channel references
- **Invites** with usage limits and automatic role assignment
- **File uploads** with per-user storage quotas and optional signed URLs
- **Plugins** that extend both server and client, through the [plugin SDK](packages/plugin-sdk)

## Getting Started

Dodecagon is distributed as a standalone binary that bundles both server and client components. Download the latest release for your platform from the [Releases](https://github.com/RND332/sharkord/releases) page.

#### Linux x64

```bash
curl -L https://github.com/RND332/sharkord/releases/latest/download/sharkord-linux-x64 -o dodecagon
chmod +x dodecagon
./dodecagon
```

The artifact and Docker identifiers still use the Sharkord name while the infrastructure rename is in progress.

#### Docker

```bash
docker run \
  -p 4991:4991/tcp \
  -p 40000:40000/tcp \
  -p 40000:40000/udp \
  -v ./data:/home/bun/.config/sharkord \
  --name dodecagon \
  ghcr.io/rnd332/sharkord:latest
```

> [!WARNING]
> On first launch Dodecagon creates a secret token and prints it to the console. It is both the credential that grants owner access and the key your server signs every session and file URL with, so anyone who obtains it can take ownership **and** impersonate any account. Keep it out of logs, screenshots and issue reports, store it securely, and do not lose it.

Once the server is running, open [http://localhost:4991](http://localhost:4991) to access the client. If the server runs on another machine, replace `localhost` with its IP address or domain name.

## Contributing

See the [Contributing Guide](CONTRIBUTING.md) for project scope and PR rules, and [Development](DEVELOPMENT.md) for running Dodecagon locally.

## License

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with open-source technologies:

- [Bun](https://bun.sh)
- [tRPC](https://trpc.io)
- [Mediasoup](https://mediasoup.org)
- [Drizzle ORM](https://orm.drizzle.team)
- [React](https://react.dev)
- [Radix UI](https://www.radix-ui.com)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com)

<div align="center">
  <p>Maintained by RND332. Originally built by the Sharkord team.</p>
  <p>
    <a href="https://github.com/RND332/sharkord">GitHub</a> •
    <a href="https://github.com/RND332/sharkord/issues">Issues</a>
  </p>
</div>
