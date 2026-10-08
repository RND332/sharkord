# Development

## Requirements

- [Bun](https://bun.sh/)
- [Tmux](https://github.com/tmux/tmux) (optional)

## Setup

1. Clone the repository.
2. Run `bun install`.
3. Start the app:
   - With tmux: `./start.sh`
   - Without tmux: run `bun dev` in both `apps/client` and `apps/server`

Development data is stored in `apps/server/data`, including the database and uploaded files.
Delete that folder if you want a clean reset.

## Mock data

To start from a server that looks used rather than empty, stop the dev server and run:

```bash
cd apps/server
bun run seed:mock
```

It **wipes `apps/server/data`** and rebuilds it: users, roles, categories, text and voice
channels, a private channel, messages spread over weeks with replies, threads, reactions and
pins, plus a few direct messages. Log in as `admin` with `password123`; every mock user shares
that password, and `useToken("dev")` still claims ownership.

It also creates a `#counting` channel holding 10,000 messages numbered `0` to `9999`, oldest
first, so scrolling, pagination and jump-to-message can be checked against a message that says
exactly where you are. Authors and timestamps alternate between runs of the same person seconds
apart, which the client draws as one group, and switches or longer gaps, which it draws
separately.

`--size small|medium|large` changes the volume (large is 25k messages, for pagination and
search), `--seed <number>` changes the cast, and `--counting <n>` resizes the numbered channel
(`0` skips it). The same seed always produces the same server.

## Direct screen sharing

Screen video and captured screen audio can use a direct WebRTC connection for a
new share with exactly two voice participants. Microphones and webcams still use
mediasoup. Server-relayed screen sharing remains the default.

To enable the optional path, set `webRtc.directScreenSharing` to `true` in the
server configuration or start `apps/server` with:

```bash
SHARKORD_WEBRTC_DIRECT_SCREEN_SHARING=true bun dev
```

Both participants must have **Direct screen sharing (1:1)** enabled in **User
Settings > Devices** before joining voice. The client preference defaults to on
when no value is saved; an existing saved off preference is preserved. It cannot
be changed while connected. Direct connections expose each participant's network
address to the other participant.

Screen viewing remains opt-in with **View demo**. An unwatched direct offer waits
for consent within the existing eight-second negotiation deadline without opening
a receiving peer or consuming screen media. If nobody opts in before that deadline,
the share falls back to the server. **Stop viewing** closes incoming direct screen
media and pauses relayed screen video and audio without ending the presenter's
capture. Delayed stop/re-view requests are serialized so they cannot replace or
pause a newer viewing session. Stopping a presentation clears its viewing choice.

The direct path is tried for up to eight seconds, including signalling and ICE
gathering. Each ICE gathering attempt is limited to two seconds. Failure reuses
the same captured tracks through mediasoup without asking for another capture.
A third participant, an external stream, loss of peer capability, or a failed
direct connection also returns the share to the server.
Existing relayed shares are never upgraded in place. Canceling a handover stops
the original capture; late producer cleanup cannot close a newer share.

For peers on different networks, configure `webRtc.directScreenStunUrls` or the
comma-separated `SHARKORD_WEBRTC_DIRECT_SCREEN_STUN_URLS` environment variable.
Only `stun:` and `stuns:` URLs are accepted, with no public STUN service enabled by
default. Some NAT/firewall combinations cannot connect directly. TURN is not used
for this path: mediasoup is the relay fallback. Group calls and older clients that
do not advertise direct support continue using the server.

## Voice-only mode

Enable **Voice-only mode** in **User Settings > Devices** to send and receive
microphone audio only. The preference is saved on this device, defaults to off,
and can be changed during a call. Saving it stops this user's webcam and screen
sharing, including captured screen audio, and closes incoming camera, screen,
and external-media consumers on both the client and server. Direct screen
connections are closed too; microphone connections and mute/deafen settings
remain unchanged, including mode changes during initial voice connection setup.

Turning the mode off resumes available remote media, including only previously
viewed demos, without restarting this user's camera or screen sharing. Camera
and screen controls are disabled while the saved mode is enabled. No database
migration is required.

## Testing

To run tests, use the following command:

```bash
bun run test
```

(if you only run `bun test` it's gonna fail, you NEED to run `bun run test`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.
